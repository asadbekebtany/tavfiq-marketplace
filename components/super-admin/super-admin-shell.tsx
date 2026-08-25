import { Crown } from "lucide-react";
import { SuperAdminSidebar } from "@/components/super-admin/super-admin-sidebar";

export function SuperAdminShell({
  children,
  userLabel,
}: {
  children: React.ReactNode;
  userLabel?: string | null;
}) {
  return (
    <div className="flex min-h-screen bg-[#f4f2f8]">
      <SuperAdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#1a0533] via-[#3b0764] to-[#1a0533] px-4 py-2.5 text-white md:px-6">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-[#f5b51b] to-[#d99a0a] text-[#1a0533]">
              <Crown size={13} />
            </span>
            <p className="text-xs font-black uppercase tracking-widest text-[#f5b51b]">
              Super Admin rejimi
            </p>
            <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/80 sm:inline">
              To‘liq dostup — barcha bo‘limlar ochiq
            </span>
          </div>
          <p className="truncate text-xs text-white/70">{userLabel ?? ""}</p>
        </div>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
