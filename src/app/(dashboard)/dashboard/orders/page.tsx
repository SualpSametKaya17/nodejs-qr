import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { OrdersClient } from "./OrdersClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await requireSession();

  const orders = await prisma.order.findMany({
    where: { restaurantId: session.id },
    include: {
      items: {
        include: { menuItem: { select: { name: true, imageUrl: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serialized = JSON.parse(JSON.stringify(orders));

  return <OrdersClient initialOrders={serialized} />;
}
