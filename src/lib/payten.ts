/**
 * Payten (Nestpay) Sanal POS - TypeScript Utility
 * Desteklenen bankalar: Garanti, Yapı Kredi, Akbank ve diğer Payten/Nestpay entegrasyonları
 */

import { createHash, createHmac, timingSafeEqual } from "crypto";

// ─── Hash ─────────────────────────────────────────────────────────────────────

function ver3Escape(value: string): string {
  return String(value).replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

function buildVer3Plaintext(params: Record<string, string>, storeKey: string): string {
  const excluded = new Set([
    "hash", "encoding", "countdown", "hashparams", "hashparamsval", "storekey",
  ]);
  const sorted = Object.entries(params)
    .filter(([k]) => !excluded.has(k.toLowerCase()))
    .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const parts = sorted.map(([, v]) => ver3Escape(v));
  parts.push(ver3Escape(storeKey));
  return parts.join("|");
}

export function calculateHashB64(params: Record<string, string>, storeKey: string): string {
  const plaintext = buildVer3Plaintext(params, storeKey);
  const bin = createHash("sha512").update(plaintext, "utf8").digest();
  return Buffer.from(bin).toString("base64");
}

export function verifyResponseHash(
  response: Record<string, string>,
  storeKey: string
): boolean {
  const receivedHash =
    response["HASH"] ?? response["hash"] ?? "";
  if (!receivedHash) return false;

  const hashparams = response["HASHPARAMS"] ?? response["hashparams"] ?? "";

  let plaintext: string;

  if (hashparams) {
    const delim = hashparams.includes(":") ? ":" : "|";
    const names = hashparams.split(delim).filter(Boolean);
    const parts = names.map((name) => {
      const entry = Object.entries(response).find(
        ([k]) => k.toLowerCase() === name.toLowerCase()
      );
      return ver3Escape(entry?.[1] ?? "");
    });
    parts.push(ver3Escape(storeKey));
    plaintext = parts.join("|");
  } else {
    plaintext = buildVer3Plaintext(response, storeKey);
  }

  const calculated = Buffer.from(
    createHash("sha512").update(plaintext, "utf8").digest()
  ).toString("base64");

  try {
    return timingSafeEqual(
      Buffer.from(receivedHash),
      Buffer.from(calculated)
    );
  } catch {
    return receivedHash === calculated;
  }
}

// ─── Currency Codes ───────────────────────────────────────────────────────────

export function getCurrencyCode(currency: string): string {
  const codes: Record<string, string> = {
    TRY: "949",
    USD: "840",
    EUR: "978",
    GBP: "826",
  };
  return codes[currency] ?? "949";
}

// ─── 3D Form Generator ────────────────────────────────────────────────────────

export interface GenerateFormOptions {
  gatewayUrl: string;
  clientId: string;
  storeKey: string;
  storeType: string;
  orderId: number;
  amount: string;       // "100.00"
  currency: string;     // "949"
  pan: string;
  expMonth: string;     // "MM"
  expYear: string;      // "YY" (2-digit)
  cv2: string;
  cardType: string;     // "1"|"2"|"3"
  okUrl: string;
  failUrl: string;
  callbackUrl: string;
  lang?: string;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function generatePaytenForm(opts: GenerateFormOptions): string {
  const rnd = Math.random().toString(36).substring(2, 22);

  const params: Record<string, string> = {
    clientid: opts.clientId,
    storetype: opts.storeType,
    hashAlgorithm: "ver3",
    TranType: "Auth",
    Instalment: "",
    amount: opts.amount,
    currency: opts.currency,
    oid: String(opts.orderId),
    okUrl: opts.okUrl,
    failUrl: opts.failUrl,
    callbackUrl: opts.callbackUrl,
    lang: opts.lang ?? "tr",
    pan: opts.pan,
    cv2: opts.cv2,
    Ecom_Payment_Card_ExpDate_Year: opts.expYear.slice(-2),
    Ecom_Payment_Card_ExpDate_Month: opts.expMonth.padStart(2, "0"),
    cardType: opts.cardType,
    rnd,
  };

  const hash = calculateHashB64(params, opts.storeKey);

  const inputs = Object.entries(params)
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}" />`
    )
    .join("\n    ");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Ödeme yönlendiriliyor...</title></head>
<body>
<p style="font-family:sans-serif;text-align:center;padding:40px;color:#555">
  3D Secure doğrulama sayfasına yönlendiriliyorsunuz...
</p>
<form id="payten_form" method="post" action="${escapeHtml(opts.gatewayUrl)}">
    ${inputs}
    <input type="hidden" name="hash" value="${escapeHtml(hash)}" />
</form>
<script>document.getElementById('payten_form').submit();</script>
</body>
</html>`;
}

// ─── Provision (cc5xml API) ───────────────────────────────────────────────────

export interface ProvisionResult {
  ok: boolean;
  transId?: string;
  authCode?: string;
  error?: string;
}

export interface ProvisionOptions {
  apiUrl: string;
  apiUser: string;
  apiPass: string;
  clientId: string;
  orderId: number;
  amount: string;
  currency: string;
  ip: string;
  mdStatus: string;
  // 3D fields (mdStatus 1/2/3/4)
  md?: string;
  cavv?: string;
  eci?: string;
  xid?: string;
  // Fallback fields (mdStatus 5/7/8)
  pan?: string;
  expMonth?: string;
  expYear?: string;
  cv2?: string;
}

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeApiUrl(raw: string): string {
  let url = raw.trim()
    .replace(/\/fim\/complete-checkout/i, "/fim/api")
    .replace(/\/fim\/est3dgate/i, "/fim/api")
    .replace(/\/fim\/cc5xml/i, "/fim/api");
  if (/^https?:\/\/[^/]+\/?$/.test(url)) {
    url = url.replace(/\/$/, "") + "/fim/api";
  }
  return url;
}

export async function provisionPayment(
  opts: ProvisionOptions
): Promise<ProvisionResult> {
  const apiUrl = normalizeApiUrl(opts.apiUrl);

  const common = `
    <Name>${escapeXml(opts.apiUser)}</Name>
    <Password>${escapeXml(opts.apiPass)}</Password>
    <ClientId>${escapeXml(opts.clientId)}</ClientId>
    <IPAddress>${escapeXml(opts.ip)}</IPAddress>
    <OrderId>${escapeXml(String(opts.orderId))}</OrderId>
    <Type>Auth</Type>
    <Total>${escapeXml(opts.amount)}</Total>
    <Currency>${escapeXml(opts.currency)}</Currency>`;

  let cardFields: string;
  const mdStatus = String(opts.mdStatus);

  if (["1", "2", "3", "4"].includes(mdStatus)) {
    if (!opts.md || !opts.cavv || !opts.xid) {
      return { ok: false, error: "3D dönüş parametreleri eksik (md/cavv/xid)." };
    }
    cardFields = `
    <Number>${escapeXml(opts.md)}</Number>
    <PayerTxnId>${escapeXml(opts.xid)}</PayerTxnId>
    <PayerSecurityLevel>${escapeXml(opts.eci ?? "")}</PayerSecurityLevel>
    <PayerAuthenticationCode>${escapeXml(opts.cavv)}</PayerAuthenticationCode>`;
  } else if (["5", "7", "8"].includes(mdStatus)) {
    if (!opts.pan || !opts.expMonth || !opts.expYear || !opts.cv2) {
      return { ok: false, error: "Kart verisi bulunamadı (fallback işlem)." };
    }
    const exp = `${String(opts.expMonth).padStart(2, "0")}/${String(opts.expYear).slice(-2)}`;
    cardFields = `
    <Number>${escapeXml(opts.pan)}</Number>
    <Expires>${escapeXml(exp)}</Expires>
    <Cvv2Val>${escapeXml(opts.cv2)}</Cvv2Val>`;
  } else {
    return { ok: false, error: `Geçersiz mdStatus: ${mdStatus}` };
  }

  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?><CC5Request>${common}${cardFields}
</CC5Request>`;

  let res: Response;
  try {
    res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=UTF-8" },
      body: xmlBody,
      signal: AbortSignal.timeout(45_000),
    });
  } catch (e: unknown) {
    return {
      ok: false,
      error: `API bağlantı hatası: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const body = await res.text().catch(() => "");
  if (!res.ok || !body) {
    return { ok: false, error: `API HTTP hatası: ${res.status} (${apiUrl})` };
  }

  // Simple XML tag extractor (no external dependency)
  const get = (tag: string): string => {
    const m = body.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, "i"));
    return m ? m[1].trim() : "";
  };

  const apiResponse = get("Response");
  const procCode = get("ProcReturnCode");
  const transId = get("TransId");
  const errMsg = get("ErrMsg");

  const approved = apiResponse.toLowerCase() === "approved";
  const procOk = procCode === "00" || procCode === "0" || procCode === "";

  if (approved && procOk) {
    return { ok: true, transId, authCode: procCode };
  }

  return {
    ok: false,
    error: errMsg || apiResponse || "API işlem reddedildi.",
    transId,
  };
}

// ─── Result Token (HMAC) ──────────────────────────────────────────────────────

const PAYMENT_SECRET =
  process.env.PAYMENT_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  "payten-default-secret-change-me";

export function generateResultToken(orderId: number, status: string): string {
  return createHmac("sha256", PAYMENT_SECRET)
    .update(`${orderId}:${status}`)
    .digest("hex");
}

export function verifyResultToken(
  orderId: number,
  status: string,
  token: string
): boolean {
  const expected = generateResultToken(orderId, status);
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}
