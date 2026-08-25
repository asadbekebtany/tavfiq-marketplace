"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp, DollarSign, ShoppingBag, Star } from "lucide-react";
import { formatPrice } from "@/lib/utils";

const MONTHS = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

type Stats = {
  totalRevenue: number;
  totalOrders: number;
  avgRating: number;
  reviewCount: number;
  cancelRate?: number;
  returnRate?: number;
  monthly: { month: number; revenue: number; orders: number }[];
  topProducts: { name: string; sold: number; revenue: number }[];
};

export default function SellerAnalyticsPage() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("year");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/seller/stats", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Statistika yuklanmadi");
        setStats(data);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Xato"));
  }, []);

  const monthly = stats?.monthly ?? [];
  const chart = useMemo(() => {
    if (period === "week") return monthly.slice(-1);
    if (period === "month") return monthly.slice(Math.max(0, new Date().getMonth() - 2), new Date().getMonth() + 1);
    return monthly;
  }, [monthly, period]);

  const maxRev = Math.max(1, ...chart.map((m) => m.revenue));
  const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">Statistika</h1>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(["week", "month", "year"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p === "week" ? "Hafta" : p === "month" ? "Oy" : "Yil"}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: DollarSign,
            label: "Jami daromad",
            value: formatPrice(stats?.totalRevenue ?? 0),
            sub: "to‘langan buyurtmalar",
            color: "bg-green-50 text-green-600",
          },
          {
            icon: ShoppingBag,
            label: "Jami buyurtmalar",
            value: String(stats?.totalOrders ?? 0),
            sub: "barcha statuslar",
            color: "bg-blue-50 text-blue-600",
          },
          {
            icon: Star,
            label: "O'rtacha reyting",
            value: String(stats?.avgRating ?? 0),
            sub: `${stats?.reviewCount ?? 0} ta sharh`,
            color: "bg-yellow-50 text-yellow-600",
          },
          {
            icon: TrendingUp,
            label: "Bekor / qaytarish",
            value: `${stats?.cancelRate ?? 0}% / ${stats?.returnRate ?? 0}%`,
            sub: "cancel rate · return rate",
            color: "bg-purple-50 text-purple-600",
          },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={18} />
            </div>
            <p className="text-xl font-black text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-6">Oylik daromad (so&apos;m)</h2>
        <div className="flex items-end gap-2 h-48">
          {chart.map((row) => {
            const h = Math.round((row.revenue / maxRev) * 100);
            return (
              <div key={row.month} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full flex items-end justify-center h-40">
                  <div
                    className="w-full max-w-[36px] bg-[#004733]/20 group-hover:bg-[#004733]/35 rounded-t-lg transition-colors mx-auto"
                    style={{ height: `${Math.max(4, h * 1.4)}px` }}
                    title={fmt(row.revenue)}
                  />
                </div>
                <span className="text-[10px] text-gray-500">{MONTHS[row.month]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4">Top mahsulotlar</h2>
        <div className="space-y-3">
          {(stats?.topProducts ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">Hali ma’lumot yo‘q</p>
          ) : (
            (stats?.topProducts ?? []).map((p, i) => (
              <div key={`${p.name}-${i}`} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 line-clamp-1">
                    {i + 1}. {p.name}
                  </p>
                  <p className="text-xs text-gray-500">{p.sold} ta sotilgan</p>
                </div>
                <p className="font-bold text-gray-900 shrink-0">{formatPrice(p.revenue)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
