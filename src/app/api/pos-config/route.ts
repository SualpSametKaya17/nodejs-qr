import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

// GET — admin POS ayarlarını getir
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role === "staff") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Yetkisiz." }, { status: 403 });
    }

    const restaurantId = getRestaurantId(session, req);
    const config = await prisma.posConfig.findUnique({ where: { restaurantId } });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: config ?? {
        isActive: false,
        testMode: true,
        clientId: "",
        storeKey: "",
        gatewayUrl: "",
        apiUrl: "",
        apiUser: "",
        apiPass: "",
        storeType: "3d",
      },
    });
  } catch (e) {
    console.error("[pos-config GET]", e);
    return NextResponse.json<ApiResponse>({ success: false, error: "Sunucu hatası." }, { status: 500 });
  }
}

// PATCH — POS ayarlarını kaydet / güncelle
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role === "staff") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Yetkisiz." }, { status: 403 });
    }

    const restaurantId = getRestaurantId(session, req);
    const body = await req.json();

    const data = {
      isActive:   Boolean(body.isActive),
      testMode:   Boolean(body.testMode),
      clientId:   String(body.clientId   ?? "").trim(),
      storeKey:   String(body.storeKey   ?? "").trim(),
      gatewayUrl: String(body.gatewayUrl ?? "").trim(),
      apiUrl:     String(body.apiUrl     ?? "").trim(),
      apiUser:    String(body.apiUser    ?? "").trim(),
      apiPass:    String(body.apiPass    ?? "").trim(),
      storeType:  String(body.storeType  ?? "3d").trim(),
    };

    const config = await prisma.posConfig.upsert({
      where:  { restaurantId },
      update: data,
      create: { restaurantId, ...data },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: config });
  } catch (e) {
    console.error("[pos-config PATCH]", e);
    return NextResponse.json<ApiResponse>({ success: false, error: "Sunucu hatası." }, { status: 500 });
  }
}

function getRestaurantId(session: { id: number; role: string }, req: NextRequest): number {
  if (session.role === "superadmin") {
    const qp = new URL(req.url).searchParams.get("restaurantId");
    if (qp) return parseInt(qp, 10);
  }
  return session.id;
}
