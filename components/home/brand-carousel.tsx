import Link from "next/link";

const brands = [
  { slug: "michelin", name: "Michelin", country: "🇫🇷" },
  { slug: "bridgestone", name: "Bridgestone", country: "🇯🇵" },
  { slug: "continental", name: "Continental", country: "🇩🇪" },
  { slug: "pirelli", name: "Pirelli", country: "🇮🇹" },
  { slug: "goodyear", name: "Goodyear", country: "🇺🇸" },
  { slug: "nokian", name: "Nokian", country: "🇫🇮" },
  { slug: "shell", name: "Shell", country: "🇳🇱" },
  { slug: "mobil", name: "Mobil", country: "🇺🇸" },
  { slug: "castrol", name: "Castrol", country: "🇬🇧" },
  { slug: "bosch", name: "Bosch", country: "🇩🇪" },
  { slug: "denso", name: "Denso", country: "🇯🇵" },
  { slug: "mann", name: "Mann", country: "🇩🇪" },
];

export function BrandCarousel() {
  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-extrabold text-white">Brendlar</h2>
        <Link href="/brands" className="text-sm text-[#f5b51b] hover:text-[#ffc733] font-semibold transition-colors">
          Barchasi →
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {brands.map((brand) => (
          <Link
            key={brand.slug}
            href={`/brand/${brand.slug}`}
            className="shrink-0 flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#fffdf7] border border-[#f5b51b]/20 hover:border-[#f5b51b] hover:shadow-lg transition-all group w-28"
          >
            <div className="w-14 h-14 rounded-xl bg-[#004733]/8 flex items-center justify-center text-2xl group-hover:bg-[#002d21] transition-colors">
              {brand.country}
            </div>
            <p className="text-xs font-semibold text-gray-700 group-hover:text-[#004733] text-center">
              {brand.name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
