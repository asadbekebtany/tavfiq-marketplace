import { NextResponse } from "next/server";
import { canAccessOrder, requireSellerApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import { orderStatusSchema, validationError } from "@/lib/marketplace-schemas";
import { getOrderDetailById, updateOrderStatus } from "@/lib/orders";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;

  const body = (await request.json()) as { status?: string };
  const parsed = orderStatusSchema.safeParse({ status: body.status });
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error), { status: 400 });
  }

  const order = await getOrderDetailById(id);
  if (!order) {
    return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
  }

  if (!canAccessOrder(user, order.userId, order.storeSellerUserId)) {
    return NextResponse.json({ error: "Bu buyurtmani boshqarish huquqingiz yo‘q" }, { status: 403 });
  }

  if (user.role === "seller" && parsed.data.status === "returned") {
    return NextResponse.json({ error: "Seller bu statusni o‘rnatolmaydi" }, { status: 403 });
  }

  if (await checkDatabaseConnection()) {
    const updated = await prisma.order.update({
      where: { id },
      data: { status: parsed.data.status },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        store: true,
        items: true,
      },
    });
    if (parsed.data.status === "delivered") {
      const { creditOrderCashback } = await import("@/lib/bonus");
      await creditOrderCashback(id);
    }
    return NextResponse.json({ success: true, order: updated });
  }

  const updated = await updateOrderStatus(id, parsed.data.status);
  if (!updated) {
    return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
  }

  return NextResponse.json({ success: true, order: updated });
}
