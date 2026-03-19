import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

export async function POST() {
  const response = NextResponse.json<ApiResponse>(
    { success: true, message: "Çıkış yapıldı." },
    { status: 200 }
  );

  response.cookies.set("auth_token", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}
