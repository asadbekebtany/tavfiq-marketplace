import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { mockProducts } from "@/lib/mock-data";
import { databaseUnavailableResponse, resolveDataSource } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const popularSearches = [
  "Michelin 205/55 R16",
  "Shell 5W-40",
  "Bosch akkumulyator",
  "Mann filter",
  "TyreWorld",
  "AutoParts Pro",
  "Continental R17",
  "Castrol 5W-30",
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], stores: [], popular: popularSearches, suggestions: [] });
  }

  const source = await resolveDataSource();

  if (source === "database") {
    const [products, stores] = await Promise.all([
      prisma.product.findMany({
        where: {
          isActive: true,
          isApproved: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { nameRu: { contains: q, mode: "insensitive" } },
            { oemNumber: { contains: q, mode: "insensitive" } },
            { brand: { name: { contains: q, mode: "insensitive" } } },
            { category: { name: { contains: q, mode: "insensitive" } } },
            { store: { name: { contains: q, mode: "insensitive" } } },
          ],
        },
        take: 8,
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          brand: { select: { name: true } },
          category: { select: { name: true } },
          store: { select: { name: true, slug: true } },
        },
      }),
      prisma.store.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
          seller: { isActive: true, isBanned: false },
        },
        take: 5,
        include: {
          _count: { select: { products: { where: { isActive: true, isApproved: true } } } },
        },
      }),
    ]);

    const results = products.map((product) => ({
      id: product.id,
      type: "product" as const,
      name: product.name,
      slug: product.slug,
      href: `/product/${product.slug}`,
      price: product.price,
      image: product.images[0]?.url,
      category: product.category.name,
      brand: product.brand?.name,
      store: product.store.name,
    }));

    const storeResults = stores.map((store) => ({
      id: store.id,
      type: "store" as const,
      name: store.name,
      slug: store.slug,
      href: `/store/${store.slug}`,
      image: store.logo,
      productCount: store._count.products,
      city: store.city,
      isVerified: store.isVerified,
    }));

    const suggestions = [
      ...storeResults.map((s) => s.name),
      ...results.map((p) => p.name),
    ].slice(0, 8);

    return NextResponse.json({
      results,
      stores: storeResults,
      suggestions,
      popular: popularSearches,
    });
  }

  if (source === "unavailable") {
    return NextResponse.json(
      { results: [], stores: [], suggestions: [], popular: popularSearches, ...databaseUnavailableResponse() },
      { status: 503 },
    );
  }

  const ql = q.toLowerCase();

  const results = mockProducts
    .filter(
      (p) =>
        p.isActive &&
        p.isApproved &&
        (p.name.toLowerCase().includes(ql) ||
          p.brand?.name.toLowerCase().includes(ql) ||
          p.category.name.toLowerCase().includes(ql) ||
          p.store.name.toLowerCase().includes(ql)),
    )
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      type: "product" as const,
      name: p.name,
      slug: p.slug,
      href: `/product/${p.slug}`,
      price: p.price,
      image: p.images[0]?.url,
      category: p.category.name,
      brand: p.brand?.name,
      store: p.store.name,
    }));

  const storeMap = new Map<string, { name: string; count: number }>();
  for (const p of mockProducts) {
    if (!p.store.name.toLowerCase().includes(ql)) continue;
    const prev = storeMap.get(p.store.name) ?? { name: p.store.name, count: 0 };
    prev.count += 1;
    storeMap.set(p.store.name, prev);
  }

  const storeResults = [...storeMap.values()].slice(0, 5).map((s) => {
    const slug = s.name.toLowerCase().replace(/\s+/g, "-");
    return {
      id: slug,
      type: "store" as const,
      name: s.name,
      slug,
      href: `/store/${slug}`,
      image: null as string | null,
      productCount: s.count,
      city: null as string | null,
      isVerified: true,
    };
  });

  const suggestions = [...storeResults.map((s) => s.name), ...results.map((p) => p.name)].slice(0, 8);

  return NextResponse.json({
    results,
    stores: storeResults,
    suggestions,
    popular: popularSearches,
  });
}
