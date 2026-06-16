// src/app/(dashboard)/dashboard/suspenso/page.tsx
import { PlanStatus } from "@prisma/client";
import Link from "next/link";
import { X } from "lucide-react";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireMembership } from "@/lib/permissions";
import { SUPPORT_WHATSAPP_URL } from "@/lib/support";

export default async function SuspensoPage() {
  const membership = await requireMembership();

  const barbershop = await db.barbershop.findUnique({
    where: { id: membership.barbershopId },
    select: { planStatus: true, name: true },
  });

  if (!barbershop) redirect("/login");

  // Estados que devem ir para outras páginas
  if (
    barbershop.planStatus === PlanStatus.active ||
    barbershop.planStatus === PlanStatus.lifetime
  ) {
    redirect("/dashboard");
  }

  if (barbershop.planStatus === PlanStatus.trial) {
    redirect("/dashboard/assinar");
  }

  const isSuspended = barbershop.planStatus === PlanStatus.suspended;

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      <div className="w-full max-w-md flex flex-col gap-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--color-primary)",
              display: "inline-block",
            }}
          />
          <span
            className="font-black"
            style={{ fontSize: "20px", color: "var(--text-primary)" }}
          >
            LIVO
          </span>
        </div>

        {/* Status badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full self-start"
          style={{
            backgroundColor: isSuspended
              ? "rgba(234,179,8,0.1)"
              : "rgba(200,16,46,0.1)",
            border: `1px solid ${isSuspended ? "rgba(234,179,8,0.3)" : "rgba(200,16,46,0.3)"}`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: isSuspended ? "#EAB308" : "var(--color-primary)",
              display: "inline-block",
            }}
          />
          <span
            className="text-xs font-bold"
            style={{
              color: isSuspended ? "#EAB308" : "var(--color-primary)",
            }}
          >
            {isSuspended ? "ACESSO SUSPENSO" : "ASSINATURA CANCELADA"}
          </span>
        </div>

        {/* Headline */}
        <div>
          <h1
            className="font-black mb-3"
            style={{
              fontSize: "32px",
              letterSpacing: "-1px",
              color: "var(--text-primary)",
            }}
          >
            {isSuspended ? (
              <>
                Pagamento
                <br />
                <span style={{ color: "#EAB308" }}>em atraso.</span>
              </>
            ) : (
              <>
                Assinatura
                <br />
                <span style={{ color: "var(--color-primary)" }}>
                  cancelada.
                </span>
              </>
            )}
          </h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {isSuspended
              ? "Seu acesso ao LIVO foi suspenso temporariamente por falta de pagamento. Regularize sua situação para retomar o acesso completo."
              : "Sua assinatura foi cancelada e o acesso foi encerrado. Para retomar o uso do LIVO, assine novamente."}
          </p>
        </div>

        {/* O que está bloqueado */}
        <div
          className="rounded-2xl p-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            O que está bloqueado
          </p>
          {[
            "Agendamentos e agenda",
            "Dashboard e relatórios",
            "CRM de clientes",
            "Comandas e estoque",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <X size={12} style={{ color: "var(--color-primary)", display: "inline" }} />
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {item}
              </span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard/assinar"
            className="w-full py-4 rounded-xl font-black text-white text-base text-center transition-all hover:opacity-90"
            style={{
              background: "var(--color-primary)",
              boxShadow: "0 8px 32px rgba(200,16,46,0.3)",
              display: "block",
            }}
          >
            {isSuspended ? "Regularizar pagamento →" : "Assinar novamente →"}
          </Link>

          <a
            href={`${SUPPORT_WHATSAPP_URL}?text=Ol%C3%A1%2C+preciso+de+ajuda+com+minha+assinatura+LIVO`}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 rounded-xl font-semibold text-sm text-center transition-all hover:opacity-80"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              display: "block",
            }}
          >
            Falar com suporte via WhatsApp
          </a>
        </div>

        {/* Dica extra para suspenso */}
        {isSuspended && (
          <p
            className="text-xs text-center"
            style={{ color: "var(--text-tertiary)" }}
          >
            Verifique também seu e-mail para o link de pagamento enviado
            automaticamente pelo sistema de cobranças.
          </p>
        )}
      </div>
    </main>
  );
}
