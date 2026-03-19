import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getRestaurantId,
  unauthorized,
  badRequest,
  serverError,
} from "@/lib/api-helpers";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  try {
    const codes = await prisma.qRCode.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        tableNumber: true,
        label: true,
        url: true,
        scanCount: true,
        isActive: true,
        createdAt: true,
        menu: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json<ApiResponse>({ success: true, data: { codes } });
  } catch (err) {
    console.error("[qr-codes GET]", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  try {
    const { menuId, tableNumber, label } = await req.json();
    if (!menuId) return badRequest("menuId zorunludur.");

    const menu = await prisma.menu.findFirst({
      where: { id: menuId, restaurantId },
    });
    if (!menu) return badRequest("Geçersiz menü.");

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    // Önce placeholder URL ile oluştur, sonra gerçek ID ile güncelle
    const code = await prisma.qRCode.create({
      data: {
        restaurantId,
        menuId,
        tableNumber: tableNumber?.toString().trim() || null,
        label: label?.trim() || null,
        url: "", // geçici
      },
    });

    const params = new URLSearchParams({ qr: String(code.id) });
    if (tableNumber) params.set("t", tableNumber.toString().trim());
    const url = `${baseUrl}/m/${restaurantId}/${menuId}?${params.toString()}`;

    await prisma.qRCode.update({ where: { id: code.id }, data: { url } });

    return NextResponse.json<ApiResponse>(
      { success: true, data: { code: { ...code, url } } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[qr-codes POST]", err);
    return serverError();
  }
}
