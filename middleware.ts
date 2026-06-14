// ============================================================
// LIVO — Middleware de Autenticação + Correlation IDs
// Protege rotas do dashboard e onboarding.
// Injeta x-correlation-id em cada request para rastreabilidade.
// ============================================================

import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isLoggedIn = !!req.auth;

  // Propaga o ID externo ou gera um novo UUID para rastreabilidade
  const correlationId =
    req.headers.get("x-correlation-id") ?? crypto.randomUUID();

  // Copia os headers originais e injeta o correlationId e pathname para Server Components
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-correlation-id", correlationId);
  requestHeaders.set("x-pathname", pathname);

  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  if (isProtectedRoute && !isLoggedIn) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.headers.set("x-correlation-id", correlationId);
    return res;
  }

  if (isAuthRoute && isLoggedIn) {
    const res = NextResponse.redirect(new URL("/dashboard", req.url));
    res.headers.set("x-correlation-id", correlationId);
    return res;
  }

  // Propaga o correlationId para downstream (server components, actions)
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("x-correlation-id", correlationId);
  return res;
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
