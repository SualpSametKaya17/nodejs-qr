import { NextRequest, NextResponse } from "next/server";
import { verifyCustomerToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("customer_token")?.value;
    if (!token) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Oturum bulunamadı." }, { status: 401 });
    }

    const session = await verifyCustomerToken(token);
    if (!session) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Geçersiz oturum." }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        points: true,
        totalSpent: true,
        orderCount: true,
        segment: true,
        createdAt: true,
      },
    });

    if (!customer) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Müşteri bulunamadı." }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({ success: true, data: customer });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Sunucu hatası." }, { status: 500 });
  }
}
