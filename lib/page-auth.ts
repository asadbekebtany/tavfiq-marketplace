import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getToken } from "next-auth/jwt";
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

/**
 * Prisma/auth() yuklamasdan JWT o‘qiydi — Netlify panel sahifalari uchun.
 */
export async function getPageSessionUser(): Promise<PageSessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = await getToken({
      // next-auth/jwt App Router uchun cookie header kerak
      req: {
        headers: {
          cookie: cookieStore
            .getAll()
            .map((c) => `${c.name}=${c.value}`)
            .join("; "),
        },
      } as Parameters<typeof getToken>[0]["req"],
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) return null;
    const id = typeof token.id === "string" ? token.id : typeof token.sub === "string" ? token.sub : null;
    if (!id) return null;

    return {
      id,
      role: parseRole(token.role),
      name: typeof token.name === "string" ? token.name : null,
      phone: typeof token.phone === "string" ? token.phone : null,
    };
  } catch {
    return null;
  }
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
