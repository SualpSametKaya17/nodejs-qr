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

    // Public QR URL: /m/{restaurantId}/{menuId}?t={tableNumber}
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const tableParam = tableNumber ? `?t=${encodeURIComponent(tableNumber)}` : "";
    const url = `${baseUrl}/m/${restaurantId}/${menuId}${tableParam}`;

    const code = await prisma.qRCode.create({
      data: {
        restaurantId,
        menuId,
        tableNumber: tableNumber?.toString().trim() || null,
        label: label?.trim() || null,
        url,
      },
    });

    return NextResponse.json<ApiResponse>(
      { success: true, data: { code } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[qr-codes POST]", err);
    return serverError();
  }
}
