import type { CatalogProduct } from "@/lib/catalog-product";
import type { CartItem } from "@/lib/cart-types";

export type ApiCartProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice: number | null;
  discount: number;
  rating: number;
  reviewCount: number;
  stock: number;
  soldCount: number;
  isActive: boolean;
  isApproved: boolean;
  isFeatured: boolean;
  oemNumber: string | null;
  images: { url: string }[];
  brand: { name: string } | null;
  store: { name: string; slug: string; isVerified: boolean };
  category: { id: string; name: string; slug: string };
};

export type ApiCartRow = {
  id: string;
  quantity: number;
  product: ApiCartProduct;
};

export function mapApiCartRow(row: ApiCartRow): CartItem {
  const product: CatalogProduct = {
    id: row.product.id,
    name: row.product.name,
    subtitle: row.product.oemNumber ?? row.product.brand?.name ?? undefined,
    slug: row.product.slug,
    price: row.product.price,
    oldPrice: row.product.oldPrice ?? undefined,
    discount: row.product.discount,
    rating: row.product.rating,
    reviewCount: row.product.reviewCount,
    stock: row.product.stock,
    soldCount: row.product.soldCount,
    isActive: row.product.isActive,
    isApproved: row.product.isApproved,
    isFeatured: row.product.isFeatured,
    images: row.product.images.length > 0 ? row.product.images : [{ url: "/placeholder-product.png" }],
    brand: row.product.brand,
    store: row.product.store,
    category: row.product.category,
  };

  return {
    id: row.id,
    product,
    quantity: row.quantity,
  };
}
