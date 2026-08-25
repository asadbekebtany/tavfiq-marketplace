import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import {
  PERMISSIONS,
  type AdminRoleType,
} from "@/lib/permissions";

export const dynamic = "force-dynamic";

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

export async function GET() {
  const { error, user } = await requireAdminApi();
  if (error || !user) return error;

  if (user.role === "super_admin") {
    return NextResponse.json({
      userId: user.id,
      role: user.role,
      adminRole: "super_admin" as const,
      permissions: ["*"],
    });
  }

  let adminRole: AdminRoleType = "product_manager";
  if (await checkDatabaseConnection()) {
    const admin = await prisma.admin.findUnique({
      where: { userId: user.id },
      select: { role: true, permissions: true },
    });
    if (isAdminRoleType(admin?.role)) adminRole = admin.role;
  }

  const permissions = PERMISSIONS[adminRole] ?? [];
  return NextResponse.json({
    userId: user.id,
    role: user.role,
    adminRole,
    permissions,
  });
}
