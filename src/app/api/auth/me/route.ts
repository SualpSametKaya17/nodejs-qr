import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Oturum açılmamış." },
      { status: 401 }
    );
  }

  const session = await verifyToken(token);
  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Geçersiz oturum." },
      { status: 401 }
    );
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      slug: true,
      phone: true,
      logoUrl: true,
      currency: true,
      planId: true,
      trialEndsAt: true,
      plan: { select: { name: true, maxMenus: true, maxQrCodes: true, analyticsEnabled: true } },
    },
  });

  if (!restaurant) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Restoran bulunamadı." },
      { status: 404 }
    );
  }

  return NextResponse.json<ApiResponse>({ success: true, data: { restaurant } });
}
