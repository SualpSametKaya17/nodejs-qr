import { requireSession } from "@/lib/session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { MenuClient } from "./MenuClient";

interface Props {
  searchParams: Promise<{ restaurantId?: string }>;
}

async function getEffectiveId(sessionId: number, role: string, searchParams: { restaurantId?: string }) {
  if (role !== "superadmin") return sessionId;
  if (searchParams.restaurantId) return parseInt(searchParams.restaurantId, 10);
  const cookieStore = await cookies();
  const c = cookieStore.get("superadmin_target_restaurant")?.value;
  return c && !isNaN(parseInt(c, 10)) ? parseInt(c, 10) : sessionId;
}

export default async function MenuPage({ searchParams }: Props) {
  const session = await requireSession();
  const sp = await searchParams;
  const restaurantId = await getEffectiveId(session.id, session.role, sp);

  const menus = await prisma.menu.findMany({
    where: { restaurantId },
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
