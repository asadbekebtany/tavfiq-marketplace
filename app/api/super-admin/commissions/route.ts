import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  defaultPercent: z.coerce.number().min(0).max(50).optional(),
  categoryId: z.string().min(1).optional(),
  rate: z.coerce.number().min(0).max(50).optional(),
});

export async function GET() {
  const { error } = await requireSuperAdminApi();
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan" }, { status: 503 });
  }

  const settings = await getSiteSettings();
  const [rows, categories] = await Promise.all([
    prisma.commission.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  return NextResponse.json({
    defaultPercent: settings.commissionPercent,
    commissions: rows,
    categories,
  });
}

export async function PATCH(request: Request) {
  const { error } = await requireSuperAdminApi();
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan" }, { status: 503 });
  }

  try {
    const data = patchSchema.parse(await request.json());
    if (typeof data.defaultPercent === "number") {
      await updateSiteSettings({ commissionPercent: data.defaultPercent });
    }
    if (data.categoryId && typeof data.rate === "number") {
      const existing = await prisma.commission.findFirst({
        where: { categoryId: data.categoryId },
      });
      if (existing) {
        await prisma.commission.update({
          where: { id: existing.id },
          data: { rate: data.rate, isDefault: false },
        });
      } else {
        await prisma.commission.create({
          data: { categoryId: data.categoryId, rate: data.rate, isDefault: false },
        });
      }
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Saqlanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
