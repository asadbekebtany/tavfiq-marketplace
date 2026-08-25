import { getMarketplaceLabel } from "@/lib/brand";
import prisma from "@/lib/prisma";
import { checkDatabaseConnection, resolveDataSource } from "@/lib/db";
import {
  createOrder as createStoredOrder,
  getOrderById as getStoredOrderById,
  listOrders as listStoredOrders,
  updateOrderStatus as updateStoredOrderStatus,
  type OrderItemRecord,
  type OrderRecord,
} from "@/lib/orders-store";

export type { OrderRecord, OrderItemRecord };

export type OrderBuyer = {
  id: string;
  name: string;
  phone: string;
};

export type OrderAddressDetail = {
  name: string;
  phone: string;
  city: string;
  district?: string | null;
  street: string;
  building?: string | null;
  apartment?: string | null;
};

export type OrderPickupDetail = {
  name: string;
  address: string;
  phone?: string | null;
  workHours?: string | null;
};

export type OrderDetailRecord = OrderRecord & {
  buyer?: OrderBuyer;
  storeSellerUserId?: string;
  address?: OrderAddressDetail | null;
  pickupPoint?: OrderPickupDetail | null;
  note?: string | null;
  paymentStatus?: string;
  subtotal?: number;
  deliveryCost?: number;
  discount?: number;
};

export type OrderListRow = {
  id: string;
  userId: string;
  buyer: string;
  phone: string;
  store: string;
  product: string;
  total: number;
  status: string;
  date: string;
  payment: string;
  delivery: string;
};

const FALLBACK_BUYERS: Record<string, OrderBuyer> = {
  "user-1-id": { id: "user-1-id", name: "Aziz Karimov", phone: "+998901234567" },
  "user-2-id": { id: "user-2-id", name: "Dilnoza Yusupova", phone: "+998911234567" },
  "seller-id": { id: "seller-id", name: "Sarvar Yusupov", phone: "+998712000002" },
};

const SELLER_STORE_BY_USER: Record<string, string> = {
  "seller-id": "AutoParts Pro",
};

function summarizeItems(items: OrderItemRecord[]): string {
  if (items.length === 0) return "—";
  const first = items[0];
  const suffix = items.length > 1 ? ` +${items.length - 1}` : "";
  return `${first.name}${first.quantity > 1 ? ` ×${first.quantity}` : ""}${suffix}`;
}

function toListRow(order: OrderRecord, buyer?: OrderBuyer): OrderListRow {
  return {
    id: order.id,
    userId: order.userId,
    buyer: buyer?.name ?? "Foydalanuvchi",
    phone: buyer?.phone ?? "—",
    store: order.store,
    product: summarizeItems(order.items),
    total: order.total,
    status: order.status,
    date: new Date(order.createdAt).toLocaleDateString("uz-UZ"),
    payment: order.paymentMethod,
    delivery: order.deliveryType === "pickup" ? "Punkt" : "Kuryer",
  };
}

function mapDbOrder(order: {
  id: string;
  userId: string;
  status: string;
  total: number;
  deliveryType: string;
  paymentMethod: string;
  createdAt: Date;
  store: { name: string };
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string | null;
  }[];
}): OrderRecord {
  return {
    id: order.id,
    userId: order.userId,
    status: order.status,
    total: order.total,
    store: order.store.name,
    deliveryType: order.deliveryType,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image ?? undefined,
    })),
  };
}

export async function listOrders(userId?: string): Promise<OrderRecord[]> {
  const source = await resolveDataSource();
  if (source === "database") {
    try {
    const rows = await prisma.order.findMany({
      where: userId ? { userId } : undefined,
      include: {
        store: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
    if (rows.length > 0) return rows.map(mapDbOrder);
    } catch {
      // DB vaqtincha ishlamayapti
    }
  }
  if (source === "fallback") {
    return listStoredOrders(userId);
  }
  return [];
}

export async function getOrderById(id: string): Promise<OrderRecord | undefined> {
  const detail = await getOrderDetailById(id);
  return detail;
}

export async function getOrderDetailById(id: string): Promise<OrderDetailRecord | undefined> {
  if (await checkDatabaseConnection()) {
    try {
      const row = await prisma.order.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, phone: true } },
          store: {
            select: {
              name: true,
              seller: { select: { userId: true } },
            },
          },
          items: true,
          address: true,
          pickupPoint: true,
        },
      });
      if (!row) return undefined;
      return {
        ...mapDbOrder(row),
        buyer: {
          id: row.user.id,
          name: row.address?.name ?? row.user.name ?? "Foydalanuvchi",
          phone: row.address?.phone ?? row.user.phone ?? "—",
        },
        storeSellerUserId: row.store.seller.userId,
        address: row.address
          ? {
              name: row.address.name,
              phone: row.address.phone,
              city: row.address.city,
              district: row.address.district,
              street: row.address.street,
              building: row.address.building,
              apartment: row.address.apartment,
            }
          : null,
        pickupPoint: row.pickupPoint
          ? {
              name: row.pickupPoint.name,
              address: row.pickupPoint.address,
              phone: row.pickupPoint.phone,
              workHours: row.pickupPoint.workHours,
            }
          : null,
        note: row.note,
        paymentStatus: row.paymentStatus,
        subtotal: row.subtotal,
        deliveryCost: row.deliveryCost,
        discount: row.discount,
      };
    } catch {
      // DB vaqtincha ishlamayapti
    }
  }

  const source = await resolveDataSource();
  if (source !== "fallback") return undefined;

  const order = getStoredOrderById(id);
  if (!order) return undefined;
  const buyer = FALLBACK_BUYERS[order.userId];
  return {
    ...order,
    buyer,
    storeSellerUserId:
      Object.entries(SELLER_STORE_BY_USER).find(([, store]) => store === order.store)?.[0],
    address: buyer
      ? {
          name: buyer.name,
          phone: buyer.phone,
          city: "Toshkent",
          street: "Demo manzil",
        }
      : null,
    note: null,
  };
}

