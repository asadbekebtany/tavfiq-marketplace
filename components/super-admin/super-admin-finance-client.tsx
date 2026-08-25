"use client";

import { useCallback, useEffect, useState } from "react";
import { DollarSign, Loader2, Wallet } from "lucide-react";

type Settlement = {
  storeId: string;
  storeName: string;
  sellerName: string;
  sellerPhone: string;
  orders: number;
  gmv: number;
  delivered: number;
  commission: number;
  paidOut: number;
  held: number;
  payable: number;
};

type LedgerRow = {
  id: string;
  storeName: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string;
};

type FinancePayload = {
  commissionPercent: number;
  payoutHoldDays: number;
  summary: {
    monthGmv: number;
    monthOrders: number;
    deliveredGmv: number;
    deliveredOrders: number;
    totalCommission: number;
    totalPayable: number;
  };
  settlements: Settlement[];
  ledger: LedgerRow[];
};

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

export function SuperAdminFinanceClient() {
  const [data, setData] = useState<FinancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/finance", { cache: "no-store" });
      const json = (await res.json()) as FinancePayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Yuklanmadi");
      setData(json);
      const next: Record<string, string> = {};
      for (const row of json.settlements) {
        if (row.payable > 0) next[row.storeId] = String(row.payable);
      }
      setAmounts(next);
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

  const payout = async (storeId: string) => {
    const amount = Number(amounts[storeId] ?? 0);
    if (!amount || amount <= 0) {
      setError("To‘lov summasi noto‘g‘ri");
      return;
    }
    setPayingId(storeId);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, amount, description: "Super admin payout" }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "To‘lov yozilmadi");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "To‘lov yozilmadi");
    } finally {
      setPayingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#1a0533]" size={32} />
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
    { label: "Oylik GMV", value: `${fmt(data.summary.monthGmv)} so‘m` },
    { label: "Yetkazilgan GMV", value: `${fmt(data.summary.deliveredGmv)} so‘m` },
    { label: "Komissiya", value: `${fmt(data.summary.totalCommission)} so‘m` },
    { label: "To‘lanishi kerak", value: `${fmt(data.summary.totalPayable)} so‘m` },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2 text-[#3b0764]">
          <Wallet size={20} />
          <h1 className="text-2xl font-black text-gray-900">Global moliya / settlements</h1>
        </div>
        <p className="text-sm text-gray-500">
          Komissiya {data.commissionPercent}% · Hold {data.payoutHoldDays} kun · Do‘konlar
          bo‘yicha to‘lovlar
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-[#3b0764]/10 bg-white p-4"
          >
            <p className="text-lg font-black text-gray-900">{c.value}</p>
            <p className="mt-1 text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#3b0764]/10 bg-white">
        <div className="border-b border-gray-100 px-5 py-4 font-black text-gray-900">
          Sotuvchi settlements
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Do‘kon</th>
                <th className="px-4 py-3">Delivered</th>
                <th className="px-4 py-3">Komissiya</th>
                <th className="px-4 py-3">To‘langan</th>
                <th className="px-4 py-3">Payable</th>
                <th className="px-4 py-3">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.settlements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    Do‘kon topilmadi
                  </td>
                </tr>
              ) : (
                data.settlements.map((row) => (
                  <tr key={row.storeId}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{row.storeName}</p>
                      <p className="text-xs text-gray-500">
                        {row.sellerName} · {row.sellerPhone}
                      </p>
                    </td>
                    <td className="px-4 py-3">{fmt(row.delivered)}</td>
                    <td className="px-4 py-3">{fmt(row.commission)}</td>
                    <td className="px-4 py-3">{fmt(row.paidOut)}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700">{fmt(row.payable)}</td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[180px] items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={amounts[row.storeId] ?? ""}
                          onChange={(e) =>
                            setAmounts((prev) => ({ ...prev, [row.storeId]: e.target.value }))
                          }
                          className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-[#3b0764]"
                          disabled={row.payable <= 0}
                        />
                        <button
                          type="button"
                          disabled={row.payable <= 0 || payingId === row.storeId}
                          onClick={() => void payout(row.storeId)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#1a0533] px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                        >
                          {payingId === row.storeId ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <DollarSign size={12} />
                          )}
                          To‘lash
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#3b0764]/10 bg-white">
        <div className="border-b border-gray-100 px-5 py-4 font-black text-gray-900">
          Oxirgi ledger
        </div>
        <div className="divide-y divide-gray-50">
          {data.ledger.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Ledger bo‘sh</p>
          ) : (
            data.ledger.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {row.storeName} · {row.type}
                  </p>
                  <p className="text-xs text-gray-500">{row.description ?? "—"}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{fmt(row.amount)} so‘m</p>
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
