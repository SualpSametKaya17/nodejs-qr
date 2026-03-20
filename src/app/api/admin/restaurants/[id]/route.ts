import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import type { ApiResponse } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (session.role !== "superadmin") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Yetkisiz erişim." },
        { status: 403 }
      );
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Geçersiz ID." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const allowed = ["isActive", "cartEnabled", "orderingEnabled", "subscriptionPlan", "subscriptionStatus", "planId"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Güncellenecek alan bulunamadı." },
        { status: 400 }
      );
    }

    const updated = await prisma.restaurant.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        isActive: true,
        cartEnabled: true,
        orderingEnabled: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
      },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { restaurant: updated } });
  } catch (err) {
    console.error("[admin/restaurants PATCH]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
