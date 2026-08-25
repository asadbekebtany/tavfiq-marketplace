import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().trim().min(3).max(200),
  comment: z.string().trim().max(1000).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(999),
      }),
    )
    .min(1),
});

export async function GET() {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const returns = await prisma.returnRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      order: { select: { id: true, total: true, status: true, store: { select: { name: true } } } },
      items: { include: { product: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({
    returns: returns.map((row) => ({
      id: row.id,
      reason: row.reason,
      comment: row.comment,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      orderId: row.order.id,
      orderTotal: row.order.total,
      storeName: row.order.store.name,
      items: row.items.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
      })),
    })),
  });
}

export async function POST(request: Request) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = createSchema.parse(await request.json());
    const order = await prisma.order.findFirst({
      where: { id: data.orderId, userId: user.id },
      include: { items: true },
    });
    if (!order) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    if (order.status !== "delivered") {
      return NextResponse.json(
        { error: "Faqat yetkazilgan buyurtmani qaytarish mumkin" },
        { status: 400 },
      );
    }

    const existing = await prisma.returnRequest.findFirst({
      where: { orderId: order.id, status: { in: ["pending", "approved"] } },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu buyurtma uchun ariza allaqachon mavjud" }, { status: 409 });
    }

    const orderProductQty = new Map(order.items.map((item) => [item.productId, item.quantity]));
    for (const item of data.items) {
      const maxQty = orderProductQty.get(item.productId) ?? 0;
      if (maxQty < item.quantity) {
        return NextResponse.json({ error: "Qaytarish miqdori buyurtmadan oshib ketdi" }, { status: 400 });
      }
    }

    const created = await prisma.returnRequest.create({
      data: {
        userId: user.id,
        orderId: order.id,
        reason: data.reason,
        comment: data.comment ?? null,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: { include: { product: { select: { name: true } } } },
      },
    });

    return NextResponse.json({ success: true, returnRequest: created }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Arizani yaratib bo‘lmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
