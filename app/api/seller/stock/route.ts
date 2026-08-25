import { NextResponse } from "next/server";
import { requireSellerApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSellerStoreForUser } from "@/lib/seller-store";
import { getPlatformSettingsRaw } from "@/lib/platform-settings";
import { z } from "zod";

export const dynamic = "force-dynamic";

const adjustSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(["in", "out", "adjustment"]),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().trim().max(300).optional().nullable(),
});

export async function GET() {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const store = await getSellerStoreForUser(user.id, user.role);
  if (!store) {
    return NextResponse.json({ products: [], movements: [], lowStockThreshold: 5 });
  }

  const threshold = getPlatformSettingsRaw().lowStockThreshold;

  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: store.id, isActive: true },
      orderBy: { stock: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        soldCount: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      },
    }),
    prisma.stockMovement.findMany({
      where: { product: { storeId: store.id } },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { product: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({
    lowStockThreshold: threshold,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      stock: p.stock,
      soldCount: p.soldCount,
      image: p.images[0]?.url ?? null,
      low: p.stock <= threshold,
    })),
    movements: movements.map((m) => ({
      id: m.id,
      productName: m.product.name,
      type: m.type,
      quantity: m.quantity,
      reason: m.reason,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const store = await getSellerStoreForUser(user.id, user.role);
    if (!store) return NextResponse.json({ error: "Do‘kon topilmadi" }, { status: 404 });

    const data = adjustSchema.parse(await request.json());
    const product = await prisma.product.findFirst({
      where: { id: data.productId, storeId: store.id },
    });
    if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });

    let nextStock = product.stock;
    if (data.type === "in") nextStock += data.quantity;
    else if (data.type === "out") nextStock = Math.max(0, nextStock - data.quantity);
    else nextStock = data.quantity; // adjustment = set absolute via quantity as new stock delta? Better: adjustment sets absolute

    // For adjustment: quantity is the NEW absolute stock
    if (data.type === "adjustment") {
      nextStock = data.quantity;
    }

    const delta =
      data.type === "adjustment"
        ? nextStock - product.stock
        : data.type === "in"
          ? data.quantity
          : -Math.min(product.stock, data.quantity);

    const [updated, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        data: { stock: nextStock },
      }),
      prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: data.type,
          quantity: Math.abs(delta) || data.quantity,
          reason: data.reason || (data.type === "in" ? "Kirim" : data.type === "out" ? "Chiqim" : "Tuzatish"),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      product: { id: updated.id, stock: updated.stock },
      movement,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Zaxira yangilanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
