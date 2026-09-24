import type { GoogleGenAI } from "@google/genai";

// Base64 increases the inline request size, so larger recordings use the Files API.
export const INLINE_AUDIO_LIMIT_BYTES = 14 * 1024 * 1024;
export const MAX_SUMMARY_AUDIO_BYTES = 45 * 1024 * 1024;
export const SUMMARY_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash"] as const;

const SUMMARY_PROMPT = `Listen to this audio note and summarize what was actually said.
Return JSON with one field named "summary" containing a concise, useful summary in the same language as the recording.
Include the main points and, when present, decisions or action items. Do not invent names, dates, facts, or action items.
If speech is unclear, say what is uncertain. If there is no intelligible speech, say that clearly instead of inventing a summary.`;

type SummaryOptions = {
  models?: readonly string[];
  attemptsPerModel?: number;
  wait?: (milliseconds: number) => Promise<void>;
};

function isTransientGeminiError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    code?: number | string;
    status?: number | string;
    message?: string;
    response?: { status?: number };
  };
  const status = Number(candidate.code ?? candidate.status ?? candidate.response?.status);
  if ([408, 429, 500, 502, 503, 504].includes(status)) return true;
  return /(?:code|status)["':\s]+(?:408|429|500|502|503|504)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|timed?\s*out/i.test(candidate.message ?? "");
}

async function generateWithFallback(
  ai: GoogleGenAI,
  contents: Array<{ text: string } | { inlineData: { mimeType: string; data: string } } | { fileData: { mimeType: string; fileUri: string } }>,
  options: SummaryOptions,
): Promise<{ text?: string }> {
  const models = options.models?.length ? options.models : SUMMARY_MODELS;
  const attemptsPerModel = Math.max(1, options.attemptsPerModel ?? 2);
  const wait = options.wait ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  let lastError: unknown;

  for (const model of models) {
    for (let attempt = 0; attempt < attemptsPerModel; attempt += 1) {
      try {
        return await ai.models.generateContent({
          model,
          contents,
          config: { responseMimeType: "application/json", temperature: 0.2 },
        });
      } catch (error) {
        if (!isTransientGeminiError(error)) throw error;
        lastError = error;
        if (attempt + 1 < attemptsPerModel) {
          const jitter = Math.floor(Math.random() * 250);
          await wait(750 * (2 ** attempt) + jitter);
        }
      }
    }
  }

  throw lastError ?? new Error("No Gemini summary model was available.");
}

export function isLikelyMp3(audio: Buffer): boolean {
  return audio.length >= 4 && (
    (audio[0] === 0x49 && audio[1] === 0x44 && audio[2] === 0x33)
    || (audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0)
  );
}

export async function summarizeAudioNote(ai: GoogleGenAI, audio: Buffer, options: SummaryOptions = {}): Promise<string> {
  let uploadedFileName: string | undefined;
  try {
    let audioPart: { inlineData: { mimeType: string; data: string } } | { fileData: { mimeType: string; fileUri: string } };
    if (audio.length <= INLINE_AUDIO_LIMIT_BYTES) {
      audioPart = { inlineData: { mimeType: "audio/mpeg", data: audio.toString("base64") } };
    } else {
      const file = await ai.files.upload({
        file: new Blob([Uint8Array.from(audio)], { type: "audio/mpeg" }),
        config: { mimeType: "audio/mpeg", displayName: "Tools4All audio note" },
      });
      uploadedFileName = file.name;
      if (!file.uri) throw new Error("Audio upload did not return a usable file URI.");
      audioPart = { fileData: { mimeType: file.mimeType || "audio/mpeg", fileUri: file.uri } };
    }

    const response = await generateWithFallback(ai, [{ text: SUMMARY_PROMPT }, audioPart], options);
    const parsed: unknown = JSON.parse(response.text || "null");
    if (!parsed || typeof parsed !== "object" || !("summary" in parsed) || typeof parsed.summary !== "string" || !parsed.summary.trim()) {
      throw new Error("The summary service returned no usable summary.");
    }
    return parsed.summary.trim().slice(0, 10_000);
  } finally {
    if (uploadedFileName) {
      try { await ai.files.delete({ name: uploadedFileName }); }
      catch { console.warn("A temporary Gemini audio file could not be deleted immediately."); }
    }
  }
}
