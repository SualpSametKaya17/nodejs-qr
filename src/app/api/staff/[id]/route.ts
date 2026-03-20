import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId, unauthorized, notFound, badRequest, serverError } from "@/lib/api-helpers";
import type { ApiResponse } from "@/types";
import bcrypt from "bcryptjs";

function getRole(req: NextRequest) {
  return req.headers.get("x-role") ?? "";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  const role = getRole(req);
  if (role !== "restaurant" && role !== "superadmin") {
    return NextResponse.json<ApiResponse>({ success: false, error: "Yetki yok." }, { status: 403 });
  }

  const { id } = await params;
  const staffId = parseInt(id, 10);
  if (isNaN(staffId)) return badRequest("Geçersiz ID.");

  try {
    const existing = await prisma.staff.findFirst({ where: { id: staffId, restaurantId } });
    if (!existing) return notFound("Personel bulunamadı.");

    const { name, email, password, staffRole, isActive } = await req.json();

    const validRoles = ["ADMIN", "MANAGER", "WAITER", "KITCHEN"];
    if (staffRole && !validRoles.includes(staffRole)) return badRequest("Geçersiz rol.");

    let passwordHash: string | undefined;
    if (password) {
      if (password.length < 6) return badRequest("Şifre en az 6 karakter olmalıdır.");
      passwordHash = await bcrypt.hash(password, 10);
    }

    if (email && email.trim().toLowerCase() !== existing.email) {
      const dup = await prisma.staff.findUnique({
        where: { restaurantId_email: { restaurantId, email: email.trim().toLowerCase() } },
      });
      if (dup) return badRequest("Bu e-posta zaten kayıtlı.");
    }

    const updated = await prisma.staff.update({
      where: { id: staffId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(email ? { email: email.trim().toLowerCase() } : {}),
        ...(passwordHash ? { passwordHash } : {}),
        ...(staffRole ? { role: staffRole } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { staff: updated } });
  } catch (err) {
    console.error("[staff PATCH]", err);
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  const role = getRole(req);
  if (role !== "restaurant" && role !== "superadmin") {
    return NextResponse.json<ApiResponse>({ success: false, error: "Yetki yok." }, { status: 403 });
  }

  const { id } = await params;
  const staffId = parseInt(id, 10);
  if (isNaN(staffId)) return badRequest("Geçersiz ID.");

  try {
    const existing = await prisma.staff.findFirst({ where: { id: staffId, restaurantId } });
    if (!existing) return notFound("Personel bulunamadı.");

    await prisma.staff.delete({ where: { id: staffId } });
    return NextResponse.json<ApiResponse>({ success: true });
  } catch (err) {
    console.error("[staff DELETE]", err);
    return serverError();
  }
}
