import { unstable_noStore as noStore } from "next/cache";
import { BannerSlider } from "@/components/home/banner-slider";
import { CategoryCarousel } from "@/components/home/category-carousel";
import { BrandCarousel } from "@/components/home/brand-carousel";
import { ProductSection } from "@/components/home/product-section";
import { CarSelector } from "@/components/home/car-selector";
import { Headset, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { getActiveSlides } from "@/lib/hero-slides";
import { listCatalogProducts } from "@/lib/products";

const advantages = [
  { icon: ShieldCheck, title: "100% sifat kafolati", desc: "Rasmiy mahsulotlar" },
  { icon: Truck, title: "Bepul yetkazib berish", desc: "500 000 so‘mdan" },
  { icon: RotateCcw, title: "14 kun ichida qaytarish", desc: "Oson va tez" },
  { icon: Headset, title: "24/7 qo‘llab-quvvatlash", desc: "Doim siz bilan" },
];

export default async function HomePage() {
  noStore();

  const heroSlides = getActiveSlides().map((slide) => ({
    id: slide.id,
    title: slide.title,
    subtitle: slide.subtitle,
    description: slide.description,
    discountText: slide.discountText,
    buttonText: slide.buttonText,
    buttonUrl: slide.buttonUrl,
    imageUrl: slide.imageUrl,
  }));

  // WB joylashuv: hero → kategoriyalar → tavsiya → chegirma → brendlar → yangi → katalog
  const empty = { products: [] as Awaited<ReturnType<typeof listCatalogProducts>>["products"] };

  const [recommended, discount, newest, catalog] = await Promise.all([
    listCatalogProducts({ sort: "popular", limit: 12, featured: true }).catch(() => empty),
    listCatalogProducts({ sort: "discount", limit: 12 }).catch(() => empty),
    listCatalogProducts({ sort: "new", limit: 12 }).catch(() => empty),
    listCatalogProducts({ sort: "popular", limit: 24 }).catch(() => empty),
  ]);

  const recommendProducts =
    recommended.products.length > 0
      ? recommended.products
      : (await listCatalogProducts({ sort: "popular", limit: 12 }).catch(() => empty)).products;

  return (
    <div className="min-h-screen overflow-x-clip bg-green-ornament">
      <section className="relative overflow-hidden border-b border-[#f5b51b]/25 bg-ikat">
        <div className="absolute inset-0 bg-[#012a1f]/22" />
        <div className="relative mx-auto max-w-[1280px] px-3 py-3 sm:px-4 sm:py-5 lg:px-4 lg:py-6">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] lg:items-stretch lg:gap-4">
            <BannerSlider slides={heroSlides} />
            <CarSelector />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] space-y-7 px-3 pb-8 pt-4 sm:space-y-8 sm:px-4 sm:pb-10 sm:pt-5">
        <CategoryCarousel />
        <ProductSection
          title="Siz uchun tavsiya"
          href="/catalog?sort=popular"
          products={recommendProducts}
          badge="TOP"
        />
        <ProductSection
          title="Chegirmadagi mahsulotlar"
          href="/catalog?sort=discount"
          products={discount.products}
          badge="Aksiya"
        />
        <BrandCarousel />
        <ProductSection
          title="Yangi kelganlar"
          href="/catalog?sort=new"
          products={newest.products}
          badge="Yangi"
        />
        <ProductSection title="Katalogdan tanlang" href="/catalog" products={catalog.products} />
      </div>

      <section className="relative">
        <div className="h-3.5 bg-ikat" />
        <div className="bg-[#002d21]">
          <div className="mx-auto grid max-w-[1280px] grid-cols-2 divide-x divide-[#f5b51b]/15 px-2 sm:px-4 md:grid-cols-4">
            {advantages.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex min-w-0 items-start gap-2 px-2 py-4 sm:items-center sm:gap-3 sm:px-4 sm:py-5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#f5b51b]/25 bg-[#f5b51b]/10 sm:h-11 sm:w-11">
                    <Icon size={20} className="text-[#f5b51b] sm:size-[22px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight text-white sm:text-sm">{item.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#cdd6cf] sm:text-xs">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="h-3.5 bg-ikat" />
      </section>
    </div>
  );
}
