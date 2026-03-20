import { requireSession } from "@/lib/session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StaffClient } from "./StaffClient";

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

export default async function StaffPage({ searchParams }: Props) {
  const session = await requireSession();

  // Sadece restoran sahibi ve süper admin erişebilir
  if (session.role === "staff") redirect("/dashboard");

  const sp = await searchParams;
  const restaurantId = await getEffectiveId(session.id, session.role, sp);

  const staff = await prisma.staff.findMany({
    where: { restaurantId },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return <StaffClient staff={staff} />;
}
