/**
 * POST /api/payment/initiate
 *
 * Müşterinin kartı ile online ödeme başlatır:
 *  1. Siparişi DB'ye "paymentStatus=pending" olarak kaydeder
 *  2. 3D Secure form HTML'ini döner — client bunu auto-submit eder
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generatePaytenForm,
  getCurrencyCode,
  type GenerateFormOptions,
} from "@/lib/payten";
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
    const body = await req.json();
    const {
      restaurantId,
      tableNumber,
      customerNote,
      customerId,
      pointsToRedeem,
      items,
      // Card data (NEVER stored permanently)
      cardPan,
      cardExpMonth,
      cardExpYear,
      cardCv2,
      cardType = "1",
    } = body;

    // ── Temel validasyon ──────────────────────────────────────────────────────
    if (!restaurantId || !items?.length) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "restaurantId ve items zorunludur." },
        { status: 400 }
      );
    }

    const rawPan = String(cardPan ?? "").replace(/\s|-/g, "");
    if (!rawPan || rawPan.length < 13 || !cardExpMonth || !cardExpYear || !cardCv2) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Kart bilgileri eksik." },
        { status: 400 }
      );
    }

    // ── Restoran & POS config ─────────────────────────────────────────────────
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId, isActive: true },
      select: {
        id: true,
        currency: true,
        loyaltyEnabled: true,
        pointsPerTL: true,
        pointValueTL: true,
        minOrderForPoints: true,
        minPointsToRedeem: true,
        posConfig: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Restoran bulunamadı." },
        { status: 404 }
      );
    }

    const pos = restaurant.posConfig;
    if (!pos?.isActive) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Online ödeme bu restoran için aktif değil." },
        { status: 400 }
      );
    }

    // ── Ürün validasyonu ──────────────────────────────────────────────────────
    const menuItemIds = (items as IncomingItem[]).map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isActive: true },
      include: {
        category: { include: { menu: { select: { restaurantId: true } } } },
      },
    });
    const validIds = new Set(
      menuItems
        .filter((mi) => mi.category.menu.restaurantId === restaurantId)
        .map((mi) => mi.id)
    );
    const validItems = (items as IncomingItem[]).filter((i) => validIds.has(i.menuItemId));

    if (!validItems.length) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Geçerli ürün bulunamadı." },
        { status: 400 }
      );
    }

    // ── Tutar hesapla ─────────────────────────────────────────────────────────
    const subtotal = validItems.reduce((sum, i) => {
      const modTotal = (i.selectedModifiers ?? []).reduce((s, m) => s + (m.price ?? 0), 0);
      return sum + i.quantity * (i.unitPrice + modTotal);
    }, 0);

    let pointsUsed = 0;
    let discount = 0;

    if (restaurant.loyaltyEnabled && customerId && pointsToRedeem > 0) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId, restaurantId },
        select: { points: true },
      });
      if (customer && customer.points > 0) {
        const meetsOrderMin =
          restaurant.minOrderForPoints <= 0 || subtotal >= restaurant.minOrderForPoints;
        const meetsPointsMin =
          restaurant.minPointsToRedeem <= 0 || customer.points >= restaurant.minPointsToRedeem;

        if (meetsOrderMin && meetsPointsMin) {
          const maxPointsNeeded = Math.ceil(subtotal / restaurant.pointValueTL);
          pointsUsed = Math.min(pointsToRedeem, customer.points, maxPointsNeeded);
          discount = Math.min(pointsUsed * restaurant.pointValueTL, subtotal);
        }
      }
    }

    const totalAmount = Math.max(0, subtotal - discount);

    // ── Siparişi kaydet (paymentStatus=pending) ───────────────────────────────
    const order = await prisma.order.create({
      data: {
        restaurantId,
        customerId: customerId ?? null,
        tableNumber: tableNumber ? String(tableNumber) : null,
        customerNote: customerNote?.trim() || null,
        totalAmount,
        paymentMethod: "online",
        paymentStatus: "pending",
        items: {
          create: validItems.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: Math.max(1, Math.floor(i.quantity)),
            unitPrice: i.unitPrice,
            note: i.note?.trim() || null,
            modifiers: {
              create: (i.selectedModifiers ?? []).map((m) => ({
                modifierId: m.modifierId,
                name: m.name,
                price: m.price ?? 0,
              })),
            },
          })),
        },
      },
    });

    // ── Puan kullanımını şimdilik rezerve et (ödeme başarılı olunca netleşir) ─
    // Not: Ödeme başarısız olursa puanlar geri iade edilmez çünkü düşülmedi.
    // Ödeme başarılı olduğunda /api/payment/response puanları düşecek.

    // ── 3D Form HTML oluştur ──────────────────────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.get("host")}`;
    const currency = getCurrencyCode(restaurant.currency);

    // pointsUsed bilgisini response handler'a iletmek için orderId yeterli
    // (handler order'dan bilgileri okur)

    const formOpts: GenerateFormOptions = {
      gatewayUrl: pos.gatewayUrl,
      clientId:   pos.clientId,
      storeKey:   pos.storeKey,
      storeType:  pos.storeType,
      orderId:    order.id,
      amount:     totalAmount.toFixed(2),
      currency,
      pan:        rawPan,
      expMonth:   String(cardExpMonth).padStart(2, "0"),
      expYear:    String(cardExpYear).slice(-2),
      cv2:        String(cardCv2),
      cardType:   String(cardType),
      okUrl:      `${baseUrl}/api/payment/response`,
      failUrl:    `${baseUrl}/api/payment/response`,
      callbackUrl:`${baseUrl}/api/payment/callback`,
    };

    const formHtml = generatePaytenForm(formOpts);

    return NextResponse.json<ApiResponse>(
      { success: true, data: { formHtml, orderId: order.id } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[payment/initiate POST]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
