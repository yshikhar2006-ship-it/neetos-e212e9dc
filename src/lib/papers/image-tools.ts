/**
 * Browser-only page preparation for paper uploads.
 * Compression here is a performance requirement as much as a UX one: it caps
 * both Storage cost and the size of every image the vision pipeline reads.
 * Every function touches canvas/Image, so call these only from event handlers.
 */

export const MAX_DIMENSION = 1800;
export const JPEG_QUALITY = 0.82;

export interface PageEdit {
  rotation: number;
  crop: { x: number; y: number; w: number; h: number } | null;
  enhance: boolean;
}

export const DEFAULT_EDIT: PageEdit = { rotation: 0, crop: null, enhance: false };

export interface PendingPage {
  id: string;
  name: string;
  /** Object URL of the original source image, for preview. */
  previewUrl: string;
  file: File;
  edit: PageEdit;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  perceptualHash?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read this image"));
    img.src = src;
  });
}

/** Applies rotation, crop and optional contrast lift, then downscales + compresses. */
export async function renderPage(file: File, edit: PageEdit): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);

    const crop = edit.crop ?? { x: 0, y: 0, w: 1, h: 1 };
    const sx = Math.round(crop.x * img.naturalWidth);
    const sy = Math.round(crop.y * img.naturalHeight);
    const sw = Math.max(1, Math.round(crop.w * img.naturalWidth));
    const sh = Math.max(1, Math.round(crop.h * img.naturalHeight));

    const rotated = edit.rotation % 180 !== 0;
    const baseW = rotated ? sh : sw;
    const baseH = rotated ? sw : sh;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(baseW, baseH));
    const outW = Math.max(1, Math.round(baseW * scale));
    const outH = Math.max(1, Math.round(baseH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable in this browser");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((edit.rotation * Math.PI) / 180);
    const drawW = rotated ? outH : outW;
    const drawH = rotated ? outW : outH;
    ctx.drawImage(img, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (edit.enhance) applyEnhance(ctx, outW, outH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error("Could not compress this page");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** One-tap contrast/brightness lift for low-light phone captures. */
function applyEnhance(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const contrast = 1.35;
  const brightness = 12;
  for (let i = 0; i < px.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = (px[i + c] - 128) * contrast + 128 + brightness;
      px[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  ctx.putImageData(data, 0, 0);
}

/**
 * 64-bit average-hash. Perceptual, not byte-exact — the same paper photographed
 * twice will never be byte-identical, so a checksum would never catch a dupe.
 */
export async function perceptualHash(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const size = 8;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(img, 0, 0, size, size);
    const px = ctx.getImageData(0, 0, size, size).data;
    const grays: number[] = [];
    for (let i = 0; i < px.length; i += 4) {
      grays.push(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    }
    const mean = grays.reduce((s, g) => s + g, 0) / grays.length;
    let bits = "";
    for (const g of grays) bits += g >= mean ? "1" : "0";
    let hex = "";
    for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    return hex;
  } catch {
    return "";
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function hammingDistance(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return 64;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      dist += x & 1;
      x >>= 1;
    }
  }
  return dist;
}

/** Below this the two pages are almost certainly the same physical page. */
export const DUPLICATE_THRESHOLD = 8;

export function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
