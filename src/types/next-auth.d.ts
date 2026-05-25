// ============================================================
// LIVO — NextAuth Type Extensions
// Adiciona campos customizados ao tipo Session do Auth.js
// ============================================================

import { DefaultSession } from "next-auth";

declare module "next-auth" {
  // Estende o tipo Session para incluir o id do usuário
  // Sem isso, session.user.id geraria erro de TypeScript
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
