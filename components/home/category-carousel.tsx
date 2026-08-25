import Link from "next/link";
import {
  CircleDot,
  Disc3,
  Droplets,
  BatteryCharging,
  Disc,
  Lightbulb,
  Car,
  Armchair,
  Smartphone,
  FlaskConical,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const categories: { slug: string; name: string; icon: LucideIcon; count: string }[] = [
  { slug: "shinalar", name: "Shinalar", icon: CircleDot, count: "1 240+" },
  { slug: "disklar", name: "Disklar", icon: Disc3, count: "850+" },
  { slug: "moylar", name: "Motor moylari", icon: Droplets, count: "320+" },
  { slug: "akkumulyator", name: "Akkumulyator", icon: BatteryCharging, count: "190+" },
  { slug: "tormoz", name: "Tormoz tizimi", icon: Disc, count: "610+" },
  { slug: "faralar", name: "Faralar", icon: Lightbulb, count: "340+" },
  { slug: "kuzov", name: "Kuzov", icon: Car, count: "720+" },
  { slug: "salon", name: "Salon", icon: Armchair, count: "290+" },
  { slug: "elektronika", name: "Elektronika", icon: Smartphone, count: "415+" },
  { slug: "kimyo", name: "Avtokimyo", icon: FlaskConical, count: "180+" },
  { slug: "asboblar", name: "Asboblar", icon: Wrench, count: "260+" },
];

export function CategoryCarousel() {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-extrabold text-white sm:text-xl">Kategoriyalar</h2>
        <Link
          href="/catalog"
          className="text-sm text-[#f5b51b] hover:text-[#ffc733] font-semibold transition-colors"
        >
          Barchasi →
        </Link>
      </div>
      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 scrollbar-hide sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-2.5 sm:overflow-visible sm:px-0 md:grid-cols-6 lg:grid-cols-11">
        {categories.slice(0, 11).map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.slug}
              href={`/catalog/${cat.slug}`}
              className="group flex w-[30%] min-w-[96px] shrink-0 flex-col items-center rounded-xl border border-[#f5b51b]/20 bg-[#fffdf7] px-1.5 py-3 text-center transition-all hover:-translate-y-0.5 hover:border-[#f5b51b] hover:shadow-lg sm:w-auto sm:min-w-0"
            >
              <div className="w-10 h-10 rounded-lg bg-[#004733]/8 flex items-center justify-center mb-1.5 group-hover:bg-[#002d21] transition-colors">
                <Icon size={20} className="text-[#004733] group-hover:text-[#f5b51b] transition-colors" />
              </div>
              <p className="text-[11px] font-semibold text-gray-800 leading-tight line-clamp-2">
                {cat.name}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{cat.count}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
