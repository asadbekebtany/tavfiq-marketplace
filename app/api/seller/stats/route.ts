import { NextResponse } from "next/server";
import { requireSellerApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function sellerStore(userId: string, role: string) {
  if (role === "admin" || role === "super_admin") {
    return prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  }
  const seller = await prisma.seller.findUnique({
    where: { userId },
    include: { store: true },
  });
  return seller?.store ?? null;
}

export async function GET() {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const store = await sellerStore(user.id, user.role);
  if (!store) {
    return NextResponse.json({
      storeName: "Do‘kon",
      todayRevenue: 0,
      todayOrders: 0,
      activeProducts: 0,
      monthRevenue: 0,
      totalRevenue: 0,
      totalOrders: 0,
      cancelledCount: 0,
      returnedCount: 0,
      cancelRate: 0,
      returnRate: 0,
      pendingReturns: 0,
      unansweredReviews: 0,
      unansweredQuestions: 0,
      avgRating: 0,
      reviewCount: 0,
      recentOrders: [],
      lowStock: [],
      monthly: [],
      topProducts: [],
    });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const paidStatuses = [
    "paid",
    "accepted",
    "packing",
    "shipped",
    "ready_for_pickup",
    "delivered",
  ] as const;

  const [
    todayAgg,
    todayCount,
    monthAgg,
    totalAgg,
    totalOrders,
    activeProducts,
    recentOrders,
    lowStock,
    yearOrders,
    topRows,
    ratingAgg,
    cancelledCount,
    returnedCount,
    pendingReturns,
    unansweredReviews,
    unansweredQuestions,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { storeId: store.id, createdAt: { gte: startOfDay }, status: { in: [...paidStatuses] } },
      _sum: { total: true },
    }),
    prisma.order.count({
      where: { storeId: store.id, createdAt: { gte: startOfDay }, status: { notIn: ["cancelled"] } },
    }),
    prisma.order.aggregate({
      where: { storeId: store.id, createdAt: { gte: startOfMonth }, status: { in: [...paidStatuses] } },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: { storeId: store.id, status: { in: [...paidStatuses] } },
      _sum: { total: true },
    }),
    prisma.order.count({ where: { storeId: store.id } }),
    prisma.product.count({ where: { storeId: store.id, isActive: true, isApproved: true } }),
    prisma.order.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: { select: { phone: true, name: true } },
        items: { take: 1 },
      },
    }),
    prisma.product.findMany({
      where: { storeId: store.id, stock: { lte: 5 }, isActive: true },
      orderBy: { stock: "asc" },
      take: 5,
      select: { id: true, name: true, stock: true },
    }),
    prisma.order.findMany({
      where: {
        storeId: store.id,
        createdAt: { gte: startOfYear },
        status: { in: [...paidStatuses] },
      },
      select: { total: true, createdAt: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId", "name"],
      where: { order: { storeId: store.id, status: { in: [...paidStatuses] } } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.product.aggregate({
      where: { storeId: store.id, reviewCount: { gt: 0 } },
      _avg: { rating: true },
      _sum: { reviewCount: true },
    }),
    prisma.order.count({ where: { storeId: store.id, status: "cancelled" } }),
    prisma.order.count({ where: { storeId: store.id, status: "returned" } }),
    prisma.returnRequest.count({
      where: { order: { storeId: store.id }, status: "pending" },
    }),
    prisma.review.count({
      where: {
        product: { storeId: store.id },
        OR: [{ sellerReply: null }, { sellerReply: "" }],
      },
    }),
    prisma.question.count({
      where: {
        product: { storeId: store.id },
        answers: { none: { isSeller: true } },
      },
    }),
  ]);

  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    revenue: 0,
    orders: 0,
  }));
  for (const order of yearOrders) {
    const m = order.createdAt.getMonth();
    monthly[m].revenue += order.total;
    monthly[m].orders += 1;
  }

  const cancelRate = totalOrders > 0 ? Math.round((cancelledCount / totalOrders) * 1000) / 10 : 0;
  const returnRate = totalOrders > 0 ? Math.round((returnedCount / totalOrders) * 1000) / 10 : 0;

  return NextResponse.json({
    storeName: store.name,
    todayRevenue: todayAgg._sum.total ?? 0,
    todayOrders: todayCount,
    activeProducts,
    monthRevenue: monthAgg._sum.total ?? 0,
    totalRevenue: totalAgg._sum.total ?? 0,
    totalOrders,
    cancelledCount,
    returnedCount,
    cancelRate,
    returnRate,
    pendingReturns,
    unansweredReviews,
    unansweredQuestions,
    avgRating: Math.round((ratingAgg._avg.rating ?? 0) * 10) / 10,
    reviewCount: ratingAgg._sum.reviewCount ?? 0,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      product: o.items[0]?.name ?? "—",
      buyer: o.user.phone || o.user.name || "—",
      total: o.total,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
    lowStock,
    monthly,
    topProducts: topRows.map((row) => ({
      name: row.name,
      sold: row._sum.quantity ?? 0,
      revenue: row._sum.total ?? 0,
    })),
  });
}
