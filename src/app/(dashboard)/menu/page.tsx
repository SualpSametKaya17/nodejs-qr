import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MenuClient } from "./MenuClient";

export default async function MenuPage() {
  const session = await requireSession();

  const menus = await prisma.menu.findMany({
    where: { restaurantId: session.id },
    orderBy: { isDefault: "desc" },
    select: { id: true, name: true, isDefault: true, isActive: true },
  });

  const defaultMenu = menus[0] ?? null;

  let initialCategories: unknown[] = [];
  if (defaultMenu) {
    initialCategories = await prisma.category.findMany({
      where: { menuId: defaultMenu.id },
      orderBy: { sortOrder: "asc" },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });
  }

  return (
    <MenuClient
      menus={menus}
      initialCategories={initialCategories}
      defaultMenuId={defaultMenu?.id ?? null}
    />
  );
}
