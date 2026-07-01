// src/app/aceitar-termos/page.tsx
// Interstitial de aceite de Termos + Privacidade. Server Component (Node).
// Nesta etapa (B2.2) é acessível sem gate; a B2.3 encaminhará pendentes para cá.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";
import { AcceptForm } from "./accept-form";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Aceite dos Termos | Livo",
};

export default async function AceitarTermosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#050505" }}
    >
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#FF2D55",
              display: "inline-block",
            }}
          />
          <span
            className="font-black text-white"
            style={{ fontSize: "20px", letterSpacing: "-0.5px" }}
          >
            Livo
          </span>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: "#0A0A0A",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h1
            className="font-black text-white mb-2"
            style={{ fontSize: "22px", letterSpacing: "-0.5px" }}
          >
            Atualização dos nossos termos
          </h1>
          <p className="text-sm mb-6" style={{ color: "#A1A1AA", lineHeight: 1.6 }}>
            Para continuar usando o Livo, revise e aceite os Termos de Uso e a
            Política de Privacidade. Leva menos de um minuto.
          </p>

          <AcceptForm />
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#3F3F46" }}>
          Versão dos documentos: {CURRENT_TERMS_VERSION}
        </p>
      </div>
    </main>
  );
}
