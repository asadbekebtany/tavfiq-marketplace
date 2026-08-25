import { PickupPointsClient } from "@/components/admin/pickup-points-client";
import { requireAdminPage } from "@/lib/page-auth";

export const metadata = { title: "Olish punktlari" };

export default async function AdminPickupPointsPage() {
  await requireAdminPage("/admin/pickup-points");
  return <PickupPointsClient />;
}
