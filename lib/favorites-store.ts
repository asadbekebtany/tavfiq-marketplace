"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PROJECT_SLUG } from "@/lib/brand";
import type { CatalogProduct } from "@/lib/catalog-product";

const FAVORITES_STORAGE_KEY = `${PROJECT_SLUG}-favorites-v1`;

export type FavoritesSource = "unknown" | "local" | "api";

interface FavoritesStore {
  products: CatalogProduct[];
  source: FavoritesSource;
  hydrated: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  toggle: (product: CatalogProduct) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  isFavorite: (productId: string) => boolean;
  count: () => number;
}

function uniqById(products: CatalogProduct[]) {
  const map = new Map<string, CatalogProduct>();
  for (const p of products) map.set(p.id, p);
  return [...map.values()];
}

async function fetchFavorites(): Promise<CatalogProduct[] | null> {
  const response = await fetch("/api/favorites", { cache: "no-store" });
  if (response.status === 401) return null;
  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error ?? "Sevimlilarni yuklab bo‘lmadi");
  }
  const data = (await response.json()) as { products?: CatalogProduct[] };
  return data.products ?? [];
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      products: [],
      source: "unknown",
      hydrated: false,
      isLoading: false,
      error: null,

      refresh: async () => {
        const products = await fetchFavorites();
        if (products === null) {
          set({ source: "local" });
          return;
        }
        set({ products: uniqById(products), source: "api", error: null });
      },

      initialize: async () => {
        if (get().hydrated) return;
        set({ isLoading: true, error: null });

        try {
          const remote = await fetchFavorites();
          if (remote === null) {
            // Login yo‘q — faqat local layklar
            set({
              source: "local",
              hydrated: true,
              isLoading: false,
              products: uniqById(get().products),
            });
            return;
          }

          const localProducts = get().products;
          if (localProducts.length > 0) {
            for (const product of localProducts) {
              if (!remote.some((p) => p.id === product.id)) {
                await fetch("/api/favorites", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ productId: product.id }),
                }).catch(() => undefined);
              }
            }
            const merged = await fetchFavorites();
            set({
              products: uniqById(merged ?? remote),
              source: "api",
              hydrated: true,
              isLoading: false,
            });
            return;
          }

          set({
            products: uniqById(remote),
            source: "api",
            hydrated: true,
            isLoading: false,
          });
        } catch (err: unknown) {
          set({
            source: "local",
            hydrated: true,
            isLoading: false,
            products: uniqById(get().products),
            error: err instanceof Error ? err.message : "Sevimlilarni yuklab bo‘lmadi",
          });
        }
      },

      toggle: async (product) => {
        const { products, source } = get();
        const exists = products.some((p) => p.id === product.id);

        // Optimistic UI — faqat layk qilinganlar qoladi
        const nextLocal = exists
          ? products.filter((p) => p.id !== product.id)
          : uniqById([...products, product]);
        set({ products: nextLocal, error: null });

        if (source !== "api") return;

        try {
          const response = await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: product.id }),
          });
          const data = (await response.json()) as { error?: string; action?: string };
          if (!response.ok) throw new Error(data.error ?? "Saqlab bo‘lmadi");

          set({
            products:
              data.action === "removed"
                ? get().products.filter((p) => p.id !== product.id)
                : uniqById([...get().products.filter((p) => p.id !== product.id), product]),
          });
        } catch (err: unknown) {
          // Rollback
          set({
            products,
            error: err instanceof Error ? err.message : "Saqlab bo‘lmadi",
          });
          throw err;
        }
      },

      remove: async (productId) => {
        const product = get().products.find((p) => p.id === productId);
        if (!product) return;
        await get().toggle(product);
      },

      isFavorite: (productId) => get().products.some((p) => p.id === productId),

      count: () => get().products.length,
    }),
    {
      name: FAVORITES_STORAGE_KEY,
      partialize: (state) => ({
        products: state.products,
        source: state.source === "api" ? "api" : "local",
      }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.hydrated) {
          void state.initialize();
        }
      },
    },
  ),
);
