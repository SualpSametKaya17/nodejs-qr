import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

function createAdapter() {
  const url = process.env.DATABASE_URL ?? "";
  // mysql://user:pass@host:port/db
  const match = url.match(/^mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)$/);
  if (match) {
    const [, user, password, host, port, database] = match;
    return new PrismaMariaDb({
      host,
      port: parseInt(port, 10),
      user,
      password,
      database,
    });
  }
  // Fallback: bağlantı string'i doğrudan ver
  return new PrismaMariaDb({ host: "localhost", user: "root", password: "password", database: "qr_menu_saas" });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: createAdapter(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
