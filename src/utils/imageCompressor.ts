export interface CompressionOptions {
  quality: number; // 0.1 to 1.0
  maxWidth?: number;
  maxHeight?: number;
  format: "image/jpeg" | "image/webp" | "image/png";
}

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  previewUrl: string;
  width: number;
  height: number;
  format: string;
}

export async function compressImage(
  file: File,
  options: CompressionOptions
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const maxW = options.maxWidth || 2560;
        const maxH = options.maxHeight || 2560;

        // Maintain aspect ratio while bounding
        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("Could not initialize canvas context"));
        }

        // Draw white background for transparency in JPEG
        if (options.format === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error("Image compression failed to produce blob"));
            }
            const savingsPercent = Math.max(
              0,
              Math.round(((file.size - blob.size) / file.size) * 100)
            );
            const previewUrl = URL.createObjectURL(blob);
            resolve({
              blob,
              originalSize: file.size,
              compressedSize: blob.size,
              savingsPercent,
              previewUrl,
              width,
              height,
              format: options.format.replace("image/", "").toUpperCase(),
            });
          },
          options.format,
          options.quality
        );
      };
      img.onerror = () => reject(new Error("Failed to load image file"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

export interface CollageConfig {
  layout: "grid-2x2" | "grid-3x3" | "featured-left" | "side-by-side" | "polaroid-row";
  aspectRatio: "1:1" | "4:5" | "16:9" | "9:16";
  gap: number;
  padding: number;
  cornerRadius: number;
  bgColor: string;
  caption?: string;
}

export async function generateCollageBlob(
  imageFiles: File[],
  config: CollageConfig
): Promise<Blob> {
  const images: HTMLImageElement[] = await Promise.all(
    imageFiles.map((f) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${f.name}`));
        img.src = URL.createObjectURL(f);
      });
    })
  );

  const canvas = document.createElement("canvas");
  let canvasW = 1600;
  let canvasH = 1600;

  if (config.aspectRatio === "4:5") {
    canvasW = 1440;
    canvasH = 1800;
  } else if (config.aspectRatio === "16:9") {
    canvasW = 1920;
    canvasH = 1080;
  } else if (config.aspectRatio === "9:16") {
    canvasW = 1080;
    canvasH = 1920;
  }

  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize canvas context for collage");

  // Background
  ctx.fillStyle = config.bgColor;
  ctx.fillRect(0, 0, canvasW, canvasH);

  const pad = config.padding;
  const gap = config.gap;
  const availW = canvasW - pad * 2;
  const availH = canvasH - pad * 2 - (config.caption ? 60 : 0);

  // Layout slots
  interface Slot {
    x: number;
    y: number;
    w: number;
    h: number;
  }
  const slots: Slot[] = [];

  if (config.layout === "side-by-side" || images.length === 2) {
    const slotW = (availW - gap) / 2;
    slots.push({ x: pad, y: pad, w: slotW, h: availH });
    slots.push({ x: pad + slotW + gap, y: pad, w: slotW, h: availH });
  } else if (config.layout === "grid-2x2" || images.length <= 4) {
    const slotW = (availW - gap) / 2;
    const slotH = (availH - gap) / 2;
    slots.push({ x: pad, y: pad, w: slotW, h: slotH });
    slots.push({ x: pad + slotW + gap, y: pad, w: slotW, h: slotH });
    slots.push({ x: pad, y: pad + slotH + gap, w: slotW, h: slotH });
    slots.push({ x: pad + slotW + gap, y: pad + slotH + gap, w: slotW, h: slotH });
  } else if (config.layout === "featured-left") {
    const leftW = (availW - gap) * 0.6;
    const rightW = (availW - gap) * 0.4;
    const rightH = (availH - gap) / 2;
    slots.push({ x: pad, y: pad, w: leftW, h: availH });
    slots.push({ x: pad + leftW + gap, y: pad, w: rightW, h: rightH });
    slots.push({ x: pad + leftW + gap, y: pad + rightH + gap, w: rightW, h: rightH });
  } else {
    // grid-3x3 default
    const cols = 3;
    const rows = Math.ceil(Math.min(images.length, 9) / cols);
    const slotW = (availW - gap * (cols - 1)) / cols;
    const slotH = (availH - gap * (rows - 1)) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        slots.push({
          x: pad + c * (slotW + gap),
          y: pad + r * (slotH + gap),
          w: slotW,
          h: slotH,
        });
      }
    }
  }

  // Draw each image clipped into slot
  for (let i = 0; i < Math.min(images.length, slots.length); i++) {
    const img = images[i];
    const slot = slots[i];

    ctx.save();
    if (config.cornerRadius > 0) {
      roundRect(ctx, slot.x, slot.y, slot.w, slot.h, config.cornerRadius);
      ctx.clip();
    }

    // Cover fit
    const imgRatio = img.width / img.height;
    const slotRatio = slot.w / slot.h;
    let drawW, drawH, drawX, drawY;

    if (imgRatio > slotRatio) {
      drawH = slot.h;
      drawW = slot.h * imgRatio;
      drawX = slot.x - (drawW - slot.w) / 2;
      drawY = slot.y;
    } else {
      drawW = slot.w;
      drawH = slot.w / imgRatio;
      drawX = slot.x;
      drawY = slot.y - (drawH - slot.h) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  // Optional Caption text
  if (config.caption) {
    ctx.save();
    ctx.font = "bold 32px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = isColorDark(config.bgColor) ? "#F8FAFC" : "#0F172A";
    ctx.textAlign = "center";
    ctx.fillText(config.caption, canvasW / 2, canvasH - pad / 2 - 10);
    ctx.restore();
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) return reject(new Error("Collage export failed"));
      resolve(b);
    }, "image/jpeg", 0.95);
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function isColorDark(color: string): boolean {
  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }
  return false;
}
