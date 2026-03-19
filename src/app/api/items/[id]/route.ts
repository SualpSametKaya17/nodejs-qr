import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId, unauthorized, notFound, badRequest, serverError } from "@/lib/api-helpers";
import type { ApiResponse } from "@/types";

async function ownedItem(itemId: number, restaurantId: number) {
  return prisma.menuItem.findFirst({
    where: { id: itemId, category: { menu: { restaurantId } } },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  const { id } = await params;
  const itemId = parseInt(id, 10);
  const existing = await ownedItem(itemId, restaurantId);
  if (!existing) return notFound("Ürün bulunamadı.");

  try {
    const body = await req.json();

    if (body.price !== undefined) {
      const p = parseFloat(body.price);
      if (isNaN(p) || p < 0) return badRequest("Geçerli bir fiyat giriniz.");
      body.price = p;
    }

    const item = await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        name: body.name?.trim() ?? existing.name,
        description: body.description !== undefined ? body.description?.trim() ?? null : existing.description,
        price: body.price ?? existing.price,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl?.trim() || null : existing.imageUrl,
        calories: body.calories !== undefined ? (body.calories ? parseInt(body.calories, 10) : null) : existing.calories,
        allergens: body.allergens !== undefined ? body.allergens?.trim() || null : existing.allergens,
        isActive: body.isActive ?? existing.isActive,
        isPopular: body.isPopular ?? existing.isPopular,
        sortOrder: body.sortOrder ?? existing.sortOrder,
      },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { item } });
  } catch (err) {
    console.error("[items PATCH]", err);
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
  const itemId = parseInt(id, 10);
  const existing = await ownedItem(itemId, restaurantId);
  if (!existing) return notFound("Ürün bulunamadı.");

  try {
    await prisma.menuItem.delete({ where: { id: itemId } });
    return NextResponse.json<ApiResponse>({ success: true, message: "Ürün silindi." });
  } catch (err) {
    console.error("[items DELETE]", err);
    return serverError();
  }
}
