"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User, Package, Heart, Star, RotateCcw,
  Settings, Car, Headphones, LogOut, Wallet, Bell,
} from "lucide-react";

const nav = [
  { href: "/profile", label: "Profilim", icon: User, exact: true },
  { href: "/profile/orders", label: "Buyurtmalarim", icon: Package },
  { href: "/profile/favorites", label: "Saralanganlar", icon: Heart },
  { href: "/profile/reviews", label: "Sharhlarim", icon: Star },
  { href: "/profile/returns", label: "Qaytarishlar", icon: RotateCcw },
  { href: "/profile/notifications", label: "Bildirishnomalar", icon: Bell },
  { href: "/profile/support", label: "Support", icon: Headphones },
  { href: "/profile/cars", label: "Avtomobillarim", icon: Car },
  { href: "/profile/settings", label: "Sozlamalar", icon: Settings },
];

type ProfileSidebarProps = {
  name?: string | null;
  phone?: string | null;
  bonusBalance?: number;
};

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

export function ProfileSidebar({
  name = "Foydalanuvchi",
  phone = "—",
  bonusBalance = 0,
}: ProfileSidebarProps) {
  const path = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? path === href : path.startsWith(href);

  const initial = (name || "U").trim().charAt(0).toUpperCase();

  return (
    <>
      <div className="-mx-4 mb-4 overflow-x-auto px-4 scrollbar-hide lg:hidden">
        <nav className="flex min-w-max gap-1.5 pb-1">
          {nav.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${
                isActive(href, exact)
                  ? "bg-[#004733] text-white"
                  : "bg-white text-gray-700 ring-1 ring-gray-200"
              }`}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white lg:block">
      <div className="bg-gradient-to-br from-[#002d21] to-[#004733] p-5 border-b border-[#f5b51b]/20">
        <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] flex items-center justify-center text-[#002d21] text-2xl font-bold mb-3">
          {initial}
        </div>
        <p className="text-white font-semibold">{name || "Foydalanuvchi"}</p>
        <p className="text-gray-300 text-sm">{phone || "—"}</p>
        <div className="mt-3 flex items-center gap-2">
          <Wallet size={14} className="text-[#f5b51b]" />
          <span className="text-xs text-gray-300">
            Bonus: <span className="text-white font-bold">{fmt(bonusBalance)} ball</span>
          </span>
        </div>
      </div>

      <nav className="p-2">
        {nav.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive(href, exact)
                ? "bg-[#004733]/10 text-[#004733]"
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}

        <div className="border-t border-gray-100 mt-2 pt-2">
          <Link
            href="/profile/support"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Headphones size={16} />
            Yordam
          </Link>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
            <LogOut size={16} />
            Chiqish
          </button>
        </div>
      </nav>
    </div>
    </>
  );
}
