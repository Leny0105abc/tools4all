import test from "node:test";
import assert from "node:assert/strict";
import { calculateVideoDimensions, chooseVideoMimeType } from "../src/utils/videoCompressor.ts";

test("video dimensions preserve aspect ratio and never upscale", () => {
  assert.deepEqual(calculateVideoDimensions(3840, 2160, 1280, 720), { width: 1280, height: 720 });
  assert.deepEqual(calculateVideoDimensions(1080, 1920, 1280, 720), { width: 406, height: 720 });
  assert.deepEqual(calculateVideoDimensions(640, 360, 1280, 720), { width: 640, height: 360 });
});

test("video dimensions reject unreadable metadata", () => {
  assert.throws(() => calculateVideoDimensions(0, 0, 1280, 720), /dimensions/);
});

test("the best available browser video encoder is selected", () => {
  const supported = { isTypeSupported: (type: string) => type.includes("vp8") };
  assert.equal(chooseVideoMimeType(supported), "video/webm;codecs=vp8,opus");
  assert.equal(chooseVideoMimeType({ isTypeSupported: () => false }), "");
});
