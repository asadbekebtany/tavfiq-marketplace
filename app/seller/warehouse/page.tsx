import { SellerWarehouseClient } from "@/components/seller/seller-warehouse-client";
import { requireSellerPage } from "@/lib/page-auth";

export const metadata = { title: "Ombor" };

export default async function SellerWarehousePage() {
  await requireSellerPage("/seller/warehouse");
  return <SellerWarehouseClient />;
}
