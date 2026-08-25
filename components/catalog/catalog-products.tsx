import { Suspense } from "react";
import { ProductGrid } from "@/components/product/product-grid";
import { CatalogPagination } from "@/components/catalog/pagination";
import { listCatalogProducts } from "@/lib/products";

interface CatalogProductsProps {
  searchParams: {
    q?: string;
    sort?: string;
    category?: string;
    brand?: string;
    minPrice?: string;
    maxPrice?: string;
    carMake?: string;
    carModel?: string;
    page?: string;
    inStock?: string;
    discount?: string;
    rating?: string;
  };
}

export async function CatalogProducts({ searchParams }: CatalogProductsProps) {
  const page = Number(searchParams.page ?? "1") || 1;
  const minPrice = searchParams.minPrice ? Number(searchParams.minPrice) : undefined;
  const maxPrice = searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined;
  const minRating = searchParams.rating ? Number(searchParams.rating) : undefined;

  const { products, total, totalPages } = await listCatalogProducts({
    q: searchParams.q,
    sort: searchParams.sort ?? "popular",
    category: searchParams.category,
    brand: searchParams.brand,
    minPrice,
    maxPrice,
    page,
    limit: 24,
    inStock: searchParams.inStock === "1" || searchParams.inStock === "true",
    hasDiscount: searchParams.discount === "1" || searchParams.discount === "true",
    minRating: Number.isFinite(minRating) ? minRating : undefined,
  });

  return (
    <div>
      <p className="mb-4 text-sm text-gray-600">
        <span className="font-bold text-[#004733]">{total}</span> ta mahsulot topildi
      </p>
      <ProductGrid products={products} />
      <Suspense fallback={null}>
        <CatalogPagination page={page} totalPages={totalPages} total={total} />
      </Suspense>
    </div>
  );
}
