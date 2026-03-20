import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId, unauthorized, notFound, badRequest, serverError } from "@/lib/api-helpers";
import type { ApiResponse } from "@/types";

const VALID_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "CANCELLED"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  try {
    const { id } = await params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) return badRequest("Geçersiz sipariş ID.");

    const { status } = await req.json();
    if (!status || !VALID_STATUSES.includes(status)) {
      return badRequest(`Geçersiz durum. Geçerli değerler: ${VALID_STATUSES.join(", ")}`);
    }

    const existing = await prisma.order.findFirst({
      where: { id: orderId, restaurantId },
    });
    if (!existing) return notFound("Sipariş bulunamadı.");

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: { include: { menuItem: { select: { name: true } } } },
      },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { order } });
  } catch (err) {
    console.error("[orders PATCH]", err);
    return serverError();
  }
}
