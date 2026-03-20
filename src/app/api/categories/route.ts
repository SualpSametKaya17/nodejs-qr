import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId, unauthorized, badRequest, serverError } from "@/lib/api-helpers";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  try {
    const { menuId, name, description, imageUrl } = await req.json();
    if (!menuId || !name?.trim()) return badRequest("menuId ve name zorunludur.");

    // Menünün bu restorana ait olduğunu doğrula
    const menu = await prisma.menu.findFirst({ where: { id: menuId, restaurantId } });
    if (!menu) return badRequest("Geçersiz menü.");

    const count = await prisma.category.count({ where: { menuId } });
    const category = await prisma.category.create({
      data: { menuId, name: name.trim(), description: description?.trim() ?? null, imageUrl: imageUrl?.trim() || null, sortOrder: count },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { category } }, { status: 201 });
  } catch (err) {
    console.error("[categories POST]", err);
    return serverError();
  }
}
