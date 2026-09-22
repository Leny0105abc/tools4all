import { Mp3Encoder } from "@breezystack/lamejs";

interface EncodeRequest {
  sampleRate: number;
  left: Float32Array;
  right?: Float32Array;
}

self.onmessage = (event: MessageEvent<EncodeRequest>) => {
  try {
    const { sampleRate, left, right } = event.data;
    const encoder = new Mp3Encoder(1, sampleRate, 96);
    const chunks: ArrayBuffer[] = [];
    const append = (encoded: Uint8Array) => {
      if (!encoded.length) return;
      const copy = new Uint8Array(encoded.length);
      copy.set(encoded);
      chunks.push(copy.buffer);
    };
    const blockSize = 1152;
    const samples = new Int16Array(blockSize);

    for (let offset = 0; offset < left.length; offset += blockSize) {
      const count = Math.min(blockSize, left.length - offset);
      for (let index = 0; index < count; index++) {
        const mixed = right ? (left[offset + index] + right[offset + index]) / 2 : left[offset + index];
        const clamped = Math.max(-1, Math.min(1, mixed));
        samples[index] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      }
      const encoded = encoder.encodeBuffer(samples.subarray(0, count));
      append(encoded);
      if (offset % (blockSize * 100) === 0) {
        self.postMessage({ type: "progress", value: Math.round((offset / left.length) * 100) });
      }
    }

    const finalChunk = encoder.flush();
    append(finalChunk);
    const blob = new Blob(chunks, { type: "audio/mpeg" });
    self.postMessage({ type: "done", blob });
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : "MP3 conversion failed." });
  }
};
