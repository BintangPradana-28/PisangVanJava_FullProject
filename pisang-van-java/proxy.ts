import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

import { NextRequest } from "next/server";
import { globalRateLimit } from "@/lib/redis";

const authMiddleware = withAuth(
  function middleware(req) {
    const token = req.nextauth.token;

    const adminPaths = ['/dashboard', '/manage-menu', '/orders', '/reports', '/settings', '/toppings', '/api/admin'];
    const isTryingToAccessAdmin = adminPaths.some(path => req.nextUrl.pathname.startsWith(path));

    if (isTryingToAccessAdmin) {
      if (token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/member-login", // Default B2C login, tapi kalau admin ya ke /login
    },
  }
);

import { NextRequestWithAuth } from "next-auth/middleware";

export default async function middleware(req: NextRequest, event: import("next/server").NextFetchEvent) {
  try {
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    
    const { success } = await globalRateLimit.limit(`global_${ip}`);
    
    if (!success) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }
  } catch (error) {
    // Fail open if Redis is down
    console.error("[SECURITY] Global Rate Limiter failed, bypassing...", error);
  }

  // Sprint 6/Module 4: Edge Proxy Time-of-Day Context for /menu-spesial
  if (req.nextUrl.pathname.startsWith('/menu-spesial')) {
    // Gunakan getUTCHours() + 7 yang sudah ada karena sangat reliable untuk Edge
    const currentHour = new Date(new Date().getTime() + 7 * 60 * 60 * 1000).getUTCHours();
    
    // Derive menu priority context
    const context = {
      earlyMorning: currentHour >= 4 && currentHour < 7,
      lunch: currentHour >= 11 && currentHour < 14,
      lateAfternoon: currentHour >= 16 && currentHour < 18, // Menggantikan preIftar agar berlaku year-round
      evening: currentHour >= 18 && currentHour < 21,
      isLateNight: currentHour >= 21 || currentHour < 4
    };

    const contextStr = JSON.stringify(context);
    const existingCookie = req.cookies.get('x-menu-context')?.value;

    const res = NextResponse.next();
    
    // Optimasi: Hanya set cookie jika berubah
    if (existingCookie !== contextStr) {
      res.cookies.set('x-menu-context', contextStr, {
        httpOnly: false, // Must be readable by client Zustand / React
        maxAge: 1800,    // 30 minutes
      });
    }
    
    return res;
  }

  // Pass to NextAuth middleware without Type Saboteurs
  return authMiddleware(req as unknown as NextRequestWithAuth, event);
}

export const config = {
  matcher: [
    // Admin Routes
    "/dashboard/:path*",
    "/manage-menu/:path*",
    "/orders/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/toppings/:path*",
    "/api/admin/:path*",
    
    // Customer Protected Routes
    "/checkout/:path*",
    "/profil/:path*",
    "/track-order/:path*",
    "/api/cart/:path*",
    
    // Public Routes with Edge Logic
    "/menu-spesial/:path*"
  ],
};
