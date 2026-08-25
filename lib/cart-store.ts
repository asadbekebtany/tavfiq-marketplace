"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PROJECT_SLUG } from "@/lib/brand";
import type { CatalogProduct } from "@/lib/catalog-product";
import { mapApiCartRow, type ApiCartRow } from "@/lib/cart-mapper";
import type { CartItem } from "@/lib/cart-types";

const CART_STORAGE_KEY = `${PROJECT_SLUG}-cart-v1`;

export type CartSource = "unknown" | "local" | "api";

interface CartStore {
  items: CartItem[];
  source: CartSource;
  hydrated: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  addItem: (product: CatalogProduct, qty?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQty: (productId: string, qty: number) => Promise<void>;
  clearCart: () => Promise<void>;
  total: () => number;
  itemCount: () => number;
}

async function fetchCartItems(): Promise<CartItem[] | null> {
  const response = await fetch("/api/cart", { cache: "no-store" });
  if (response.status === 401) return null;
  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error ?? "Savatni yuklab bo‘lmadi");
  }
  const data = (await response.json()) as { items?: ApiCartRow[] };
  return (data.items ?? []).map(mapApiCartRow);
}

function upsertLocalItem(items: CartItem[], product: CatalogProduct, qty: number): CartItem[] {
  const existing = items.find((item) => item.product.id === product.id);
  if (existing) {
    return items.map((item) =>
      item.product.id === product.id
        ? { ...item, quantity: Math.min(item.quantity + qty, product.stock) }
        : item,
    );
  }
  return [...items, { id: product.id, product, quantity: qty }];
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      source: "unknown",
      hydrated: false,
      isLoading: false,
      error: null,

      refresh: async () => {
        const items = await fetchCartItems();
        if (items === null) {
          set({ source: "local" });
          return;
        }
        set({ items, source: "api", error: null });
      },

      initialize: async () => {
        if (get().hydrated) return;
        set({ isLoading: true, error: null });

        try {
          const items = await fetchCartItems();

          if (items === null) {
            set({ source: "local", hydrated: true, isLoading: false });
            return;
          }

          const guestItems = get().items;
          if (guestItems.length > 0) {
            for (const guestItem of guestItems) {
              await fetch("/api/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  productId: guestItem.product.id,
                  quantity: guestItem.quantity,
                }),
              });
            }
          }

          const merged = await fetchCartItems();
          set({
            items: merged ?? [],
            source: "api",
            hydrated: true,
            error: null,
          });
        } catch (err: unknown) {
          set({
            source: "local",
            hydrated: true,
            error: err instanceof Error ? err.message : "Savatni sinxronlashda xato",
          });
        } finally {
          set({ isLoading: false });
        }
      },

      addItem: async (product, qty = 1) => {
        const { source } = get();

        if (source === "api") {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch("/api/cart", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId: product.id, quantity: qty }),
            });
            const data = (await response.json()) as { error?: string };
            if (!response.ok) throw new Error(data.error ?? "Savatga qo‘shib bo‘lmadi");
            await get().refresh();
          } catch (err: unknown) {
            set({
              error: err instanceof Error ? err.message : "Savatga qo‘shib bo‘lmadi",
            });
            throw err;
          } finally {
            set({ isLoading: false });
          }
          return;
        }

        set({
          items: upsertLocalItem(get().items, product, qty),
          source: get().source === "unknown" ? "local" : get().source,
        });
      },

      removeItem: async (productId) => {
        const { source, items } = get();

        if (source === "api") {
          const row = items.find((item) => item.product.id === productId);
          set({ isLoading: true, error: null });
          try {
            const params = new URLSearchParams();
            if (row?.id) params.set("itemId", row.id);
            else params.set("productId", productId);

            const response = await fetch(`/api/cart?${params.toString()}`, { method: "DELETE" });
            const data = (await response.json()) as { error?: string };
            if (!response.ok) throw new Error(data.error ?? "O‘chirib bo‘lmadi");
            await get().refresh();
          } catch (err: unknown) {
            set({
              error: err instanceof Error ? err.message : "O‘chirib bo‘lmadi",
            });
          } finally {
            set({ isLoading: false });
          }
          return;
        }

        set({ items: items.filter((item) => item.product.id !== productId) });
      },

      updateQty: async (productId, qty) => {
        const { source, items } = get();

        if (source === "api") {
          const row = items.find((item) => item.product.id === productId);
          if (!row) return;

          set({ isLoading: true, error: null });
          try {
            const response = await fetch("/api/cart", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemId: row.id, quantity: qty }),
            });
            const data = (await response.json()) as { error?: string };
            if (!response.ok) throw new Error(data.error ?? "Miqdorni yangilab bo‘lmadi");
            await get().refresh();
          } catch (err: unknown) {
            set({
              error: err instanceof Error ? err.message : "Miqdorni yangilab bo‘lmadi",
            });
          } finally {
            set({ isLoading: false });
          }
          return;
        }

        if (qty <= 0) {
          set({ items: items.filter((item) => item.product.id !== productId) });
          return;
        }

        set({
          items: items.map((item) =>
            item.product.id === productId ? { ...item, quantity: qty } : item,
          ),
        });
      },

      clearCart: async () => {
        const { source } = get();

        if (source === "api") {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch("/api/cart", { method: "DELETE" });
            const data = (await response.json()) as { error?: string };
            if (!response.ok) throw new Error(data.error ?? "Savatni tozalab bo‘lmadi");
            set({ items: [] });
          } catch (err: unknown) {
            set({
              error: err instanceof Error ? err.message : "Savatni tozalab bo‘lmadi",
            });
          } finally {
            set({ isLoading: false });
          }
          return;
        }

        set({ items: [] });
      },

      total: () => get().items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),

      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: CART_STORAGE_KEY,
      partialize: (state) => ({
        items: state.source === "api" ? [] : state.items,
      }),
      onRehydrateStorage: () => (state) => {
        void state?.initialize();
      },
    },
  ),
);
