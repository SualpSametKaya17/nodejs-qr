import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId, unauthorized, badRequest, serverError } from "@/lib/api-helpers";
import bcrypt from "bcryptjs";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  try {
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) return badRequest("Tüm alanlar zorunludur.");
    if (newPassword.length < 8) return badRequest("Yeni şifre en az 8 karakter olmalıdır.");

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { passwordHash: true },
    });
    if (!restaurant) return unauthorized();

    const valid = await bcrypt.compare(currentPassword, restaurant.passwordHash);
    if (!valid) return NextResponse.json<ApiResponse>(
      { success: false, error: "Mevcut şifre hatalı." },
      { status: 400 }
    );

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.restaurant.update({ where: { id: restaurantId }, data: { passwordHash } });

    return NextResponse.json<ApiResponse>({ success: true, message: "Şifre güncellendi." });
  } catch (err) {
    console.error("[change-password POST]", err);
    return serverError();
  }
}
