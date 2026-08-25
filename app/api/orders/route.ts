import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser, requireAdminApi, requireSessionUser } from "@/lib/api-auth";
import { getAuditContextFromRequest, writeAuditLog } from "@/lib/audit-log";
import { checkDatabaseConnection, databaseUnavailableResponse, resolveDataSource } from "@/lib/db";
import prisma from "@/lib/prisma";
import { createOrder, listAdminOrderRows, listOrders, updateOrderStatus } from "@/lib/orders";
import type { OrderItemRecord } from "@/lib/orders-store";
import { isRealDatabaseUserId } from "@/lib/users";
import { orderCreateSchema, orderStatusSchema, validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";

type CartOrderItem = {
  productId: string;
  quantity: number;
  product: {
    storeId: string;
    name: string;
    price: number;
    stock: number;
    images: { url: string }[];
  };
};

function calcCouponDiscount(
  coupon: { type: string; value: number; minOrder: number | null; maxUses: number | null; usedCount: number; isActive: boolean; expiresAt: Date | null },
  subtotal: number,
): number {
  if (!coupon.isActive) return 0;
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return 0;
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return 0;
  if (coupon.minOrder != null && subtotal < coupon.minOrder) return 0;
  if (coupon.type === "fixed") return Math.min(coupon.value, subtotal);
  return Math.min(Math.round((subtotal * coupon.value) / 100), subtotal);
}

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const isAdminRequest = searchParams.get("admin") === "true";

  if (isAdminRequest) {
    const { error } = await requireAdminApi();
    if (error) return error;
  } else if (!sessionUser) {
    return NextResponse.json({ error: "Buyurtmalarni ko‘rish uchun tizimga kiring." }, { status: 401 });
  }

  const source = await resolveDataSource();

  if (source === "database") {
    const where = isAdminRequest ? {} : { userId: sessionUser?.id };
    const statusWhere = status && status !== "all" && status !== "active" ? { status: status as never } : {};
    const rows = await prisma.order.findMany({
      where: { ...where, ...statusWhere },
      include: { store: true, items: true, user: { select: { id: true, name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    });
    const orders = status === "active" ? rows.filter((order: { status: string }) => !["delivered", "cancelled", "returned"].includes(order.status)) : rows;
    return NextResponse.json({ orders });
  }

  if (source === "unavailable") {
    return NextResponse.json(databaseUnavailableResponse(), { status: 503 });
  }

  if (isAdminRequest) {
    const rows = await listAdminOrderRows();
    let orders = rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      total: row.total,
      status: row.status,
      paymentMethod: row.payment,
      deliveryType: row.delivery === "Punkt" ? "pickup" : "courier",
      createdAt: new Date().toISOString(),
      user: { name: row.buyer, phone: row.phone },
      store: { name: row.store },
      items: row.product === "—" ? [] : [{ name: row.product, quantity: 1 }],
    }));
    if (status && status !== "all") {
      if (status === "active") {
        orders = orders.filter((order) => !["delivered", "cancelled", "returned"].includes(order.status));
      } else {
        orders = orders.filter((order) => order.status === status);
      }
    }
    return NextResponse.json({ orders });
  }

  let orders = await listOrders(sessionUser?.id);
  if (status && status !== "all") {
    if (status === "active") {
      orders = orders.filter((order) => !["delivered", "cancelled", "returned"].includes(order.status));
    } else {
      orders = orders.filter((order) => order.status === status);
    }
  }

  return NextResponse.json({ orders });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;

  if (await checkDatabaseConnection()) {
    try {
      const data = orderCreateSchema.parse(await request.json().catch(() => ({})));
      const cartItems = await prisma.cartItem.findMany({
        where: { userId: user.id },
        include: {
          product: {
            include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
          },
        },
      });

      if (cartItems.length === 0) return NextResponse.json({ error: "Savat bo‘sh" }, { status: 400 });

      for (const item of cartItems) {
        if (item.product.stock < item.quantity) {
          return NextResponse.json(
            { error: `"${item.product.name}" omborda yetarli emas (qoldiq: ${item.product.stock})` },
            { status: 400 },
          );
        }
      }

      let addressId = data.addressId ?? null;
      if (!addressId && data.address && data.deliveryType === "courier") {
        const createdAddress = await prisma.address.create({
          data: {
            userId: user.id,
            name: data.address.name,
            phone: data.address.phone,
            city: data.address.city,
            district: data.address.district ?? null,
            street: data.address.street,
            building: data.address.building ?? null,
            apartment: data.address.apartment ?? null,
            isDefault: true,
          },
        });
        addressId = createdAddress.id;
      }

      const byStore = new Map<string, CartOrderItem[]>();
      for (const item of cartItems as CartOrderItem[]) {
        const items = byStore.get(item.product.storeId) ?? [];
        items.push(item);
        byStore.set(item.product.storeId, items);
      }

      const couponCode = data.couponCode?.trim().toUpperCase() || null;
      const coupon = couponCode
        ? await prisma.coupon.findUnique({ where: { code: couponCode } })
        : null;
      if (couponCode && !coupon) {
        return NextResponse.json({ error: "Kupon kodi topilmadi" }, { status: 400 });
      }

      const grandSubtotal = cartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0,
      );
      const deliveryCost = data.deliveryType === "pickup" ? 0 : grandSubtotal >= 500_000 ? 0 : 30_000;
      const totalDiscount = coupon ? calcCouponDiscount(coupon, grandSubtotal) : 0;
      if (couponCode && totalDiscount <= 0) {
        return NextResponse.json({ error: "Kupon ushbu buyurtmaga qo‘llanilmaydi" }, { status: 400 });
      }

      const storeEntries = [...byStore.entries()];
      const orders = await prisma.$transaction(async (tx) => {
        const created = [];
        let remainingDiscount = totalDiscount;

        for (let i = 0; i < storeEntries.length; i++) {
          const [storeId, items] = storeEntries[i];
          const subtotal = items.reduce(
            (sum: number, item: CartOrderItem) => sum + item.product.price * item.quantity,
            0,
          );
          const share =
            i === storeEntries.length - 1
              ? remainingDiscount
              : Math.round((totalDiscount * subtotal) / Math.max(grandSubtotal, 1));
          remainingDiscount -= share;
          const storeDelivery = i === 0 ? deliveryCost : 0;
          const total = Math.max(0, subtotal + storeDelivery - share);

          const order = await tx.order.create({
            data: {
              userId: user.id,
              storeId,
              addressId,
              pickupPointId: data.deliveryType === "pickup" ? data.pickupPointId ?? null : null,
              deliveryType: data.deliveryType,
              paymentMethod: data.paymentMethod,
              subtotal,
              deliveryCost: storeDelivery,
              discount: share,
              total,
              couponCode,
              note: data.note ?? null,
              items: {
                create: items.map((item: CartOrderItem) => ({
                  productId: item.productId,
                  name: item.product.name,
                  image: item.product.images[0]?.url ?? null,
                  price: item.product.price,
                  quantity: item.quantity,
                  total: item.product.price * item.quantity,
                })),
              },
            },
            include: { store: true, items: true },
          });

          for (const item of items) {
            const updated = await tx.product.updateMany({
              where: { id: item.productId, stock: { gte: item.quantity } },
              data: {
                stock: { decrement: item.quantity },
                soldCount: { increment: item.quantity },
              },
            });
            if (updated.count === 0) {
              throw new Error(`STOCK:${item.product.name}`);
            }
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: "out",
                quantity: item.quantity,
                reason: `order:${order.id}`,
              },
            });
          }

          created.push(order);
        }

        if (coupon && totalDiscount > 0) {
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }

        await tx.cartItem.deleteMany({ where: { userId: user.id } });
        return created;
      });

      try {
        const firstId = orders[0]?.id;
        if (firstId) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: "order",
              title: "Buyurtma qabul qilindi",
              message: `Buyurtmangiz #${firstId.slice(0, 8)} qabul qilindi. Holatni profilingizdan kuzating.`,
              link: `/profile/orders/${firstId}`,
            },
          });
        }

        // Sotuvchilarga yangi buyurtma haqida
        const storeIds = [...new Set(orders.map((o) => o.storeId).filter(Boolean))];
        if (storeIds.length > 0) {
          const stores = await prisma.store.findMany({
            where: { id: { in: storeIds } },
            include: { seller: { select: { userId: true } } },
          });
          await prisma.notification.createMany({
            data: stores.map((s) => {
              const order = orders.find((o) => o.storeId === s.id);
              return {
                userId: s.seller.userId,
                type: "order" as const,
                title: "Yangi buyurtma",
                message: `Yangi buyurtma #${(order?.id ?? "").slice(0, 8)} — ${(order?.total ?? 0).toLocaleString("uz-UZ")} so‘m`,
                link: order ? `/seller/orders/${order.id}` : "/seller/orders",
              };
            }),
          });
        }
      } catch {
        // notification ixtiyoriy — buyurtma allaqachon yaratilgan
      }

      return NextResponse.json({ success: true, orderId: orders[0]?.id, orders }, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("STOCK:")) {
        return NextResponse.json(
          { error: `"${err.message.slice(6)}" omborda yetarli emas` },
          { status: 400 },
        );
      }
      return NextResponse.json(validationError(err), { status: 400 });
    }
  }

  const body = (await request.json()) as {
    items?: OrderItemRecord[];
    deliveryType?: string;
    paymentMethod?: string;
    total?: number;
    store?: string;
  };
  const items = body.items ?? [];
  if (items.length === 0) return NextResponse.json({ error: "Savat bo‘sh" }, { status: 400 });
  if (!isRealDatabaseUserId(user.id)) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  const total =
    typeof body.total === "number"
      ? body.total
      : items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = await createOrder({
    userId: user.id,
    items,
    deliveryType: body.deliveryType ?? "courier",
    paymentMethod: body.paymentMethod ?? "cash",
    total,
    store: body.store,
  });
  return NextResponse.json({ success: true, orderId: order.id, order });
}

