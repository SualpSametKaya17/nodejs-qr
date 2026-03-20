import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/loyalty/customers/[id]/adjust — Manuel puan düzenleme
export async function POST(req: NextRequest, { params }: Params) {
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
    const { points, description } = await req.json();

    if (typeof points !== "number" || points === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Geçerli bir puan miktarı giriniz (0 olamaz)." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, restaurantId },
    });

    if (!customer) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Müşteri bulunamadı." },
        { status: 404 }
      );
    }

    const newTotal = customer.totalPoints + points;
    if (newTotal < 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Yetersiz puan. Mevcut: ${customer.totalPoints}, çıkarılmak istenen: ${Math.abs(points)}.`,
        },
        { status: 400 }
      );
    }

    const transactionType = points > 0 ? "MANUAL_ADD" : "MANUAL_SUB";

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id: customerId },
        data: { totalPoints: newTotal },
      });

      const transaction = await tx.loyaltyTransaction.create({
        data: {
          restaurantId,
          customerId,
          type: transactionType,
          points,
          description: description || (points > 0 ? "Manuel puan ekleme" : "Manuel puan çıkarma"),
        },
      });

      return { customer: updated, transaction };
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result,
      message: `${Math.abs(points)} puan ${points > 0 ? "eklendi" : "çıkarıldı"}. Yeni bakiye: ${newTotal}`,
    });
  } catch (err) {
    console.error("[loyalty/customers/[id]/adjust POST]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
