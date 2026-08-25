import { AdminCouponsClient } from "@/components/admin/admin-coupons-client";
import { requireAdminPage } from "@/lib/page-auth";

export const metadata = { title: "Kuponlar" };

export default async function CouponsPage() {
  await requireAdminPage("/admin/coupons");
  return <AdminCouponsClient />;
}
