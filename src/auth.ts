// src/auth.ts
import { db } from "@/lib/db";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

// Rate limiter de login — 5 tentativas falhas por e-mail em 15 minutos.
// Chamado SOMENTE dentro de authorize() (Node Runtime, Route Handler /api/auth).
// NUNCA referenciar dentro dos callbacks jwt/session (Edge) — ver comentários abaixo.
// checkRateLimit incrementa a cada chamada (sucesso ou falha); login bem-sucedido
// chama resetLoginRateLimit para "perdoar" as tentativas, replicando o
// loginRateLimitMap.delete(email) do mecanismo anterior.
const LOGIN_RATE_LIMIT_MAX = 5;
const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

async function isLoginRateLimited(email: string): Promise<boolean> {
  const { success } = await checkRateLimit(
    `login:${email}`,
    LOGIN_RATE_LIMIT_MAX,
    LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  );
  return !success;
}

async function resetLoginRateLimit(email: string): Promise<void> {
  await resetRateLimit(`login:${email}`, LOGIN_RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_WINDOW_SECONDS);
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
      // Vincula automaticamente o login Google a uma conta de mesmo e-mail
      // ja existente (ex.: criada por credenciais). Habilitado SOMENTE aqui
      // porque o Google sempre verifica o e-mail retornado, anulando o risco
      // de takeover. NAO habilitar esta flag em nenhum outro provider.
      allowDangerousEmailAccountLinking: true,
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

        if (await isLoginRateLimited(email)) return null;

        const user = await db.user.findUnique({ where: { email } });

        if (!user || !user.password) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );

        if (!passwordMatch) {
          return null;
        }

        await resetLoginRateLimit(email);
        return user;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Grava no campo padrao do Auth.js (token.sub), que e o mesmo lido pelo
        // callback session abaixo. Sem campo orfao. Edge-safe: nada de Prisma/DB.
        token.sub = user.id;
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

  events: {
    // Roda no Route Handler /api/auth (Node), NUNCA no middleware (Edge) — o
    // middleware só invoca os callbacks jwt/session, que permanecem sem Prisma.
    // adapter.createUser só é chamado no fluxo OAuth (Google); usuários de
    // credenciais são criados pelo nosso próprio código, não pelo adapter.
    // Logo, todo createUser aqui é Google, cujo e-mail já vem verificado.
    async createUser({ user }) {
      if (!user.id) return;
      // updateMany com filtro emailVerified: null é idempotente: se o adapter
      // já tiver populado o campo, não sobrescreve (evita escrita dupla).
      await db.user.updateMany({
        where: { id: user.id, emailVerified: null },
        data: { emailVerified: new Date() },
      });
    },
  },
});
