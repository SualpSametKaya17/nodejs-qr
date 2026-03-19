import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { QRCodesClient } from "./QRCodesClient";

export default async function QRCodesPage() {
  const session = await requireSession();

  const [codes, menus] = await Promise.all([
    prisma.qRCode.findMany({
      where: { restaurantId: session.id },
      orderBy: { createdAt: "desc" },
      include: { menu: { select: { id: true, name: true } } },
    }),
    prisma.menu.findMany({
      where: { restaurantId: session.id, isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  return <QRCodesClient initialCodes={codes} menus={menus} restaurantId={session.id} />;
}
