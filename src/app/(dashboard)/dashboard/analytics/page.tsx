import { requireSession } from "@/lib/session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AnalyticsClient } from "./AnalyticsClient";

interface Props {
  searchParams: Promise<{ restaurantId?: string }>;
}

async function getEffectiveId(sessionId: number, role: string, searchParams: { restaurantId?: string }) {
  if (role !== "superadmin") return sessionId;
  if (searchParams.restaurantId) return parseInt(searchParams.restaurantId, 10);
  const cookieStore = await cookies();
  const c = cookieStore.get("superadmin_target_restaurant")?.value;
  return c && !isNaN(parseInt(c, 10)) ? parseInt(c, 10) : sessionId;
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const session = await requireSession();
  const sp = await searchParams;
  const restaurantId = await getEffectiveId(session.id, session.role, sp);

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [qrCodes, categories, recentOrders, menuCount, itemCount] =
    await Promise.all([
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
      prisma.category.findMany({
        where: { menu: { restaurantId }, isActive: true },
        select: {
          name: true,
          _count: { select: { items: { where: { isActive: true } } } },
        },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: since30 } },
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
      prisma.menu.count({ where: { restaurantId } }),
      prisma.menuItem.count({ where: { category: { menu: { restaurantId } } } }),
    ]);

  const totalScans = qrCodes.reduce((s: number, c: (typeof qrCodes)[number]) => s + c.scanCount, 0);
  const orderRevenue = recentOrders.reduce((s: number, o: (typeof recentOrders)[number]) => s + Number(o.totalAmount), 0);

  // Günlük sipariş grafiği (son 30 gün)
  const dailyMap: Record<string, { count: number; revenue: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dailyMap[d.toISOString().slice(0, 10)] = { count: 0, revenue: 0 };
  }
  for (const o of recentOrders) {
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    if (dailyMap[key]) {
      dailyMap[key].count++;
      dailyMap[key].revenue += Number(o.totalAmount);
    }
  }
  const daily = Object.entries(dailyMap).map(([date, v]) => ({ date, ...v }));

  return (
    <AnalyticsClient
      summary={{
        totalScans,
        activeQrCodes: qrCodes.filter((c) => c.isActive).length,
        orderCount: recentOrders.length,
        orderRevenue,
        menuCount,
        itemCount,
      }}
      qrCodes={JSON.parse(JSON.stringify(qrCodes))}
      categories={categories.map((c) => ({ name: c.name, itemCount: c._count.items }))}
      daily={daily}
      recentOrders={JSON.parse(JSON.stringify(recentOrders.slice(0, 8)))}
    />
  );
}
