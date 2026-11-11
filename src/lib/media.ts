import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const MEDIA_STORAGE_ROOT = path.resolve(process.cwd(), "storage", "media");

const ALLOWED_BUCKETS = new Set([
  "products",
  "avatars",
  "addresses",
  "proofs",
  "stores",
  "reviews",
  "misc",
]);

function normalizeBucket(bucket?: string): string {
  if (!bucket) return "misc";
  const clean = bucket.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return ALLOWED_BUCKETS.has(clean) ? clean : "misc";
}

function getExtFromMime(mimeType: string): string {
  const clean = mimeType.toLowerCase();
  if (clean.includes("webp")) return "webp";
  if (clean.includes("png")) return "png";
  if (clean.includes("gif")) return "gif";
  if (clean.includes("avif")) return "avif";
  return "jpg";
}

export function getMimeFromExt(extOrFile: string): string {
  const lower = extOrFile.toLowerCase();
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".avif")) return "image/avif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}

/**
 * Saves a binary image buffer to storage/media/<bucket>/<id>.<ext>
 * and returns a compact internal URL (/api/media/<bucket>/<filename>).
 */
export async function saveMediaBuffer(
  buffer: Buffer,
  mimeType: string = "image/webp",
  bucket: string = "misc"
): Promise<string> {
  const safeBucket = normalizeBucket(bucket);
  const ext = getExtFromMime(mimeType);
  const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 14);
  const filename = `${hash}-${buffer.length}.${ext}`;

  const dirPath = path.join(MEDIA_STORAGE_ROOT, safeBucket);
  await fs.mkdir(dirPath, { recursive: true });

  const filePath = path.join(dirPath, filename);
  try {
    await fs.access(filePath);
    // Identical content already stored on disk -> deduplicate cleanly
  } catch {
    await fs.writeFile(filePath, buffer);
  }

  return `/api/media/${safeBucket}/${filename}`;
}

/**
 * If value is a base64 data:image URL, writes it to binary disk storage
 * and returns the compact /api/media/... path. Otherwise returns value unchanged.
 */
export async function persistDataUrlIfNeeded(
  value: string | null | undefined,
  bucket: string = "misc"
): Promise<string | null> {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (!trimmed.startsWith("data:image/")) {
    return trimmed;
  }

  const match = trimmed.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,([\s\S]+)$/);
  if (!match) {
    return trimmed;
  }

  const mimeType = match[1];
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, "base64");
  if (buffer.length === 0) {
    return null;
  }

  return saveMediaBuffer(buffer, mimeType, bucket);
}

/**
 * Externalizes all base64 data URLs inside a product/media image array.
 */
export async function persistImageArrayIfNeeded(
  images: unknown,
  bucket: string = "products",
  fallback: string = "/images/new-balance-2022r.jpg"
): Promise<string[]> {
  if (!Array.isArray(images) || images.length === 0) {
    return [fallback];
  }

  const converted = await Promise.all(
    images
      .slice(0, 5)
      .map((item) =>
        typeof item === "string" ? persistDataUrlIfNeeded(item, bucket) : Promise.resolve(null)
      )
  );

  const valid = converted.filter((url): url is string => Boolean(url));
  return valid.length > 0 ? valid : [fallback];
}

