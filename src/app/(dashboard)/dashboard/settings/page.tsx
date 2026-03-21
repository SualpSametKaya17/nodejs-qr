import { requireSession } from "@/lib/session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";

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

export default async function SettingsPage({ searchParams }: Props) {
  const session = await requireSession();

  // Staff üyeleri ayarlara erişemez
  if (session.role === "staff") redirect("/dashboard/orders");

  const sp = await searchParams;
  const restaurantId = await getEffectiveId(session.id, session.role, sp);

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      email: true,
      logoUrl: true,
      primaryColor: true,
      menuStyle: true,
      address: true,
      phone: true,
      currency: true,
      language: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      loyaltyEnabled: true,
      pointsPerTL: true,
      pointValueTL: true,
    },
  });

  if (!restaurant) return null;

  return <SettingsClient restaurant={restaurant} />;
}
