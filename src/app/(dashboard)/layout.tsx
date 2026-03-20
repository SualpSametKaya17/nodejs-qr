import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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

  const isSuperadmin = session.role === "superadmin";

  // Superadmin için seçili restoranı cookie'den belirle
  const cookieStore = await cookies();
  const targetCookie = cookieStore.get("superadmin_target_restaurant")?.value;
  const effectiveRestaurantId = isSuperadmin && targetCookie && !isNaN(parseInt(targetCookie, 10))
    ? parseInt(targetCookie, 10)
    : session.id;

  const defaultMenu = await prisma.menu.findFirst({
    where: { restaurantId: effectiveRestaurantId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const menuUrl = defaultMenu
    ? `${baseUrl}/m/${effectiveRestaurantId}/${defaultMenu.id}`
    : null;

  // Superadmin ise tüm restoranları getir
  const allRestaurants = isSuperadmin
    ? await prisma.restaurant.findMany({
        where: { role: "restaurant" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, isActive: true },
      })
    : null;

  return (
    <DashboardShell
      session={session}
      menuUrl={menuUrl}
      allRestaurants={allRestaurants}
      selectedRestaurantId={isSuperadmin ? effectiveRestaurantId : null}
    >
      {children}
    </DashboardShell>
  );
}
