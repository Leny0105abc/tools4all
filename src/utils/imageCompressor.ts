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
  borderWidth: number;
  borderColor: string;
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
        const sourceUrl = URL.createObjectURL(f);
        img.onload = () => {
          URL.revokeObjectURL(sourceUrl);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(sourceUrl);
          reject(new Error(`Failed to load ${f.name}`));
        };
        img.src = sourceUrl;
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
  const imageCount = Math.min(images.length, 9);
  const addGridSlots = (columns: number, fillLastRow = true) => {
    const rows = Math.ceil(imageCount / columns);
    const slotH = (availH - gap * (rows - 1)) / rows;
    for (let row = 0; row < rows; row++) {
      const itemsInRow = Math.min(columns, imageCount - row * columns);
      const slotW = fillLastRow
        ? (availW - gap * (itemsInRow - 1)) / itemsInRow
        : (availW - gap * (columns - 1)) / columns;
      const rowWidth = itemsInRow * slotW + gap * (itemsInRow - 1);
      const startX = pad + (availW - rowWidth) / 2;
      for (let column = 0; column < itemsInRow; column++) {
        slots.push({
          x: startX + column * (slotW + gap),
          y: pad + row * (slotH + gap),
          w: slotW,
          h: slotH,
        });
      }
    }
  };

  if (config.layout === "side-by-side") {
    addGridSlots(imageCount);
  } else if (config.layout === "grid-2x2") {
    addGridSlots(2);
  } else if (config.layout === "grid-3x3" || config.layout === "polaroid-row") {
    addGridSlots(3, config.layout !== "polaroid-row");
  } else if (config.layout === "featured-left") {
    const heroW = (availW - gap) * 0.55;
    const rightW = availW - gap - heroW;
    slots.push({ x: pad, y: pad, w: heroW, h: availH });
    const remaining = imageCount - 1;
    const columns = remaining > 4 ? 2 : 1;
    const rows = Math.ceil(remaining / columns);
    const slotH = (availH - gap * (rows - 1)) / rows;
    for (let row = 0; row < rows; row++) {
      const itemsInRow = Math.min(columns, remaining - row * columns);
      const slotW = (rightW - gap * (itemsInRow - 1)) / itemsInRow;
      for (let column = 0; column < itemsInRow; column++) {
        slots.push({
          x: pad + heroW + gap + column * (slotW + gap),
          y: pad + row * (slotH + gap),
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
    if (config.layout === "polaroid-row") {
      const inset = Math.min(slot.w, slot.h) * 0.06;
      const cardW = slot.w - inset * 2;
      const cardH = slot.h - inset * 2;
      ctx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
      ctx.rotate(([-4, 3, -2][i % 3] * Math.PI) / 180);
      ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      const border = Math.min(cardW, cardH) * 0.06;
      const photoSlot = {
        x: -cardW / 2 + border,
        y: -cardH / 2 + border,
        w: cardW - border * 2,
        h: cardH - border * 3,
      };
      drawCoverImage(ctx, img, photoSlot);
      drawSlotBorder(ctx, photoSlot, 0, config.borderWidth, config.borderColor);
    } else {
      if (config.cornerRadius > 0) {
        roundRect(ctx, slot.x, slot.y, slot.w, slot.h, config.cornerRadius);
        ctx.clip();
      }
      drawCoverImage(ctx, img, slot);
    }
    ctx.restore();
    if (config.layout !== "polaroid-row") {
      drawSlotBorder(ctx, slot, config.cornerRadius, config.borderWidth, config.borderColor);
    }
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

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  slot: { x: number; y: number; w: number; h: number }
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(slot.x, slot.y, slot.w, slot.h);
  ctx.clip();
  const imageRatio = img.width / img.height;
  const slotRatio = slot.w / slot.h;
  const drawW = imageRatio > slotRatio ? slot.h * imageRatio : slot.w;
  const drawH = imageRatio > slotRatio ? slot.h : slot.w / imageRatio;
  ctx.drawImage(
    img,
    slot.x - (drawW - slot.w) / 2,
    slot.y - (drawH - slot.h) / 2,
    drawW,
    drawH
  );
  ctx.restore();
}

function drawSlotBorder(
  ctx: CanvasRenderingContext2D,
  slot: { x: number; y: number; w: number; h: number },
  radius: number,
  requestedWidth: number,
  color: string,
) {
  const width = Math.max(0, Math.min(requestedWidth, Math.min(slot.w, slot.h) / 4));
  if (width === 0) return;

  const inset = width / 2;
  ctx.save();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  roundRect(
    ctx,
    slot.x + inset,
    slot.y + inset,
    slot.w - width,
    slot.h - width,
    Math.max(0, radius - inset),
  );
  ctx.stroke();
  ctx.restore();
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
