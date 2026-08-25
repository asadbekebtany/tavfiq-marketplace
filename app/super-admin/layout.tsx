import { SuperAdminShell } from "@/components/super-admin/super-admin-shell";
import { requireSuperAdminPage } from "@/lib/page-auth";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSuperAdminPage("/super-admin");
  return <SuperAdminShell userLabel={user.name ?? user.phone}>{children}</SuperAdminShell>;
}
