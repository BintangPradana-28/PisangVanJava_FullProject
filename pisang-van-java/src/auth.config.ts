import type { NextAuthConfig } from "next-auth";

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
  providers: [], // Add providers in auth.ts
} satisfies NextAuthConfig;
