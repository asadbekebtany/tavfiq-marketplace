import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { mockProducts } from "@/lib/mock-data";
import { getSessionUser, requireSellerApi } from "@/lib/api-auth";
import { checkDatabaseConnection, databaseUnavailableResponse, resolveDataSource } from "@/lib/db";
import prisma from "@/lib/prisma";
import { productCreateSchema, productListQuerySchema, validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";

type ProductSort = "cheap" | "expensive" | "rating" | "new" | "discount" | string;

type DbProductRow = Awaited<
  ReturnType<
    typeof prisma.product.findMany<{
      include: {
        images: true;
        brand: { select: { name: true; slug: true } };
        category: { select: { id: true; name: true; slug: true } };
        store: { select: { id: true; name: true; isVerified: true; seller: { select: { userId: true } } } };
      };
    }>
  >
>[number];

function mapProduct(product: DbProductRow) {
  return {
    ...product,
    subtitle: product.oemNumber ?? product.brand?.name ?? undefined,
  };
}

async function sellerStoreId(userId: string): Promise<string | null> {
  const seller = await prisma.seller.findUnique({
    where: { userId },
    include: { store: { select: { id: true } } },
  });
  return seller?.store?.id ?? null;
}

function sortMockProducts(products: typeof mockProducts, sort: ProductSort) {
  switch (sort) {
    case "cheap": return products.sort((a, b) => a.price - b.price);
    case "expensive": return products.sort((a, b) => b.price - a.price);
    case "rating": return products.sort((a, b) => b.rating - a.rating);
    case "new": return products.sort((a, b) => b.id.localeCompare(a.id));
    case "discount": return products.sort((a, b) => b.discount - a.discount);
    default: return products.sort((a, b) => b.soldCount - a.soldCount);
  }
}

export async function GET(request: NextRequest) {
  const parsed = productListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const sessionUser = await getSessionUser();

  const source = await resolveDataSource();

  if (source === "database") {
    const where: Prisma.ProductWhereInput = {};

    if (!parsed.admin && !parsed.mine) {
      where.isActive = true;
      where.isApproved = true;
    }

    if (parsed.mine) {
      if (!sessionUser) return NextResponse.json({ error: "Login talab qilinadi." }, { status: 401 });
      if (sessionUser.role === "seller") {
        const storeId = await sellerStoreId(sessionUser.id);
        if (!storeId) return NextResponse.json({ products: [], total: 0, page: parsed.page, limit: parsed.limit, totalPages: 0 });
        where.storeId = storeId;
      } else if (sessionUser.role !== "admin" && sessionUser.role !== "super_admin") {
        return NextResponse.json({ error: "Huquq yetarli emas." }, { status: 403 });
      }
    }

    if (parsed.admin) {
      if (!sessionUser || (sessionUser.role !== "admin" && sessionUser.role !== "super_admin")) {
        return NextResponse.json({ error: "Admin huquqi talab qilinadi." }, { status: 403 });
      }
    }

    if (parsed.q) {
      where.OR = [
        { name: { contains: parsed.q, mode: "insensitive" } },
        { nameRu: { contains: parsed.q, mode: "insensitive" } },
        { oemNumber: { contains: parsed.q, mode: "insensitive" } },
        { brand: { name: { contains: parsed.q, mode: "insensitive" } } },
      ];
    }

    if (parsed.category) {
      where.category = { slug: parsed.category };
    }

    if (parsed.brand) {
      where.brand = { slug: parsed.brand };
    }

    where.price = { gte: parsed.minPrice, lte: parsed.maxPrice };

    const orderBy =
      parsed.sort === "cheap" ? { price: "asc" as const } :
      parsed.sort === "expensive" ? { price: "desc" as const } :
      parsed.sort === "rating" ? { rating: "desc" as const } :
      parsed.sort === "new" ? { createdAt: "desc" as const } :
      parsed.sort === "discount" ? { discount: "desc" as const } :
      { soldCount: "desc" as const };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          brand: { select: { name: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
          store: { select: { id: true, name: true, isVerified: true, seller: { select: { userId: true } } } },
        },
      }),
    ]);

    return NextResponse.json({
      products: products.map(mapProduct),
      total,
      page: parsed.page,
      limit: parsed.limit,
      totalPages: Math.ceil(total / parsed.limit),
    });
  }

  if (source === "unavailable") {
    return NextResponse.json(databaseUnavailableResponse(), { status: 503 });
  }

  if (parsed.admin || parsed.mine) {
    return NextResponse.json(
      { error: "Admin va seller mahsulotlari uchun database talab qilinadi." },
      { status: 503 },
    );
  }

  let products = [...mockProducts].filter((p) => p.isApproved && p.isActive);
  if (parsed.q) products = products.filter((p) => p.name.toLowerCase().includes(parsed.q.toLowerCase()) || p.brand?.name.toLowerCase().includes(parsed.q.toLowerCase()));
  if (parsed.category) products = products.filter((p) => p.category.slug === parsed.category || p.category.name.toLowerCase() === parsed.category.toLowerCase());
  if (parsed.brand) products = products.filter((p) => p.brand?.name.toLowerCase() === parsed.brand.toLowerCase());
  products = products.filter((p) => p.price >= parsed.minPrice && p.price <= parsed.maxPrice);
  sortMockProducts(products, parsed.sort);

  const total = products.length;
  const paginated = products.slice((parsed.page - 1) * parsed.limit, parsed.page * parsed.limit);
  return NextResponse.json({ products: paginated, total, page: parsed.page, limit: parsed.limit, totalPages: Math.ceil(total / parsed.limit) });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) return NextResponse.json({ error: "Database ulanmagan. Mahsulot saqlanmadi." }, { status: 503 });

  try {
    const data = productCreateSchema.parse(await request.json());
    let storeId: string | null = null;

    if (user.role === "seller") {
      storeId = await sellerStoreId(user.id);
      if (!storeId) return NextResponse.json({ error: "Seller store topilmadi." }, { status: 403 });
    } else {
      const store = await prisma.store.findFirst({ select: { id: true } });
      storeId = store?.id ?? null;
      if (!storeId) return NextResponse.json({ error: "Store topilmadi." }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        storeId,
        categoryId: data.categoryId,
        brandId: data.brandId ?? null,
        name: data.name,
        nameRu: data.nameRu ?? null,
        slug: data.slug,
        description: data.description ?? null,
        descriptionRu: data.descriptionRu ?? null,
        sku: data.sku ?? null,
        oemNumber: data.oemNumber ?? null,
        crossNumbers: data.crossNumbers,
        price: data.price,
        oldPrice: data.oldPrice ?? null,
        stock: data.stock,
        warranty: data.warranty ?? null,
        returnPolicy: data.returnPolicy ?? null,
        weight: data.weight ?? null,
        isActive: data.isActive,
        isApproved: user.role === "admin" || user.role === "super_admin",
        images: { create: data.images.map((url, sortOrder) => ({ url, sortOrder })) },
      },
      include: { images: true, brand: true, category: true, store: true },
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    return NextResponse.json(validationError(error), { status: 400 });
  }
}
