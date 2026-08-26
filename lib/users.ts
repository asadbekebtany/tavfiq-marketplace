import "server-only";
import type { User } from "@prisma/client";
import { checkDatabaseConnection } from "@/lib/db";
import { serverEnv } from "@/lib/env.server";
import { normalizePhone } from "@/lib/phone";
import { getRuntimeDatabaseUrl } from "@/lib/runtime-env";

export type AuthUserRecord = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  phone: string;
};

export type FindOrCreateUserResult = AuthUserRecord & {
  isNewUser: boolean;
};

export type UserPersistenceErrorCode =
  | "db_unavailable"
  | "create_failed"
  | "user_banned"
  | "user_inactive";

export class UserPersistenceError extends Error {
  readonly code: UserPersistenceErrorCode;

  constructor(message: string, code: UserPersistenceErrorCode) {
    super(message);
    this.name = "UserPersistenceError";
    this.code = code;
  }
}

/** DATABASE_URL yo‘q bo‘lganda demo panellar uchun fallback */
const DEV_FALLBACK_USERS: Record<string, AuthUserRecord> = {
  "+998712000000": {
    id: "super-admin-id",
    name: "Super Admin",
    role: "super_admin",
    phone: "+998712000000",
    email: null,
  },
  "+998712000001": {
    id: "admin-id",
    name: "Mahsulot Admin",
    role: "admin",
    phone: "+998712000001",
    email: null,
  },
  "+998712000002": {
    id: "seller-id",
    name: "Sarvar Yusupov",
    role: "seller",
    phone: "+998712000002",
    email: null,
  },
  "+998901234567": {
    id: "user-1-id",
    name: "Aziz Karimov",
    role: "customer",
    phone: "+998901234567",
    email: null,
  },
  "+998911234567": {
    id: "user-2-id",
    name: "Dilnoza Yusupova",
    role: "customer",
    phone: "+998911234567",
    email: null,
  },
};

function mapPrismaUser(user: User): AuthUserRecord {
  return {
    id: user.id,
    name: user.name ?? "Foydalanuvchi",
    email: user.email,
    role: user.role,
    phone: user.phone ?? "",
  };
}

function assertUserCanSignIn(user: User): void {
  if (user.isBanned) {
    throw new UserPersistenceError(
      "Hisobingiz bloklangan. Administrator bilan bog'laning.",
      "user_banned",
    );
  }

  if (!user.isActive) {
    throw new UserPersistenceError(
      "Hisobingiz faol emas. Administrator bilan bog'laning.",
      "user_inactive",
    );
  }
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

export async function findUserByPhone(phoneRaw: string): Promise<AuthUserRecord | null> {
  const phone = normalizePhone(phoneRaw);
  const { default: prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return null;
  assertUserCanSignIn(user);
  return mapPrismaUser(user);
}

export async function findOrCreateUserByPhone(
  phoneRaw: string,
): Promise<FindOrCreateUserResult> {
  const phone = normalizePhone(phoneRaw);
  const { default: prisma } = await import("@/lib/prisma");

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    assertUserCanSignIn(existing);
    return { ...mapPrismaUser(existing), isNewUser: false };
  }

  try {
    const created = await prisma.user.create({
      data: {
        phone,
        name: "Foydalanuvchi",
        role: "customer",
        isActive: true,
      },
    });

    return { ...mapPrismaUser(created), isNewUser: true };
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      const raced = await prisma.user.findUnique({ where: { phone } });
      if (raced) {
        assertUserCanSignIn(raced);
        return { ...mapPrismaUser(raced), isNewUser: false };
      }
    }

    throw new UserPersistenceError(
      "Foydalanuvchini saqlashda xatolik yuz berdi. Qayta urinib ko'ring.",
      "create_failed",
    );
  }
}

function resolveDevFallbackUser(phone: string): AuthUserRecord | null {
  return DEV_FALLBACK_USERS[phone] ?? null;
}

function resolveEphemeralGuestUser(phone: string): AuthUserRecord {
  return {
    id: `guest-${Date.now()}`,
    name: "Foydalanuvchi",
    email: null,
    role: "customer",
    phone,
  };
}

export async function persistUserAfterOtpVerification(
  phoneRaw: string,
): Promise<FindOrCreateUserResult> {
  const phone = normalizePhone(phoneRaw);

  if (getRuntimeDatabaseUrl() && (await checkDatabaseConnection())) {
    return findOrCreateUserByPhone(phone);
  }

  if (serverEnv.hasDatabase && getRuntimeDatabaseUrl()) {
    throw new UserPersistenceError(
      "Ma'lumotlar bazasiga ulanish yo'q. Foydalanuvchi saqlanmadi.",
      "db_unavailable",
    );
  }

  const fallback = resolveDevFallbackUser(phone);
  if (fallback) {
    return { ...fallback, isNewUser: false };
  }

  return { ...resolveEphemeralGuestUser(phone), isNewUser: true };
}

export async function resolveAuthUser(phoneRaw: string): Promise<AuthUserRecord | null> {
  const phone = normalizePhone(phoneRaw);

  if (getRuntimeDatabaseUrl() && (await checkDatabaseConnection())) {
    return findOrCreateUserByPhone(phone);
  }

  if (serverEnv.hasDatabase && getRuntimeDatabaseUrl()) {
    throw new UserPersistenceError(
      "Ma'lumotlar bazasiga ulanish yo'q. Kirish vaqtincha mumkin emas.",
      "db_unavailable",
    );
  }

  const fallback = resolveDevFallbackUser(phone);
  if (fallback) return fallback;

  return resolveEphemeralGuestUser(phone);
}

export function isRealDatabaseUserId(userId: string): boolean {
  return !userId.startsWith("guest-");
}
