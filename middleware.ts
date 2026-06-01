// ============================================================
// LIVO — Middleware de Autenticação
// Protege rotas do dashboard e onboarding
// ============================================================

import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isLoggedIn = !!req.auth;

  // Rotas que exigem autenticação
  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");

  // Rotas de autenticação (login e cadastro)
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  // Rotas públicas explícitas (documentação — não precisam de nada):
  // /convite/[token] → aceite de convite
  // /vip            → captura de leads
  // /[slug]         → página pública da barbearia

  // Não logado tentando acessar área protegida → login
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Já logado tentando acessar login/register → dashboard
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
