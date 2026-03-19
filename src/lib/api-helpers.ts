import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

export function getRestaurantId(req: NextRequest): number | null {
  const raw = req.headers.get("x-restaurant-id");
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

export function unauthorized(): NextResponse {
  return NextResponse.json<ApiResponse>(
    { success: false, error: "Oturum açılmamış." },
    { status: 401 }
  );
}

export function notFound(msg = "Bulunamadı."): NextResponse {
  return NextResponse.json<ApiResponse>(
    { success: false, error: msg },
    { status: 404 }
  );
}

export function badRequest(msg: string): NextResponse {
  return NextResponse.json<ApiResponse>(
    { success: false, error: msg },
    { status: 400 }
  );
}

export function serverError(): NextResponse {
  return NextResponse.json<ApiResponse>(
    { success: false, error: "Sunucu hatası." },
    { status: 500 }
  );
}
