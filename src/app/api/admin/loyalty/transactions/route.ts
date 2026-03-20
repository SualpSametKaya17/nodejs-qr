import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiResponse, PaginatedResponse } from "@/types";

// GET /api/admin/loyalty/transactions — Tüm işlem geçmişi
export async function GET(req: NextRequest) {
  try {
    const restaurantId = Number(req.headers.get("x-restaurant-id"));
    if (!restaurantId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Yetkisiz erişim." },
        { status: 401 }
      );
    }

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));
    const customerId = searchParams.get("customerId");
    const type = searchParams.get("type");

    const where = {
      restaurantId,
      ...(customerId ? { customerId: Number(customerId) } : {}),
      ...(type ? { type: type as never } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.loyaltyTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          customer: {
            select: { id: true, name: true, phone: true },
          },
        },
      }),
      prisma.loyaltyTransaction.count({ where }),
    ]);

    return NextResponse.json<PaginatedResponse<(typeof items)[0]>>({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error("[loyalty/transactions GET]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
