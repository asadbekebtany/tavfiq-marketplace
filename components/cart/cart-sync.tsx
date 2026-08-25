"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/cart-store";

/** Login holatida savatni server bilan sinxronlashtirish */
export function CartSync() {
  const initialize = useCartStore((store) => store.initialize);
  const hydrated = useCartStore((store) => store.hydrated);

  useEffect(() => {
    if (!hydrated) {
      void initialize();
    }
  }, [hydrated, initialize]);

  return null;
}
