"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2 } from "lucide-react";

type Noti = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export function SellerNotificationsClient() {
  const [items, setItems] = useState<Noti[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = (await res.json()) as {
        notifications?: Noti[];
        unread?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Yuklanmadi");
      setItems(data.notifications ?? []);
      setUnread(data.unread ?? 0);
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

  const markAll = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await load();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-[#cb11ab]" />
          <h1 className="text-xl font-black text-gray-900">Bildirishnomalar</h1>
          {unread > 0 ? (
            <span className="rounded-full bg-[#cb11ab] px-2 py-0.5 text-[10px] font-bold text-white">
              {unread}
            </span>
          ) : null}
        </div>
        {unread > 0 ? (
          <button
            type="button"
            onClick={() => void markAll()}
            className="text-xs font-bold text-[#cb11ab] hover:underline"
          >
            Hammasini o‘qilgan
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Loader2 className="animate-spin text-[#cb11ab]" size={28} />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
          Bildirishnomalar yo‘q
        </p>
      ) : (
        <div className="divide-y divide-gray-50 overflow-hidden rounded-2xl border border-gray-100 bg-white">
          {items.map((n) => {
            const body = (
              <div className={`px-5 py-4 ${n.isRead ? "bg-white" : "bg-[#cb11ab]/5"}`}>
                <p className="text-sm font-bold text-gray-900">{n.title}</p>
                <p className="mt-0.5 text-sm text-gray-600">{n.message}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(n.createdAt).toLocaleString("uz-UZ")} · {n.type}
                </p>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link}>
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
