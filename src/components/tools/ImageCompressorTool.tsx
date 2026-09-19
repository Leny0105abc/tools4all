import { useState, useRef } from "react";
import {
  Minimize2,
  Upload,
  Download,
  CheckCircle2,
  Loader2,
  Layers,
  Sparkles,
  Sliders,
  Archive,
  Image as ImageIcon,
} from "lucide-react";
import JSZip from "jszip";
import {
  compressImage,
  CompressionResult,
  CompressionOptions,
} from "../../utils/imageCompressor";
import { downloadBlob, formatFileSize } from "../../utils/audioConverter";

interface QueueItem {
  id: string;
  file: File;
  originalUrl: string;
  status: "pending" | "processing" | "completed";
  result?: CompressionResult;
}

export default function ImageCompressorTool() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [quality, setQuality] = useState(75);
  const [targetFormat, setTargetFormat] = useState<"image/jpeg" | "image/webp" | "image/png">("image/webp");
  const [maxDimension, setMaxDimension] = useState<number>(1920);
  const [compressing, setCompressing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = (files: FileList | File[]) => {
    const newItems: QueueItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({
        id: Math.random().toString(36).substring(2, 9),
        file: f,
        originalUrl: URL.createObjectURL(f),
        status: "pending",
      }));

    if (newItems.length === 0) {
      alert("Please upload image files (JPG, PNG, WebP)");
      return;
    }

    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleCompressAll = async () => {
    if (queue.length === 0) return;
    setCompressing(true);

    const options: CompressionOptions = {
      quality: quality / 100,
      maxWidth: maxDimension,
      maxHeight: maxDimension,
      format: targetFormat,
    };

    const updated = [...queue];
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status !== "completed") {
        updated[i].status = "processing";
        setQueue([...updated]);
        try {
          const res = await compressImage(updated[i].file, options);
          updated[i].result = res;
          updated[i].status = "completed";
        } catch (err) {
          console.error("Compression failed for:", updated[i].file.name, err);
          updated[i].status = "pending";
        }
        setQueue([...updated]);
      }
    }

    setCompressing(false);
  };

  const downloadSingle = (item: QueueItem) => {
    if (!item.result) return;
    const ext = targetFormat === "image/webp" ? "webp" : targetFormat === "image/jpeg" ? "jpg" : "png";
    const name = `${item.file.name.replace(/\.[^/.]+$/, "")}_compressed.${ext}`;
    downloadBlob(item.result.blob, name);
  };

  const downloadAllAsZip = async () => {
    const completed = queue.filter((q) => q.result);
    if (completed.length === 0) return;

    const zip = new JSZip();
    const ext = targetFormat === "image/webp" ? "webp" : targetFormat === "image/jpeg" ? "jpg" : "png";

    for (const item of completed) {
      if (item.result) {
        const name = `${item.file.name.replace(/\.[^/.]+$/, "")}_compressed.${ext}`;
        zip.file(name, item.result.blob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, "compressed_images.zip");
  };

  const loadSampleImages = async () => {
    // Generate two sample image canvases
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext("2d")!;
    // Draw sample gradient
    const grad = ctx.createLinearGradient(0, 0, 1200, 800);
    grad.addColorStop(0, "#4F46E5");
    grad.addColorStop(1, "#06B6D4");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 800);
    ctx.fillStyle = "white";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText("High-Resolution Asset 01", 100, 400);

    canvas.toBlob((b) => {
      if (b) {
        const f = new File([b], "High_Res_Marketing_Banner.png", { type: "image/png" });
        handleFiles([f]);
      }
    }, "image/png");
  };

  const totalOriginalBytes = queue.reduce((acc, q) => acc + q.file.size, 0);
  const totalCompressedBytes = queue.reduce((acc, q) => acc + (q.result?.compressedSize || q.file.size), 0);
  const totalSavedPercent =
    totalOriginalBytes > 0
      ? Math.max(0, Math.round(((totalOriginalBytes - totalCompressedBytes) / totalOriginalBytes) * 100))
      : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400">
            <Minimize2 className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Image Compression Utilities
          </h1>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Compress JPG, PNG, and WebP images with custom visual quality controls and batch reduction analytics.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-neutral-400" />
            <span>Compression & Resolution Settings</span>
          </span>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            Quality: {quality}%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-1.5">
              <span>Quality Slider</span>
              <span className="font-mono">{quality}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Target Output Format
            </label>
            <select
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="image/webp">WebP (Maximum Compression)</option>
              <option value="image/jpeg">JPEG (Standard Web & Photos)</option>
              <option value="image/png">PNG (Lossless Sharpness)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Max Dimensions (Resize)
            </label>
            <select
              value={maxDimension}
              onChange={(e) => setMaxDimension(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={2560}>Original Resolution (Up to 2K)</option>
              <option value={1920}>Full HD (1920px width)</option>
              <option value={1280}>HD 720p (1280px width)</option>
              <option value={800}>Thumbnail / Email (800px)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        id="image-compress-dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files?.length) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
          isDragOver
            ? "border-pink-500 bg-pink-50/40 dark:bg-pink-950/20"
            : "border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              Tap to choose images or drag & drop (Batch supported)
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              JPG, PNG, WebP, GIF • Multiple files supported
            </p>
          </div>
        </div>
      </div>

      {/* Queue & Compression Actions */}
      {queue.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <span className="text-xs font-bold text-neutral-900 dark:text-white">
                Queue: {queue.length} image{queue.length > 1 ? "s" : ""}
              </span>
              {totalSavedPercent > 0 && (
                <span className="block sm:inline sm:ml-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Total Saved: -{totalSavedPercent}% ({formatFileSize(totalOriginalBytes - totalCompressedBytes)})
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setQueue([])}
                className="px-3 py-2 min-h-[38px] rounded-lg text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                Clear Queue
              </button>

              <button
                onClick={downloadAllAsZip}
                disabled={!queue.some((q) => q.result)}
                className="flex-1 sm:flex-none px-3.5 py-2 min-h-[38px] rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-neutral-200 dark:border-neutral-700 disabled:opacity-40 transition-colors"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Download All (.zip)</span>
              </button>

              <button
                id="btn-compress-all"
                onClick={handleCompressAll}
                disabled={compressing}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm sm:text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-pink-600/20 disabled:opacity-50 transition-all active:scale-98"
              >
                {compressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compressing...</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-4 h-4" />
                    <span>Compress All Images</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* List items with Before / After comparison */}
          <div className="space-y-3">
            {queue.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700 shrink-0">
                    <img
                      src={item.result?.previewUrl || item.originalUrl}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-white truncate max-w-xs">
                      {item.file.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                      <span>Original: {formatFileSize(item.file.size)}</span>
                      {item.result && (
                        <>
                          <span>➔</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatFileSize(item.result.compressedSize)} (-{item.result.savingsPercent}%)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {item.status === "completed" && item.result ? (
                    <button
                      onClick={() => downloadSingle(item)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                  ) : item.status === "processing" ? (
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Compressing...
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-400">Ready in queue</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {queue.length === 0 && (
        <div className="flex items-center justify-center pt-2">
          <button
            onClick={loadSampleImages}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Demo High-Res Image for Testing</span>
          </button>
        </div>
      )}
    </div>
  );
}
