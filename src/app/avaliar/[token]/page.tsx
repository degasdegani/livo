// src/app/avaliar/[token]/page.tsx
// Server Component em runtime Node (Prisma na validação do token, nunca no Edge).
// Mesma estrutura de src/app/verify-email/page.tsx.

import type { Metadata } from "next";
import { validateReviewInviteToken } from "@/lib/reviews-server";
import { ReviewForm } from "./review-form";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Avalie seu atendimento | LIVO",
};

type State = "success" | "invalid" | "expired" | "used";

export default async function AvaliarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const validation = await validateReviewInviteToken(token);

  const state: State = validation.success ? "success" : validation.reason;

  const CONTENT: Record<State, { title: string; description: string }> = {
    success: {
      title: `Como foi com ${validation.success ? validation.professionalName : ""}?`,
      description: validation.success
        ? `Sua avaliação para a ${validation.barbershopName} ajuda outros clientes.`
        : "",
    },
    used: {
      title: "Avaliação já enviada",
      description: "Você já avaliou este atendimento. Obrigado!",
    },
    expired: {
      title: "Link expirado",
      description: "Este link de avaliação expirou.",
    },
    invalid: {
      title: "Link inválido",
      description: "Este link de avaliação não é válido.",
    },
  };

  const info = CONTENT[state];

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      data-theme="dark"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-3xl font-black tracking-widest">
            <span style={{ color: "#fff" }}>LI</span>
            <span style={{ color: "#C8102E" }}>V</span>
            <span style={{ color: "#C8102E" }}>O</span>
          </span>
        </div>

        <div className="bg-[#17171C] border border-[#2A2A33] rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[#2A2A33]">
            <h1 className="text-xl font-bold text-center" style={{ color: "#fff" }}>
              {info.title}
            </h1>
            {info.description && (
              <p className="text-sm text-center mt-2" style={{ color: "#9A9AA6" }}>
                {info.description}
              </p>
            )}
          </div>

          <div className="px-6 py-6">
            {state === "success" ? (
              <ReviewForm token={token} />
            ) : (
              <a
                href="/"
                className="block w-full py-3 rounded-xl font-bold text-sm text-center transition-all duration-200 hover:opacity-90"
                style={{
                  background: "transparent",
                  color: "#9A9AA6",
                  border: "1px solid #2A2A33",
                }}
              >
                Voltar ao início
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
