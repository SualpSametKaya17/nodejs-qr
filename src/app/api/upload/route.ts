import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getRestaurantId, unauthorized, badRequest, serverError } from "@/lib/api-helpers";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) return badRequest("Dosya bulunamadı.");
    if (!ALLOWED[file.type]) return badRequest("Sadece JPEG, PNG, WebP veya GIF yüklenebilir.");
    if (file.size > MAX_SIZE) return badRequest("Dosya 5 MB'ı geçemez.");

    const ext = ALLOWED[file.type];
    const filename = `${restaurantId}_${randomUUID()}.${ext}`;
    const uploadDir = join(process.cwd(), "uploads");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ success: true, data: { url: `/uploads/${filename}` } });
  } catch (err) {
    console.error("[upload POST]", err);
    return serverError();
  }
}
