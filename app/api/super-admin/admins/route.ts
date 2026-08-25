import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getAdminRoleLabel, type AdminRoleType } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireSuperAdminApi();
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const admins = await prisma.user.findMany({
    where: { role: { in: ["admin", "super_admin"] } },
    orderBy: { createdAt: "desc" },
    include: {
      admin: true,
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { action: true, createdAt: true, entityType: true },
      },
      _count: { select: { auditLogs: true } },
    },
  });

  return NextResponse.json({
    admins: admins.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      isBanned: u.isBanned,
      createdAt: u.createdAt.toISOString(),
      adminRole: (u.admin?.role ?? null) as AdminRoleType | null,
      adminRoleLabel: u.admin?.role ? getAdminRoleLabel(u.admin.role as AdminRoleType) : null,
      permissions: u.admin?.permissions ?? [],
      auditCount: u._count.auditLogs,
      lastAction: u.auditLogs[0]
        ? {
            action: u.auditLogs[0].action,
            entityType: u.auditLogs[0].entityType,
            createdAt: u.auditLogs[0].createdAt.toISOString(),
          }
        : null,
    })),
  });
}
