import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

function createAdapter() {
  const url = process.env.DATABASE_URL ?? "";
  // mysql://user:pass@host:port/db or mysql://user:pass@host/db
  const match = url.match(/^mysql:\/\/([^:]+):([^@]*)@([^:/]+)(?::(\d+))?\/(.+)$/);
  if (match) {
    const [, user, password, host, port, database] = match;
    return new PrismaMariaDb({
      host,
      port: port ? parseInt(port, 10) : 3306,
      user,
      password,
      database,
    });
  }
  throw new Error(`DATABASE_URL geçersiz veya eksik: "${url}"`);
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

globalForPrisma.prisma = prisma;
