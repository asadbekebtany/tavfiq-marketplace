import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serverEnv } from "@/lib/env.server";
import { checkDatabaseConnection } from "@/lib/db";
import { getRuntimeDatabaseUrl } from "@/lib/runtime-env";
import {
  hasPermission,
  type AdminRoleType,
  type Role,
  ROLE_HIERARCHY,
} from "@/lib/permissions";

export type SessionUser = {
  id: string;
  role: Role;
  adminRole?: AdminRoleType | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user = session.user as { id?: string; role?: string };
  if (!user.id) return null;

  const role = isRole(user.role) ? user.role : "customer";
  return { id: user.id, role };
}

function isRole(value: unknown): value is Role {
  return (
    value === "customer" ||
    value === "seller" ||
    value === "admin" ||
    value === "super_admin"
  );
}

function isAdminRoleType(value: unknown): value is AdminRoleType {
  return (
    value === "super_admin" ||
    value === "product_manager" ||
    value === "order_manager" ||
    value === "seller_manager" ||
    value === "content_manager" ||
    value === "support_manager" ||
    value === "finance_manager"
  );
}

function unauthorized(message = "Avtorizatsiya talab qilinadi. Iltimos, tizimga kiring.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

function forbidden(message = "Bu amal uchun huquqingiz yetarli emas.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) {
    return { error: unauthorized(), user: null as null };
  }
  return { error: null, user };
}

export function hasRole(user: SessionUser, allowedRoles: Role[]): boolean {
  if (user.role === "super_admin") return true;
  return allowedRoles.includes(user.role);
}

export function isAtLeastRole(user: SessionUser, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole];
}

export async function requireRoleApi(allowedRoles: Role[]) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return { error, user: null as null };

  if (!hasRole(user, allowedRoles)) {
    return { error: forbidden(), user: null as null };
  }

  return { error: null, user };
}

export async function requireAdminApi() {
  if (serverEnv.lockAdminApi) {
    return {
      error: forbidden("Admin API vaqtincha bloklangan. LOCK_ADMIN_API qiymatini tekshiring"),
      user: null as null,
    };
  }

  return requireRoleApi(["admin", "super_admin"]);
}

export async function requireSuperAdminApi() {
  return requireRoleApi(["super_admin"]);
}

/** Admin granular permission (Admin.role jadvalidan). Super admin har doim o‘tadi. */
export async function requirePermissionApi(permission: string) {
  const { error, user } = await requireAdminApi();
  if (error || !user) {
    return { error, user: null as null, adminRole: null as AdminRoleType | null };
  }

  if (user.role === "super_admin") {
    return {
      error: null,
      user: { ...user, adminRole: "super_admin" as const },
      adminRole: "super_admin" as const,
    };
  }

  if (!getRuntimeDatabaseUrl() || !(await checkDatabaseConnection())) {
    return { error: null, user, adminRole: null as AdminRoleType | null };
  }

  const { default: prisma } = await import("@/lib/prisma");
  const admin = await prisma.admin.findUnique({
    where: { userId: user.id },
    select: { role: true },
  });
  const adminRole = isAdminRoleType(admin?.role) ? admin.role : "product_manager";

  if (!hasPermission(adminRole, permission)) {
    return {
      error: forbidden(`Huquq yetarli emas: ${permission}`),
      user: null as null,
      adminRole,
    };
  }

  return { error: null, user: { ...user, adminRole }, adminRole };
}

export async function requireSellerApi() {
  return requireRoleApi(["seller", "admin", "super_admin"]);
}

export function canAccessOrder(
  user: { id: string; role: string },
  orderUserId: string,
  orderStoreSellerUserId?: string,
): boolean {
  if (user.id === orderUserId) return true;
  if (orderStoreSellerUserId && user.id === orderStoreSellerUserId) return true;
  return user.role === "admin" || user.role === "super_admin";
}

export function canManageUserRole(currentUser: SessionUser, targetRole: Role): boolean {
  if (currentUser.role !== "super_admin") return false;
  if (targetRole === "super_admin" && currentUser.role !== "super_admin") return false;
  return true;
}
