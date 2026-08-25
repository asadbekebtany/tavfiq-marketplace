"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Warehouse } from "lucide-react";

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  soldCount: number;
  image: string | null;
  low: boolean;
};

type Movement = {
  id: string;
  productName: string;
  type: string;
  quantity: number;
  reason: string | null;
  createdAt: string;
};

export function SellerWarehouseClient() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [threshold, setThreshold] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [type, setType] = useState<"in" | "out" | "adjustment">("in");
  const [qty, setQty] = useState("10");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/seller/stock", { cache: "no-store" });
      const data = (await res.json()) as {
        products?: ProductRow[];
        movements?: Movement[];
        lowStockThreshold?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Yuklanmadi");
      setProducts(data.products ?? []);
      setMovements(data.movements ?? []);
      setThreshold(data.lowStockThreshold ?? 5);
      setSelectedId((prev) => prev || data.products?.[0]?.id || "");
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

  const submit = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/seller/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedId,
          type,
          quantity: Number(qty),
          reason: reason || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Saqlanmadi");
      setReason("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Saqlanmadi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#cb11ab]" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-2">
        <Warehouse size={20} className="text-[#cb11ab]" />
        <h1 className="text-xl font-black text-gray-900">Ombor / zaxira</h1>
      </div>
      <p className="text-sm text-gray-500">Past zaxira chegarasi: ≤ {threshold}</p>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <h2 className="mb-3 font-bold text-gray-900">Zaxira harakati</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm lg:col-span-2"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.stock})
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "in" | "out" | "adjustment")}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="in">Kirim (+)</option>
            <option value="out">Chiqim (−)</option>
            <option value="adjustment">Tuzatish (=)</option>
          </select>
          <input
            type="number"
            min={0}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
            placeholder="Miqdor"
          />
          <button
            type="button"
            disabled={saving || !selectedId}
            onClick={() => void submit()}
            className="rounded-xl bg-[#cb11ab] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "..." : "Qo‘llash"}
          </button>
        </div>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Sabab (ixtiyoriy)"
          className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="border-b border-gray-100 px-5 py-4 font-bold text-gray-900">Mahsulotlar</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Mahsulot</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Zaxira</th>
                <th className="px-4 py-3">Sotilgan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className={p.low ? "bg-amber-50/50" : undefined}>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.sku ?? "—"}</td>
                  <td className={`px-4 py-3 font-bold ${p.low ? "text-amber-700" : "text-gray-900"}`}>
                    {p.stock}
                  </td>
                  <td className="px-4 py-3">{p.soldCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="border-b border-gray-100 px-5 py-4 font-bold text-gray-900">Harakatlar</div>
        <div className="divide-y divide-gray-50">
          {movements.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Harakatlar yo‘q</p>
          ) : (
            movements.map((m) => (
              <div key={m.id} className="flex justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {m.productName} · {m.type}
                  </p>
                  <p className="text-xs text-gray-500">{m.reason ?? "—"}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{m.quantity}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(m.createdAt).toLocaleString("uz-UZ")}
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
