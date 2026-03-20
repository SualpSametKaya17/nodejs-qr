import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  // Başlangıç noktası: mevcut en son sipariş ID'si
  let lastCheckedId = 0;
  try {
    const latest = await prisma.order.findFirst({
      where: { restaurantId },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    if (latest) lastCheckedId = latest.id;
  } catch {
    // DB erişim hatası — yine de stream'i başlat
  }

  const stream = new ReadableStream({
    start(controller) {
      // İlk bağlantı mesajı
      controller.enqueue(encoder.encode(": connected\n\n"));

      const interval = setInterval(async () => {
        try {
          const newOrders = await prisma.order.findMany({
            where: { restaurantId, id: { gt: lastCheckedId } },
            include: {
              items: { include: { menuItem: { select: { name: true } } } },
            },
            orderBy: { id: "asc" },
          });

          if (newOrders.length > 0) {
            lastCheckedId = newOrders[newOrders.length - 1].id;
            const payload = JSON.stringify({ type: "new_orders", orders: newOrders });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          } else {
            // Heartbeat — bağlantıyı canlı tutar
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          }
        } catch {
          clearInterval(interval);
          try { controller.close(); } catch { /* already closed */ }
        }
      }, 5000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
