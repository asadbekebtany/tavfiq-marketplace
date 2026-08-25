import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Super admin routes protection
  if (pathname.startsWith("/super-admin")) {
    const session = await auth();
    if (!session) {
      return NextResponse.redirect(new URL("/login?from=" + pathname, request.url));
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "super_admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  // Admin routes protection
  if (pathname.startsWith("/admin")) {
    const session = await auth();
    if (!session) {
      return NextResponse.redirect(new URL("/login?from=" + pathname, request.url));
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Seller routes protection
  if (
    pathname.startsWith("/seller/dashboard") ||
    pathname.startsWith("/seller/products") ||
    pathname.startsWith("/seller/orders") ||
    pathname.startsWith("/seller/analytics") ||
    pathname.startsWith("/seller/settings")
  ) {
    const session = await auth();
    if (!session) {
      return NextResponse.redirect(new URL("/login?from=" + pathname, request.url));
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "seller" && role !== "admin" && role !== "super_admin") {
      return NextResponse.redirect(new URL("/seller/register", request.url));
    }
  }

  // Profile routes protection
  if (pathname.startsWith("/profile")) {
    const session = await auth();
    if (!session) {
      return NextResponse.redirect(new URL("/login?from=" + pathname, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/super-admin/:path*",
    "/admin/:path*",
    "/seller/dashboard/:path*",
    "/seller/products/:path*",
    "/seller/orders/:path*",
    "/seller/analytics/:path*",
    "/seller/settings/:path*",
    "/profile/:path*",
  ],
};
