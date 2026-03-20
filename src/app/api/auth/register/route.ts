import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import type { ApiResponse } from "@/types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Ad, e-posta ve şifre zorunludur." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Şifre en az 8 karakter olmalıdır." },
        { status: 400 }
      );
    }

    const existing = await prisma.restaurant.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Bu e-posta adresi zaten kayıtlı." },
        { status: 409 }
      );
    }

    // Ücretsiz plan (id: 1) varsayılan
    const freePlan = await prisma.plan.findFirst({ where: { price: 0 } });
    const planId = freePlan?.id ?? 1;

    const passwordHash = await bcrypt.hash(password, 12);

    // Benzersiz slug oluştur
    let slug = slugify(name);
    const exists = await prisma.restaurant.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now()}`;

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        email,
        passwordHash,
        phone: phone ?? null,
        slug,
        planId,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 gün trial
      },
      select: { id: true, email: true, name: true, slug: true, planId: true },
    });

    // Varsayılan menü oluştur
    await prisma.menu.create({
      data: {
        restaurantId: restaurant.id,
        name: "Ana Menü",
        isDefault: true,
        isActive: true,
      },
    });

    const token = await signToken({
      id: restaurant.id,
      email: restaurant.email,
      name: restaurant.name,
      slug: restaurant.slug,
      planId: restaurant.planId,
      role: "restaurant",
    });

    const response = NextResponse.json<ApiResponse>(
      { success: true, message: "Kayıt başarılı.", data: { restaurant } },
      { status: 201 }
    );

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 gün
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
