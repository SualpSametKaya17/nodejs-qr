import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId, unauthorized, notFound, badRequest, serverError } from "@/lib/api-helpers";
import type { ApiResponse } from "@/types";

async function ownedGroup(groupId: number, restaurantId: number) {
  return prisma.itemModifierGroup.findFirst({
    where: { id: groupId, menuItem: { category: { menu: { restaurantId } } } },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  const { id } = await params;
  const groupId = parseInt(id, 10);
  if (!await ownedGroup(groupId, restaurantId)) return notFound("Grup bulunamadı.");

  try {
    const { name, price, isDefault } = await req.json();
    if (!name?.trim()) return badRequest("Seçenek adı zorunludur.");

    const parsedPrice = parseFloat(price ?? 0);
    if (isNaN(parsedPrice) || parsedPrice < 0) return badRequest("Geçerli bir fiyat giriniz.");

    const count = await prisma.itemModifier.count({ where: { groupId } });
    const modifier = await prisma.itemModifier.create({
      data: {
        groupId,
        name: name.trim(),
        price: parsedPrice,
        isDefault: Boolean(isDefault),
        sortOrder: count,
      },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { modifier } }, { status: 201 });
  } catch (err) {
    console.error("[modifiers POST]", err);
    return serverError();
  }
}
