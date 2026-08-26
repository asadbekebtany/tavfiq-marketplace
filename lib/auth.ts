import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { serverEnv } from "@/lib/env.server";
import { normalizePhone } from "@/lib/phone";
import { enforceAuthRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { resolveAuthUser, UserPersistenceError } from "@/lib/users";

async function isOtpValid(phone: string, code: string): Promise<boolean> {
  if (serverEnv.sms.isConfigured) {
    const { verifyPhoneOtp } = await import("@/lib/otp");
    const result = await verifyPhoneOtp(phone, code);
    return result.valid;
  }

  return serverEnv.auth.otpDemoCodes.includes(code);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: serverEnv.auth.secret,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Phone",
      credentials: {
        phone: { label: "Telefon", type: "tel" },
        code: { label: "Kod", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) return null;

        const code = (credentials.code as string).trim();
        const phone = normalizePhone(credentials.phone as string);

        if (!(await isOtpValid(phone, code))) {
          return null;
        }

        try {
          return await resolveAuthUser(phone);
        } catch (error) {
          if (error instanceof UserPersistenceError) {
            console.error("[auth] resolveAuthUser:", error.message);
            return null;
          }
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "customer";
        token.phone = (user as { phone?: string }).phone ?? "";
        token.name = user.name ?? "Foydalanuvchi";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { phone?: string }).phone = token.phone as string;
        if (typeof token.name === "string") session.user.name = token.name;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      const role = (user as { role?: string }).role;
      if (role !== "admin" && role !== "super_admin" && role !== "seller") return;

      const userId = (user as { id?: string }).id;
      if (!userId) return;

      try {
        const { writeAuditLog } = await import("@/lib/audit-log");
        await writeAuditLog({
          actorId: userId,
          actorRole: role,
          action: "auth_login",
          entityType: "session",
          entityId: userId,
          metadata: {
            phone: (user as { phone?: string }).phone ?? null,
            role,
          },
        });
      } catch {
        // demo / DB yo‘q
      }
    },
  },
});

async function parseCredentialsPhone(request: NextRequest): Promise<string | null> {
  const url = new URL(request.url);
  if (request.method !== "POST") return null;
  if (!url.pathname.endsWith("/callback/credentials")) return null;

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.clone().json()) as { phone?: string };
      if (!body.phone) return null;
      return normalizePhone(body.phone);
    }

    const text = await request.clone().text();
    const params = new URLSearchParams(text);
    const phone = params.get("phone");
    if (!phone) return null;
    return normalizePhone(phone);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const phone = await parseCredentialsPhone(request);

  if (phone) {
    const rateLimit = await enforceAuthRateLimit({
      scope: "auth-signin",
      ip: getClientIp(request),
      phone,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: rateLimit.message,
          retryAfterSec: rateLimit.retryAfterSec,
          rateLimited: true,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSec) },
        },
      );
    }
  }

  return handlers.POST(request);
}

export async function GET(request: NextRequest) {
  return handlers.GET(request);
}