export async function listAdminOrderRows(): Promise<OrderListRow[]> {
  if (await checkDatabaseConnection()) {
    try {
      const rows = await prisma.order.findMany({
        include: {
          user: { select: { id: true, name: true, phone: true } },
          store: { select: { name: true } },
          items: true,
        },
        orderBy: { createdAt: "desc" },
      });
      if (rows.length > 0) {
        return rows.map((row) =>
          toListRow(mapDbOrder(row), {
            id: row.user.id,
            name: row.user.name ?? "Foydalanuvchi",
            phone: row.user.phone ?? "—",
          }),
        );
      }
    } catch {
      // fallback
    }
  }

  const source = await resolveDataSource();
  if (source !== "fallback") return [];

  return listStoredOrders().map((order) =>
    toListRow(order, FALLBACK_BUYERS[order.userId]),
  );
}

export async function listSellerOrderRows(
  sellerUserId: string,
  role: string,
): Promise<OrderListRow[]> {
  if (await checkDatabaseConnection()) {
    try {
      const where =
        role === "seller"
          ? { store: { seller: { userId: sellerUserId } } }
          : undefined;
      const rows = await prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, phone: true } },
          store: { select: { name: true } },
          items: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return rows.map((row) =>
        toListRow(mapDbOrder(row), {
          id: row.user.id,
          name: row.user.name ?? "Foydalanuvchi",
          phone: row.user.phone ?? "—",
        }),
      );
    } catch {
      // fallback
    }
  }

  const source = await resolveDataSource();
  if (source !== "fallback") return [];

  const storeName = SELLER_STORE_BY_USER[sellerUserId];
  const orders = listStoredOrders().filter(
    (order) => !storeName || order.store === storeName || role !== "seller",
  );
  return orders.map((order) => toListRow(order, FALLBACK_BUYERS[order.userId]));
}

type CreateOrderInput = {
  userId: string;
  items: OrderItemRecord[];
  deliveryType: string;
  paymentMethod: string;
  total: number;
  store?: string;
};

export async function createOrder(input: CreateOrderInput): Promise<OrderRecord> {
  if (await checkDatabaseConnection()) {
    try {
    const store = await prisma.store.findFirst();
    if (store) {
      const subtotal = input.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const row = await prisma.order.create({
        data: {
          userId: input.userId,
          storeId: store.id,
          status: "pending",
          deliveryType: input.deliveryType === "pickup" ? "pickup" : "courier",
          paymentMethod:
            input.paymentMethod === "card"
              ? "card"
              : input.paymentMethod === "payme"
                ? "payme"
                : input.paymentMethod === "click"
                  ? "click"
                  : "cash",
          subtotal,
          total: input.total,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              image: item.image,
              total: item.price * item.quantity,
            })),
          },
        },
        include: {
          store: { select: { name: true } },
          items: true,
        },
      });
      return mapDbOrder(row);
    }
    } catch {
      // JSON fallback
    }
  }

  const source = await resolveDataSource();
  if (source !== "fallback") {
    throw new Error("Buyurtma yaratish uchun database talab qilinadi.");
  }

  return createStoredOrder({
    userId: input.userId,
    status: "pending",
    total: input.total,
    store: input.store ?? getMarketplaceLabel(),
    deliveryType: input.deliveryType,
    paymentMethod: input.paymentMethod,
    items: input.items,
  });
}

export async function updateOrderStatus(
  id: string,
  status: string,
): Promise<OrderRecord | undefined> {
  if (await checkDatabaseConnection()) {
    try {
    const row = await prisma.order.update({
      where: { id },
      data: { status: status as never },
      include: {
        store: { select: { name: true } },
        items: true,
      },
    });
    if (status === "delivered") {
      const { creditOrderCashback } = await import("@/lib/bonus");
      await creditOrderCashback(id);
    }
    return mapDbOrder(row);
    } catch {
      // JSON fallback
    }
  }

  const source = await resolveDataSource();
  if (source !== "fallback") return undefined;

  return updateStoredOrderStatus(id, status);
}
