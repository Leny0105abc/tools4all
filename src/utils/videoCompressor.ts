export interface VideoCompressionOptions {
  maxWidth: number;
  maxHeight: number;
  videoBitsPerSecond: number;
  framesPerSecond: number;
  includeAudio: boolean;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

export interface VideoCompressionResult {
  blob: Blob;
  width: number;
  height: number;
  duration: number;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
  savedPercent: number;
}

type MediaRecorderLike = Pick<typeof MediaRecorder, "isTypeSupported">;

const RECORDER_MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

export function calculateVideoDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
) {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("The video dimensions could not be read.");
  }

  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
  const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);
  return {
    width: even(sourceWidth * scale),
    height: even(sourceHeight * scale),
  };
}

export function chooseVideoMimeType(recorder: MediaRecorderLike = MediaRecorder): string {
  return RECORDER_MIME_TYPES.find((type) => recorder.isTypeSupported(type)) ?? "";
}

export async function createDemoVideoFile(durationMs = 3000): Promise<File> {
  const mimeType = chooseVideoMimeType();
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context || typeof canvas.captureStream !== "function" || !mimeType) {
    throw new Error("This browser cannot create the demo video.");
  }

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_000_000 });
  const chunks: BlobPart[] = [];
  let animationFrame = 0;

  return new Promise<File>((resolve, reject) => {
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) chunks.push(event.data);
    });
    recorder.addEventListener("error", () => reject(new Error("The demo video could not be created.")), { once: true });
    recorder.addEventListener("stop", () => {
      cancelAnimationFrame(animationFrame);
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: mimeType.split(";")[0] });
      resolve(new File([blob], "Tools4All_Demo_Video.webm", { type: blob.type }));
    }, { once: true });

    const startedAt = performance.now();
    const draw = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, `hsl(${190 + progress * 70} 85% 48%)`);
      gradient.addColorStop(1, `hsl(${250 + progress * 60} 80% 42%)`);
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "rgba(255,255,255,.18)";
      context.beginPath();
      context.arc(80 + progress * 480, 180, 64, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "white";
      context.font = "700 34px system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText("Tools4All Video Compressor", 320, 168);
      context.font = "500 18px system-ui, sans-serif";
      context.fillText("Private browser processing demo", 320, 205);

      if (progress >= 1) {
        recorder.stop();
      } else {
        animationFrame = requestAnimationFrame(draw);
      }
    };

    recorder.start(250);
    animationFrame = requestAnimationFrame(draw);
  });
}

function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    video.addEventListener("loadedmetadata", () => resolve(), { once: true });
    video.addEventListener("error", () => reject(new Error("This browser could not read the selected video.")), {
      once: true,
    });
  });
}

export async function compressVideo(
  file: File,
  options: VideoCompressionOptions,
): Promise<VideoCompressionResult> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Video compression is not supported by this browser. Try the latest Chrome or Edge.");
  }

  const mimeType = chooseVideoMimeType();
  if (!mimeType) {
    throw new Error("This browser cannot create a compressed WebM video.");
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  const canvas = document.createElement("canvas");
  let outputStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let activeRecorder: MediaRecorder | null = null;
  let frameHandle = 0;
  let aborted = false;

  try {
    video.preload = "auto";
    video.playsInline = true;
    video.muted = true;
    video.src = objectUrl;
    await waitForVideoMetadata(video);

    const { width, height } = calculateVideoDimensions(
      video.videoWidth,
      video.videoHeight,
      options.maxWidth,
      options.maxHeight,
    );
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context || typeof canvas.captureStream !== "function") {
      throw new Error("Canvas video processing is not supported by this browser.");
    }

    outputStream = canvas.captureStream(options.framesPerSecond);

    if (options.includeAudio) {
      try {
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audioContext = new AudioContextClass();
          const source = audioContext.createMediaElementSource(video);
          const destination = audioContext.createMediaStreamDestination();
          const silentOutput = audioContext.createGain();
          silentOutput.gain.value = 0;
          source.connect(destination);
          source.connect(silentOutput);
          silentOutput.connect(audioContext.destination);
          destination.stream.getAudioTracks().forEach((track) => outputStream?.addTrack(track));
          await audioContext.resume();
        }
      } catch (error) {
        console.warn("Audio could not be added to the compressed video:", error);
      }
    }

    const recorder = new MediaRecorder(outputStream, {
      mimeType,
      videoBitsPerSecond: options.videoBitsPerSecond,
      audioBitsPerSecond: options.includeAudio ? 96_000 : undefined,
    });
    activeRecorder = recorder;
    const chunks: BlobPart[] = [];

    const recording = new Promise<Blob>((resolve, reject) => {
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      });
      recorder.addEventListener("error", () => reject(new Error("The browser stopped video compression unexpectedly.")), {
        once: true,
      });
      recorder.addEventListener("stop", () => {
        if (aborted) {
          reject(new DOMException("Video compression was cancelled.", "AbortError"));
          return;
        }
        resolve(new Blob(chunks, { type: mimeType.split(";")[0] }));
      }, { once: true });
    });

    const stopRecorder = () => {
      if (recorder.state !== "inactive") recorder.stop();
    };
    const abortHandler = () => {
      aborted = true;
      video.pause();
      stopRecorder();
    };
    options.signal?.addEventListener("abort", abortHandler, { once: true });

    let lastDrawnAt = 0;
    const drawFrame = (now = performance.now()) => {
      if (aborted || video.ended) return;
      if (now - lastDrawnAt >= 1000 / options.framesPerSecond) {
        context.drawImage(video, 0, 0, width, height);
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        options.onProgress?.(duration > 0 ? Math.min(99, Math.round((video.currentTime / duration) * 100)) : 0);
        lastDrawnAt = now;
      }
      frameHandle = requestAnimationFrame(drawFrame);
    };

    video.addEventListener("ended", () => {
      context.drawImage(video, 0, 0, width, height);
      options.onProgress?.(100);
      stopRecorder();
    }, { once: true });

    recorder.start(1000);
    await video.play();
    drawFrame();
    const blob = await recording;
    options.signal?.removeEventListener("abort", abortHandler);

    if (blob.size === 0) {
      throw new Error("The compressed video was empty. Please try a different video file.");
    }

    return {
      blob,
      width,
      height,
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      mimeType: blob.type,
      originalSize: file.size,
      compressedSize: blob.size,
      savedPercent: Math.round(((file.size - blob.size) / file.size) * 100),
    };
  } finally {
    cancelAnimationFrame(frameHandle);
    video.pause();
    if (activeRecorder?.state !== "inactive") activeRecorder?.stop();
    video.removeAttribute("src");
    video.load();
    outputStream?.getTracks().forEach((track) => track.stop());
    if (audioContext && audioContext.state !== "closed") await audioContext.close();
    URL.revokeObjectURL(objectUrl);
  }
}
