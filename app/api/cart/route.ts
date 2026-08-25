import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { cartPatchSchema, cartUpsertSchema, validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  const items = await prisma.cartItem.findMany({
    where: { userId: user.id },
    include: {
      product: {
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          brand: { select: { name: true } },
          store: { select: { name: true, slug: true, isVerified: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      },
      variant: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  try {
    const data = cartUpsertSchema.parse(await request.json());
    const product = await prisma.product.findFirst({
      where: { id: data.productId, isActive: true, isApproved: true },
      select: { id: true, stock: true },
    });
    if (!product) return NextResponse.json({ error: "Mahsulot topilmadi." }, { status: 404 });
    if (product.stock < data.quantity) return NextResponse.json({ error: "Omborda yetarli mahsulot yo‘q." }, { status: 400 });

    const item = await prisma.cartItem.upsert({
      where: { userId_productId_variantId: { userId: user.id, productId: data.productId, variantId: data.variantId ?? "" } },
      update: { quantity: { increment: data.quantity } },
      create: { userId: user.id, productId: data.productId, variantId: data.variantId ?? null, quantity: data.quantity },
    }).catch(async () => {
      const existing = await prisma.cartItem.findFirst({ where: { userId: user.id, productId: data.productId, variantId: data.variantId ?? null } });
      if (existing) {
        return prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + data.quantity } });
      }
      return prisma.cartItem.create({ data: { userId: user.id, productId: data.productId, variantId: data.variantId ?? null, quantity: data.quantity } });
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    return NextResponse.json(validationError(error), { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  const productId = searchParams.get("productId");

  if (itemId) {
    await prisma.cartItem.deleteMany({ where: { id: itemId, userId: user.id } });
  } else if (productId) {
    await prisma.cartItem.deleteMany({ where: { productId, userId: user.id } });
  } else {
    await prisma.cartItem.deleteMany({ where: { userId: user.id } });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = cartPatchSchema.parse(await request.json());
    const existing = await prisma.cartItem.findFirst({
      where: { id: data.itemId, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Savat elementi topilmadi." }, { status: 404 });
    }

    if (data.quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: existing.id } });
      return NextResponse.json({ success: true, removed: true });
    }

    const product = await prisma.product.findFirst({
      where: { id: existing.productId, isActive: true, isApproved: true },
      select: { stock: true },
    });

    if (!product) {
      await prisma.cartItem.delete({ where: { id: existing.id } });
      return NextResponse.json({ error: "Mahsulot endi mavjud emas." }, { status: 404 });
    }

    if (product.stock < data.quantity) {
      return NextResponse.json({ error: "Omborda yetarli mahsulot yo‘q." }, { status: 400 });
    }

    const item = await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: data.quantity },
    });

    return NextResponse.json({ success: true, item });
  } catch (err) {
    return NextResponse.json(validationError(err), { status: 400 });
  }
}
