import { SignJWT, jwtVerify } from "jose";
import type { AuthSession, CustomerSession } from "@/types";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-secret-change-in-production"
);

export async function signToken(payload: AuthSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as AuthSession;
  } catch {
    return null;
  }
}

export async function signCustomerToken(payload: CustomerSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyCustomerToken(token: string): Promise<CustomerSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const data = payload as unknown as CustomerSession;
    if (data.role !== "customer") return null;
    return data;
  } catch {
    return null;
  }
}
