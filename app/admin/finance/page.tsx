import { AdminFinanceClient } from "@/components/admin/admin-finance-client";
import { requireAdminPage } from "@/lib/page-auth";

export const metadata = { title: "Moliya" };

export default async function AdminFinancePage() {
  await requireAdminPage("/admin/finance");
  return <AdminFinanceClient />;
}
