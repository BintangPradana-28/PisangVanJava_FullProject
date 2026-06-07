import type { NextAuthConfig, DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import * as jwt from "jose";

declare module "next-auth" {
  interface Session {
    supabaseAccessToken?: string;
    user: {
      id: string;
      role: string;
      isBanned: boolean;
    } & DefaultSession["user"]
  }
}

export const authConfig = {
  pages: {
    signIn: "/member-login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 Days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.isBanned = (user as any).isBanned;
      }
      
      if (trigger === "update" && session) {
        if (session.role) token.role = session.role;
        if (session.name) token.name = session.name;
        if (session.image) token.picture = session.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        session.user.role = (token.role as any) || "CUSTOMER";
        session.user.isBanned = token.isBanned as boolean;
        
        // ─── SUPABASE JOSE JWT BRIDGE ──────────────────────────────────────
        const signingSecret = process.env.SUPABASE_JWT_SECRET;
        if (signingSecret) {
          const payload = {
            aud: "authenticated",
            exp: Math.floor(new Date(session.expires).getTime() / 1000),
            sub: session.user.id,
            email: session.user.email,
            role: "authenticated",
          };
          session.supabaseAccessToken = await new jwt.SignJWT(payload)
            .setProtectedHeader({ alg: "HS256" })
            .sign(new TextEncoder().encode(signingSecret));
        } else {
          console.warn("[SECURITY] SUPABASE_JWT_SECRET is missing. Storage RLS will fail.");
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "default_secret_key_change_me_in_production",
  debug: false, 
  logger: {
    error(error) {
      console.error("[NEXTAUTH SECURITY ERROR]:", error);
    },
    warn(code) {
      console.warn("[NEXTAUTH WARN]:", code);
    },
    debug(code) {}
  },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || "MOCK_CLIENT_ID",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "MOCK_CLIENT_SECRET",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
} satisfies NextAuthConfig;
