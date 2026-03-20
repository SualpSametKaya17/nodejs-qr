import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { restaurantId, tableNumber, customerNote, items } = await req.json();

    if (!restaurantId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "restaurantId ve items zorunludur." },
        { status: 400 }
      );
    }

    // Restoranın varlığını doğrula
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId, isActive: true },
      select: { id: true },
    });
    if (!restaurant) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Restoran bulunamadı." },
        { status: 404 }
      );
    }

    // Ürünlerin bu restorana ait olduğunu doğrula
    const menuItemIds = items.map((i: { menuItemId: number }) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isActive: true },
      include: { category: { include: { menu: { select: { restaurantId: true } } } } },
    });

    const validItemIds = new Set(
      menuItems
        .filter((mi) => mi.category.menu.restaurantId === restaurantId)
        .map((mi) => mi.id)
    );

    const orderItems = items
      .filter((i: { menuItemId: number }) => validItemIds.has(i.menuItemId))
      .map((i: { menuItemId: number; quantity: number; unitPrice: number }) => ({
        menuItemId: i.menuItemId,
        quantity: Math.max(1, Math.floor(i.quantity)),
        unitPrice: i.unitPrice,
      }));

    if (orderItems.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Geçerli ürün bulunamadı." },
        { status: 400 }
      );
    }

    const totalAmount = orderItems.reduce(
      (sum: number, i: { quantity: number; unitPrice: number }) => sum + i.quantity * i.unitPrice,
      0
    );

    const order = await prisma.order.create({
      data: {
        restaurantId,
        tableNumber: tableNumber ? String(tableNumber) : null,
        customerNote: customerNote?.trim() || null,
        totalAmount,
        items: { create: orderItems },
      },
      include: {
        items: {
          include: { menuItem: { select: { name: true } } },
        },
      },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { order } }, { status: 201 });
  } catch (err) {
    console.error("[public/orders POST]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
