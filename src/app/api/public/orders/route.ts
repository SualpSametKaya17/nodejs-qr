import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

interface IncomingModifier {
  modifierId: number;
  name: string;
  price: number;
}

interface IncomingItem {
  menuItemId: number;
  quantity: number;
  unitPrice: number;
  note?: string;
  selectedModifiers?: IncomingModifier[];
}

export async function POST(req: NextRequest) {
  try {
    const { restaurantId, tableNumber, customerNote, items } = await req.json();

    if (!restaurantId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "restaurantId ve items zorunludur." },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId, isActive: true },
      select: { id: true },
    });
    if (!restaurant) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Restoran bulunamadı." }, { status: 404 });
    }

    // Ürün sahipliği doğrulama
    const menuItemIds = items.map((i: IncomingItem) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isActive: true },
      include: { category: { include: { menu: { select: { restaurantId: true } } } } },
    });
    const validIds = new Set(
      menuItems.filter((mi) => mi.category.menu.restaurantId === restaurantId).map((mi) => mi.id)
    );

    const validItems = items.filter((i: IncomingItem) => validIds.has(i.menuItemId));
    if (validItems.length === 0) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Geçerli ürün bulunamadı." }, { status: 400 });
    }

    // Toplam hesapla (base fiyat + modifier fiyatları)
    const totalAmount = validItems.reduce((sum: number, i: IncomingItem) => {
      const modTotal = (i.selectedModifiers ?? []).reduce((s: number, m: IncomingModifier) => s + (m.price ?? 0), 0);
      return sum + i.quantity * (i.unitPrice + modTotal);
    }, 0);

    const order = await prisma.order.create({
      data: {
        restaurantId,
        tableNumber: tableNumber ? String(tableNumber) : null,
        customerNote: customerNote?.trim() || null,
        totalAmount,
        items: {
          create: validItems.map((i: IncomingItem) => ({
            menuItemId: i.menuItemId,
            quantity: Math.max(1, Math.floor(i.quantity)),
            unitPrice: i.unitPrice,
            note: i.note?.trim() || null,
            modifiers: {
              create: (i.selectedModifiers ?? []).map((m: IncomingModifier) => ({
                modifierId: m.modifierId,
                name: m.name,
                price: m.price ?? 0,
              })),
            },
          })),
        },
      },
      include: {
        items: {
          include: {
            menuItem: { select: { name: true } },
            modifiers: true,
          },
        },
      },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { order } }, { status: 201 });
  } catch (err) {
    console.error("[public/orders POST]", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Sunucu hatası." }, { status: 500 });
  }
}
