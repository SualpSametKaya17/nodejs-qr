import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MenuClient } from "./MenuClient";

export default async function MenuPage() {
  const session = await requireSession();

  const menus = await prisma.menu.findMany({
    where: { restaurantId: session.id },
    orderBy: { isDefault: "desc" },
    select: {
      id: true,
      name: true,
      isDefault: true,
      isActive: true,
      _count: { select: { categories: true } },
    },
  });

  return <MenuClient menus={menus} />;
}
