import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signCustomerToken } from "@/lib/auth";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { restaurantId, phone, name, password } = await req.json();

    if (!restaurantId || !phone || !password) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Restoran, telefon ve şifre zorunludur." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Şifre en az 6 karakter olmalıdır." }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Restoran bulunamadı." }, { status: 404 });
    }

    const existing = await prisma.customer.findUnique({
      where: { restaurantId_phone: { restaurantId, phone } },
    });
    if (existing) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Bu telefon numarası zaten kayıtlı." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const customer = await prisma.customer.create({
      data: { restaurantId, phone, name: name?.trim() || null, passwordHash },
    });

    const token = await signCustomerToken({
      id: customer.id,
      phone: customer.phone,
      name: customer.name,
      restaurantId: customer.restaurantId,
      role: "customer",
    });

    const response = NextResponse.json<ApiResponse>({
      success: true,
      data: { id: customer.id, phone: customer.phone, name: customer.name, points: customer.points },
    });
    response.cookies.set("customer_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Sunucu hatası." }, { status: 500 });
  }
}
