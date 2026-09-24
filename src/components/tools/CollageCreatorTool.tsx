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

const designOptions: { id: CollageConfig["layout"]; label: string; description: string }[] = [
  { id: "grid-2x2", label: "Balanced Grid", description: "Two equal columns" },
  { id: "grid-3x3", label: "Gallery Grid", description: "Three equal columns" },
  { id: "featured-left", label: "Spotlight", description: "One large feature photo" },
  { id: "side-by-side", label: "Photo Strips", description: "Full-height columns" },
  { id: "polaroid-row", label: "Polaroid", description: "Printed-photo frames" },
];

function DesignThumbnail({ design }: { design: CollageConfig["layout"] }) {
  const tile = "rounded-[3px] bg-gradient-to-br from-rose-300 to-orange-200 dark:from-rose-700 dark:to-orange-500";

  if (design === "polaroid-row") {
    return (
      <div className="flex items-center justify-center gap-1.5 h-full px-2" aria-hidden="true">
        {[-7, 4, -4].map((angle) => (
          <div key={angle} className="w-1/4 h-3/4 bg-white p-1 pb-2 shadow-sm" style={{ transform: `rotate(${angle}deg)` }}>
            <div className={`${tile} w-full h-full`} />
          </div>
        ))}
      </div>
    );
  }

  const classes = {
    "grid-2x2": "grid-cols-2 grid-rows-2",
    "grid-3x3": "grid-cols-3 grid-rows-3",
    "featured-left": "grid-cols-3 grid-rows-2",
    "side-by-side": "grid-cols-3 grid-rows-1",
  }[design];
  const count = design === "grid-3x3" ? 9 : design === "featured-left" || design === "side-by-side" ? 3 : 4;

  return (
    <div className={`grid ${classes} gap-1 h-full p-2`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`${tile} ${design === "featured-left" && index === 0 ? "col-span-2 row-span-2" : ""}`} />
      ))}
    </div>
  );
}

