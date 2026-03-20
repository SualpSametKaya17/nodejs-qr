import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const defaultMenu = await prisma.menu.findFirst({
    where: { restaurantId: session.id, isActive: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const menuUrl = defaultMenu
    ? `${baseUrl}/m/${session.id}/${defaultMenu.id}`
    : null;

  return (
    <DashboardShell session={session} menuUrl={menuUrl}>
      {children}
    </DashboardShell>
  );
}
