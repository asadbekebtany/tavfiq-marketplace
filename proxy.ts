import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Edge/middleware da Prisma/auth() chaqirilmaydi — Netlify C++ addon taqiqlaydi.
 * Session JWT dan role o‘qiladi.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const role = typeof token?.role === "string" ? token.role : "";

  if (pathname.startsWith("/super-admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login?from=" + pathname, request.url));
    }
    if (role !== "super_admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login?from=" + pathname, request.url));
    }
    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (
    pathname.startsWith("/seller/dashboard") ||
    pathname.startsWith("/seller/products") ||
    pathname.startsWith("/seller/orders") ||
    pathname.startsWith("/seller/analytics") ||
    pathname.startsWith("/seller/settings")
  ) {
    if (!token) {
      return NextResponse.redirect(new URL("/login?from=" + pathname, request.url));
    }
    if (role !== "seller" && role !== "admin" && role !== "super_admin") {
      return NextResponse.redirect(new URL("/seller/register", request.url));
    }
  }

  if (pathname.startsWith("/profile")) {
    if (!token) {
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
