import type { CatalogProduct } from "@/lib/catalog-product";

export interface CartItem {
  /** Savat qatori ID (API) yoki mahsulot ID (local guest) */
  id: string;
  product: CatalogProduct;
  quantity: number;
}
