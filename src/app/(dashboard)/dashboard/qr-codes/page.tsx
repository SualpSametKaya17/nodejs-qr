import { requireSession } from "@/lib/session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { QRCodesClient } from "./QRCodesClient";

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

export default async function QRCodesPage({ searchParams }: Props) {
  const session = await requireSession();
  const sp = await searchParams;
  const restaurantId = await getEffectiveId(session.id, session.role, sp);

  const [codes, menus] = await Promise.all([
    prisma.qrCode.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      include: { menu: { select: { id: true, name: true } } },
    }),
    prisma.menu.findMany({
      where: { restaurantId, isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  return <QRCodesClient initialCodes={codes} menus={menus} restaurantId={restaurantId} />;
}
