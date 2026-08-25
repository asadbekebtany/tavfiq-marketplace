"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type QRow = {
  id: string;
  question: string;
  isApproved: boolean;
  createdAt: string;
  buyer: { name: string | null; phone: string | null };
  product: string;
  store: string;
  answers: { id: string; answer: string; isSeller: boolean; isAdmin: boolean }[];
};

export function AdminQuestionsClient() {
  const [rows, setRows] = useState<QRow[]>([]);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = pendingOnly ? "?pending=true" : "";
      const res = await fetch(`/api/admin/questions${q}`, { cache: "no-store" });
      const data = (await res.json()) as { questions?: QRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Yuklanmadi");
      setRows(data.questions ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [pendingOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (questionId: string, extra: Record<string, unknown>) => {
    const res = await fetch("/api/admin/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, ...extra }),
    });
    if (res.ok) await load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-black text-gray-900">Savol-javob moderatsiyasi</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => setPendingOnly(e.target.checked)}
            className="accent-[#004733]"
          />
          Tasdiqlanmagan
        </label>
      </div>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="animate-spin text-[#004733]" />
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((q) => (
            <div key={q.id} className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-xs text-gray-500">
                {q.product} · {q.store}
              </p>
              <p className="mt-1 font-medium text-gray-900">{q.question}</p>
              {q.answers.map((a) => (
                <p key={a.id} className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {a.isSeller ? "Seller: " : a.isAdmin ? "Admin: " : ""}
                  {a.answer}
                </p>
              ))}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void act(q.id, { isApproved: true })}
                  className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800"
                >
                  Tasdiqlash
                </button>
                <button
                  type="button"
                  onClick={() => void act(q.id, { isApproved: false })}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700"
                >
                  Yashirish
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={drafts[q.id] ?? ""}
                  onChange={(e) => setDrafts((p) => ({ ...p, [q.id]: e.target.value }))}
                  placeholder="Admin javobi..."
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void act(q.id, { answer: drafts[q.id], isApproved: true })}
                  className="rounded-xl bg-[#002d21] px-3 py-2 text-xs font-bold text-[#f5b51b]"
                >
                  Javob
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
