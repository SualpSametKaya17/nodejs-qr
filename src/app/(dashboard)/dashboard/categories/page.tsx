import { requireSession } from "@/lib/session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CategoriesClient } from "./CategoriesClient";

interface Props {
  searchParams: Promise<{ menuId?: string; restaurantId?: string }>;
}

async function getEffectiveId(sessionId: number, role: string, searchParams: { restaurantId?: string }) {
  if (role !== "superadmin") return sessionId;
  if (searchParams.restaurantId) return parseInt(searchParams.restaurantId, 10);
  const cookieStore = await cookies();
  const c = cookieStore.get("superadmin_target_restaurant")?.value;
  return c && !isNaN(parseInt(c, 10)) ? parseInt(c, 10) : sessionId;
}

export default async function CategoriesPage({ searchParams }: Props) {
  const session = await requireSession();
  const { menuId: menuIdParam, restaurantId: restaurantIdParam } = await searchParams;

  const restaurantId = await getEffectiveId(session.id, session.role, { restaurantId: restaurantIdParam });

  const menus = await prisma.menu.findMany({
    where: { restaurantId },
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
