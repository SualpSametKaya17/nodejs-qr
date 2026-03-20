import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/loyalty/customers/[id] — Müşteri detayı + işlem geçmişi
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const restaurantId = Number(req.headers.get("x-restaurant-id"));
    if (!restaurantId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Yetkisiz erişim." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const customerId = Number(id);

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, restaurantId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        _count: { select: { orders: true, transactions: true } },
      },
    });

    if (!customer) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Müşteri bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({ success: true, data: customer });
  } catch (err) {
    console.error("[loyalty/customers/[id] GET]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/loyalty/customers/[id] — Müşteri bilgilerini güncelle
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const restaurantId = Number(req.headers.get("x-restaurant-id"));
    if (!restaurantId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Yetkisiz erişim." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const customerId = Number(id);
    const { name, email, isActive } = await req.json();

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, restaurantId },
    });

    if (!customer) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Müşteri bulunamadı." },
        { status: 404 }
      );
    }

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(typeof isActive === "boolean" && { isActive }),
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updated,
      message: "Müşteri güncellendi.",
    });
  } catch (err) {
    console.error("[loyalty/customers/[id] PATCH]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
