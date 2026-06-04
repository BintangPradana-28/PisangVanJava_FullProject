import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { NextFetchEvent } from "next/server";
import { getToken } from "next-auth/jwt";
import { globalRateLimit } from "@/lib/redis";

// ─── Route definitions ────────────────────────────────────────────────────────

const ADMIN_PATHS = [
  "/dashboard",
  "/manage-menu",
  "/orders",
  "/reports",
  "/settings",
  "/toppings",
  "/api/admin",
];

const CUSTOMER_PROTECTED_PATHS = [
  "/checkout",
  "/profile",
  "/track-order",
  "/api/cart",
];

const EDGE_CONTEXT_PATHS = ["/menu-spesial"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWIBHour(): number {
  // UTC+7 — reliable on Edge Runtime without Node.js Date quirks
  return new Date(Date.now() + 7 * 60 * 60 * 1000).getUTCHours();
}

function deriveMenuContext(hour: number) {
  return {
    earlyMorning: hour >= 4 && hour < 7,
    lunch:        hour >= 11 && hour < 14,
    lateAfternoon:hour >= 16 && hour < 18,
    evening:      hour >= 18 && hour < 21,
    isLateNight:  hour >= 21 || hour < 4,
  };
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATHS.some((p) => pathname.startsWith(p));
}

function isCustomerProtectedPath(pathname: string): boolean {
  return CUSTOMER_PROTECTED_PATHS.some((p) => pathname.startsWith(p));
}

function isEdgeContextPath(pathname: string): boolean {
  return EDGE_CONTEXT_PATHS.some((p) => pathname.startsWith(p));
}

// ─── Main middleware ──────────────────────────────────────────────────────────

export default async function middleware(
  req: NextRequest,
  event: NextFetchEvent
) {
  const { pathname } = req.nextUrl;

  // ── 1. Global rate limiting (runs on all matched routes) ──────────────────
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1";

    const { success } = await globalRateLimit.limit(`global_${ip}`);

    if (!success) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Coba lagi sebentar." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch {
    // Fail open — Redis down should not block legitimate users
    // In production: send alert to Sentry here
    console.error("[SECURITY] Rate limiter unavailable, failing open.");
  }

  // ── 2. Edge context injection for /menu-spesial ───────────────────────────
  if (isEdgeContextPath(pathname)) {
    const hour = getWIBHour();
    const context = deriveMenuContext(hour);
    const contextStr = JSON.stringify(context);
    const existingCookie = req.cookies.get("x-menu-context")?.value;

    const res = NextResponse.next();

    // Only write cookie when context changes — avoids unnecessary Set-Cookie headers
    if (existingCookie !== contextStr) {
      res.cookies.set("x-menu-context", contextStr, {
        httpOnly: false, // Must be readable by client (Zustand)
        maxAge: 1800,    // 30 minutes
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    return res;
  }

  // ── 3. Auth guard — read JWT token once for all protected routes ──────────
  const needsAuth = isAdminPath(pathname) || isCustomerProtectedPath(pathname);

  if (!needsAuth) {
    return NextResponse.next();
  }

  // getToken() uses the NEXTAUTH_SECRET env var automatically
  // NextAuth sometimes fails to infer secureCookie correctly on Vercel edge
  let token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: true,
  });

  if (!token) {
    token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: false,
    });
  }

  // ── 4. Unauthenticated — redirect to correct login page ──────────────────
  if (!token) {
    const loginUrl = isAdminPath(pathname)
      ? new URL("/login", req.url)         // Admin login
      : new URL("/member-login", req.url); // Customer login

    // Preserve the original destination for post-login redirect
    loginUrl.searchParams.set("callbackUrl", req.url);

    return NextResponse.redirect(loginUrl);
  }

  // ── 5. Authenticated but wrong role for admin routes ─────────────────────
  if (isAdminPath(pathname) && token.role !== "ADMIN") {
    // Logged-in customer trying to access admin — redirect to their home
    return NextResponse.redirect(new URL("/", req.url));
  }

  // ── 6. All checks passed ──────────────────────────────────────────────────
  return NextResponse.next();
}

// ─── Route matcher ────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    // Admin routes
    "/dashboard/:path*",
    "/manage-menu/:path*",
    "/orders/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/toppings/:path*",
    "/api/admin/:path*",

    // Customer protected routes
    "/checkout/:path*",
    "/profile/:path*",
    "/track-order/:path*",
    "/api/cart/:path*",

    // Public routes with edge context injection
    "/menu-spesial/:path*"
  ],
};
