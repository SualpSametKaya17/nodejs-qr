/**
 * POST /api/payment/response
 *
 * Banka 3D Secure sonrası bu URL'e POST yapar.
 * 1. Hash doğrulama
 * 2. cc5xml API ile provizyon
 * 3. Order güncelleme + puan işlemleri
 * 4. /payment/complete sayfasına yönlendirme
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyResponseHash,
  provisionPayment,
  getCurrencyCode,
  generateResultToken,
} from "@/lib/payten";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.get("host")}`;

  // ── 1. POST form datasını oku ─────────────────────────────────────────────
  let response: Record<string, string> = {};
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      for (const [k, v] of new URLSearchParams(text)) {
        response[k] = v;
      }
    } else {
      // Bazı bankalar JSON gönderebilir
      response = await req.json();
    }
  } catch {
    return redirectTo(baseUrl, 0, "failed", "Geçersiz yanıt.");
  }

  const orderId = parseInt(response["oid"] ?? response["OrderId"] ?? "0", 10);
  if (!orderId) {
    return redirectTo(baseUrl, 0, "failed", "Sipariş ID bulunamadı.");
  }

  // ── 2. Order ve POS config ────────────────────────────────────────────────
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      restaurantId: true,
      customerId: true,
      totalAmount: true,
      paymentStatus: true,
      restaurant: {
        select: {
          currency: true,
          loyaltyEnabled: true,
          pointsPerTL: true,
          pointValueTL: true,
          minOrderForPoints: true,
          minPointsToRedeem: true,
          posConfig: true,
        },
      },
    },
  });

  if (!order) {
    return redirectTo(baseUrl, orderId, "failed", "Sipariş bulunamadı.");
  }

  // Çift işlem koruması
  if (order.paymentStatus === "paid") {
    const token = generateResultToken(orderId, "success");
    return Response.redirect(`${baseUrl}/payment/complete?orderId=${orderId}&status=success&token=${token}`, 302);
  }

  const pos = order.restaurant.posConfig;
  if (!pos) {
    return redirectTo(baseUrl, orderId, "failed", "POS ayarları bulunamadı.");
  }

  // ── 3. Hash doğrulama ─────────────────────────────────────────────────────
  const hashValid = verifyResponseHash(response, pos.storeKey);
  if (!hashValid && !pos.testMode) {
    await markFailed(orderId, "Hash doğrulama başarısız.");
    return redirectTo(baseUrl, orderId, "failed", "Güvenlik doğrulaması başarısız.");
  }

  // ── 4. mdStatus kontrolü ──────────────────────────────────────────────────
  const mdStatus = String(response["mdStatus"] ?? "");
  const errmsg   = String(response["ErrMsg"] ?? response["errmsg"] ?? "");

  if (mdStatus === "0" || mdStatus === "6") {
    const msg = errmsg || "3D doğrulama başarısız.";
    await markFailed(orderId, msg);
    return redirectTo(baseUrl, orderId, "failed", msg);
  }

  // ── 5. cc5xml Provizyon ───────────────────────────────────────────────────
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "0.0.0.0";

  const totalAmount = Number(order.totalAmount);
  const currency = getCurrencyCode(order.restaurant.currency);

  const result = await provisionPayment({
    apiUrl:    pos.apiUrl,
    apiUser:   pos.apiUser,
    apiPass:   pos.apiPass,
    clientId:  pos.clientId,
    orderId,
    amount:    totalAmount.toFixed(2),
    currency,
    ip,
    mdStatus,
    md:    response["md"]   ?? response["MD"],
    cavv:  response["cavv"] ?? response["CAVV"],
    eci:   response["eci"]  ?? response["ECI"],
    xid:   response["xid"]  ?? response["Xid"] ?? response["XID"],
  });

  if (!result.ok) {
    await markFailed(orderId, result.error ?? "Bilinmeyen ödeme hatası.");
    return redirectTo(baseUrl, orderId, "failed", result.error ?? "Ödeme başarısız.");
  }

  // ── 6. Başarılı: order güncelle + sadakat işlemleri ──────────────────────
  const pointsEarned = order.restaurant.loyaltyEnabled
    ? Math.floor(totalAmount * order.restaurant.pointsPerTL)
    : 0;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "paid",
        posAuthCode:   result.transId ?? "",
        status:        "CONFIRMED",
      },
    });

    if (order.customerId && pointsEarned > 0) {
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          points:     { increment: pointsEarned },
          totalSpent: { increment: totalAmount },
          orderCount: { increment: 1 },
        },
      });
      await tx.loyaltyTransaction.create({
        data: {
          restaurantId: order.restaurantId,
          customerId:   order.customerId,
          orderId,
          type:         "earn",
          points:       pointsEarned,
          description:  `Sipariş #${orderId} için ${pointsEarned} puan kazanıldı (online ödeme)`,
        },
      });
    }
  });

  // ── 7. Sonuç sayfasına yönlendir ──────────────────────────────────────────
  const token = generateResultToken(orderId, "success");
  return Response.redirect(
    `${baseUrl}/payment/complete?orderId=${orderId}&status=success&token=${token}`,
    302
  );
}

async function markFailed(orderId: number, note: string) {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: "failed", posAuthCode: note.substring(0, 100) },
    });
  } catch { /* sessizce geç */ }
}

function redirectTo(
  baseUrl: string,
  orderId: number,
  status: "failed",
  msg: string
): Response {
  const token = generateResultToken(orderId, status);
  const encoded = encodeURIComponent(msg);
  return Response.redirect(
    `${baseUrl}/payment/complete?orderId=${orderId}&status=${status}&msg=${encoded}&token=${token}`,
    302
  );
}
