"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type Report = {
  usersByRole: Record<string, number>;
  sellers: number;
  pendingSellers: number;
  products: number;
  pendingProducts: number;
  ordersToday: number;
  gmvToday: number;
  ordersMonth: number;
  gmvMonth: number;
  pendingReturns: number;
  openTickets: number;
  pendingReviews: number;
  unansweredQuestions: number;
  pickupActive: number;
};

export function SuperAdminReportsClient() {
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/super-admin/reports", { cache: "no-store" })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Yuklanmadi");
        setData(json);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Yuklanmadi"));
  }, []);

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  }
  if (!data) {
    return (
      <div className="grid min-h-[30vh] place-items-center">
        <Loader2 className="animate-spin text-[#f5b51b]" />
      </div>
    );
  }

  const cards = [
    { label: "Bugungi GMV", value: formatPrice(data.gmvToday), href: "/admin/orders" },
    { label: "Oylik GMV", value: formatPrice(data.gmvMonth), href: "/super-admin/finance" },
    { label: "Bugungi buyurtma", value: String(data.ordersToday), href: "/admin/orders" },
    { label: "Oylik buyurtma", value: String(data.ordersMonth), href: "/admin/orders" },
    { label: "Sellerlar", value: String(data.sellers), href: "/admin/sellers" },
    { label: "Kutilayotgan seller", value: String(data.pendingSellers), href: "/admin/sellers" },
    { label: "Mahsulotlar", value: String(data.products), href: "/admin/products" },
    { label: "Tasdiqlanmagan mahsulot", value: String(data.pendingProducts), href: "/admin/products" },
    { label: "Qaytarishlar", value: String(data.pendingReturns), href: "/admin/returns" },
    { label: "Support", value: String(data.openTickets), href: "/admin/support" },
    { label: "Sharhlarni tasdiq", value: String(data.pendingReviews), href: "/admin/reviews" },
    { label: "Javobsiz savollar", value: String(data.unansweredQuestions), href: "/admin/questions" },
    { label: "Faol punktlar", value: String(data.pickupActive), href: "/admin/pickup-points" },
    { label: "Xaridorlar", value: String(data.usersByRole.customer ?? 0), href: "/admin/users" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-gray-900">Platforma hisobotlari</h1>
        <button
          type="button"
          onClick={() => {
            const lines = cards.map((c) => `${c.label},${c.value.replace(/,/g, " ")}`);
            const blob = new Blob([`ko‘rsatkich,qiymat\n${lines.join("\n")}`], {
              type: "text/csv;charset=utf-8",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "tavfiq-hisobot.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          CSV yuklab olish
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-2xl border border-gray-100 bg-white p-4 hover:border-[#f5b51b]/40"
          >
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="mt-1 text-xl font-black text-gray-900">{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
