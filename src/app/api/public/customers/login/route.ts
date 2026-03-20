import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signCustomerToken } from "@/lib/auth";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { restaurantId, phone, password } = await req.json();

    if (!restaurantId || !phone || !password) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Telefon ve şifre zorunludur." }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { restaurantId_phone: { restaurantId, phone } },
    });

    if (!customer || !customer.passwordHash) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Telefon veya şifre hatalı." }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Telefon veya şifre hatalı." }, { status: 401 });
    }

    if (!customer.isActive) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Hesabınız devre dışı." }, { status: 403 });
    }

    const token = await signCustomerToken({
      id: customer.id,
      phone: customer.phone,
      name: customer.name,
      restaurantId: customer.restaurantId,
      role: "customer",
    });

    const response = NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        points: customer.points,
        segment: customer.segment,
        orderCount: customer.orderCount,
      },
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
