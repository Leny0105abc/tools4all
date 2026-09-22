export async function convertRecordingToMp3(rawBlob: Blob, onProgress?: (value: number) => void): Promise<Blob> {
  const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) throw new Error("This browser cannot convert recordings to MP3.");

  const context = new AudioContextConstructor();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(await rawBlob.arrayBuffer());
  } catch {
    throw new Error("This browser could not read the recording. Your original recording is still saved as a draft.");
  } finally {
    await context.close();
  }

  if (decoded.length === 0) throw new Error("The recording is empty. Please record again.");
  const left = decoded.getChannelData(0).slice();
  const right = decoded.numberOfChannels > 1 ? decoded.getChannelData(1).slice() : undefined;

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./audioNotesMp3.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ type: "progress" | "done" | "error"; value?: number; blob?: Blob; message?: string }>) => {
      if (event.data.type === "progress") onProgress?.(event.data.value ?? 0);
      if (event.data.type === "error") {
        worker.terminate();
        reject(new Error(event.data.message ?? "MP3 conversion failed."));
      }
      if (event.data.type === "done") {
        worker.terminate();
        const blob = event.data.blob;
        if (!blob || blob.size < 4) {
          reject(new Error("The MP3 file could not be created."));
          return;
        }
        blob.slice(0, 4).arrayBuffer().then((headerBuffer) => {
          const header = new Uint8Array(headerBuffer);
          const isMp3 = (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33)
            || (header[0] === 0xff && (header[1] & 0xe0) === 0xe0);
          if (!isMp3) reject(new Error("The output was not a valid MP3 file."));
          else resolve(blob);
        }).catch(reject);
      }
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error("MP3 conversion stopped unexpectedly. Your original recording is still saved as a draft."));
    };
    const transfer: Transferable[] = [left.buffer];
    if (right) transfer.push(right.buffer);
    worker.postMessage({ sampleRate: decoded.sampleRate, left, right }, transfer);
  });
}

export function safeAudioNoteFilename(title: string, createdAt: number): string {
  const safeTitle = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "Audio-Note";
  const date = new Date(createdAt).toISOString().slice(0, 10);
  return `${safeTitle}-${date}.mp3`;
}
