/**
 * POST /api/payment/callback
 * Banka async callback — bazı Payten/Nestpay entegrasyonlarında banka bu URL'e
 * asenkron bildirim gönderir. Sadece "OK" dönmek yeterli.
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  return new NextResponse("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
