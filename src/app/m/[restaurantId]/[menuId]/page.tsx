import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicMenuClient } from "./PublicMenuClient";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ restaurantId: string; menuId: string }>;
  searchParams: Promise<{ t?: string; qr?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { restaurantId, menuId } = await params;
  const menu = await prisma.menu.findFirst({
    where: { id: parseInt(menuId, 10), restaurantId: parseInt(restaurantId, 10), isActive: true },
    include: { restaurant: { select: { name: true } } },
  });
  if (!menu) return { title: "Menü" };
  return {
    title: `${menu.restaurant.name} — ${menu.name}`,
    description: `${menu.restaurant.name} dijital menüsü`,
  };
}

export default async function PublicMenuPage({ params, searchParams }: Props) {
  const { restaurantId, menuId } = await params;
  const { t: tableNumber, qr: qrId } = await searchParams;

  const rId = parseInt(restaurantId, 10);
  const mId = parseInt(menuId, 10);

  if (isNaN(rId) || isNaN(mId)) notFound();

  const menu = await prisma.menu.findFirst({
    where: { id: mId, restaurantId: rId, isActive: true },
    include: {
      restaurant: {
        select: { name: true, logoUrl: true, primaryColor: true, address: true, phone: true },
      },
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!menu) notFound();

  // Decimal → string (JSON serialization, client component'e geçiş için)
  const serialized = JSON.parse(JSON.stringify(menu));

  return (
    <PublicMenuClient
      menu={serialized}
      tableNumber={tableNumber ?? null}
      qrId={qrId ?? null}
    />
  );
}
