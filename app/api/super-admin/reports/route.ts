import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireSuperAdminApi();
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const paid = ["paid", "accepted", "packing", "shipped", "ready_for_pickup", "delivered"] as const;

  const [
    users,
    sellers,
    pendingSellers,
    products,
    pendingProducts,
    ordersToday,
    gmvToday,
    ordersMonth,
    gmvMonth,
    pendingReturns,
    openTickets,
    pendingReviews,
    unansweredQuestions,
    pickupActive,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.seller.count(),
    prisma.seller.count({ where: { isActive: false, isBanned: false } }),
    prisma.product.count(),
    prisma.product.count({ where: { isApproved: false } }),
    prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: startOfDay }, status: { in: [...paid] } },
      _sum: { total: true },
    }),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: startOfMonth }, status: { in: [...paid] } },
      _sum: { total: true },
    }),
    prisma.returnRequest.count({ where: { status: "pending" } }),
    prisma.supportTicket.count({ where: { status: "open" } }),
    prisma.review.count({ where: { isApproved: false } }),
    prisma.question.count({ where: { answers: { none: {} } } }),
    prisma.pickupPoint.count({ where: { isActive: true } }),
  ]);

  return NextResponse.json({
    usersByRole: Object.fromEntries(users.map((u) => [u.role, u._count._all])),
    sellers,
    pendingSellers,
    products,
    pendingProducts,
    ordersToday,
    gmvToday: gmvToday._sum.total ?? 0,
    ordersMonth,
    gmvMonth: gmvMonth._sum.total ?? 0,
    pendingReturns,
    openTickets,
    pendingReviews,
    unansweredQuestions,
    pickupActive,
  });
}
