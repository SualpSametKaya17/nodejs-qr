import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const session = await requireSession();
    if (session.role !== "superadmin") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Yetkisiz erişim." },
        { status: 403 }
      );
    }

    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        isActive: true,
        cartEnabled: true,
        orderingEnabled: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        createdAt: true,
        _count: { select: { menus: true, orders: true } },
      },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { restaurants } });
  } catch (err) {
    console.error("[admin/restaurants GET]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
