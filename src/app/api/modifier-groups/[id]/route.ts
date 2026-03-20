import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId, unauthorized, notFound, badRequest, serverError } from "@/lib/api-helpers";
import type { ApiResponse } from "@/types";

async function ownedGroup(groupId: number, restaurantId: number) {
  return prisma.itemModifierGroup.findFirst({
    where: { id: groupId, menuItem: { category: { menu: { restaurantId } } } },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  const { id } = await params;
  const groupId = parseInt(id, 10);
  if (!await ownedGroup(groupId, restaurantId)) return notFound("Grup bulunamadı.");

  try {
    const { name, type, required, minSelect, maxSelect } = await req.json();
    if (name !== undefined && !name?.trim()) return badRequest("Grup adı boş olamaz.");

    const group = await prisma.itemModifierGroup.update({
      where: { id: groupId },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(type !== undefined ? { type: type === "single" ? "single" : "multiple" } : {}),
        ...(required !== undefined ? { required: Boolean(required) } : {}),
        ...(minSelect !== undefined ? { minSelect: Number(minSelect) } : {}),
        ...(maxSelect !== undefined ? { maxSelect: Number(maxSelect) } : {}),
      },
      include: { modifiers: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json<ApiResponse>({ success: true, data: { group } });
  } catch (err) {
    console.error("[modifier-groups PATCH]", err);
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
  const groupId = parseInt(id, 10);
  if (!await ownedGroup(groupId, restaurantId)) return notFound("Grup bulunamadı.");

  try {
    await prisma.itemModifierGroup.delete({ where: { id: groupId } });
    return NextResponse.json<ApiResponse>({ success: true, message: "Grup silindi." });
  } catch (err) {
    console.error("[modifier-groups DELETE]", err);
    return serverError();
  }
}
