/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import type { PickupPointSummary } from "@/lib/pickup-point-types";
import { formatPrice } from "@/lib/utils";
import { Check, MapPin, Truck, CreditCard, Banknote, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Step = "address" | "delivery" | "payment" | "confirm";

type CheckoutClientProps = {
  pickupPoints: PickupPointSummary[];
  initialName?: string;
  initialPhone?: string;
};

export function CheckoutClient({
  pickupPoints,
  initialName = "",
  initialPhone = "",
}: CheckoutClientProps) {
  const { items, total, clearCart, source } = useCartStore();
  const [step, setStep] = useState<Step>("address");
  const [form, setForm] = useState({
    name: initialName,
    phone: initialPhone,
    city: "Toshkent",
    street: "",
    building: "",
    apartment: "",
  });
  const [deliveryType, setDeliveryType] = useState<"courier" | "pickup">("courier");
  const [pickupPointId, setPickupPointId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "payme" | "click">("cash");
  const [note, setNote] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const subtotal = total();
  const delivery = deliveryType === "pickup" ? 0 : subtotal >= 500_000 ? 0 : 30_000;
  const grandTotal = Math.max(0, subtotal + delivery - couponDiscount);

  const applyCoupon = async () => {
    setCouponLoading(true);
    setCouponError(null);
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, subtotal }),
      });
      const data = (await response.json()) as { discount?: number; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Kupon ishlamadi");
      setCouponDiscount(data.discount ?? 0);
    } catch (err: unknown) {
      setCouponDiscount(0);
      setCouponError(err instanceof Error ? err.message : "Kupon ishlamadi");
    } finally {
      setCouponLoading(false);
    }
  };

  const steps: { key: Step; label: string }[] = [
    { key: "address", label: "Manzil" },
    { key: "delivery", label: "Yetkazish" },
    { key: "payment", label: "To'lov" },
    { key: "confirm", label: "Tasdiq" },
  ];

  const stepIndex = steps.findIndex((s) => s.key === step);

  const handlePlaceOrder = async () => {
    setLoading(true);
    setOrderError(null);
    try {
      const useServerCart = source === "api";
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          useServerCart
            ? {
                deliveryType,
                paymentMethod,
                pickupPointId: deliveryType === "pickup" ? pickupPointId : null,
                note: note || null,
                couponCode: couponDiscount > 0 ? couponCode.trim() : null,
                address:
                  deliveryType === "courier"
                    ? {
                        name: form.name,
                        phone: form.phone,
                        city: form.city || "Toshkent",
                        street: form.street || form.city || "Manzil",
                        building: form.building || null,
                        apartment: form.apartment || null,
                      }
                    : null,
              }
            : {
                items: items.map((item) => ({
                  productId: item.product.id,
                  name: item.product.name,
                  price: item.product.price,
                  quantity: item.quantity,
                  image: item.product.images?.[0]?.url,
                })),
                deliveryType,
                paymentMethod,
                total: grandTotal,
              },
        ),
      });
      const data = (await response.json()) as { orderId?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Buyurtmani yuborib bo‘lmadi");
      setOrderId(data.orderId ?? null);
      await clearCart();
    } catch (err: unknown) {
      setOrderError(err instanceof Error ? err.message : "Buyurtmani yuborib bo‘lmadi");
    } finally {
      setLoading(false);
    }
  };

  if (orderId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <Check size={40} className="text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Buyurtma qabul qilindi!</h1>
        <p className="text-gray-500 mb-2">Buyurtma raqami: <span className="font-bold text-gray-900">{orderId}</span></p>
        <p className="text-gray-500 mb-8">Tez orada siz bilan bog'lanamiz.</p>
        <div className="flex gap-3 justify-center">
          <Link href={`/profile/orders/${orderId}`} className="px-6 py-3 bg-[#004733] text-white rounded-xl font-semibold hover:bg-[#003a29] transition-colors">
            Buyurtmani ko‘rish
          </Link>
          <Link href="/profile/orders" className="px-6 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Barcha buyurtmalar
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">Savat bo'sh</p>
        <Link href="/catalog" className="text-[#004733] hover:underline">Xarid qilish</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6">
      {/* Back */}
      <Link href="/cart" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft size={16} /> Savatga qaytish
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Buyurtma berish</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              i < stepIndex ? "text-green-600" :
              i === stepIndex ? "bg-[#004733] text-white" :
              "text-gray-400"
            }`}>
              {i < stepIndex ? <Check size={14} /> : <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-xs">{i + 1}</span>}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-8 mx-1 ${i < stepIndex ? "bg-green-500" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            {/* STEP: Address */}
            {step === "address" && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Kontakt ma'lumotlar</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ism *</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="To'liq ismingiz"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#004733]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+998 XX XXX XX XX"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#004733]"
                    />
                    {initialPhone ? (
                      <p className="mt-1 text-xs text-gray-500">
                        Ro‘yxatdan o‘tgan telefon avtomatik to‘ldirildi
                      </p>
                    ) : null}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ko'cha, mahalla *</label>
                    <input
                      value={form.street}
                      onChange={(e) => setForm({ ...form, street: e.target.value })}
                      placeholder="Ko'cha nomi va raqami"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#004733]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Uy raqami</label>
                    <input
                      value={form.building}
                      onChange={(e) => setForm({ ...form, building: e.target.value })}
                      placeholder="12"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#004733]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Xonadon</label>
                    <input
                      value={form.apartment}
                      onChange={(e) => setForm({ ...form, apartment: e.target.value })}
                      placeholder="42"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#004733]"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setStep("delivery")}
                  disabled={!form.name || !form.phone || !form.street}
                  className="mt-6 w-full bg-[#004733] text-white py-3 rounded-xl font-semibold hover:bg-[#003a29] transition-colors disabled:opacity-50"
                >
                  Davom etish →
                </button>
              </div>
            )}

            {/* STEP: Delivery */}
            {step === "delivery" && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Yetkazish usuli</h2>
                <div className="space-y-3 mb-6">
                  {[
                    { value: "courier", icon: <Truck size={20} />, label: "Kuryer orqali", desc: `3-5 ish kuni · ${subtotal >= 500_000 ? "Bepul" : "30 000 so'm"}` },
                    { value: "pickup", icon: <MapPin size={20} />, label: "Olish punktidan", desc: "1-2 ish kuni · Bepul" },
                  ].map((opt) => (
                    <label key={opt.value} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      deliveryType === opt.value ? "border-[#004733] bg-[#004733]/5" : "border-gray-200 hover:border-gray-300"
                    }`}>
                      <input
                        type="radio"
                        name="delivery"
                        value={opt.value}
                        checked={deliveryType === opt.value}
                        onChange={() => setDeliveryType(opt.value as "courier" | "pickup")}
                        className="sr-only"
                      />
                      <div className={`${deliveryType === opt.value ? "text-[#004733]" : "text-gray-400"}`}>{opt.icon}</div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {deliveryType === "pickup" && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Punkt tanlang:</p>
                    <div className="space-y-2">
                      {pickupPoints.map((pp) => (
                        <label key={pp.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                          pickupPointId === pp.id ? "border-[#004733] bg-[#004733]/5" : "border-gray-200"
                        }`}>
                          <input type="radio" name="pickup" value={pp.id} checked={pickupPointId === pp.id} onChange={() => setPickupPointId(pp.id)} className="mt-1" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{pp.name}</p>
                            <p className="text-xs text-gray-500">{pp.address}</p>
                            {pp.workHours && <p className="text-xs text-gray-400">{pp.workHours}</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep("address")} className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    ← Orqaga
                  </button>
                  <button
                    onClick={() => setStep("payment")}
                    disabled={deliveryType === "pickup" && !pickupPointId}
                    className="flex-1 bg-[#004733] text-white py-3 rounded-xl font-semibold hover:bg-[#003a29] transition-colors disabled:opacity-50"
                  >
                    Davom etish →
                  </button>
                </div>
              </div>
            )}

            {/* STEP: Payment */}
            {step === "payment" && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">To'lov usuli</h2>
                <div className="space-y-3 mb-6">
                  {[
                    { value: "cash", icon: <Banknote size={20} />, label: "Naqd pul", desc: "Kuryer kelganda to'lang" },
                    { value: "card", icon: <CreditCard size={20} />, label: "Karta (Uzcard/Humo)", desc: "Kuryer POS-terminaliga" },
                    { value: "payme", icon: "💳", label: "Payme", desc: "Payme ilovasi orqali (tez orada)" },
                    { value: "click", icon: "📲", label: "Click", desc: "Click ilovasi orqali (tez orada)" },
                  ].map((opt) => (
                    <label key={opt.value} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      paymentMethod === opt.value ? "border-[#004733] bg-[#004733]/5" : "border-gray-200 hover:border-gray-300"
                    } ${["payme", "click"].includes(opt.value) ? "opacity-60" : ""}`}>
                      <input type="radio" name="payment" value={opt.value} checked={paymentMethod === opt.value} onChange={() => setPaymentMethod(opt.value as typeof paymentMethod)} className="sr-only" />
                      <div className="text-xl">{typeof opt.icon === "string" ? opt.icon : <span className={paymentMethod === opt.value ? "text-[#004733]" : "text-gray-400"}>{opt.icon}</span>}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.desc}</p>
                      </div>
                      {["payme", "click"].includes(opt.value) && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Tez orada</span>
                      )}
                    </label>
                  ))}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Izoh (ixtiyoriy)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Sotuvchiga izoh..."
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#004733] resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep("delivery")} className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    ← Orqaga
                  </button>
                  <button onClick={() => setStep("confirm")} className="flex-1 bg-[#004733] text-white py-3 rounded-xl font-semibold hover:bg-[#003a29] transition-colors">
                    Davom etish →
                  </button>
                </div>
              </div>
            )}

            {/* STEP: Confirm */}
            {step === "confirm" && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Buyurtmani tasdiqlash</h2>

                <div className="space-y-3 mb-6 text-sm">
                  {[
                    ["Ism", form.name],
                    ["Telefon", form.phone],
                    ["Manzil", `${form.city}, ${form.street}${form.building ? ", " + form.building : ""}`],
                    ["Yetkazish", deliveryType === "courier" ? "Kuryer" : "Olish punkti"],
                    ["To'lov", { cash: "Naqd", card: "Karta", payme: "Payme", click: "Click" }[paymentMethod]],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-medium text-gray-900">{v}</span>
                    </div>
                  ))}
                </div>

                {orderError ? (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {orderError}
                  </div>
                ) : null}

                <div className="flex gap-3">
                  <button onClick={() => setStep("payment")} className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    ← Orqaga
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] text-[#002d21] py-3 rounded-xl font-bold hover:from-[#ffc733] hover:to-[#f5b51b] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : null}
                    {loading ? "Yuborilmoqda..." : "Buyurtmani tasdiqlash ✓"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order summary */}
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-3">Mahsulotlar ({items.length})</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-2 text-sm">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                    {item.product.images[0] && (
                      <img src={item.product.images[0].url} alt="" className="w-full h-full object-contain p-0.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 line-clamp-1 text-xs">{item.product.name}</p>
                    <p className="text-gray-500 text-xs">{item.quantity} x {formatPrice(item.product.price)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-1.5 text-sm">
              <div className="flex gap-2 mb-2">
                <input
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value);
                    setCouponDiscount(0);
                    setCouponError(null);
                  }}
                  placeholder="Kupon kodi"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#004733]"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={!couponCode.trim() || couponLoading}
                  className="px-3 py-2 rounded-lg text-sm font-semibold bg-[#004733] text-white disabled:opacity-50"
                >
                  {couponLoading ? "..." : "Qo'llash"}
                </button>
              </div>
              {couponError ? <p className="text-xs text-red-600 mb-2">{couponError}</p> : null}
              {couponDiscount > 0 ? (
                <p className="text-xs text-green-600 mb-2">Kupon: −{formatPrice(couponDiscount)}</p>
              ) : null}
              <div className="flex justify-between text-gray-600">
                <span>Mahsulotlar</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Yetkazish</span>
                <span className={delivery === 0 ? "text-green-600" : ""}>{delivery === 0 ? "Bepul" : formatPrice(delivery)}</span>
              </div>
              {couponDiscount > 0 ? (
                <div className="flex justify-between text-green-700">
                  <span>Chegirma</span>
                  <span>−{formatPrice(couponDiscount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t">
                <span>Jami</span>
                <span>{formatPrice(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
