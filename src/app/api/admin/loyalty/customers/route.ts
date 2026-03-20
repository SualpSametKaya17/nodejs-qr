import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiResponse, PaginatedResponse } from "@/types";

// GET /api/admin/loyalty/customers — Müşteri listesi
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
    const search = searchParams.get("search") ?? "";
    const sortBy = searchParams.get("sortBy") ?? "totalPoints";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const where = {
      restaurantId,
      ...(search
        ? {
            OR: [
              { phone: { contains: search } },
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          totalPoints: true,
          isActive: true,
          createdAt: true,
          _count: { select: { transactions: true, orders: true } },
        },
      }),
      prisma.customer.count({ where }),
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
    console.error("[loyalty/customers GET]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}

// POST /api/admin/loyalty/customers — Yeni müşteri oluştur
export async function POST(req: NextRequest) {
  try {
    const restaurantId = Number(req.headers.get("x-restaurant-id"));
    if (!restaurantId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Yetkisiz erişim." },
        { status: 401 }
      );
    }

    const { name, phone, email } = await req.json();

    if (!phone) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Telefon numarası zorunludur." },
        { status: 400 }
      );
    }

    const existing = await prisma.customer.findUnique({
      where: { restaurantId_phone: { restaurantId, phone } },
    });

    if (existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Bu telefon numarasıyla kayıtlı müşteri zaten mevcut." },
        { status: 409 }
      );
    }

    // Hoş geldin bonusu kontrolü
    const program = await prisma.loyaltyProgram.findUnique({ where: { restaurantId } });
    const welcomeBonus = program?.welcomeBonus ?? 0;

    const customer = await prisma.$transaction(async (tx) => {
      const c = await tx.customer.create({
        data: { restaurantId, name, phone, email, totalPoints: welcomeBonus },
      });

      if (welcomeBonus > 0) {
        await tx.loyaltyTransaction.create({
          data: {
            restaurantId,
            customerId: c.id,
            type: "WELCOME",
            points: welcomeBonus,
            description: "Hoş geldin bonusu",
          },
        });
      }

      return c;
    });

    return NextResponse.json<ApiResponse>(
      { success: true, data: customer, message: "Müşteri oluşturuldu." },
      { status: 201 }
    );
  } catch (err) {
    console.error("[loyalty/customers POST]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
