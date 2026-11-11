import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { MEDIA_STORAGE_ROOT, getMimeFromExt } from "@/lib/media";

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await context.params;
    const segments = resolvedParams?.path || [];
    if (segments.length === 0 || segments.some((s) => !s || s.includes("..") || s.includes("\\"))) {
      return NextResponse.json({ success: false, message: "Invalid media path" }, { status: 400 });
    }

    const targetPath = path.resolve(MEDIA_STORAGE_ROOT, ...segments);
    if (!targetPath.startsWith(MEDIA_STORAGE_ROOT + path.sep)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const fileBuffer = await fs.readFile(targetPath);
    const filename = segments[segments.length - 1];
    const mimeType = getMimeFromExt(filename);
    const etag = `"${filename}"`;

    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          ETag: etag,
        },
      });
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(fileBuffer.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: etag,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Media not found" }, { status: 404 });
  }
}

