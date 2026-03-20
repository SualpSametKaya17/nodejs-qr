import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/public/",
];

const MENU_PATH_PREFIX = "/m/";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Herkese açık yollar
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith(MENU_PATH_PREFIX) ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Dashboard ve API rotaları korunuyor
  const token = req.cookies.get("auth_token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Oturum açılmamış." },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const session = await verifyToken(token);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Geçersiz oturum." },
        { status: 401 }
      );
    }
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete("auth_token");
    return response;
  }

  // Session bilgisini header'a ekle (API route'larında kullanmak için)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-restaurant-id", String(session.id));
  requestHeaders.set("x-restaurant-slug", session.slug);
  requestHeaders.set("x-plan-id", String(session.planId));

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads/).*)",
  ],
};
