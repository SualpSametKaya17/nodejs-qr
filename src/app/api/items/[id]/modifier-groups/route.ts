import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId, unauthorized, notFound, badRequest, serverError } from "@/lib/api-helpers";
import type { ApiResponse } from "@/types";

async function ownedItem(itemId: number, restaurantId: number) {
  return prisma.menuItem.findFirst({
    where: { id: itemId, category: { menu: { restaurantId } } },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (!await ownedItem(itemId, restaurantId)) return notFound("Ürün bulunamadı.");

  try {
    const groups = await prisma.itemModifierGroup.findMany({
      where: { menuItemId: itemId },
      include: { modifiers: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json<ApiResponse>({ success: true, data: { groups } });
  } catch (err) {
    console.error("[modifier-groups GET]", err);
    return serverError();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (!await ownedItem(itemId, restaurantId)) return notFound("Ürün bulunamadı.");

  try {
    const { name, type, required, minSelect, maxSelect } = await req.json();
    if (!name?.trim()) return badRequest("Grup adı zorunludur.");

    const count = await prisma.itemModifierGroup.count({ where: { menuItemId: itemId } });
    const group = await prisma.itemModifierGroup.create({
      data: {
        menuItemId: itemId,
        name: name.trim(),
        type: type === "single" ? "single" : "multiple",
        required: Boolean(required),
        minSelect: Number(minSelect ?? 0),
        maxSelect: Number(maxSelect ?? 0),
        sortOrder: count,
      },
      include: { modifiers: true },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { group } }, { status: 201 });
  } catch (err) {
    console.error("[modifier-groups POST]", err);
    return serverError();
  }
}
