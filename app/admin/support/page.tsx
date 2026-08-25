import { AdminSupportClient } from "@/components/admin/admin-support-client";
import { requireAdminPage } from "@/lib/page-auth";

export const metadata = { title: "Support" };

export default async function SupportPage() {
  await requireAdminPage("/admin/support");
  return <AdminSupportClient />;
}
