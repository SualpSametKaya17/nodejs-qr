import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

// GET /api/admin/loyalty/program — Sadakat programı ayarlarını getir
export async function GET(req: NextRequest) {
  try {
    const restaurantId = Number(req.headers.get("x-restaurant-id"));
    if (!restaurantId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Yetkisiz erişim." },
        { status: 401 }
      );
    }

    let program = await prisma.loyaltyProgram.findUnique({
      where: { restaurantId },
    });

    // Eğer program yoksa varsayılan değerlerle oluştur
    if (!program) {
      program = await prisma.loyaltyProgram.create({
        data: { restaurantId },
      });
    }

    return NextResponse.json<ApiResponse>({ success: true, data: program });
  } catch (err) {
    console.error("[loyalty/program GET]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}

// PUT /api/admin/loyalty/program — Sadakat programı ayarlarını güncelle
export async function PUT(req: NextRequest) {
  try {
    const restaurantId = Number(req.headers.get("x-restaurant-id"));
    if (!restaurantId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Yetkisiz erişim." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { isActive, pointsPerUnit, minimumRedeemPoints, welcomeBonus, expiryDays } = body;

    const program = await prisma.loyaltyProgram.upsert({
      where: { restaurantId },
      update: {
        ...(typeof isActive === "boolean" && { isActive }),
        ...(typeof pointsPerUnit === "number" && pointsPerUnit > 0 && { pointsPerUnit }),
        ...(typeof minimumRedeemPoints === "number" && minimumRedeemPoints >= 0 && { minimumRedeemPoints }),
        ...(typeof welcomeBonus === "number" && welcomeBonus >= 0 && { welcomeBonus }),
        ...(expiryDays === null || (typeof expiryDays === "number" && expiryDays > 0)
          ? { expiryDays }
          : {}),
      },
      create: {
        restaurantId,
        isActive: isActive ?? true,
        pointsPerUnit: pointsPerUnit ?? 1,
        minimumRedeemPoints: minimumRedeemPoints ?? 100,
        welcomeBonus: welcomeBonus ?? 0,
        expiryDays: expiryDays ?? null,
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: program,
      message: "Sadakat programı güncellendi.",
    });
  } catch (err) {
    console.error("[loyalty/program PUT]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
