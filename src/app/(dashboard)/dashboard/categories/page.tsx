import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CategoriesClient } from "./CategoriesClient";

interface Props {
  searchParams: Promise<{ menuId?: string }>;
}

export default async function CategoriesPage({ searchParams }: Props) {
  const session = await requireSession();
  const { menuId: menuIdParam } = await searchParams;

  const menus = await prisma.menu.findMany({
    where: { restaurantId: session.id },
    orderBy: { isDefault: "desc" },
    select: { id: true, name: true, isDefault: true, isActive: true },
  });

  const defaultMenu = menuIdParam
    ? (menus.find((m: { id: number }) => m.id === parseInt(menuIdParam, 10)) ?? menus[0])
    : menus[0];

  const initialCategories = defaultMenu
    ? await prisma.category.findMany({
        where: { menuId: defaultMenu.id },
        orderBy: { sortOrder: "asc" },
        include: {
          parent: { select: { id: true, name: true } },
          children: {
            orderBy: { sortOrder: "asc" },
            include: { _count: { select: { items: true } } },
          },
          _count: { select: { items: true } },
        },
      })
    : [];

  return (
    <CategoriesClient
      menus={menus}
      initialCategories={initialCategories}
      defaultMenuId={defaultMenu?.id ?? null}
    />
  );
}
