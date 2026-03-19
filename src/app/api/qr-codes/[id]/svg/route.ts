import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId, unauthorized, notFound, serverError } from "@/lib/api-helpers";
import { generateQRSvg } from "@/lib/qr";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();
  const { id } = await params;

  try {
    const code = await prisma.qrCode.findFirst({
      where: { id: parseInt(id, 10), restaurantId },
    });
    if (!code) return notFound("QR kod bulunamadı.");

    const svg = await generateQRSvg(code.url);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[qr svg GET]", err);
    return serverError();
  }
}
