import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";

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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar restaurantName={session.name} menuUrl={menuUrl} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar session={session} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
