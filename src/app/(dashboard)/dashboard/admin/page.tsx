import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminClient } from "./AdminClient";

export default async function AdminPage() {
  const session = await requireSession();
  if (session.role !== "superadmin") {
    redirect("/dashboard");
  }

  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      isActive: true,
      cartEnabled: true,
      orderingEnabled: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      createdAt: true,
      _count: { select: { menus: true, orders: true } },
    },
  });

  return <AdminClient restaurants={restaurants} />;
}
