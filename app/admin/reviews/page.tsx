import { AdminReviewsClient } from "@/components/admin/admin-reviews-client";
import { requireAdminPage } from "@/lib/page-auth";

export const metadata = { title: "Sharhlar" };

export default async function AdminReviewsPage() {
  await requireAdminPage("/admin/reviews");
  return <AdminReviewsClient />;
}
