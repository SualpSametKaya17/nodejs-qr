import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getRestaurantId,
  unauthorized,
  notFound,
  serverError,
} from "@/lib/api-helpers";
import type { ApiResponse } from "@/types";

async function owned(id: number, restaurantId: number) {
  return prisma.qRCode.findFirst({ where: { id, restaurantId } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();
  const { id } = await params;
  const existing = await owned(parseInt(id, 10), restaurantId);
  if (!existing) return notFound("QR kod bulunamadı.");

  try {
    const body = await req.json();
    const code = await prisma.qRCode.update({
      where: { id: existing.id },
      data: {
        label: body.label !== undefined ? body.label?.trim() || null : existing.label,
        isActive: body.isActive ?? existing.isActive,
      },
    });
    return NextResponse.json<ApiResponse>({ success: true, data: { code } });
  } catch (err) {
    console.error("[qr-codes PATCH]", err);
    return serverError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();
  const { id } = await params;
  const existing = await owned(parseInt(id, 10), restaurantId);
  if (!existing) return notFound("QR kod bulunamadı.");

  try {
    await prisma.qRCode.delete({ where: { id: existing.id } });
    return NextResponse.json<ApiResponse>({ success: true, message: "Silindi." });
  } catch (err) {
    console.error("[qr-codes DELETE]", err);
    return serverError();
  }
}
