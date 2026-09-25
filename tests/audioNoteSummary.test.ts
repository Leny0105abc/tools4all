import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { GoogleGenAI } from "@google/genai";
import { INLINE_AUDIO_LIMIT_BYTES, SUMMARY_MODELS, isLikelyMp3, summarizeAudioNote } from "../src/server/audioNoteSummary.ts";

test("validates MP3 headers and summarizes small audio inline", async () => {
  const audio = Buffer.from([0xff, 0xfb, 0x90, 0x00, 1, 2, 3]);
  assert.equal(isLikelyMp3(audio), true);
  assert.equal(isLikelyMp3(Buffer.from("not mp3")), false);
  let request: unknown;
  const ai = {
    files: { upload: async () => { throw new Error("small audio must not use file upload"); }, delete: async () => {} },
    models: { generateContent: async (input: unknown) => { request = input; return { text: '{"summary":"  Main point and action item.  "}' }; } },
  } as unknown as GoogleGenAI;
  assert.equal(await summarizeAudioNote(ai, audio), "Main point and action item.");
  const sent = request as { contents: Array<{ inlineData?: { mimeType: string; data: string } }> };
  assert.equal(sent.contents[1].inlineData?.mimeType, "audio/mpeg");
  assert.equal(Buffer.from(sent.contents[1].inlineData!.data, "base64").toString("hex"), audio.toString("hex"));
});

test("large audio uses a temporary file and deletes it after summarizing", async () => {
  const audio = Buffer.alloc(INLINE_AUDIO_LIMIT_BYTES + 1);
  audio.set([0x49, 0x44, 0x33, 0x03]);
  let uploadedBytes = 0;
  let deletedName = "";
  let request: unknown;
  const ai = {
    files: {
      upload: async ({ file }: { file: Blob }) => { uploadedBytes = file.size; return { name: "files/audio-note-test", uri: "gemini://audio-note-test", mimeType: "audio/mpeg" }; },
      delete: async ({ name }: { name: string }) => { deletedName = name; },
    },
    models: { generateContent: async (input: unknown) => { request = input; return { text: '{"summary":"A faithful summary."}' }; } },
  } as unknown as GoogleGenAI;
  assert.equal(await summarizeAudioNote(ai, audio), "A faithful summary.");
  assert.equal(uploadedBytes, audio.length);
  assert.equal(deletedName, "files/audio-note-test");
  const sent = request as { contents: Array<{ fileData?: { fileUri: string } }> };
  assert.equal(sent.contents[1].fileData?.fileUri, "gemini://audio-note-test");
});

test("does not invent a summary when the AI response is empty", async () => {
  const ai = {
    files: { upload: async () => {}, delete: async () => {} },
    models: { generateContent: async () => ({ text: '{"summary":""}' }) },
  } as unknown as GoogleGenAI;
  await assert.rejects(summarizeAudioNote(ai, Buffer.from([0xff, 0xfb, 0x90, 0x00])), /no usable summary/);
});

test("retries temporary Gemini failures and falls back to another audio-capable model", async () => {
  const attemptedModels: string[] = [];
  const waits: number[] = [];
  const ai = {
    files: { upload: async () => {}, delete: async () => {} },
    models: {
      generateContent: async ({ model }: { model: string }) => {
        attemptedModels.push(model);
        if (model === SUMMARY_MODELS[0]) {
          throw Object.assign(new Error('{"error":{"code":503,"status":"UNAVAILABLE"}}'), { code: 503 });
        }
        return { text: '{"summary":"Recovered using the fallback model."}' };
      },
    },
  } as unknown as GoogleGenAI;

  const summary = await summarizeAudioNote(ai, Buffer.from([0xff, 0xfb, 0x90, 0x00]), {
    attemptsPerModel: 2,
    wait: async (milliseconds) => { waits.push(milliseconds); },
  });

  assert.equal(summary, "Recovered using the fallback model.");
  assert.deepEqual(attemptedModels, [SUMMARY_MODELS[0], SUMMARY_MODELS[0], SUMMARY_MODELS[1]]);
  assert.equal(waits.length, 1);
  assert.ok(waits[0] >= 750);
});

test("does not retry permanent Gemini request errors", async () => {
  let attempts = 0;
  const ai = {
    files: { upload: async () => {}, delete: async () => {} },
    models: {
      generateContent: async () => {
        attempts += 1;
        throw Object.assign(new Error("Invalid API key"), { code: 400 });
      },
    },
  } as unknown as GoogleGenAI;

  await assert.rejects(
    summarizeAudioNote(ai, Buffer.from([0xff, 0xfb, 0x90, 0x00]), { wait: async () => {} }),
    /Invalid API key/,
  );
  assert.equal(attempts, 1);
});

test("the summary API rejects invalid audio and reports missing configuration", async () => {
  const previousVercel = process.env.VERCEL;
  const previousKey = process.env.GEMINI_API_KEY;
  const previousAuthUsername = process.env.AUTH_USERNAME;
  const previousAuthPassword = process.env.AUTH_PASSWORD;
  const previousAuthSecret = process.env.AUTH_SESSION_SECRET;
  process.env.VERCEL = "1";
  delete process.env.GEMINI_API_KEY;
  process.env.AUTH_USERNAME = "test-user";
  process.env.AUTH_PASSWORD = "test-password";
  process.env.AUTH_SESSION_SECRET = "test-session-secret-that-is-long-enough-12345";
  const { default: app } = await import("../server.ts");
  const server = app.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const protectedResponse = await fetch(`${baseUrl}/api/gemini/audio-summary`, { method: "POST" });
    assert.equal(protectedResponse.status, 401);
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      redirect: "manual",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: "test-user", password: "test-password" }),
    });
    const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(cookie);
    const url = `${baseUrl}/api/gemini/audio-summary`;
    const invalid = await fetch(url, { method: "POST", headers: { "Content-Type": "audio/mpeg", Cookie: cookie }, body: Buffer.from("not mp3") });
    assert.equal(invalid.status, 400);
    const unavailable = await fetch(url, { method: "POST", headers: { "Content-Type": "audio/mpeg", Cookie: cookie }, body: Buffer.from([0xff, 0xfb, 0x90, 0x00]) });
    assert.equal(unavailable.status, 503);
    assert.match((await unavailable.json() as { error: string }).error, /not configured/);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (previousVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = previousVercel;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey;
    if (previousAuthUsername === undefined) delete process.env.AUTH_USERNAME; else process.env.AUTH_USERNAME = previousAuthUsername;
    if (previousAuthPassword === undefined) delete process.env.AUTH_PASSWORD; else process.env.AUTH_PASSWORD = previousAuthPassword;
    if (previousAuthSecret === undefined) delete process.env.AUTH_SESSION_SECRET; else process.env.AUTH_SESSION_SECRET = previousAuthSecret;
  }
});
