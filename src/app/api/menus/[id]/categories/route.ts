import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId, unauthorized, notFound, serverError } from "@/lib/api-helpers";
import type { ApiResponse } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  const { id } = await params;
  const menuId = parseInt(id, 10);

  try {
    const menu = await prisma.menu.findFirst({
      where: { id: menuId, restaurantId },
    });
    if (!menu) return notFound("Menü bulunamadı.");

    const categories = await prisma.category.findMany({
      where: { menuId },
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { categories } });
  } catch (err) {
    console.error("[menu categories GET]", err);
    return serverError();
  }
}
