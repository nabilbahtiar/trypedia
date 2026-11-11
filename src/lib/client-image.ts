"use client";

/**
 * Compresses an image File on the client via Canvas (WebP preferred, JPEG fallback)
 * and uploads it as multipart binary directly to /api/media/upload.
 * Returns a lightweight /api/media/... URL so giant Base64 blobs never hit JSON APIs.
 */
export async function compressImageToBlob(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.82
): Promise<{ blob: Blob; mimeType: string }> {
  // Small already-optimized files under 80KB don't need canvas re-encoding
  if (file.size <= 80 * 1024 && (file.type === "image/webp" || file.type === "image/jpeg")) {
    return { blob: file, mimeType: file.type };
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ blob: file, mimeType: file.type || "image/jpeg" });
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob && webpBlob.size > 0) {
            resolve({ blob: webpBlob, mimeType: "image/webp" });
            return;
          }
          canvas.toBlob(
            (jpgBlob) => {
              if (jpgBlob && jpgBlob.size > 0) {
                resolve({ blob: jpgBlob, mimeType: "image/jpeg" });
              } else {
                resolve({ blob: file, mimeType: file.type || "image/jpeg" });
              }
            },
            "image/jpeg",
            quality
          );
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ blob: file, mimeType: file.type || "image/jpeg" });
    };
    img.src = objectUrl;
  });
}

export async function compressAndUploadImage(
  file: File,
  bucket: "products" | "avatars" | "addresses" | "proofs" | "stores" | "reviews" | "misc" = "misc",
  maxWidth: number = 1200,
  quality: number = 0.82
): Promise<string> {
  const { blob, mimeType } = await compressImageToBlob(file, maxWidth, quality);
  const ext = mimeType.includes("webp") ? "webp" : mimeType.includes("png") ? "png" : "jpg";

  const formData = new FormData();
  formData.append("bucket", bucket);
  formData.append("file", blob, `upload.${ext}`);

  const res = await fetch("/api/media/upload", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (data.success && data.url) {
    return data.url;
  }
  throw new Error(data.message || "Gagal menyimpan foto ke server media");
}

