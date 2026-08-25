import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SuperAdminShell } from "@/components/super-admin/super-admin-shell";
import { requireAdminPage } from "@/lib/page-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage("/admin/dashboard");

  // Super admin /admin/... sahifalarga kirsa ham o'z (binafsha) qobig'ida qoladi
  if (user?.role === "super_admin") {
    return <SuperAdminShell userLabel={user.name ?? user.phone}>{children}</SuperAdminShell>;
  }

  return (
    <div className="flex min-h-screen bg-[#f3f5f1]">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
