import "server-only";
import type { Prisma } from "@prisma/client";
import type { CatalogProduct } from "@/lib/catalog-product";
import { getRuntimeDatabaseUrl } from "@/lib/runtime-env";
import { mockProducts } from "@/lib/mock-data";

export type ProductListParams = {
  q?: string;
  category?: string;
  brand?: string;
  sort?: string;
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  inStock?: boolean;
  hasDiscount?: boolean;
  minRating?: number;
};

function splitCsv(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export type ProductListResult = {
  products: CatalogProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const productInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  brand: { select: { name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  store: { select: { id: true, name: true, slug: true, isVerified: true } },
} satisfies Prisma.ProductInclude;

type DbProductRow = {
  id: string;
  name: string;
  oemNumber: string | null;
  slug: string;
  price: number;
  oldPrice: number | null;
  discount: number;
  rating: number;
  reviewCount: number;
  stock: number;
  soldCount: number;
  isActive: boolean;
  isApproved: boolean;
  isFeatured: boolean;
  images: { url: string }[];
  brand: { name: string } | null;
  store: { name: string; slug: string; isVerified: boolean };
  category: { id: string; name: string; slug: string };
};

function mapDbProduct(product: DbProductRow): CatalogProduct {
  return {
    id: product.id,
    name: product.name,
    subtitle: product.oemNumber ?? product.brand?.name ?? undefined,
    slug: product.slug,
    price: product.price,
    oldPrice: product.oldPrice ?? undefined,
    discount: product.discount,
    rating: product.rating,
    reviewCount: product.reviewCount,
    stock: product.stock,
    soldCount: product.soldCount,
    isActive: product.isActive,
    isApproved: product.isApproved,
    isFeatured: product.isFeatured,
    images: product.images.map((image) => ({ url: image.url })),
    brand: product.brand ? { name: product.brand.name } : null,
    store: {
      name: product.store.name,
      slug: product.store.slug,
      isVerified: product.store.isVerified,
    },
    category: product.category,
  };
}

function sortMockProducts(products: CatalogProduct[], sort: string) {
  const copy = [...products];
  switch (sort) {
    case "cheap":
      return copy.sort((a, b) => a.price - b.price);
    case "expensive":
      return copy.sort((a, b) => b.price - a.price);
    case "rating":
      return copy.sort((a, b) => b.rating - a.rating);
    case "new":
      return copy.sort((a, b) => b.id.localeCompare(a.id));
    case "discount":
      return copy.sort((a, b) => b.discount - a.discount);
    default:
      return copy.sort((a, b) => b.soldCount - a.soldCount);
  }
}

function filterMockProducts(params: ProductListParams): CatalogProduct[] {
  let products = mockProducts.filter((product) => product.isApproved && product.isActive);

  if (params.featured) {
    products = products.filter((product) => product.isFeatured);
  }

  if (params.q) {
    const q = params.q.toLowerCase();
    products = products.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        product.brand?.name.toLowerCase().includes(q) ||
        product.category.name.toLowerCase().includes(q) ||
        product.store.name.toLowerCase().includes(q),
    );
  }

  const categories = splitCsv(params.category);
  if (categories.length > 0) {
    products = products.filter((product) => categories.includes(product.category.slug));
  }

  const brands = splitCsv(params.brand).map((b) => b.toLowerCase());
  if (brands.length > 0) {
    products = products.filter((product) => {
      const name = product.brand?.name?.toLowerCase() ?? "";
      return brands.some((b) => name === b || name.replace(/\s+/g, "-") === b);
    });
  }

  const minPrice = params.minPrice ?? 0;
  const maxPrice = params.maxPrice ?? 999_999_999;
  products = products.filter((product) => product.price >= minPrice && product.price <= maxPrice);

  if (params.inStock) {
    products = products.filter((product) => product.stock > 0);
  }
  if (params.hasDiscount) {
    products = products.filter((product) => product.discount > 0 || Boolean(product.oldPrice));
  }
  if (params.minRating) {
    products = products.filter((product) => product.rating >= (params.minRating ?? 0));
  }

  return sortMockProducts(products, params.sort ?? "popular");
}

function buildOrderBy(sort: string): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "cheap":
      return { price: "asc" };
    case "expensive":
      return { price: "desc" };
    case "rating":
      return { rating: "desc" };
    case "new":
      return { createdAt: "desc" };
    case "discount":
      return { discount: "desc" };
    default:
      return { soldCount: "desc" };
  }
}

