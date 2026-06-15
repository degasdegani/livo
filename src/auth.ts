// src/auth.ts
import { db } from "@/lib/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

// Rate limiter de login — 5 tentativas falhas por e-mail em 15 minutos.
// Em multi-instância serverless cada instância mantém seu próprio Map.
type LoginRateLimitEntry = { count: number; resetAt: number };
const loginRateLimitMap = new Map<string, LoginRateLimitEntry>();
const LOGIN_RATE_LIMIT_MAX = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60_000;

function trackLoginFailure(email: string): void {
  const now = Date.now();
  const entry = loginRateLimitMap.get(email);
  if (entry && now < entry.resetAt) {
    entry.count += 1;
  } else {
    loginRateLimitMap.set(email, {
      count: 1,
      resetAt: now + LOGIN_RATE_LIMIT_WINDOW_MS,
    });
  }
}

function isLoginRateLimited(email: string): boolean {
  const now = Date.now();
  const entry = loginRateLimitMap.get(email);
  return !!entry && now < entry.resetAt && entry.count >= LOGIN_RATE_LIMIT_MAX;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
      checks: ["pkce", "state"],
    }),

    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase();

        if (isLoginRateLimited(email)) return null;

        const user = await db.user.findUnique({ where: { email } });

        if (!user || !user.password) {
          trackLoginFailure(email);
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );

        if (!passwordMatch) {
          trackLoginFailure(email);
          return null;
        }

        loginRateLimitMap.delete(email);
        return user;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },

  events: {},
});
