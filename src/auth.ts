// ============================================================
// LIVO — Auth.js Configuration
// Define provedores de login, validação e sessão
// ============================================================

import { db } from "@/lib/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Conecta o Auth.js ao Prisma
  // Quando usuário faz login com Google pela 1a vez,
  // cria automaticamente registros em users + accounts
  adapter: PrismaAdapter(db),

  // JWT: sessão armazenada em cookie criptografado
  // Necessário para o Credentials provider funcionar
  session: { strategy: "jwt" },

  // Páginas customizadas (em vez das padrão do Auth.js)
  pages: {
    signIn: "/login", // redireciona para nossa página de login
    error: "/login", // erros de auth vão para o login
  },

  // ── Provedores de login ─────────────────────────────────
  providers: [
    // Login com Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // Login com e-mail e senha
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },

      // authorize() é chamado quando o usuário tenta fazer login
      // Retorna o usuário se credenciais estiverem corretas, null se não
      async authorize(credentials) {
        // Valida se os campos foram preenchidos
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Busca o usuário pelo e-mail no banco
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        // Se não achou o usuário ou ele não tem senha (login com Google)
        if (!user || !user.password) {
          return null;
        }

        // Compara a senha digitada com o hash no banco
        // bcrypt.compare("minhasenha", "$2b$12$hash...") → true ou false
        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );

        // Se senha errada, retorna null (login negado)
        if (!passwordMatch) return null;

        // Senha correta: retorna o usuário (login autorizado)
        return user;
      },
    }),
  ],

  // ── Callbacks ────────────────────────────────────────────
  // Callbacks são funções executadas em momentos específicos do fluxo de auth

  callbacks: {
    // jwt() é chamado quando o token JWT é criado ou atualizado
    // token.sub = ID do usuário no banco de dados
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    // session() é chamado quando a sessão é acessada
    // Aqui adicionamos o ID do usuário à sessão para usar em qualquer página
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
