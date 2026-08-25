import { NextResponse } from "next/server";
import { getAuditContextFromRequest, writeAuditLog } from "@/lib/audit-log";
import { requirePermissionApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { returnStatusSchema, validationError } from "@/lib/marketplace-schemas";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { error, user: actor } = await requirePermissionApi("returns.edit");
  if (error || !actor) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const { status } = returnStatusSchema.parse(await request.json());

    const existing = await prisma.returnRequest.findUnique({
      where: { id },
      select: { id: true, status: true, orderId: true },
    });
    if (!existing) return NextResponse.json({ error: "Qaytarish so‘rovi topilmadi" }, { status: 404 });

    const returnRequest = await prisma.returnRequest.update({ where: { id }, data: { status } });

    const auditContext = getAuditContextFromRequest(request);
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "return_status_update",
      entityType: "return_request",
      entityId: id,
      metadata: {
        orderId: existing.orderId,
        previousStatus: existing.status,
        newStatus: status,
      },
      ...auditContext,
    });

    return NextResponse.json({ success: true, returnRequest });
  } catch (err) {
    return NextResponse.json(validationError(err), { status: 400 });
  }
}
