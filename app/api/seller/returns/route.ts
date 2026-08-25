import { NextResponse } from "next/server";
import { requireSellerApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSellerStoreForUser } from "@/lib/seller-store";
import { returnStatusSchema, validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const store = await getSellerStoreForUser(user.id, user.role);
  if (!store) return NextResponse.json({ returns: [] });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "";

  const returns = await prisma.returnRequest.findMany({
    where: {
      order: { storeId: store.id },
      ...(status && status !== "all" ? { status: status as "pending" | "approved" | "rejected" | "completed" } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, phone: true } },
      order: { select: { id: true, total: true, status: true } },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    returns: returns.map((r) => ({
      id: r.id,
      status: r.status,
      reason: r.reason,
      comment: r.comment,
      images: r.images,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      buyer: { name: r.user.name, phone: r.user.phone },
      order: {
        id: r.order.id,
        orderNumber: r.order.id.slice(-8).toUpperCase(),
        total: r.order.total,
        status: r.order.status,
      },
      items: r.items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        name: it.product.name,
        image: it.product.images[0]?.url ?? null,
      })),
    })),
  });
}

export async function PATCH(request: Request) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const store = await getSellerStoreForUser(user.id, user.role);
    if (!store) return NextResponse.json({ error: "Do‘kon topilmadi" }, { status: 404 });

    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "id majburiy" }, { status: 400 });
    const { status } = returnStatusSchema.parse(body);

    if (!["approved", "rejected", "completed"].includes(status)) {
      return NextResponse.json(
        { error: "Seller faqat approved / rejected / completed qo‘yishi mumkin" },
        { status: 400 },
      );
    }

    const existing = await prisma.returnRequest.findFirst({
      where: { id, order: { storeId: store.id } },
      include: { items: true, order: { select: { id: true, userId: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Qaytarish topilmadi" }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.returnRequest.update({ where: { id }, data: { status } });

      if (status === "completed") {
        await tx.order.update({
          where: { id: existing.orderId },
          data: { status: "returned" },
        });
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: "return",
              quantity: item.quantity,
              reason: `Qaytarish #${id.slice(-6)}`,
            },
          });
        }
      }

      await tx.notification.create({
        data: {
          userId: existing.order.userId,
          type: "return",
          title: "Qaytarish yangilandi",
          message: `Sotuvchi qaytarish holatini o‘zgartirdi: ${status}`,
          link: "/profile/returns",
        },
      });

      return row;
    });

    return NextResponse.json({ success: true, returnRequest: updated });
  } catch (err) {
    return NextResponse.json(validationError(err), { status: 400 });
  }
}
