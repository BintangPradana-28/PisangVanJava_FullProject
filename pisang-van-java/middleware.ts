import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/src/auth.config";

const { auth } = NextAuth(authConfig);
import { globalRateLimit, redis } from "@/lib/redis";

// ─── Native TypeScript RBAC Route Map ───────────────────────────────────────────

type AllowedRoles = ("SUPER_ADMIN" | "ADMIN" | "KITCHEN" | "CASHIER" | "CUSTOMER" | "RESELLER")[];

const PROTECTED: Record<string, AllowedRoles> = {
  // STRICT ADMIN
  "/dashboard": ["SUPER_ADMIN", "ADMIN"],
  "/manage-menu": ["SUPER_ADMIN", "ADMIN"],
  "/settings": ["SUPER_ADMIN", "ADMIN"],
  "/reports": ["SUPER_ADMIN", "ADMIN"],
  "/toppings": ["SUPER_ADMIN", "ADMIN"],
  "/api/admin": ["SUPER_ADMIN", "ADMIN"],
  
  // STAFF
  "/orders": ["SUPER_ADMIN", "ADMIN", "KITCHEN", "CASHIER"],
  "/kasir": ["SUPER_ADMIN", "ADMIN", "CASHIER"],
  "/kitchen": ["SUPER_ADMIN", "ADMIN", "KITCHEN"],

  // CUSTOMER BOUNDARY
  "/checkout": ["CUSTOMER", "RESELLER", "SUPER_ADMIN", "ADMIN"],
  "/profile": ["CUSTOMER", "RESELLER", "SUPER_ADMIN", "ADMIN"],
  "/track-order": ["CUSTOMER", "RESELLER", "SUPER_ADMIN", "ADMIN"],
  "/api/cart": ["CUSTOMER", "RESELLER", "SUPER_ADMIN", "ADMIN"],
};

const EDGE_CONTEXT_PATHS = ["/menu-spesial"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWIBHour(): number {
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

function isEdgeContextPath(pathname: string): boolean {
  return EDGE_CONTEXT_PATHS.some((p) => pathname.startsWith(p));
}

/**
 * Resolves the required roles for a given pathname by checking the PROTECTED map.
 */
function getRequiredRoles(pathname: string): AllowedRoles | null {
  for (const [route, roles] of Object.entries(PROTECTED)) {
    if (pathname.startsWith(route)) {
      return roles;
    }
  }
  return null;
}

// ─── Main middleware (wrapped with Auth.js v5) ───────────────────────────────

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // ── 1. Global rate limiting (runs on all matched routes) ──────────────────
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1";
    const { success } = await globalRateLimit.limit(`global_${ip}`);

    if (!success) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Coba lagi sebentar." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch {
    console.error("[SECURITY] Rate limiter unavailable, failing open.");
  }

  // ── 2. Edge context injection for /menu-spesial ───────────────────────────
  if (isEdgeContextPath(pathname)) {
    const hour = getWIBHour();
    const context = deriveMenuContext(hour);
    const contextStr = JSON.stringify(context);
    const existingCookie = req.cookies.get("x-menu-context")?.value;

    const res = NextResponse.next();

    if (existingCookie !== contextStr) {
      res.cookies.set("x-menu-context", contextStr, {
        httpOnly: false,
        maxAge: 1800,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
    return res;
  }

  // ── 3. Route Protection & RBAC Resolution ───────────────────────────────────
  const requiredRoles = getRequiredRoles(pathname);
  const token = req.auth?.user;

  // ── 3.5. Banned User Check ────────────────────────────────────────────────
  if (token && requiredRoles) {
    let isBanned = token.isBanned;
    
    if (!isBanned) {
      try {
        const bannedInRedis = await redis.get(`banned:${token.id}`);
        if (bannedInRedis) isBanned = true;
      } catch (err) {
        console.error("[SECURITY] Redis ban check failed", err);
      }
    }

    if (isBanned) {
      const response = NextResponse.redirect(new URL("/banned", req.url));
      response.cookies.delete("authjs.session-token");
      response.cookies.delete("__Secure-authjs.session-token");
      return response;
    }
  }

  if (!requiredRoles) {
    // Route is fully public
    return NextResponse.next();
  }

  // ── 4. Unauthenticated Boundary ──────────────────────────────────────────────
  if (!token) {
    // Determine login portal based on route intent
    const isStaffRoute = requiredRoles.includes("ADMIN") && !requiredRoles.includes("CUSTOMER");
    const loginUrl = isStaffRoute
      ? new URL("/login", req.url)
      : new URL("/member-login", req.url);

    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // ── 5. Native Role Validation (The Core Security Check) ────────────────────
  const userRole = token.role as string;
  if (!requiredRoles.includes(userRole as any)) {
    // Authorized but Forbidden
    console.warn(`[RBAC BLOCK] User ${token.id} (${userRole}) attempted to access ${pathname}`);
    return NextResponse.redirect(new URL("/", req.url)); // Send back to home or a 403 page
  }

  return NextResponse.next();
});

// ─── Route matcher ────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/manage-menu/:path*",
    "/orders/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/toppings/:path*",
    "/api/admin/:path*",
    "/checkout/:path*",
    "/profile/:path*",
    "/track-order/:path*",
    "/api/cart/:path*",
    "/menu-spesial/:path*"
  ],
};
