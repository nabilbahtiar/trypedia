import { NextResponse } from "next/server";
import { saveMediaBuffer, persistDataUrlIfNeeded } from "@/lib/media";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const bucket = String(formData.get("bucket") || "misc");
      const files = formData.getAll("files").concat(formData.getAll("file"));
      const validFiles = files.filter((f): f is File => f instanceof File && f.size > 0);

      if (validFiles.length === 0) {
        return NextResponse.json(
          { success: false, message: "Tidak ada file gambar yang diunggah" },
          { status: 400 }
        );
      }

      const urls: string[] = [];
      for (const file of validFiles.slice(0, 5)) {
        const arrayBuf = await file.arrayBuffer();
        const url = await saveMediaBuffer(
          Buffer.from(arrayBuf),
          file.type || "image/webp",
          bucket
        );
        urls.push(url);
      }

      return NextResponse.json({
        success: true,
        url: urls[0],
        urls,
      });
    }

    const body = await request.json();
    const { dataUrl, dataUrls, bucket = "misc" } = body;

    if (Array.isArray(dataUrls) && dataUrls.length > 0) {
      const urls = await Promise.all(
        dataUrls.slice(0, 5).map((d: string) => persistDataUrlIfNeeded(d, bucket))
      );
      const validUrls = urls.filter((u): u is string => Boolean(u));
      return NextResponse.json({
        success: true,
        url: validUrls[0] || null,
        urls: validUrls,
      });
    }

    if (dataUrl) {
      const url = await persistDataUrlIfNeeded(dataUrl, bucket);
      return NextResponse.json({
        success: true,
        url,
        urls: url ? [url] : [],
      });
    }

    return NextResponse.json(
      { success: false, message: "Payload media tidak valid" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal mengunggah media" },
      { status: 500 }
    );
  }
}

