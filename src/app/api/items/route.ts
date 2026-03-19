import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId, unauthorized, badRequest, serverError } from "@/lib/api-helpers";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  try {
    const { categoryId, name, description, price, imageUrl, calories, allergens, isPopular } =
      await req.json();

    if (!categoryId || !name?.trim() || price === undefined)
      return badRequest("categoryId, name ve price zorunludur.");

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0)
      return badRequest("Geçerli bir fiyat giriniz.");

    // Kategorinin bu restorana ait olduğunu doğrula
    const category = await prisma.category.findFirst({
      where: { id: categoryId, menu: { restaurantId } },
    });
    if (!category) return badRequest("Geçersiz kategori.");

    const count = await prisma.menuItem.count({ where: { categoryId } });
    const item = await prisma.menuItem.create({
      data: {
        categoryId,
        name: name.trim(),
        description: description?.trim() ?? null,
        price: parsedPrice,
        imageUrl: imageUrl?.trim() || null,
        calories: calories ? parseInt(calories, 10) : null,
        allergens: allergens?.trim() || null,
        isPopular: isPopular ?? false,
        sortOrder: count,
      },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { item } }, { status: 201 });
  } catch (err) {
    console.error("[items POST]", err);
    return serverError();
  }
}
