// src/app/verify-email/page.tsx
// Server Component em runtime Node (Prisma na validação do token, nunca no Edge).

import type { Metadata } from "next";
import { consumeEmailVerificationToken } from "@/lib/email-verification";
import { log } from "@/lib/logger";
import { ResendButton } from "./resend-button";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Confirmação de e-mail | Livo",
};

type State = "success" | "invalid" | "expired" | "used" | "missing";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let state: State;
  if (!token) {
    state = "missing";
  } else {
    const result = await consumeEmailVerificationToken(token);
    state = result.success ? "success" : result.reason;
    log.auth.info("tentativa de confirmação de e-mail", { state });
  }

  const CONTENT: Record<
    State,
    { title: string; description: string; showResend: boolean }
  > = {
    success: {
      title: "E-mail confirmado!",
      description:
        "Seu e-mail foi confirmado com sucesso. Sua conta LIVO está protegida.",
      showResend: false,
    },
    used: {
      title: "Link já utilizado",
      description:
        "Este link de confirmação já foi usado. Se o seu e-mail ainda não está confirmado, solicite um novo link.",
      showResend: true,
    },
    expired: {
      title: "Link expirado",
      description:
        "Este link de confirmação expirou (validade de 24 horas). Solicite um novo link abaixo.",
      showResend: true,
    },
    invalid: {
      title: "Link inválido",
      description:
        "Este link de confirmação não é válido. Solicite um novo link abaixo.",
      showResend: true,
    },
    missing: {
      title: "Link inválido",
      description: "Nenhum token de confirmação foi informado.",
      showResend: true,
    },
  };

  const info = CONTENT[state];
  const isSuccess = state === "success";

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
          <div
            className="px-6 py-5 border-b border-[#2A2A33]"
            style={{
              background: isSuccess
                ? "rgba(0,212,160,0.08)"
                : "rgba(200,16,46,0.10)",
            }}
          >
            <h1
              className="text-xl font-bold"
              style={{ color: isSuccess ? "#00D4A0" : "#fff" }}
            >
              {info.title}
            </h1>
          </div>

          <div className="px-6 py-6 flex flex-col gap-5">
            <p className="text-sm" style={{ color: "#9A9AA6", lineHeight: 1.6 }}>
              {info.description}
            </p>

            {info.showResend && <ResendButton />}

            <a
              href={isSuccess ? "/dashboard" : "/login"}
              className="block w-full py-3 rounded-xl font-bold text-sm text-center transition-all duration-200 hover:opacity-90"
              style={
                isSuccess
                  ? {
                      background: "#FF2D55",
                      color: "#fff",
                      boxShadow: "0 8px 24px rgba(255,45,85,0.3)",
                    }
                  : {
                      background: "transparent",
                      color: "#9A9AA6",
                      border: "1px solid #2A2A33",
                    }
              }
            >
              {isSuccess ? "Ir para o painel" : "Ir para o login"}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
