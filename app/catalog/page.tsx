import Link from "next/link";
import { Suspense } from "react";
import { FilterSidebar } from "@/components/catalog/filter-sidebar";
import { CatalogProducts } from "@/components/catalog/catalog-products";
import { SortDropdown } from "@/components/catalog/sort-dropdown";
import { MobileFilters } from "@/components/catalog/mobile-filters";
import { ProductGridSkeleton } from "@/components/ui/skeleton";

interface CatalogPageProps {
  searchParams: Promise<{
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
  }>;
}

export const metadata = {
  title: "Katalog",
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-[1280px] px-3 py-4 sm:px-4 sm:py-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-[#004733]">Bosh sahifa</Link>
        <span className="mx-2 text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Katalog</span>
        {params.q && (
          <>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-gray-900">"{params.q}"</span>
          </>
        )}
      </nav>

      {/* Page title + sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-[#004733]/10">
        <div>
          <h1 className="text-xl font-bold text-[#002d21] sm:text-2xl">
            {params.q ? `"${params.q}" bo'yicha natijalar` : "Barcha mahsulotlar"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <MobileFilters />
          </Suspense>
          <Suspense fallback={null}>
            <SortDropdown currentSort={params.sort ?? "popular"} />
          </Suspense>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Filter sidebar */}
        <aside className="hidden lg:block w-[260px] shrink-0">
          <div className="sticky top-24">
            <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-white/60" />}>
              <FilterSidebar />
            </Suspense>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <Suspense fallback={<ProductGridSkeleton />}>
            <CatalogProducts searchParams={params} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
