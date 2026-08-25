/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowLeft, Package, RotateCcw } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { OrderRecord } from "@/lib/orders-store";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Kutilmoqda", color: "bg-amber-100 text-amber-700" },
  paid: { label: "To'landi", color: "bg-[#004733]/10 text-[#004733]" },
  accepted: { label: "Qabul qilindi", color: "bg-emerald-100 text-emerald-700" },
  packing: { label: "Yig'ilmoqda", color: "bg-[#f5b51b]/20 text-[#9a6b00]" },
  shipped: { label: "Yo'lda", color: "bg-teal-100 text-teal-700" },
  ready_for_pickup: { label: "Tayyor", color: "bg-teal-100 text-teal-700" },
  delivered: { label: "Yetkazildi", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Bekor qilindi", color: "bg-red-100 text-red-700" },
  returned: { label: "Qaytarildi", color: "bg-gray-100 text-gray-700" },
};

function formatOrderDate(value: string) {
  return new Date(value).toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function OrderDetailView({ order }: { order: OrderRecord }) {
  const status = STATUS_MAP[order.status] ?? {
    label: order.status,
    color: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-4">
      <Link
        href="/profile/orders"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#004733] hover:underline"
      >
        <ArrowLeft size={16} />
        Buyurtmalarga qaytish
      </Link>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[#004733]">
              <Package size={18} />
              <h1 className="text-xl font-bold text-gray-900">{order.id}</h1>
            </div>
            <p className="text-sm text-gray-500">
              {formatOrderDate(order.createdAt)} · {order.store}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Yetkazish</p>
            <p className="text-sm font-semibold text-gray-900">
              {order.deliveryType === "pickup" ? "Olish punktidan" : "Kuryer"}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">To‘lov</p>
            <p className="text-sm font-semibold capitalize text-gray-900">
              {order.paymentMethod}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Jami summa</p>
            <p className="text-sm font-bold text-gray-900">{formatPrice(order.total)}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <h2 className="font-bold text-gray-900">Mahsulotlar</h2>
          {order.items.map((item) => (
            <div key={`${item.productId}-${item.name}`} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
              {item.image ? (
                <img
                  src={item.image}
                  alt=""
                  className="h-14 w-14 rounded-lg border border-gray-100 bg-gray-50 object-contain p-1"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-lg bg-gray-50 text-gray-400">
                  <Package size={20} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {item.quantity} ta × {formatPrice(item.price)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold text-gray-900">
                {formatPrice(item.price * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <div className="flex gap-2">
            {order.status === "delivered" && (
              <Link
                href="/profile/returns"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                <RotateCcw size={12} />
                Qaytarish
              </Link>
            )}
          </div>
          <p className="font-bold text-gray-900">Jami: {formatPrice(order.total)}</p>
        </div>
      </div>
    </div>
  );
}
