"use client";

import { useCartStore } from "@/lib/cart-store";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Heart, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export function CartClient() {
  const { items, removeItem, updateQty, total, itemCount, isLoading, error, source, hydrated } =
    useCartStore();

  const subtotal = total();
  const delivery = subtotal >= 500_000 ? 0 : 30_000;
  const grandTotal = subtotal + delivery;

  if (!hydrated || isLoading) {
    return (
      <div className="mx-auto grid max-w-[1280px] min-h-[320px] place-items-center px-4 py-16">
        <Loader2 className="animate-spin text-[#004733]" size={32} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-16 text-center">
        <div className="max-w-sm mx-auto">
          <ShoppingBag size={80} className="text-gray-200 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Savat bo'sh</h1>
          <p className="text-gray-500 mb-8">
            Hali hech narsa qo'shilmagan. Katalogdan mahsulot tanlang.
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] text-[#002d21] px-8 py-3 rounded-xl font-bold hover:from-[#ffc733] hover:to-[#f5b51b] transition-all"
          >
            Xarid qilishni boshlash
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    );
  }

  // Group by store
  const byStore: Record<string, typeof items> = {};
  items.forEach((item) => {
    const storeName = item.product.store.name;
    if (!byStore[storeName]) byStore[storeName] = [];
    byStore[storeName].push(item);
  });

  return (
    <div className="max-w-[1280px] mx-auto px-3 py-4 sm:px-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Savat</h1>
        <span className="bg-[#004733] text-white text-sm font-bold px-2.5 py-0.5 rounded-full">
          {itemCount()} ta
        </span>
        {source === "api" ? (
          <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">Serverda saqlangan</span>
        ) : null}
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {Object.entries(byStore).map(([storeName, storeItems]) => (
            <div key={storeName} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Store header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#004733]/10 flex items-center justify-center text-xs font-bold text-[#004733]">
                  {storeName[0]}
                </div>
                <span className="text-sm font-semibold text-gray-900">{storeName}</span>
              </div>

              {/* Products */}
              <div className="divide-y divide-gray-50">
                {storeItems.map((item) => {
                  const img = item.product.images[0]?.url ?? "";
                  return (
                    <div key={item.id} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                      {/* Image */}
                      <Link href={`/product/${item.product.slug}`} className="shrink-0">
                        <div className="w-20 h-20 rounded-xl bg-gray-50 overflow-hidden border border-gray-100">
                          {img && (
                            <Image src={img} alt={item.product.name} width={80} height={80} className="w-full h-full object-contain p-1" />
                          )}
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/product/${item.product.slug}`} className="text-sm font-medium text-gray-900 hover:text-[#004733] line-clamp-2 mb-1">
                          {item.product.name}
                        </Link>
                        {item.product.brand && (
                          <p className="text-xs text-gray-400 mb-2">{item.product.brand.name}</p>
                        )}

                        {/* Price row */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <span className="font-bold text-gray-900">{formatPrice(item.product.price)}</span>
                            {item.product.oldPrice && (
                              <span className="text-xs text-gray-400 line-through ml-2">{formatPrice(item.product.oldPrice)}</span>
                            )}
                          </div>

                          {/* Qty controls */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                onClick={() => void updateQty(item.product.id, item.quantity - 1)}
                                className="px-2.5 py-1.5 hover:bg-gray-50 text-gray-600 transition-colors"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                              <button
                                onClick={() => void updateQty(item.product.id, item.quantity + 1)}
                                disabled={item.quantity >= item.product.stock}
                                className="px-2.5 py-1.5 hover:bg-gray-50 text-gray-600 disabled:opacity-40 transition-colors"
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            {/* Actions */}
                            <button
                              onClick={() => void removeItem(item.product.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                            >
                              <Trash2 size={15} />
                            </button>
                            <button className="p-1.5 text-gray-400 hover:text-[#004733] transition-colors rounded-lg hover:bg-[#004733]/10">
                              <Heart size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Item total */}
                        <p className="text-xs text-gray-500 mt-1">
                          Jami: <span className="font-semibold text-gray-800">{formatPrice(item.product.price * item.quantity)}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-20 bg-white rounded-2xl border border-gray-100 p-5 shadow-lg lg:bottom-auto lg:top-24 lg:p-6 lg:shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Buyurtma xulosasi</h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Mahsulotlar ({itemCount()} ta)</span>
                <span className="text-gray-900">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Yetkazib berish</span>
                <span className={delivery === 0 ? "text-green-600 font-medium" : "text-gray-900"}>
                  {delivery === 0 ? "Bepul" : formatPrice(delivery)}
                </span>
              </div>
              {delivery === 0 && (
                <p className="text-xs text-green-600 bg-green-50 p-2 rounded-lg">
                  ✓ 500 000 so'mdan bepul yetkazish
                </p>
              )}
            </div>

            {/* Coupon */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Kupon kodi"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#004733]"
              />
              <button className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">
                Qo'llash
              </button>
            </div>

            <div className="border-t border-gray-100 pt-4 mb-4">
              <div className="flex justify-between">
                <span className="font-bold text-gray-900 text-base">Jami</span>
                <span className="font-black text-xl text-gray-900">{formatPrice(grandTotal)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] text-[#002d21] py-3.5 rounded-xl font-bold text-base hover:from-[#ffc733] hover:to-[#f5b51b] transition-all"
            >
              Buyurtma berish
              <ArrowRight size={18} />
            </Link>

            <p className="text-xs text-gray-400 text-center mt-3">
              Xavfsiz to'lov: Payme, Click, karta
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
