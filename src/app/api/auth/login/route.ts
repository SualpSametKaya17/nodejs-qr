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

    // ── 1. Restoran sahibi mi? ──────────────────────────────────────────────
    const restaurant = await prisma.restaurant.findUnique({
      where: { email },
      select: {
        id: true, email: true, name: true, slug: true,
        planId: true, role: true, passwordHash: true, isActive: true,
      },
    });

    if (restaurant && restaurant.isActive) {
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
        role: restaurant.role,
      });
      const { passwordHash: _, ...safe } = restaurant;
      const response = NextResponse.json<ApiResponse>(
        { success: true, data: { restaurant: safe } }
      );
      response.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      return response;
    }

    // ── 2. Staff (personel) mi? ─────────────────────────────────────────────
    const staff = await prisma.staff.findFirst({
      where: { email, isActive: true },
      include: {
        restaurant: {
          select: { id: true, name: true, slug: true, planId: true, isActive: true },
        },
      },
    });

    if (staff && staff.restaurant.isActive) {
      const valid = await bcrypt.compare(password, staff.passwordHash);
      if (!valid) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "E-posta veya şifre hatalı." },
          { status: 401 }
        );
      }
      // id = restaurantId → proxy'nin x-restaurant-id için kritik
      const token = await signToken({
        id: staff.restaurantId,
        email: staff.email,
        name: staff.name,
        slug: staff.restaurant.slug,
        planId: staff.restaurant.planId,
        role: "staff",
        staffRole: staff.role,
        staffId: staff.id,
      });
      const response = NextResponse.json<ApiResponse>({
        success: true,
        data: {
          restaurant: {
            id: staff.restaurantId,
            name: staff.restaurant.name,
            role: "staff",
            staffRole: staff.role,
          },
        },
      });
      response.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      return response;
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: "E-posta veya şifre hatalı." },
      { status: 401 }
    );
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
