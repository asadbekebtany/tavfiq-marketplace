"use client";

import { useCallback, useEffect, useState } from "react";
import { DollarSign, Loader2, Wallet } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type FinanceData = {
  storeName: string;
  commissionPercent: number;
  payoutHoldDays: number;
  summary: {
    gmv: number;
    delivered: number;
    inProgress: number;
    commission: number;
    paidOut: number;
    held: number;
    available: number;
    monthDelivered: number;
    monthCommission: number;
    orderCount: number;
  };
  ledger: {
    id: string;
    amount: number;
    type: string;
    description: string | null;
    createdAt: string;
  }[];
};

export function SellerFinanceClient() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/seller/finance", { cache: "no-store" });
      const json = (await res.json()) as FinanceData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Yuklanmadi");
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#cb11ab]" size={32} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error ?? "Ma’lumot yo‘q"}
      </div>
    );
  }

  const cards = [
    { label: "Mavjud balans", value: formatPrice(data.summary.available), hint: "Yetkazilgan − komissiya − to‘lovlar" },
    { label: "Yetkazilgan GMV", value: formatPrice(data.summary.delivered), hint: `${data.summary.orderCount} ta buyurtma` },
    { label: "Komissiya", value: formatPrice(data.summary.commission), hint: `${data.commissionPercent}%` },
    { label: "To‘langan", value: formatPrice(data.summary.paidOut), hint: `Hold ${data.payoutHoldDays} kun` },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2 text-[#cb11ab]">
          <Wallet size={20} />
          <h1 className="text-xl font-black text-gray-900">Moliya</h1>
        </div>
        <p className="text-sm text-gray-500">
          {data.storeName} · jarayondagi aylanma {formatPrice(data.summary.inProgress)}
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="text-lg font-black text-gray-900">{c.value}</p>
            <p className="mt-1 text-xs font-semibold text-gray-700">{c.label}</p>
            <p className="text-[11px] text-gray-400">{c.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-600">
        <div className="mb-1 flex items-center gap-2 font-semibold text-gray-900">
          <DollarSign size={14} />
          Oylik
        </div>
        Yetkazilgan {formatPrice(data.summary.monthDelivered)} · komissiya{" "}
        {formatPrice(data.summary.monthCommission)}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="border-b border-gray-100 px-5 py-4 font-bold text-gray-900">Ledger</div>
        <div className="divide-y divide-gray-50">
          {data.ledger.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              Hali to‘lov yozuvlari yo‘q. Super admin payout qilganda shu yerda ko‘rinadi.
            </p>
          ) : (
            data.ledger.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{row.type}</p>
                  <p className="text-xs text-gray-500">{row.description ?? "—"}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatPrice(row.amount)}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(row.createdAt).toLocaleString("uz-UZ")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
