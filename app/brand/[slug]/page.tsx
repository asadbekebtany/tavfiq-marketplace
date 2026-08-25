import { notFound } from "next/navigation";
import { Award } from "lucide-react";
import { InfoPage } from "@/components/ui/info-page";
import { getBrand } from "@/lib/brands-store";
import { mockProducts } from "@/lib/mock-data";
import { ProductGrid } from "@/components/product/product-grid";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = getBrand(slug);
  if (!brand) notFound();

  const { siteName } = await getSiteSettings();
  const products = mockProducts.filter(
    (p) => p.brand?.name.toLowerCase() === brand.name.toLowerCase(),
  );

  return (
    <InfoPage
      title={brand.name}
      description={`${brand.country} brendi. ${siteName} katalogida ${brand.count} dan ortiq mahsulot.`}
      icon={Award}
      backHref="/brands"
    >
      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        <div className="rounded-2xl border border-dashed border-[#cbd8d0] bg-[#f7f9f6] p-10 text-center text-gray-500">
          Bu brend mahsulotlari katalogga qo‘shilmoqda.
        </div>
      )}
    </InfoPage>
  );
}
