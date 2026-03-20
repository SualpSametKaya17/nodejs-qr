import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const session = await requireSession();

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      logoUrl: true,
      primaryColor: true,
      address: true,
      phone: true,
      currency: true,
      language: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
    },
  });

  if (!restaurant) return null;

  return <SettingsClient restaurant={restaurant} />;
}
