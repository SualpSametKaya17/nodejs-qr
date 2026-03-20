import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ItemsClient } from "./ItemsClient";

interface Props {
  searchParams: Promise<{ menuId?: string; categoryId?: string }>;
}

export default async function ItemsPage({ searchParams }: Props) {
  const session = await requireSession();
  const { menuId: menuIdParam, categoryId: categoryIdParam } = await searchParams;

  const menus = await prisma.menu.findMany({
    where: { restaurantId: session.id },
    orderBy: { isDefault: "desc" },
    select: { id: true, name: true, isDefault: true, isActive: true },
  });

  const defaultMenu = menuIdParam
    ? (menus.find((m: { id: number }) => m.id === parseInt(menuIdParam, 10)) ?? menus[0])
    : menus[0];

  const categories = defaultMenu
    ? await prisma.category.findMany({
        where: { menuId: defaultMenu.id },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      })
    : [];

  const initialItems = defaultMenu
    ? await prisma.menuItem.findMany({
        where: { category: { menuId: defaultMenu.id } },
        include: {
          category: { select: { id: true, name: true } },
          modifierGroups: {
            include: {
              modifiers: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
      })
    : [];

  return (
    <ItemsClient
      menus={menus}
      categories={categories}
      initialItems={initialItems}
      defaultMenuId={defaultMenu?.id ?? null}
      defaultCategoryId={categoryIdParam ? parseInt(categoryIdParam, 10) : null}
    />
  );
}
