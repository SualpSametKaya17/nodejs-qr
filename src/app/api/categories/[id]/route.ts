import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId, unauthorized, notFound, serverError } from "@/lib/api-helpers";
import type { ApiResponse } from "@/types";

async function ownedCategory(categoryId: number, restaurantId: number) {
  return prisma.category.findFirst({
    where: { id: categoryId, menu: { restaurantId } },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  const { id } = await params;
  const categoryId = parseInt(id, 10);
  const existing = await ownedCategory(categoryId, restaurantId);
  if (!existing) return notFound("Kategori bulunamadı.");

  try {
    const body = await req.json();
    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: body.name?.trim() ?? existing.name,
        description: body.description !== undefined ? body.description?.trim() ?? null : existing.description,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl?.trim() || null : existing.imageUrl,
        isActive: body.isActive ?? existing.isActive,
        sortOrder: body.sortOrder ?? existing.sortOrder,
      },
    });
    return NextResponse.json<ApiResponse>({ success: true, data: { category } });
  } catch (err) {
    console.error("[categories PATCH]", err);
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
  const categoryId = parseInt(id, 10);
  const existing = await ownedCategory(categoryId, restaurantId);
  if (!existing) return notFound("Kategori bulunamadı.");

  try {
    await prisma.category.delete({ where: { id: categoryId } });
    return NextResponse.json<ApiResponse>({ success: true, message: "Kategori silindi." });
  } catch (err) {
    console.error("[categories DELETE]", err);
    return serverError();
  }
}
