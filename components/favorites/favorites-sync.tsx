"use client";

import { useEffect } from "react";
import { useFavoritesStore } from "@/lib/favorites-store";

export function FavoritesSync() {
  const initialize = useFavoritesStore((store) => store.initialize);
  const hydrated = useFavoritesStore((store) => store.hydrated);

  useEffect(() => {
    if (!hydrated) {
      void initialize();
    }
  }, [hydrated, initialize]);

  return null;
}
