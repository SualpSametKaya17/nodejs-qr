import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

export async function POST() {
  const response = NextResponse.json<ApiResponse>({ success: true });
  response.cookies.set("customer_token", "", { maxAge: 0, path: "/" });
  return response;
}
