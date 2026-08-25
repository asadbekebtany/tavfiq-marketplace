import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getAuditContextFromRequest, writeAuditLog } from "@/lib/audit-log";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  sellerId: z.string().min(1),
  action: z.enum(["approve", "reject", "ban", "unban"]),
  reason: z.string().trim().max(500).optional().nullable(),
});

export async function GET() {
  const { error } = await requirePermissionApi("sellers.view");
  if (error) return error;
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  const sellers = await prisma.seller.findMany({
    include: {
      user: true,
      store: {
        include: {
          _count: { select: { products: true, orders: true } },
        },
      },
      application: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const mapped = await Promise.all(
    sellers.map(async (seller) => {
      const revenueAgg = seller.store
        ? await prisma.order.aggregate({
            where: {
              storeId: seller.store.id,
              status: { in: ["paid", "accepted", "packing", "shipped", "ready_for_pickup", "delivered"] },
            },
            _sum: { total: true },
          })
        : { _sum: { total: null } };

      let status: "pending" | "approved" | "rejected" | "banned" = "pending";
      if (seller.isBanned) status = "banned";
      else if (seller.application?.status === "rejected") status = "rejected";
      else if (seller.isActive || seller.application?.status === "approved") status = "approved";
      else status = "pending";

      return {
        id: seller.id,
        name: seller.application?.contactName || seller.user.name || "—",
        store: seller.store?.name || seller.application?.companyName || "—",
        phone: seller.application?.phone || seller.user.phone,
        email: seller.application?.email || "",
        status,
        products: seller.store?._count.products ?? 0,
        orders: seller.store?._count.orders ?? 0,
        revenue: revenueAgg._sum.total ?? 0,
        commission: Math.round((revenueAgg._sum.total ?? 0) * 0.1),
        joinedAt: seller.createdAt.toISOString().slice(0, 10),
        inn: seller.application?.inn ?? undefined,
        applicationId: seller.application?.id,
        userId: seller.userId,
      };
    }),
  );

  return NextResponse.json({ sellers: mapped });
}

export async function PATCH(request: Request) {
  const { error, user: actor } = await requirePermissionApi("sellers.approve");
  if (error || !actor) return error;
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  try {
    const data = patchSchema.parse(await request.json());
    const seller = await prisma.seller.findUnique({
      where: { id: data.sellerId },
      include: { application: true, store: true, user: true },
    });
    if (!seller) return NextResponse.json({ error: "Sotuvchi topilmadi" }, { status: 404 });

    if (data.action === "approve") {
      await prisma.$transaction([
        prisma.seller.update({
          where: { id: seller.id },
          data: { isActive: true, isBanned: false },
        }),
        prisma.user.update({
          where: { id: seller.userId },
          data: { role: "seller" },
        }),
        ...(seller.application
          ? [
              prisma.sellerApplication.update({
                where: { id: seller.application.id },
                data: { status: "approved", rejectedReason: null },
              }),
            ]
          : []),
        ...(seller.store
          ? [
              prisma.store.update({
                where: { id: seller.store.id },
                data: { isVerified: true },
              }),
            ]
          : []),
      ]);
    } else if (data.action === "reject") {
      await prisma.$transaction([
        prisma.seller.update({
          where: { id: seller.id },
          data: { isActive: false },
        }),
        ...(seller.application
          ? [
              prisma.sellerApplication.update({
                where: { id: seller.application.id },
                data: { status: "rejected", rejectedReason: data.reason || "Rad etildi" },
              }),
            ]
          : []),
      ]);
    } else if (data.action === "ban") {
      await prisma.seller.update({
        where: { id: seller.id },
        data: { isBanned: true, isActive: false },
      });
    } else if (data.action === "unban") {
      await prisma.seller.update({
        where: { id: seller.id },
        data: { isBanned: false, isActive: seller.application?.status === "approved" },
      });
    }

    const auditContext = getAuditContextFromRequest(request);
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action:
        data.action === "ban" || data.action === "unban"
          ? "user_ban_update"
          : "user_role_update",
      entityType: "seller",
      entityId: seller.id,
      metadata: { action: data.action, reason: data.reason ?? null, userId: seller.userId },
      ...auditContext,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Yangilab bo‘lmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
