import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId, unauthorized, serverError } from "@/lib/api-helpers";
import type { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        ...(status ? { status: status as never } : {}),
      },
      include: {
        items: {
          include: { menuItem: { select: { name: true, imageUrl: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { orders } });
  } catch (err) {
    console.error("[orders GET]", err);
    return serverError();
  }
}