export async function PATCH(request: NextRequest) {
  const { error, user: actor } = await requireAdminApi();
  if (error || !actor) return error;

  const body = (await request.json()) as { orderId?: string; status?: string };
  const statusResult = orderStatusSchema.safeParse({ status: body.status });
  if (!body.orderId || !statusResult.success) {
    return NextResponse.json({ error: "orderId va to‘g‘ri status majburiy" }, { status: 400 });
  }

  if (await checkDatabaseConnection()) {
    const existing = await prisma.order.findUnique({
      where: { id: body.orderId },
      select: { id: true, status: true, userId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    }

    const order = await prisma.order.update({
      where: { id: body.orderId },
      data: { status: statusResult.data.status },
      include: { items: true, store: true },
    });

    if (statusResult.data.status === "delivered") {
      const { creditOrderCashback } = await import("@/lib/bonus");
      await creditOrderCashback(body.orderId);
    }

    const auditContext = getAuditContextFromRequest(request);
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "order_status_update",
      entityType: "order",
      entityId: body.orderId,
      metadata: {
        orderId: body.orderId,
        previousStatus: existing.status,
        newStatus: statusResult.data.status,
        customerUserId: existing.userId,
      },
      ...auditContext,
    });

    return NextResponse.json({ success: true, order });
  }

  const order = await updateOrderStatus(body.orderId, statusResult.data.status);
  if (!order) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
  return NextResponse.json({ success: true, order });
}
