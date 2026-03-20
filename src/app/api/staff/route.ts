import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantId, unauthorized, badRequest, serverError } from "@/lib/api-helpers";
import type { ApiResponse } from "@/types";
import bcrypt from "bcryptjs";

function getRole(req: NextRequest) {
  return req.headers.get("x-role") ?? "";
}

export async function GET(req: NextRequest) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  const role = getRole(req);
  if (role !== "restaurant" && role !== "superadmin") {
    return NextResponse.json<ApiResponse>({ success: false, error: "Yetki yok." }, { status: 403 });
  }

  try {
    const staff = await prisma.staff.findMany({
      where: { restaurantId },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json<ApiResponse>({ success: true, data: { staff } });
  } catch (err) {
    console.error("[staff GET]", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) return unauthorized();

  const role = getRole(req);
  if (role !== "restaurant" && role !== "superadmin") {
    return NextResponse.json<ApiResponse>({ success: false, error: "Yetki yok." }, { status: 403 });
  }

  try {
    const { name, email, password, staffRole } = await req.json();

    if (!name?.trim() || !email?.trim() || !password || !staffRole)
      return badRequest("name, email, password ve staffRole zorunludur.");

    const validRoles = ["ADMIN", "MANAGER", "WAITER", "KITCHEN"];
    if (!validRoles.includes(staffRole))
      return badRequest("Geçersiz rol.");

    if (password.length < 6)
      return badRequest("Şifre en az 6 karakter olmalıdır.");

    const existing = await prisma.staff.findUnique({
      where: { restaurantId_email: { restaurantId, email: email.trim() } },
    });
    if (existing) return badRequest("Bu e-posta zaten kayıtlı.");

    const passwordHash = await bcrypt.hash(password, 10);
    const staff = await prisma.staff.create({
      data: {
        restaurantId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role: staffRole,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { staff } }, { status: 201 });
  } catch (err) {
    console.error("[staff POST]", err);
    return serverError();
  }
}