export default function CollageCreatorTool() {
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [layout, setLayout] = useState<CollageConfig["layout"]>("grid-2x2");
  const [aspectRatio, setAspectRatio] = useState<CollageConfig["aspectRatio"]>("1:1");
  const [gap, setGap] = useState(24);
  const [padding, setPadding] = useState(32);
  const [cornerRadius, setCornerRadius] = useState(16);
  const [borderWidth, setBorderWidth] = useState(0);
  const [borderColor, setBorderColor] = useState("#FFFFFF");
  const [bgColor, setBgColor] = useState("#0F172A");
  const [caption, setCaption] = useState("Photo Story Collection");
  const [dragActive, setDragActive] = useState(false);

  const [collagePreviewUrl, setCollagePreviewUrl] = useState<string | null>(null);
  const collagePreviewUrlRef = useRef<string | null>(null);
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
  };

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
  };

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  // Render collage preview whenever images or config changes
  useEffect(() => {
    if (images.length < 2) {
      if (collagePreviewUrlRef.current) URL.revokeObjectURL(collagePreviewUrlRef.current);
      collagePreviewUrlRef.current = null;
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
          borderWidth,
          borderColor,
          bgColor,
          caption: caption.trim() || undefined,
        });
        if (isMounted) {
          const url = URL.createObjectURL(blob);
          if (collagePreviewUrlRef.current) URL.revokeObjectURL(collagePreviewUrlRef.current);
          collagePreviewUrlRef.current = url;
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
  }, [images, layout, aspectRatio, gap, padding, cornerRadius, borderWidth, borderColor, bgColor, caption]);

  useEffect(() => () => {
    if (collagePreviewUrlRef.current) URL.revokeObjectURL(collagePreviewUrlRef.current);
  }, []);

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
        borderWidth,
        borderColor,
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

  const borderColorPresets = [
    { label: "White", val: "#FFFFFF" },
    { label: "Black", val: "#111827" },
    { label: "Gold", val: "#F59E0B" },
    { label: "Rose", val: "#F43F5E" },
    { label: "Blue", val: "#2563EB" },
    { label: "Green", val: "#10B981" },
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
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
          Upload photos, choose a design, and save your collage as a JPG.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* Left Controls & Image Queue (5 cols) */}
        <div className="contents lg:block lg:col-span-5 lg:space-y-4">
          {/* Upload Zone */}
          <div className="order-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                if (event.dataTransfer.files.length) handleFiles(event.dataTransfer.files);
              }}
              className={`w-full min-h-32 p-5 rounded-2xl border-2 border-dashed bg-white dark:bg-neutral-900 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 ${
                dragActive ? "border-rose-500 bg-rose-50 dark:bg-rose-950/40" : "border-neutral-300 dark:border-neutral-700 hover:border-rose-400"
              }`}
            >
              <span className="flex flex-col items-center justify-center gap-1.5">
                <Upload className="w-6 h-6 text-rose-500" />
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">Add photos (2–9)</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Tap to choose, or drag images here</span>
              </span>
            </button>
          </div>

          {/* Quick Demo Button */}
          {images.length === 0 && (
            <button
              type="button"
              onClick={loadDemoImages}
              className="order-2 w-full min-h-11 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load 4 Sample Photos for Collage</span>
            </button>
          )}

          {/* Thumbnails list */}
          {images.length > 0 && (
            <div className="order-3 p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                <span>Selected Photos ({images.length}/9)</span>
                <button
                  onClick={() => {
                    setImages([]);
                  }}
                  className="min-h-9 px-2 text-neutral-500 hover:text-red-500 text-sm"
                >
                  Remove All
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group bg-neutral-100">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      aria-label={`Remove photo ${idx + 1}`}
                      className="absolute top-1 right-1 min-w-7 min-h-7 p-1 rounded-full bg-black/75 text-white flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="order-4 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            {/* Visual design picker */}
            <fieldset>
              <legend className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Choose a design
              </legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                {designOptions.map((design) => (
                  <button
                    key={design.id}
                    type="button"
                    aria-pressed={layout === design.id}
                    onClick={() => setLayout(design.id)}
                    className={`min-h-32 p-2 rounded-xl border-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 ${
                      layout === design.id
                        ? "border-rose-500 bg-rose-50 dark:bg-rose-950/40"
                        : "border-neutral-200 dark:border-neutral-700 hover:border-rose-300 bg-neutral-50 dark:bg-neutral-800"
                    }`}
                  >
                    <div className="h-16 rounded-lg bg-neutral-100 dark:bg-neutral-900 overflow-hidden mb-2">
                      <DesignThumbnail design={design.id} />
                    </div>
                    <span className="block text-sm font-semibold text-neutral-900 dark:text-white">{design.label}</span>
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{design.description}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="order-6 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-neutral-400" />
              Fine-tune your collage
            </h2>

            {/* Aspect Ratio */}
            <div>
              <span className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                Aspect Ratio
              </span>
              <div className="flex gap-1.5">
                {(["1:1", "4:5", "16:9", "9:16"] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    aria-pressed={aspectRatio === ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex-1 min-h-11 rounded-lg text-sm font-mono font-medium transition-colors ${
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
                <div className="flex justify-between text-sm text-neutral-500 mb-2">
                  <label htmlFor="collage-spacing">Spacing</label>
                  <span className="font-mono">{gap}px</span>
                </div>
                <input
                  id="collage-spacing"
                  type="range"
                  min={0}
                  max={60}
                  value={gap}
                  onChange={(e) => setGap(Number(e.target.value))}
                  className="w-full h-8 accent-rose-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm text-neutral-500 mb-2">
                  <label htmlFor="collage-corners">Corner Radius</label>
                  <span className="font-mono">{cornerRadius}px</span>
                </div>
                <input
                  id="collage-corners"
                  type="range"
                  min={0}
                  max={40}
                  value={cornerRadius}
                  onChange={(e) => setCornerRadius(Number(e.target.value))}
                  className="w-full h-8 accent-rose-600"
                />
              </div>
            </div>

            {/* Photo Border */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                Photo Border
              </legend>
              <div>
                <div className="flex justify-between text-sm text-neutral-500 mb-2">
                  <label htmlFor="collage-border-width">Thickness</label>
                  <span className="font-mono">{borderWidth}px</span>
                </div>
                <input
                  id="collage-border-width"
                  type="range"
                  min={0}
                  max={32}
                  step={2}
                  value={borderWidth}
                  onChange={(e) => setBorderWidth(Number(e.target.value))}
                  className="w-full h-8 accent-rose-600"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2" aria-label="Border color options">
                {borderColorPresets.map((color) => (
                  <button
                    key={color.val}
                    type="button"
                    aria-label={`${color.label} border`}
                    aria-pressed={borderColor.toUpperCase() === color.val}
                    onClick={() => {
                      setBorderColor(color.val);
                      if (borderWidth === 0) setBorderWidth(8);
                    }}
                    style={{ backgroundColor: color.val }}
                    className={`w-11 h-11 rounded-full border-2 transition-transform ${
                      borderColor.toUpperCase() === color.val && borderWidth > 0
                        ? "ring-2 ring-offset-2 ring-rose-500 border-rose-500 dark:ring-offset-neutral-900"
                        : "border-neutral-300 dark:border-neutral-700"
                    }`}
                    title={color.label}
                  />
                ))}
                <label className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-neutral-300 dark:border-neutral-700 cursor-pointer" title="Custom border color">
                  <span className="sr-only">Custom border color</span>
                  <input
                    type="color"
                    aria-label="Custom border color"
                    value={borderColor}
                    onChange={(e) => {
                      setBorderColor(e.target.value.toUpperCase());
                      if (borderWidth === 0) setBorderWidth(8);
                    }}
                    className="absolute -inset-2 w-16 h-16 cursor-pointer"
                  />
                  <Palette className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow pointer-events-none" aria-hidden="true" />
                </label>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Choose a color to turn the border on automatically. Set thickness to 0 for no border.
              </p>
            </fieldset>

            {/* Background Color */}
            <div>
              <span className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                Background Canvas Color
              </span>
              <div className="flex items-center gap-2">
                {colorPresets.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={c.label}
                    aria-pressed={bgColor === c.val}
                    onClick={() => setBgColor(c.val)}
                    style={{ backgroundColor: c.val }}
                    className={`w-11 h-11 rounded-full border-2 transition-transform ${
                      bgColor === c.val ? "ring-2 ring-offset-2 ring-rose-500 border-rose-500 dark:ring-offset-neutral-900" : "border-neutral-300 dark:border-neutral-700"
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Caption */}
            <div>
              <label htmlFor="collage-caption" className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                Caption / Watermark
              </label>
              <input
                id="collage-caption"
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Optional caption..."
                className="w-full min-h-11 px-3 py-2 text-base rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={images.length < 2 || exporting}
              className="lg:hidden w-full min-h-12 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Creating collage…" : "Save collage as JPG"}
            </button>
          </div>
        </div>

        {/* Right Preview Canvas (7 cols) */}
        <div className="order-5 lg:col-span-7 space-y-4 min-w-0">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col items-center">
            <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800 mb-4">
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                Live preview
              </span>
              <button
                id="btn-export-collage"
                onClick={handleExport}
                disabled={images.length < 2 || exporting}
                className="w-full sm:w-auto min-h-11 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-rose-600/20 disabled:opacity-50 transition-all active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>{exporting ? "Creating collage…" : "Save collage as JPG"}</span>
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
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
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
