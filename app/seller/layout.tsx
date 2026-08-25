import { SellerSidebar } from "@/components/seller/seller-sidebar";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <SellerSidebar />
      <main className="flex-1 min-w-0 p-6">{children}</main>
    </div>
  );
}
