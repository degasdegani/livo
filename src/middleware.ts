import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Sistema temporariamente indisponivel: toda rota redireciona para /manutencao,
// sem excecao (inclusive contas lifetime) -- decisao do founder. Nao remove nada
// do banco nem do codigo, so bloqueia o acesso via middleware, que roda antes de
// qualquer coisa do App Router (sem risco de cache de rota).
export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const isExempt =
    pathname === "/manutencao" ||
    pathname.startsWith("/api/webhooks/asaas");

  if (isExempt) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/manutencao", req.url));
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
