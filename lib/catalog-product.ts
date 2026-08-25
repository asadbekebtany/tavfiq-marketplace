/** Storefront mahsulot kartasi (mock va DB uchun umumiy tip) */
export type CatalogProduct = {
  id: string;
  name: string;
  subtitle?: string;
  slug: string;
  price: number;
  oldPrice?: number;
  discount: number;
  rating: number;
  reviewCount: number;
  stock: number;
  soldCount: number;
  isActive: boolean;
  isApproved: boolean;
  isFeatured: boolean;
  images: { url: string }[];
  brand?: { name: string } | null;
  store: { name: string; slug: string; isVerified: boolean };
  category: { id: string; name: string; slug: string };
};
