import { PrismaClient } from "@prisma/client";
import { getRuntimeDatabaseUrl } from "@/lib/runtime-env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const url = getRuntimeDatabaseUrl();
  if (!url) {
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        if (prop === "then") return undefined;
        throw new Error("DATABASE_URL sozlanmagan");
      },
    });
  }

  return new PrismaClient({
    datasources: {
      db: { url },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production" && getRuntimeDatabaseUrl()) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
