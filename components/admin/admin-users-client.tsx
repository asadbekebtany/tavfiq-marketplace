"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Ban, CheckCircle, ChevronDown, Loader2, Search, Shield } from "lucide-react";

type Role = "customer" | "seller" | "admin" | "super_admin";

type UserRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: Role;
  isActive: boolean;
  isBanned: boolean;
  orders: number;
  spent: number;
  joinedAt: string;
};

const ROLE_LABELS: Record<Role, string> = {
  customer: "Xaridor",
  seller: "Sotuvchi",
  admin: "Admin",
  super_admin: "Super Admin",
};

const ROLE_COLORS: Record<Role, string> = {
  customer: "bg-gray-100 text-gray-600",
  seller: "bg-blue-100 text-blue-700",
  admin: "bg-purple-100 text-purple-700",
  super_admin: "bg-[#cb11ab]/10 text-[#cb11ab]",
};

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

export function AdminUsersClient() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | Role>("all");
  const [openRole, setOpenRole] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (filterRole !== "all") params.set("role", filterRole);

      const response = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as {
        users?: Array<Record<string, unknown>>;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Foydalanuvchilarni yuklab bo‘lmadi");

      const rows: UserRow[] = (data.users ?? []).map((user) => ({
        id: String(user.id),
        name: String(user.name ?? "Foydalanuvchi"),
        phone: String(user.phone ?? "—"),
        email: String(user.email ?? "—"),
        role: String(user.role ?? "customer") as Role,
        isActive: Boolean(user.isActive ?? true),
        isBanned: Boolean(user.isBanned ?? false),
        orders: Number(user.orders ?? 0),
        spent: Number(user.spent ?? 0),
        joinedAt: new Date(String(user.createdAt ?? Date.now())).toLocaleDateString("uz-UZ", {
          month: "short",
          year: "numeric",
        }),
      }));

      setUsers(rows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Foydalanuvchilarni yuklab bo‘lmadi");
    } finally {
      setLoading(false);
    }
  }, [q, filterRole]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const toggleBan = async (id: string, isBanned: boolean) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned: !isBanned }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Holat yangilanmadi");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, isBanned: !isBanned, isActive: isBanned } : u,
        ),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Holat yangilanmadi");
    } finally {
      setUpdatingId(null);
    }
  };

  const changeRole = async (id: string, role: Role) => {
    setUpdatingId(id);
    setOpenRole(null);
    try {
      const response = await fetch(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Rol yangilanmadi");
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Rol yangilanmadi");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = users.filter((u) => {
    const matchQ =
      !q ||
      u.name.toLowerCase().includes(q.toLowerCase()) ||
      u.phone.includes(q) ||
      u.email.toLowerCase().includes(q.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchQ && matchRole;
  });

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="animate-spin text-[#002d21]" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <h1 className="text-xl font-black text-gray-900">Foydalanuvchilar</h1>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Jami", val: users.length, color: "text-gray-900" },
          { label: "Xaridorlar", val: users.filter((u) => u.role === "customer").length, color: "text-blue-600" },
          { label: "Sotuvchilar", val: users.filter((u) => u.role === "seller").length, color: "text-purple-600" },
          { label: "Bloklangan", val: users.filter((u) => u.isBanned).length, color: "text-red-500" },
        ].map(({ label, val, color }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className={`text-2xl font-black ${color}`}>{val}</p>
            <p className="mt-0.5 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ism, telefon yoki email..."
            className="w-full rounded-xl border border-gray-200 py-2 pl-8 pr-3 text-sm focus:border-[#cb11ab] focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "customer", "seller", "admin", "super_admin"] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setFilterRole(role)}
              className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                filterRole === role
                  ? "border-[#cb11ab] bg-[#cb11ab] text-white"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              {role === "all" ? "Barchasi" : ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {["Foydalanuvchi", "Telefon / Email", "Role", "Buyurtmalar", "Jami xarid", "Ro'yxatdan", "Holat", "Amallar"].map(
                  (h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className={`transition-colors hover:bg-gray-50 ${user.isBanned ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1a0533] to-[#cb11ab] text-xs font-bold text-white">
                        {(user.name[0] ?? "U").toUpperCase()}
                      </div>
                      <p className="whitespace-nowrap text-sm font-medium text-gray-900">
                        <Link href={`/admin/users/${user.id}`} className="hover:text-[#cb11ab] hover:underline">
                          {user.name}
                        </Link>
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700">{user.phone}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenRole(openRole === user.id ? null : user.id)}
                        disabled={updatingId === user.id || user.role === "super_admin"}
                        className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${ROLE_COLORS[user.role]}`}
                      >
                        {user.role === "super_admin" && <Shield size={10} />}
                        {ROLE_LABELS[user.role]}
                        {user.role !== "super_admin" ? <ChevronDown size={10} /> : null}
                      </button>
                      {openRole === user.id ? (
                        <>
                          <button
                            type="button"
                            aria-label="Yopish"
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenRole(null)}
                          />
                          <div className="absolute left-0 top-7 z-20 w-40 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
                            {(["customer", "seller", "admin"] as Role[]).map((role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => void changeRole(user.id, role)}
                                className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50 ${
                                  user.role === role ? "font-bold text-[#cb11ab]" : "text-gray-700"
                                }`}
                              >
                                {ROLE_LABELS[role]}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.orders}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-gray-900">
                    {user.spent > 0 ? `${fmt(user.spent)} so'm` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{user.joinedAt}</td>
                  <td className="px-4 py-3">
                    {user.isBanned ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                        Bloklangan
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600">
                        Faol
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.role !== "super_admin" ? (
                      <button
                        type="button"
                        disabled={updatingId === user.id}
                        onClick={() => void toggleBan(user.id, user.isBanned)}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          user.isBanned
                            ? "bg-green-50 text-green-600 hover:bg-green-100"
                            : "bg-red-50 text-red-500 hover:bg-red-100"
                        }`}
                      >
                        {user.isBanned ? (
                          <>
                            <CheckCircle size={12} /> Blokni ochish
                          </>
                        ) : (
                          <>
                            <Ban size={12} /> Bloklash
                          </>
                        )}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">Foydalanuvchi topilmadi</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
