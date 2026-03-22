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
    const { restaurantId, tableNumber, customerNote, customerId, pointsToRedeem, items } = await req.json();

    if (!restaurantId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "restaurantId ve items zorunludur." },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId, isActive: true },
      select: { id: true, loyaltyEnabled: true, pointsPerTL: true, pointValueTL: true, minOrderForPoints: true, minPointsToRedeem: true },
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

    // Ara toplam
    const subtotal = validItems.reduce((sum: number, i: IncomingItem) => {
      const modTotal = (i.selectedModifiers ?? []).reduce((s: number, m: IncomingModifier) => s + (m.price ?? 0), 0);
      return sum + i.quantity * (i.unitPrice + modTotal);
    }, 0);

    // Puan indirimi hesapla — sadece gerçekten kullanılacak kadar puan düş
    let pointsUsed = 0;
    let discount = 0;

    if (restaurant.loyaltyEnabled && customerId && pointsToRedeem && pointsToRedeem > 0) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId, restaurantId },
        select: { id: true, points: true },
      });
      if (customer && customer.points > 0) {
        // Minimum sipariş tutarı kontrolü
        const meetsOrderMin = restaurant.minOrderForPoints <= 0 || subtotal >= restaurant.minOrderForPoints;
        // Minimum puan bakiyesi kontrolü
        const meetsPointsMin = restaurant.minPointsToRedeem <= 0 || customer.points >= restaurant.minPointsToRedeem;

        if (meetsOrderMin && meetsPointsMin) {
          // Siparişi sıfırlamak için gereken maksimum puan miktarı
          const maxPointsNeeded = Math.ceil(subtotal / restaurant.pointValueTL);
          pointsUsed = Math.min(pointsToRedeem, customer.points, maxPointsNeeded);
          discount = Math.min(pointsUsed * restaurant.pointValueTL, subtotal);
        }
      }
    }

    const totalAmount = Math.max(0, subtotal - discount);

    // Puan kazanımı (indirim sonrası tutar üzerinden)
    const pointsEarned = restaurant.loyaltyEnabled
      ? Math.floor(totalAmount * restaurant.pointsPerTL)
      : 0;

    // Sipariş + müşteri güncellemesi + sadakat işlemleri tek transaction'da
    const { order } = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          restaurantId,
          customerId: customerId ?? null,
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

      if (customerId) {
        // Müşteri istatistiklerini ve puan bakiyesini tek seferde güncelle
        await tx.customer.update({
          where: { id: customerId },
          data: {
            points: { increment: pointsEarned - pointsUsed },
            totalSpent: { increment: totalAmount },
            orderCount: { increment: 1 },
          },
        });

        // Puan kullanım kaydı
        if (pointsUsed > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              restaurantId,
              customerId,
              orderId: order.id,
              type: "redeem",
              points: -pointsUsed,
              description: `Sipariş #${order.id} için ${pointsUsed} puan kullanıldı`,
            },
          });
        }

        // Puan kazanım kaydı
        if (pointsEarned > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              restaurantId,
              customerId,
              orderId: order.id,
              type: "earn",
              points: pointsEarned,
              description: `Sipariş #${order.id} için ${pointsEarned} puan kazanıldı`,
            },
          });
        }
      }

      return { order };
    });

    return NextResponse.json<ApiResponse>(
      { success: true, data: { order, pointsEarned, pointsUsed, discount } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[public/orders POST]", err);
    return NextResponse.json<ApiResponse>({ success: false, error: "Sunucu hatası." }, { status: 500 });
  }
}
