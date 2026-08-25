import { AdminReturnsClient } from "@/components/admin/admin-returns-client";
import { requireAdminPage } from "@/lib/page-auth";

export const metadata = { title: "Qaytarishlar" };

export default async function AdminReturnsPage() {
  await requireAdminPage("/admin/returns");
  return <AdminReturnsClient />;
}
