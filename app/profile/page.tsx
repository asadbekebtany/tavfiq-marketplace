import Link from "next/link";
import { Package, Heart, Star, RotateCcw, Car, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { getUserBonusBalance } from "@/lib/bonus";
import { listOrders } from "@/lib/orders";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Profilim" };

const quickLinks = [
  { href: "/profile/orders", icon: Package, label: "Buyurtmalar", color: "bg-[#004733]/10 text-[#004733]" },
  { href: "/profile/favorites", icon: Heart, label: "Saralanganlar", color: "bg-red-50 text-red-500" },
  { href: "/profile/reviews", icon: Star, label: "Sharhlar", color: "bg-yellow-50 text-yellow-600" },
  { href: "/profile/returns", icon: RotateCcw, label: "Qaytarishlar", color: "bg-gray-50 text-gray-600" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Kutilmoqda",
  shipped: "Yo'lda",
  delivered: "Yetkazildi",
  cancelled: "Bekor",
};

export default async function ProfilePage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const orders = userId ? (await listOrders(userId)).slice(0, 3) : [];
  const bonusBalance = userId ? await getUserBonusBalance(userId) : 0;
  const fmtBonus = new Intl.NumberFormat("uz-UZ").format(bonusBalance);

  const quickLinksWithCounts = quickLinks.map((link) =>
    link.href === "/profile/orders"
      ? { ...link, count: String(orders.length || 0) }
      : { ...link, count: link.label === "Saralanganlar" ? "12" : link.label === "Sharhlar" ? "5" : "0" },
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#004733] to-[#003a29] text-3xl font-black text-white">
            D
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {session?.user?.name ?? "Foydalanuvchi"}
            </h1>
            <p className="text-gray-500">
              {(session?.user as { phone?: string } | undefined)?.phone ?? "+998 90 123 45 67"}
            </p>
            <span className="mt-1 inline-block rounded-full bg-[#004733]/10 px-2 py-0.5 text-xs font-medium text-[#004733]">
              Xaridor
            </span>
          </div>
          <Link href="/profile/settings" className="ml-auto text-sm text-[#004733] hover:underline">
            Tahrirlash
          </Link>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[#f5b51b]/20 bg-gradient-to-r from-[#002d21] to-[#004733] p-4">
          <div>
            <p className="mb-1 text-xs text-gray-300">Bonus ballarim</p>
            <p className="text-2xl font-black text-[#f5b51b]">{fmtBonus}</p>
            <p className="text-xs text-gray-300">= {fmtBonus} so&apos;m</p>
          </div>
          <div className="text-right">
            <p className="mb-2 text-xs text-gray-300">Sarflash mumkin</p>
            <button className="rounded-lg bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] px-3 py-1.5 text-xs font-bold text-[#002d21] transition-all hover:from-[#ffc733] hover:to-[#f5b51b]">
              Ishlatish
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickLinksWithCounts.map(({ href, icon: Icon, label, count, color }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:shadow-md"
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-black text-gray-900">{count}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">So&apos;nggi buyurtmalar</h2>
          <Link href="/profile/orders" className="flex items-center gap-1 text-sm text-[#004733] hover:underline">
            Barchasi <ChevronRight size={14} />
          </Link>
        </div>

        {orders.length === 0 ? (
          <p className="text-sm text-gray-500">Hali buyurtmalar yo‘q.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/profile/orders/${order.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.id}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString("uz-UZ")} · {order.items.length} ta mahsulot
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatPrice(order.total)}</p>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Avtomobillarim</h2>
          <Link href="/profile/cars" className="text-sm text-[#004733] hover:underline">
            + Qo&apos;shish
          </Link>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
          <Car size={24} className="text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">Hali avtomobil qo&apos;shilmagan</p>
            <Link href="/profile/cars" className="text-xs text-[#004733] hover:underline">
              Avtomobil qo&apos;shish →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
