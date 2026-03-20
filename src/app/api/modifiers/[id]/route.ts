import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId, unauthorized, notFound, badRequest, serverError } from "@/lib/api-helpers";
import type { ApiResponse } from "@/types";

async function ownedModifier(modifierId: number, restaurantId: number) {
  return prisma.itemModifier.findFirst({
    where: { id: modifierId, group: { menuItem: { category: { menu: { restaurantId } } } } },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  const { id } = await params;
  const modifierId = parseInt(id, 10);
  if (!await ownedModifier(modifierId, restaurantId)) return notFound("Seçenek bulunamadı.");

  try {
    const { name, price, isDefault, isActive } = await req.json();
    if (name !== undefined && !name?.trim()) return badRequest("Seçenek adı boş olamaz.");

    const modifier = await prisma.itemModifier.update({
      where: { id: modifierId },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(price !== undefined ? { price: parseFloat(price) } : {}),
        ...(isDefault !== undefined ? { isDefault: Boolean(isDefault) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });
    return NextResponse.json<ApiResponse>({ success: true, data: { modifier } });
  } catch (err) {
    console.error("[modifiers PATCH]", err);
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
  const modifierId = parseInt(id, 10);
  if (!await ownedModifier(modifierId, restaurantId)) return notFound("Seçenek bulunamadı.");

  try {
    await prisma.itemModifier.delete({ where: { id: modifierId } });
    return NextResponse.json<ApiResponse>({ success: true, message: "Seçenek silindi." });
  } catch (err) {
    console.error("[modifiers DELETE]", err);
    return serverError();
  }
}
