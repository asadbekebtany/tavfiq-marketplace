import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAtLeast, type Role } from "@/lib/permissions";

export type PageSessionUser = {
  id: string;
  role: Role;
  name?: string | null;
  phone?: string | null;
};

function parseRole(value: unknown): Role {
  if (
    value === "customer" ||
    value === "seller" ||
    value === "admin" ||
    value === "super_admin"
  ) {
    return value;
  }
  return "customer";
}

export async function getPageSessionUser(): Promise<PageSessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user = session.user as {
    id?: string;
    role?: string;
    name?: string | null;
    phone?: string | null;
  };
  if (!user.id) return null;

  return {
    id: user.id,
    role: parseRole(user.role),
    name: user.name,
    phone: user.phone,
  };
}

export async function requirePageSession(fromPath: string): Promise<PageSessionUser> {
  const user = await getPageSessionUser();
  if (!user) redirect(`/login?from=${encodeURIComponent(fromPath)}`);
  return user;
}

export async function requireAdminPage(fromPath: string): Promise<PageSessionUser> {
  const user = await requirePageSession(fromPath);
  if (!isAtLeast(user.role, "admin")) redirect("/");
  return user;
}

export async function requireSuperAdminPage(fromPath: string): Promise<PageSessionUser> {
  const user = await requirePageSession(fromPath);
  if (user.role !== "super_admin") redirect("/admin/dashboard");
  return user;
}

export async function requireSellerPage(fromPath: string): Promise<PageSessionUser> {
  const user = await requirePageSession(fromPath);
  if (!isAtLeast(user.role, "seller")) redirect("/seller/register");
  return user;
}
