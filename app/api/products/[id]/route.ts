import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { productUpdateSchema, validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

const productInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  store: { select: { id: true, name: true, isVerified: true, seller: { select: { userId: true } } } },
} as const;

async function canManageProduct(userId: string, role: string, productId: string): Promise<boolean> {
  if (role === "admin" || role === "super_admin") return true;
  if (role !== "seller") return false;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { store: { select: { seller: { select: { userId: true } } } } },
  });
  return product?.store.seller.userId === userId;
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Login talab qilinadi." }, { status: 401 });
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const { id } = await context.params;
  if (!(await canManageProduct(user.id, user.role, id))) {
    return NextResponse.json({ error: "Bu mahsulotni ko‘rish huquqingiz yo‘q." }, { status: 403 });
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });
  if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });

  return NextResponse.json({
    product: {
      ...product,
      subtitle: product.oemNumber ?? product.brand?.name ?? undefined,
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Login talab qilinadi." }, { status: 401 });
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  const { id } = await context.params;
  if (!(await canManageProduct(user.id, user.role, id))) {
    return NextResponse.json({ error: "Bu mahsulotni o‘zgartirish huquqingiz yo‘q." }, { status: 403 });
  }

  try {
    const data = productUpdateSchema.parse(await request.json());
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.nameRu !== undefined ? { nameRu: data.nameRu } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.descriptionRu !== undefined ? { descriptionRu: data.descriptionRu } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.brandId !== undefined ? { brandId: data.brandId } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.oldPrice !== undefined ? { oldPrice: data.oldPrice } : {}),
        ...(data.stock !== undefined ? { stock: data.stock } : {}),
        ...(data.sku !== undefined ? { sku: data.sku } : {}),
        ...(data.oemNumber !== undefined ? { oemNumber: data.oemNumber } : {}),
        ...(data.crossNumbers !== undefined ? { crossNumbers: data.crossNumbers } : {}),
        ...(data.warranty !== undefined ? { warranty: data.warranty } : {}),
        ...(data.returnPolicy !== undefined ? { returnPolicy: data.returnPolicy } : {}),
        ...(data.weight !== undefined ? { weight: data.weight } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...((user.role === "admin" || user.role === "super_admin") && data.isApproved !== undefined ? { isApproved: data.isApproved } : {}),
        ...((user.role === "admin" || user.role === "super_admin") && data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
        ...(data.images !== undefined ? { images: { deleteMany: {}, create: data.images.map((url, sortOrder) => ({ url, sortOrder })) } } : {}),
      },
      include: { images: true, brand: true, category: true, store: true },
    });
    return NextResponse.json({ success: true, product });
  } catch (error) {
    return NextResponse.json(validationError(error), { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Login talab qilinadi." }, { status: 401 });
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });

  const { id } = await context.params;
  if (!(await canManageProduct(user.id, user.role, id))) {
    return NextResponse.json({ error: "Bu mahsulotni o‘chirish huquqingiz yo‘q." }, { status: 403 });
  }

  await prisma.product.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
