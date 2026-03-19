import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId, unauthorized, serverError } from "@/lib/api-helpers";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  const { searchParams } = req.nextUrl;
  const range = searchParams.get("range") ?? "30"; // gün sayısı
  const days = Math.min(Math.max(parseInt(range, 10) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const [qrCodes, categories, recentOrders] = await Promise.all([
      // QR tarama istatistikleri
      prisma.qrCode.findMany({
        where: { restaurantId },
        select: {
          id: true,
          tableNumber: true,
          label: true,
          scanCount: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { scanCount: "desc" },
      }),

      // Kategori bazlı ürün sayıları
      prisma.category.findMany({
        where: { menu: { restaurantId }, isActive: true },
        select: {
          name: true,
          _count: { select: { items: { where: { isActive: true } } } },
        },
        orderBy: { sortOrder: "asc" },
      }),

      // Son siparişler (tarih aralığı)
      prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: since } },
        select: {
          id: true,
          tableNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    // Günlük tarama toplamı (QR bazlı - createdAt yok per scan, toplam kullanıyoruz)
    const totalScans = qrCodes.reduce((s, c) => s + c.scanCount, 0);
    const activeQrCodes = qrCodes.filter((c) => c.isActive).length;

    // Sipariş özeti
    const orderRevenue = recentOrders.reduce(
      (s, o) => s + Number(o.totalAmount),
      0
    );
    const orderCount = recentOrders.length;

    // Günlük sipariş dağılımı (son N gün)
    const dailyOrders: Record<string, { count: number; revenue: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyOrders[key] = { count: 0, revenue: 0 };
    }
    for (const o of recentOrders) {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      if (dailyOrders[key]) {
        dailyOrders[key].count++;
        dailyOrders[key].revenue += Number(o.totalAmount);
      }
    }
    const daily = Object.entries(dailyOrders)
      .map(([date, v]) => ({ date, ...v }))
      .reverse();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        summary: {
          totalScans,
          activeQrCodes,
          orderCount,
          orderRevenue,
          days,
        },
        qrCodes,
        categories: categories.map((c) => ({
          name: c.name,
          itemCount: c._count.items,
        })),
        daily,
        recentOrders: recentOrders.slice(0, 10),
      },
    });
  } catch (err) {
    console.error("[analytics GET]", err);
    return serverError();
  }
}
