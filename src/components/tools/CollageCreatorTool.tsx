import { useState, useRef, useEffect } from "react";
import {
  Image as ImageIcon,
  LayoutGrid,
  Download,
  Upload,
  Sparkles,
  Sliders,
  Type,
  Palette,
  Layers,
  Trash2,
} from "lucide-react";
import { generateCollageBlob, CollageConfig } from "../../utils/imageCompressor";
import { downloadBlob } from "../../utils/audioConverter";

export default function CollageCreatorTool() {
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [layout, setLayout] = useState<CollageConfig["layout"]>("grid-2x2");
  const [aspectRatio, setAspectRatio] = useState<CollageConfig["aspectRatio"]>("1:1");
  const [gap, setGap] = useState(24);
  const [padding, setPadding] = useState(32);
  const [cornerRadius, setCornerRadius] = useState(16);
  const [bgColor, setBgColor] = useState("#0F172A");
  const [caption, setCaption] = useState("Photo Story Collection");

  const [collagePreviewUrl, setCollagePreviewUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = (files: FileList | File[]) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (valid.length === 0) {
      alert("Please upload image files (JPG, PNG, WebP)");
      return;
    }
    const combined = [...images, ...valid].slice(0, 9);
    setImages(combined);
    setPreviewUrls(combined.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    setPreviewUrls(updated.map((f) => URL.createObjectURL(f)));
  };

  // Render collage preview whenever images or config changes
  useEffect(() => {
    if (images.length < 2) {
      setCollagePreviewUrl(null);
      return;
    }

    let isMounted = true;
    const renderPreview = async () => {
      try {
        const blob = await generateCollageBlob(images, {
          layout,
          aspectRatio,
          gap,
          padding,
          cornerRadius,
          bgColor,
          caption: caption.trim() || undefined,
        });
        if (isMounted) {
          const url = URL.createObjectURL(blob);
          setCollagePreviewUrl(url);
        }
      } catch (err) {
        console.error("Collage render error:", err);
      }
    };

    const timer = setTimeout(renderPreview, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [images, layout, aspectRatio, gap, padding, cornerRadius, bgColor, caption]);

  const handleExport = async () => {
    if (images.length < 2) return;
    setExporting(true);
    try {
      const blob = await generateCollageBlob(images, {
        layout,
        aspectRatio,
        gap,
        padding,
        cornerRadius,
        bgColor,
        caption: caption.trim() || undefined,
      });
      downloadBlob(blob, `collage_${layout}_${Date.now()}.jpg`);
    } catch (err: any) {
      alert("Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const loadDemoImages = async () => {
    const colors = ["#4F46E5", "#06B6D4", "#F43F5E", "#10B981"];
    const demoFiles: File[] = [];

    for (let i = 0; i < colors.length; i++) {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 800;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = colors[i];
      ctx.fillRect(0, 0, 800, 800);
      ctx.fillStyle = "white";
      ctx.font = "bold 64px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Image 0${i + 1}`, 400, 420);

      const b: Blob = await new Promise((res) => canvas.toBlob((blob) => res(blob!), "image/jpeg"));
      demoFiles.push(new File([b], `demo_image_0${i + 1}.jpg`, { type: "image/jpeg" }));
    }

    handleFiles(demoFiles);
  };

  const colorPresets = [
    { label: "Dark Slate", val: "#0F172A" },
    { label: "Pure White", val: "#FFFFFF" },
    { label: "Warm Beige", val: "#F5F0EB" },
    { label: "Midnight Blue", val: "#1E1B4B" },
    { label: "Charcoal Black", val: "#18181B" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Images to Collage Creation Studio
          </h1>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Combine multiple photos into customizable grid layouts, aspect ratios, rounded frames, and export high-res files to local disk.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Controls & Image Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-5 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900 text-center cursor-pointer transition-all"
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
            <div className="flex flex-col items-center justify-center space-y-1.5">
              <Upload className="w-5 h-5 text-rose-500" />
              <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                Upload 2 to 9 photos
              </p>
              <p className="text-[11px] text-neutral-400">
                Click or drag & drop (JPG, PNG, WebP)
              </p>
            </div>
          </div>

          {/* Quick Demo Button */}
          {images.length === 0 && (
            <button
              onClick={loadDemoImages}
              className="w-full py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load 4 Sample Photos for Collage</span>
            </button>
          )}

          {/* Thumbnails list */}
          {images.length > 0 && (
            <div className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <span>Selected Photos ({images.length}/9)</span>
                <button
                  onClick={() => {
                    setImages([]);
                    setPreviewUrls([]);
                  }}
                  className="text-neutral-400 hover:text-red-500 text-[11px]"
                >
                  Remove All
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group bg-neutral-100">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customization Sliders & Layout */}
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
            <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-neutral-400" />
              <span>Collage Styling & Frame</span>
            </span>

            {/* Layout Options */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                Layout Arrangement
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: "grid-2x2", label: "2x2 Quad Grid" },
                  { id: "grid-3x3", label: "3x3 Masonry" },
                  { id: "featured-left", label: "1 Hero + 2 Side" },
                  { id: "side-by-side", label: "Side-by-Side" },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLayout(l.id as any)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                      layout === l.id
                        ? "bg-rose-600 text-white"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                Aspect Ratio
              </label>
              <div className="flex gap-1.5">
                {(["1:1", "4:5", "16:9", "9:16"] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex-1 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                      aspectRatio === ratio
                        ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Gap & Rounded Corners */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-[11px] text-neutral-500 mb-1">
                  <span>Spacing</span>
                  <span className="font-mono">{gap}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={gap}
                  onChange={(e) => setGap(Number(e.target.value))}
                  className="w-full accent-rose-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-neutral-500 mb-1">
                  <span>Corner Radius</span>
                  <span className="font-mono">{cornerRadius}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={cornerRadius}
                  onChange={(e) => setCornerRadius(Number(e.target.value))}
                  className="w-full accent-rose-600"
                />
              </div>
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                Background Canvas Color
              </label>
              <div className="flex items-center gap-2">
                {colorPresets.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setBgColor(c.val)}
                    style={{ backgroundColor: c.val }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      bgColor === c.val ? "scale-110 border-rose-500" : "border-neutral-300 dark:border-neutral-700"
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Caption */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                Caption / Watermark
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Optional caption..."
                className="w-full px-3 py-2 text-base sm:text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Right Preview Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col items-center">
            <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800 mb-4">
              <span className="text-xs font-bold text-neutral-900 dark:text-white">
                Live Rendered Canvas
              </span>
              <button
                id="btn-export-collage"
                onClick={handleExport}
                disabled={images.length < 2 || exporting}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm sm:text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-rose-600/20 disabled:opacity-50 transition-all active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Export Collage (PNG/JPG)</span>
              </button>
            </div>

            {collagePreviewUrl ? (
              <div className="w-full max-w-md mx-auto rounded-xl overflow-hidden shadow-lg border border-neutral-200 dark:border-neutral-800">
                <img
                  src={collagePreviewUrl}
                  alt="Collage Preview"
                  className="w-full h-auto object-contain block"
                />
              </div>
            ) : (
              <div className="w-full aspect-square max-w-md flex flex-col items-center justify-center p-8 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-dashed border-neutral-200 dark:border-neutral-800 text-center text-neutral-400">
                <ImageIcon className="w-12 h-12 mb-2 text-neutral-300 dark:text-neutral-600" />
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Upload at least 2 photos to preview your collage
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Or click "Load 4 Sample Photos" to see it in action instantly.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
