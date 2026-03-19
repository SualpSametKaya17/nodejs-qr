import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "E-posta ve şifre zorunludur." },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        slug: true,
        planId: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!restaurant || !restaurant.isActive) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "E-posta veya şifre hatalı." },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, restaurant.passwordHash);
    if (!valid) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "E-posta veya şifre hatalı." },
        { status: 401 }
      );
    }

    const token = await signToken({
      id: restaurant.id,
      email: restaurant.email,
      name: restaurant.name,
      slug: restaurant.slug,
      planId: restaurant.planId,
    });

    const { passwordHash: _, ...safeRestaurant } = restaurant;

    const response = NextResponse.json<ApiResponse>(
      { success: true, data: { restaurant: safeRestaurant } },
      { status: 200 }
    );

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
