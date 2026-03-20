import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId, unauthorized, serverError } from "@/lib/api-helpers";
import type { ApiResponse } from "@/types";

export async function PATCH(req: NextRequest) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  try {
    const body = await req.json();

    // İzin verilen alanlar
    const allowed = [
      "name", "logoUrl", "primaryColor", "menuStyle",
      "address", "phone", "currency", "language",
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        data[key] = typeof body[key] === "string"
          ? body[key].trim() || null
          : body[key];
      }
    }

    if (data.name !== undefined && !data.name) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Restoran adı boş olamaz." },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data,
      select: {
        id: true, name: true, logoUrl: true, primaryColor: true, menuStyle: true,
        address: true, phone: true, currency: true, language: true,
        subscriptionPlan: true, subscriptionStatus: true,
      },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { restaurant } });
  } catch (err) {
    console.error("[restaurant PATCH]", err);
    return serverError();
  }
}
