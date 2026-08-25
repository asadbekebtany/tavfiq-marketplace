"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BarChart2,
  Crown,
  DollarSign,
  GalleryHorizontalEnd,
  Headphones,
  Image,
  LayoutDashboard,
  Menu,
  Package,
  PackageX,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  TicketPercent,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { BrandEmblem, BrandName } from "@/components/brand/brand-logo";

const navGroups: Array<{
  title: string;
  items: Array<{ href: string; icon: typeof Crown; label: string }>;
}> = [
  {
    title: "Boshqaruv",
    items: [
      { href: "/super-admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/super-admin/reports", icon: BarChart2, label: "Hisobotlar" },
      { href: "/super-admin/admins", icon: Users, label: "Adminlar" },
      { href: "/super-admin/roles", icon: ShieldCheck, label: "Admin rollari" },
      { href: "/super-admin/platform", icon: Settings, label: "Platforma" },
      { href: "/admin/audit-logs", icon: ScrollText, label: "Audit log" },
      { href: "/admin/settings", icon: Wrench, label: "Sayt sozlamalari" },
    ],
  },
  {
    title: "Moliya",
    items: [
      { href: "/super-admin/finance", icon: DollarSign, label: "Settlements" },
      { href: "/super-admin/commissions", icon: TicketPercent, label: "Komissiya" },
      { href: "/admin/finance", icon: DollarSign, label: "Admin moliya" },
      { href: "/admin/coupons", icon: TicketPercent, label: "Kuponlar" },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { href: "/admin/orders", icon: ShoppingBag, label: "Buyurtmalar" },
      { href: "/admin/returns", icon: PackageX, label: "Qaytarishlar" },
      { href: "/admin/pickup-points", icon: Store, label: "Olish punktlari" },
      { href: "/admin/products", icon: Package, label: "Mahsulotlar" },
      { href: "/admin/categories", icon: Tag, label: "Kategoriyalar" },
      { href: "/admin/brands", icon: Award, label: "Brendlar" },
    ],
  },
  {
    title: "Odamlar",
    items: [
      { href: "/admin/users", icon: Users, label: "Foydalanuvchilar" },
      { href: "/admin/sellers", icon: Store, label: "Sotuvchilar" },
      { href: "/admin/support", icon: Headphones, label: "Support" },
    ],
  },
  {
    title: "Kontent",
    items: [
      { href: "/admin/hero-slides", icon: GalleryHorizontalEnd, label: "Hero slayderlar" },
      { href: "/admin/banners", icon: Image, label: "Bannerlar" },
      { href: "/admin/reviews", icon: Award, label: "Sharhlar" },
      { href: "/admin/questions", icon: Headphones, label: "Savol-javob" },
    ],
  },
];

export function SuperAdminSidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const content = (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#f5b51b]/25 px-4 py-5">
        <Link href="/super-admin/dashboard" className="flex items-center gap-3">
          <BrandEmblem className="h-9 w-9" />
          <div>
            <p className="text-xs tracking-wide">
              <BrandName className="text-xs" />
            </p>
            <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#f5b51b] to-[#ffdf7e] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#1a0533]">
              <Crown size={9} />
              Super Admin
            </p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-1 px-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#f5b51b]/60">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active =
                  path === href || (href !== "/super-admin/dashboard" && path.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-gradient-to-r from-[#f5b51b] to-[#d99a0a] text-[#1a0533] shadow-lg shadow-[#f5b51b]/20"
                        : "text-[#d5cbe8] hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="space-y-1 border-t border-[#f5b51b]/25 p-3">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#b3a6cf] hover:bg-white/8 hover:text-white"
        >
          <ShieldCheck size={15} />
          Oddiy admin panel →
        </Link>
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#b3a6cf] hover:bg-white/8 hover:text-white"
        >
          <Wrench size={15} />
          Saytga qaytish →
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-20 z-40 grid h-10 w-10 place-items-center rounded-xl bg-[#1a0533] text-[#f5b51b] shadow-xl lg:hidden"
      >
        <Menu size={18} />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Yopish"
            className="fixed inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-64 overflow-y-auto bg-gradient-to-b from-[#1a0533] via-[#12042a] to-[#050011] shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-10 text-[#d5cbe8]"
            >
              <X size={19} />
            </button>
            {content}
          </div>
        </div>
      ) : null}
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col bg-gradient-to-b from-[#1a0533] via-[#12042a] to-[#050011] lg:flex">
        {content}
      </aside>
    </>
  );
}
