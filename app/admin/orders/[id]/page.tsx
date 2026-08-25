import { notFound } from "next/navigation";
import { canAccessOrder } from "@/lib/api-auth";
import { getOrderDetailById } from "@/lib/orders";
import { requireAdminPage } from "@/lib/page-auth";
import { OrderOpsDetail } from "@/components/orders/order-ops-detail";

export const metadata = { title: "Buyurtma tafsilotlari" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAdminPage(`/admin/orders/${id}`);

  const order = await getOrderDetailById(id);
  if (!order) notFound();

  if (!canAccessOrder(user, order.userId, order.storeSellerUserId)) {
    notFound();
  }

  return (
    <OrderOpsDetail
      order={order}
      backHref="/admin/orders"
      canUpdateStatus
      patchUrl="/api/orders"
    />
  );
}
