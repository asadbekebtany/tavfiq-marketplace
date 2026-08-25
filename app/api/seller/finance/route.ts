import { NextResponse } from "next/server";
import { requireSellerApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSellerStoreForUser } from "@/lib/seller-store";
import { getSiteSettings } from "@/lib/site-settings";
import { getPlatformSettingsRaw } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const store = await getSellerStoreForUser(user.id, user.role);
  if (!store) {
    return NextResponse.json({ error: "Do‘kon topilmadi" }, { status: 404 });
  }

  const { commissionPercent } = await getSiteSettings();
  const platform = getPlatformSettingsRaw();
  const rate = commissionPercent / 100;

  const [orders, finance] = await Promise.all([
    prisma.order.findMany({
      where: { storeId: store.id, status: { notIn: ["cancelled"] } },
      select: { id: true, total: true, status: true, createdAt: true },
    }),
    prisma.sellerFinance.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const gmv = orders.reduce((s, o) => s + o.total, 0);
  const delivered = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.total, 0);
  const inProgress = orders
    .filter((o) => !["delivered", "returned"].includes(o.status))
    .reduce((s, o) => s + o.total, 0);
  const commission = Math.round(delivered * rate);
  const paidOut = finance.filter((f) => f.type === "payout").reduce((s, f) => s + f.amount, 0);
  const held = finance.filter((f) => f.type === "hold").reduce((s, f) => s + f.amount, 0);
  const available = Math.max(0, delivered - commission - paidOut - held);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthDelivered = orders
    .filter((o) => o.status === "delivered" && o.createdAt >= monthStart)
    .reduce((s, o) => s + o.total, 0);

  return NextResponse.json({
    storeName: store.name,
    commissionPercent,
    payoutHoldDays: platform.payoutHoldDays,
    summary: {
      gmv,
      delivered,
      inProgress,
      commission,
      paidOut,
      held,
      available,
      monthDelivered,
      monthCommission: Math.round(monthDelivered * rate),
      orderCount: orders.length,
    },
    ledger: finance.map((f) => ({
      id: f.id,
      amount: f.amount,
      type: f.type,
      description: f.description,
      orderId: f.orderId,
      createdAt: f.createdAt.toISOString(),
    })),
  });
}
