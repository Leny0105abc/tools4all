import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { GoogleGenAI } from "@google/genai";
import { INLINE_AUDIO_LIMIT_BYTES, isLikelyMp3, summarizeAudioNote } from "../src/server/audioNoteSummary.ts";

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

test("the summary API rejects invalid audio and reports missing configuration", async () => {
  const previousVercel = process.env.VERCEL;
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.VERCEL = "1";
  delete process.env.GEMINI_API_KEY;
  const { default: app } = await import("../server.ts");
  const server = app.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/gemini/audio-summary`;
    const invalid = await fetch(url, { method: "POST", headers: { "Content-Type": "audio/mpeg" }, body: Buffer.from("not mp3") });
    assert.equal(invalid.status, 400);
    const unavailable = await fetch(url, { method: "POST", headers: { "Content-Type": "audio/mpeg" }, body: Buffer.from([0xff, 0xfb, 0x90, 0x00]) });
    assert.equal(unavailable.status, 503);
    assert.match((await unavailable.json() as { error: string }).error, /not configured/);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (previousVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = previousVercel;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey;
  }
});
