import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, extname, basename } from "path";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  // Sadece tek seviye dosya adı — path traversal önlemi
  const filename = basename(path[0] ?? "");
  if (!filename) return new NextResponse("Not Found", { status: 404 });

  const ext = extname(filename).toLowerCase();
  const contentType = MIME[ext];
  if (!contentType) return new NextResponse("Not Found", { status: 404 });

  try {
    const data = await readFile(join(process.cwd(), "uploads", filename));
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
