import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

test("the production worker encodes real MP3 frames", async () => {
  const assets = resolve("dist/assets");
  const workerFile = (await readdir(assets)).find((name) => /^audioNotesMp3\.worker-.*\.js$/.test(name));
  assert.ok(workerFile, "build the app before running this test");

  const messages = [];
  globalThis.self = {
    postMessage(message) { messages.push(message); },
  };
  try {
    await import(pathToFileURL(resolve(assets, workerFile)).href);
    const sampleRate = 44100;
    const left = Float32Array.from({ length: sampleRate }, (_, index) => Math.sin(2 * Math.PI * 440 * index / sampleRate) * 0.35);
    globalThis.self.onmessage({ data: { sampleRate, left } });
    const result = messages.find((message) => message.type === "done");
    assert.ok(result, messages.find((message) => message.type === "error")?.message ?? "encoder did not finish");
    assert.equal(result.blob.type, "audio/mpeg");
    assert.ok(result.blob.size > 1000);
    const bytes = new Uint8Array(await result.blob.slice(0, 4).arrayBuffer());
    assert.equal(bytes[0], 0xff, "MP3 should begin with a frame sync, not a WAV/RIFF header");
    assert.equal(bytes[1] & 0xe0, 0xe0);
    const fullFile = new Uint8Array(await result.blob.arrayBuffer());
    const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
    const sampleRates = [44100, 48000, 32000];
    let offset = 0;
    let frames = 0;
    while (offset + 4 < fullFile.length) {
      const header = (fullFile[offset] << 24) | (fullFile[offset + 1] << 16) | (fullFile[offset + 2] << 8) | fullFile[offset + 3];
      if (fullFile[offset] !== 0xff || (fullFile[offset + 1] & 0xe0) !== 0xe0) break;
      assert.equal((header >>> 19) & 3, 3, "MPEG-1 audio frame");
      assert.equal((header >>> 17) & 3, 1, "Layer III frame");
      const bitrate = bitrates[(header >>> 12) & 15];
      const sampleRate = sampleRates[(header >>> 10) & 3];
      assert.ok(bitrate && sampleRate);
      offset += Math.floor(144000 * bitrate / sampleRate) + ((header >>> 9) & 1);
      frames++;
    }
    assert.ok(frames >= 30, `expected a playable sequence of MP3 frames, got ${frames}`);
  } finally {
    delete globalThis.self;
  }
});
