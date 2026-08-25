import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { getPlatformSettingsRaw } from "@/lib/platform-settings";
import { getAuditContextFromRequest, writeAuditLog } from "@/lib/audit-log";
import { z } from "zod";

export const dynamic = "force-dynamic";

const payoutSchema = z.object({
  storeId: z.string().min(1),
  amount: z.coerce.number().int().positive(),
  description: z.string().trim().max(300).optional().nullable(),
});

export async function GET() {
  const { error } = await requireSuperAdminApi();
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const { commissionPercent } = await getSiteSettings();
  const platform = getPlatformSettingsRaw();
  const rate = commissionPercent / 100;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [monthAgg, deliveredAgg, stores, ledgers] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: monthStart }, status: { notIn: ["cancelled", "returned"] } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { status: "delivered" },
      _sum: { total: true },
      _count: true,
    }),
    prisma.store.findMany({
      include: {
        seller: { include: { user: { select: { name: true, phone: true } } } },
        orders: {
          where: { status: { notIn: ["cancelled", "returned"] } },
          select: { id: true, total: true, status: true, createdAt: true },
        },
        finance: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    }),
    prisma.sellerFinance.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { store: { select: { name: true } } },
    }),
  ]);

  const settlements = stores.map((store) => {
    const gmv = store.orders.reduce((s, o) => s + o.total, 0);
    const delivered = store.orders
      .filter((o) => o.status === "delivered")
      .reduce((s, o) => s + o.total, 0);
    const commission = Math.round(delivered * rate);
    const paidOut = store.finance
      .filter((f) => f.type === "payout")
      .reduce((s, f) => s + f.amount, 0);
    const held = store.finance
      .filter((f) => f.type === "hold")
      .reduce((s, f) => s + f.amount, 0);
    const payable = Math.max(0, delivered - commission - paidOut - held);
    return {
      storeId: store.id,
      storeName: store.name,
      sellerName: store.seller.user.name ?? "—",
      sellerPhone: store.seller.user.phone ?? "—",
      orders: store.orders.length,
      gmv,
      delivered,
      commission,
      paidOut,
      held,
      payable,
      recentFinance: store.finance.slice(0, 5).map((f) => ({
        id: f.id,
        type: f.type,
        amount: f.amount,
        description: f.description,
        createdAt: f.createdAt.toISOString(),
      })),
    };
  });

  const totalPayable = settlements.reduce((s, row) => s + row.payable, 0);
  const totalCommission = settlements.reduce((s, row) => s + row.commission, 0);

  return NextResponse.json({
    commissionPercent,
    payoutHoldDays: platform.payoutHoldDays,
    summary: {
      monthGmv: monthAgg._sum.total ?? 0,
      monthOrders: monthAgg._count,
      deliveredGmv: deliveredAgg._sum.total ?? 0,
      deliveredOrders: deliveredAgg._count,
      totalCommission,
      totalPayable,
    },
    settlements: settlements.sort((a, b) => b.payable - a.payable),
    ledger: ledgers.map((row) => ({
      id: row.id,
      storeName: row.store.name,
      amount: row.amount,
      type: row.type,
      description: row.description,
      orderId: row.orderId,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const { error, user } = await requireSuperAdminApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = payoutSchema.parse(await request.json());
    const store = await prisma.store.findUnique({ where: { id: data.storeId } });
    if (!store) return NextResponse.json({ error: "Do‘kon topilmadi" }, { status: 404 });

    const row = await prisma.sellerFinance.create({
      data: {
        storeId: data.storeId,
        amount: data.amount,
        type: "payout",
        description: data.description || "Super admin to‘lovi",
      },
    });

    const auditContext = getAuditContextFromRequest(request);
    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "site_settings_update",
      entityType: "seller_finance",
      entityId: row.id,
      metadata: { storeId: data.storeId, amount: data.amount, type: "payout" },
      ...auditContext,
    });

    return NextResponse.json({ success: true, finance: row }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "To‘lov yozilmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
