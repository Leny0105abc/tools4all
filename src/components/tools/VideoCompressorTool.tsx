import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileVideo2,
  Gauge,
  Loader2,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  Upload,
  Video,
  X,
} from "lucide-react";
import { downloadBlob, formatFileSize } from "../../utils/audioConverter";
import { compressVideo, createDemoVideoFile, type VideoCompressionResult } from "../../utils/videoCompressor";

type CompressionPreset = "compact" | "balanced" | "quality" | "custom";

const PRESETS = {
  compact: { label: "Small file", hint: "Sharing & messaging", maxWidth: 854, maxHeight: 480, bitrate: 650_000 },
  balanced: { label: "Balanced", hint: "Best everyday choice", maxWidth: 1280, maxHeight: 720, bitrate: 1_200_000 },
  quality: { label: "High quality", hint: "Large screens", maxWidth: 1920, maxHeight: 1080, bitrate: 2_500_000 },
} as const;

const VIDEO_FILE_PATTERN = /\.(mp4|mov|m4v|webm|mkv|avi)$/i;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

export default function VideoCompressorTool() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [result, setResult] = useState<VideoCompressionResult | null>(null);
  const [metadata, setMetadata] = useState({ width: 0, height: 0, duration: 0 });
  const [preset, setPreset] = useState<CompressionPreset>("balanced");
  const [customResolution, setCustomResolution] = useState(720);
  const [customBitrate, setCustomBitrate] = useState(1200);
  const [framesPerSecond, setFramesPerSecond] = useState(30);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  useEffect(() => {
    if (!result) {
      setResultUrl("");
      return;
    }
    const url = URL.createObjectURL(result.blob);
    setResultUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const chooseFile = (file: File) => {
    if (!file.type.startsWith("video/") && !VIDEO_FILE_PATTERN.test(file.name)) {
      setError("Please choose an MP4, MOV, WebM, MKV, M4V, or AVI video.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError("Please choose a video smaller than 500 MB for reliable browser processing.");
      return;
    }
    abortRef.current?.abort();
    setSelectedFile(file);
    setResult(null);
    setMetadata({ width: 0, height: 0, duration: 0 });
    setProgress(0);
    setError("");
  };

  const clearFile = () => {
    abortRef.current?.abort();
    setSelectedFile(null);
    setResult(null);
    setProgress(0);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const loadDemoVideo = async () => {
    setCreatingDemo(true);
    setError("");
    try {
      chooseFile(await createDemoVideoFile());
      setPreset("compact");
      setIncludeAudio(false);
      setMetadata({ width: 640, height: 360, duration: 3 });
    } catch (demoError) {
      setError(demoError instanceof Error ? demoError.message : "The demo video could not be created.");
    } finally {
      setCreatingDemo(false);
    }
  };

  const startCompression = async () => {
    if (!selectedFile) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setCompressing(true);
    setProgress(0);
    setResult(null);
    setError("");

    const configured = preset === "custom"
      ? { maxWidth: customResolution === 1080 ? 1920 : customResolution === 720 ? 1280 : 854, maxHeight: customResolution, bitrate: customBitrate * 1000 }
      : PRESETS[preset];

    try {
      const compressed = await compressVideo(selectedFile, {
        maxWidth: configured.maxWidth,
        maxHeight: configured.maxHeight,
        videoBitsPerSecond: configured.bitrate,
        framesPerSecond,
        includeAudio,
        signal: controller.signal,
        onProgress: setProgress,
      });
      setResult(compressed);
    } catch (compressionError) {
      if ((compressionError as DOMException).name !== "AbortError") {
        setError(compressionError instanceof Error ? compressionError.message : "Video compression failed. Please try another file.");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setCompressing(false);
    }
  };

  const cancelCompression = () => abortRef.current?.abort();

  const downloadResult = () => {
    if (!selectedFile || !result) return;
    const baseName = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    downloadBlob(result.blob, `${baseName}_compressed.webm`);
  };

  const estimatedSize = Number.isFinite(metadata.duration) && metadata.duration > 0
    ? Math.round(((preset === "custom" ? customBitrate * 1000 : PRESETS[preset].bitrate) + (includeAudio ? 96_000 : 0)) * metadata.duration / 8)
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
      <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400">
            <Video className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">Video Compression Studio</h1>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Reduce video size with resolution and bitrate controls. Processing stays privately in this browser.
        </p>
      </div>

      <div
        id="video-compress-dropzone"
        onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          const file = event.dataTransfer.files?.[0];
          if (file) chooseFile(file);
        }}
        onClick={() => !compressing && inputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all ${
          isDragOver
            ? "border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/30"
            : "border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-cyan-400"
        } ${compressing ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*,.mp4,.mov,.m4v,.webm,.mkv,.avi"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) chooseFile(file);
          }}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 flex items-center justify-center">
            {selectedFile ? <FileVideo2 className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
          </div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-white break-all px-4">
            {selectedFile?.name ?? "Tap to choose a video or drag and drop"}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            MP4, MOV, WebM, MKV, M4V, AVI • Up to 500 MB
          </p>
          {selectedFile ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200 text-xs font-semibold">
              {formatFileSize(selectedFile.size)}
            </span>
          ) : (
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); void loadDemoVideo(); }}
              disabled={creatingDemo}
              className="mt-1 inline-flex min-h-[36px] items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200 text-xs font-semibold disabled:opacity-50"
            >
              {creatingDemo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {creatingDemo ? "Creating demo…" : "Try a 3-second demo"}
            </button>
          )}
        </div>
        {selectedFile && !compressing ? (
          <button
            type="button"
            aria-label="Remove selected video"
            onClick={(event) => { event.stopPropagation(); clearFile(); }}
            className="absolute top-3 right-3 p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {error ? (
        <div role="alert" className="p-3.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white">
            <SlidersHorizontal className="w-4 h-4 text-cyan-600" /> Compression settings
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" /> Local processing
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.entries(PRESETS) as [Exclude<CompressionPreset, "custom">, typeof PRESETS[keyof typeof PRESETS]][]).map(([id, item]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPreset(id)}
                disabled={compressing}
                className={`text-left p-3.5 rounded-xl border transition-colors ${
                  preset === id
                    ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30 ring-1 ring-cyan-500"
                    : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                }`}
              >
                <span className="block text-xs font-bold text-neutral-900 dark:text-white">{item.label}</span>
                <span className="block text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">{item.hint}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Resolution</label>
              <select
                value={preset === "custom" ? customResolution : PRESETS[preset].maxHeight}
                onChange={(event) => { setPreset("custom"); setCustomResolution(Number(event.target.value)); }}
                disabled={compressing}
                className="w-full min-h-[44px] px-3 text-base sm:text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              >
                <option value={1080}>Full HD 1080p</option>
                <option value={720}>HD 720p</option>
                <option value={480}>SD 480p</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Frame rate</label>
              <select
                value={framesPerSecond}
                onChange={(event) => setFramesPerSecond(Number(event.target.value))}
                disabled={compressing}
                className="w-full min-h-[44px] px-3 text-base sm:text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              >
                <option value={24}>24 fps • Smaller</option>
                <option value={30}>30 fps • Standard</option>
                <option value={60}>60 fps • Smooth</option>
              </select>
            </div>
            <label className="flex min-h-[44px] items-center justify-between gap-3 px-3 py-2 mt-0 sm:mt-[22px] rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Keep original audio
              <input type="checkbox" checked={includeAudio} onChange={(event) => setIncludeAudio(event.target.checked)} disabled={compressing} className="w-4 h-4 accent-cyan-600" />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <label htmlFor="video-bitrate" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Video bitrate</label>
              <span className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-400">
                {preset === "custom" ? customBitrate : Math.round(PRESETS[preset].bitrate / 1000)} kbps
              </span>
            </div>
            <input
              id="video-bitrate"
              type="range"
              min={350}
              max={4000}
              step={50}
              value={preset === "custom" ? customBitrate : Math.round(PRESETS[preset].bitrate / 1000)}
              onChange={(event) => { setPreset("custom"); setCustomBitrate(Number(event.target.value)); }}
              disabled={compressing}
              className="w-full accent-cyan-600"
            />
          </div>

          {selectedFile && previewUrl ? (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px] gap-4 items-start">
              <video
                src={previewUrl}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={(event) => {
                  const element = event.currentTarget;
                  setMetadata((previous) => ({
                    width: element.videoWidth,
                    height: element.videoHeight,
                    duration: Number.isFinite(element.duration) ? element.duration : previous.duration,
                  }));
                }}
                className="w-full max-h-80 rounded-xl bg-black aspect-video"
              />
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  <span className="block text-neutral-500 dark:text-neutral-400">Original</span>
                  <strong className="block mt-1 text-neutral-900 dark:text-white">{formatFileSize(selectedFile.size)}</strong>
                  {metadata.width ? <span className="text-[11px] text-neutral-500">{metadata.width} × {metadata.height}</span> : null}
                </div>
                <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900/60">
                  <span className="block text-cyan-700 dark:text-cyan-300">Estimated output</span>
                  <strong className="block mt-1 text-cyan-900 dark:text-cyan-100">{estimatedSize ? formatFileSize(estimatedSize) : "Calculating…"}</strong>
                  <span className="text-[11px] text-cyan-700 dark:text-cyan-400">WebM format</span>
                </div>
              </div>
            </div>
          ) : null}

          {compressing ? (
            <div className="space-y-2" aria-live="polite">
              <div className="flex justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <span>Compressing in real time…</span><span>{progress}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                <div className="h-full bg-cyan-600 transition-[width] duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Keep this tab open. Compression takes about the length of the video.</p>
            </div>
          ) : null}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {compressing ? (
              <button type="button" onClick={cancelCompression} className="min-h-[44px] px-5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800">
                Cancel
              </button>
            ) : null}
            <button
              id="compress-video-btn"
              type="button"
              onClick={startCompression}
              disabled={!selectedFile || compressing}
              className="min-h-[46px] px-6 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm sm:text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-45 shadow-sm shadow-cyan-600/20"
            >
              {compressing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gauge className="w-4 h-4" />}
              {compressing ? `Compressing ${progress}%` : "Compress Video"}
            </button>
          </div>
        </div>
      </div>

      {result && resultUrl ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-900/60 shadow-xs space-y-4">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Video compressed successfully</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {result.savedPercent >= 0 ? `${result.savedPercent}% smaller` : `${Math.abs(result.savedPercent)}% larger at these settings`} • {result.width} × {result.height} • {formatFileSize(result.compressedSize)}
              </p>
            </div>
          </div>
          <video src={resultUrl} controls playsInline className="w-full max-h-[420px] rounded-xl bg-black aspect-video" />
          <button
            type="button"
            onClick={downloadResult}
            className="w-full sm:w-auto min-h-[46px] px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-xs font-bold flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download Compressed Video
          </button>
        </div>
      ) : null}
    </div>
  );
}
