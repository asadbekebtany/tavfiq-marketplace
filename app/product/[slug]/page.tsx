import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/product/product-detail-client";
import { getCatalogProductBySlug, getRelatedCatalogProducts } from "@/lib/products";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getCatalogProductBySlug(slug);
  if (!product) return { title: "Mahsulot topilmadi" };
  return { title: product.name };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getCatalogProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedCatalogProducts(product.category.slug, product.id);

  return <ProductDetailClient product={product} related={related} />;
}
