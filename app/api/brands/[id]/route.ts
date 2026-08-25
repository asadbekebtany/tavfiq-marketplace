import { NextResponse } from "next/server";
import { deleteBrand, getBrand, updateBrand } from "@/lib/brands-store";
import { requireAdminApi } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brand = getBrand(id);
  return brand ? NextResponse.json({ brand }) : NextResponse.json({ error: "Brend topilmadi" }, { status: 404 });
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminApi(); if (error) return error;
  const { id } = await params;
  try {
    const brand = updateBrand(id, await request.json());
    return brand ? NextResponse.json({ brand }) : NextResponse.json({ error: "Brend topilmadi" }, { status: 404 });
  } catch { return NextResponse.json({ error: "Noto‘g‘ri ma’lumot" }, { status: 400 }); }
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminApi(); if (error) return error;
  const { id } = await params;
  return deleteBrand(id) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Brend topilmadi" }, { status: 404 });
}
