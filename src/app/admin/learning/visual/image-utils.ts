import type { VisualImage } from "./types";

async function fingerprint(dataUrl: string): Promise<string> {
  const bytes = new TextEncoder().encode(dataUrl);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Image compression failed."));
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Image read failed."));
      reader.readAsDataURL(blob);
    }, "image/webp", quality);
  });
}

export async function compressVisualScreenshot(file: File): Promise<VisualImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Upload a PNG, JPEG or WebP screenshot.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Screenshot is too large. Keep the source under 12 MB.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable in this browser.");
    ctx.drawImage(bitmap, 0, 0, width, height);

    let dataUrl = await canvasToDataUrl(canvas, 0.84);
    if (dataUrl.length > 2_300_000) dataUrl = await canvasToDataUrl(canvas, 0.70);
    if (dataUrl.length > 2_300_000) {
      throw new Error("Compressed screenshot is still too large. Crop it to the interface area you want to train on.");
    }

    return {
      dataUrl,
      fingerprint: await fingerprint(dataUrl),
      width,
      height,
      name: file.name,
    };
  } finally {
    bitmap.close();
  }
}
