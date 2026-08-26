import { getRuntimeDatabaseUrl } from "@/lib/runtime-env";

type PrismaClient = import("@prisma/client").PrismaClient;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * @prisma/client static import qilinmaydi — Netlify’da native engine 500 beradi.
 * Faqat DATABASE_URL bo‘lsa require qilinadi.
 */
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

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient: Client } = require("@prisma/client") as typeof import("@prisma/client");
  return new Client({
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
