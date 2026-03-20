import { requireSession } from "@/lib/session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { OrdersClient } from "./OrdersClient";

export const dynamic = "force-dynamic";

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

export default async function OrdersPage({ searchParams }: Props) {
  const session = await requireSession();
  const sp = await searchParams;
  const restaurantId = await getEffectiveId(session.id, session.role, sp);

  const orders = await prisma.order.findMany({
    where: { restaurantId },
    include: {
      items: {
        include: {
          menuItem: { select: { name: true, imageUrl: true } },
          modifiers: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serialized = JSON.parse(JSON.stringify(orders));

  return <OrdersClient initialOrders={serialized} />;
}