function buildWhere(params: ProductListParams): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    isApproved: true,
  };

  if (params.featured) {
    where.isFeatured = true;
  }

  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { nameRu: { contains: params.q, mode: "insensitive" } },
      { oemNumber: { contains: params.q, mode: "insensitive" } },
      { brand: { name: { contains: params.q, mode: "insensitive" } } },
      { store: { name: { contains: params.q, mode: "insensitive" } } },
    ];
  }

  const categories = splitCsv(params.category);
  if (categories.length === 1) {
    where.category = { slug: categories[0] };
  } else if (categories.length > 1) {
    where.category = { slug: { in: categories } };
  }

  const brands = splitCsv(params.brand);
  if (brands.length > 0) {
    where.brand = {
      OR: [
        { slug: { in: brands } },
        { name: { in: brands, mode: "insensitive" } },
      ],
    };
  }

  where.price = {
    gte: params.minPrice ?? 0,
    lte: params.maxPrice ?? 999_999_999,
  };

  if (params.inStock) {
    where.stock = { gt: 0 };
  }
  if (params.hasDiscount) {
    where.AND = [
      ...((where.AND as Prisma.ProductWhereInput[] | undefined) ?? []),
      { OR: [{ discount: { gt: 0 } }, { oldPrice: { not: null } }] },
    ];
  }
  if (params.minRating) {
    where.rating = { gte: params.minRating };
  }

  return where;
}

function mockResult(params: ProductListParams): ProductListResult {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const sort = params.sort ?? "popular";
  const filtered = filterMockProducts({ ...params, sort });
  const total = filtered.length;
  return {
    products: filtered.slice((page - 1) * limit, page * limit),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function listCatalogProducts(
  params: ProductListParams = {},
): Promise<ProductListResult> {
  // Netlify demo: DATABASE_URL yo‘q — Prisma engine yuklanmasin
  if (!getRuntimeDatabaseUrl()) {
    return mockResult(params);
  }

  try {
    const { resolveDataSource } = await import("@/lib/db");
    const source = await resolveDataSource();
    if (source !== "database") return mockResult(params);

    const { default: prisma } = await import("@/lib/prisma");
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const sort = params.sort ?? "popular";
    const where = buildWhere(params);
    const [total, rows] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: buildOrderBy(sort),
        skip: (page - 1) * limit,
        take: limit,
        include: productInclude,
      }),
    ]);

    return {
      products: rows.map((row) => mapDbProduct(row as unknown as DbProductRow)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  } catch {
    return mockResult(params);
  }
}

export async function getCatalogProductBySlug(slug: string): Promise<CatalogProduct | null> {
  if (!getRuntimeDatabaseUrl()) {
    return (
      mockProducts.find(
        (product) => product.slug === slug && product.isActive && product.isApproved,
      ) ?? null
    );
  }

  try {
    const { resolveDataSource } = await import("@/lib/db");
    const source = await resolveDataSource();
    if (source !== "database") {
      return (
        mockProducts.find(
          (product) => product.slug === slug && product.isActive && product.isApproved,
        ) ?? null
      );
    }

    const { default: prisma } = await import("@/lib/prisma");
    const product = await prisma.product.findFirst({
      where: { slug, isActive: true, isApproved: true },
      include: productInclude,
    });
    return product ? mapDbProduct(product as unknown as DbProductRow) : null;
  } catch {
    return (
      mockProducts.find(
        (product) => product.slug === slug && product.isActive && product.isApproved,
      ) ?? null
    );
  }
}

export async function getRelatedCatalogProducts(
  categorySlug: string,
  excludeId: string,
  limit = 5,
): Promise<CatalogProduct[]> {
  const result = await listCatalogProducts({
    category: categorySlug,
    limit: limit + 1,
    sort: "popular",
  });

  return result.products.filter((product) => product.id !== excludeId).slice(0, limit);
}
