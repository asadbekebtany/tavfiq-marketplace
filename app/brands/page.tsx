import Link from "next/link";
import { Award } from "lucide-react";
import { InfoPage } from "@/components/ui/info-page";
import { getBrands } from "@/lib/brands-store";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const [{ siteName }, brands] = await Promise.all([
    getSiteSettings(),
    Promise.resolve(getBrands(true)),
  ]);

  return (
    <InfoPage
      title="Brendlar"
      description={`${siteName} marketplace’dagi ishonchli va original ishlab chiqaruvchilar.`}
      icon={Award}
    >
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {brands.map((b) => (
          <Link
            key={b.id}
            href={`/brand/${b.slug}`}
            className="group flex items-center gap-3 rounded-2xl border border-[#e4e9e5] bg-[#fffdf7] p-4 hover:-translate-y-0.5 hover:border-[#f5b51b] hover:shadow-lg"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#002d21] text-lg font-black text-[#f5b51b]">
              {b.logo}
            </span>
            <span>
              <strong className="block text-[#15231b]">{b.name}</strong>
              <small className="text-gray-500">
                {b.country} · {b.count} mahsulot
              </small>
            </span>
          </Link>
        ))}
      </div>
    </InfoPage>
  );
}
