import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const qrId = parseInt(id, 10);
  if (isNaN(qrId)) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  try {
    await prisma.qrCode.updateMany({
      where: { id: qrId, isActive: true },
      data: { scanCount: { increment: 1 } },
    });
  } catch {
    // Sayaç hatası kritik değil, sessizce geç
  }

  return NextResponse.json({ success: true });
}
