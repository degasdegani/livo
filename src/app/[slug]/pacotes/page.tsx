// src/app/[slug]/pacotes/page.tsx
// Vitrine pública dos pacotes ativos de uma barbearia. Somente leitura +
// botão de WhatsApp — SEM venda, SEM agendamento. A venda continua 100%
// manual pelo dashboard (Etapa 3). Dark-locked, igual às demais páginas
// públicas ([slug]/page.tsx).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isEmailGateBlocked } from "@/lib/email-gate";
import { onlyDigits } from "@/lib/masks";
import { PublicUnavailable } from "../unavailable";

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const barbershop = await db.barbershop.findUnique({
    where: { slug, isActive: true },
    select: { name: true },
  });

  if (!barbershop) {
    return { title: "Barbearia não encontrada | Livo" };
  }

  return {
    title: `Pacotes | ${barbershop.name} | Livo`,
    description: `Confira os pacotes de serviços da ${barbershop.name} e fale com a barbearia pelo WhatsApp.`,
  };
}

export default async function PacotesPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const barbershop = await db.barbershop.findUnique({
    where: { slug, isActive: true },
    include: {
      packages: {
        where: { isActive: true },
        include: {
          items: {
            include: { service: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      owner: { select: { emailVerified: true } },
    },
  });

  if (!barbershop) notFound();

  // Mesmo portão suave da página principal: dono sem e-mail confirmado
  // (exceto lifetime) => página oculta, sem expor o motivo ao público.
  if (
    isEmailGateBlocked({
      planStatus: barbershop.planStatus,
      emailVerified: barbershop.owner.emailVerified,
    })
  ) {
    return <PublicUnavailable />;
  }

  const phoneDigits = barbershop.phone ? onlyDigits(barbershop.phone) : "";

  return (
    <main
      className="min-h-screen"
      data-theme="dark"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <header
        style={{
          background: "var(--bg-card)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-2xl mx-auto px-6 py-8">
          <Link
            href={`/${slug}`}
            className="text-sm"
            style={{ color: "#A1A1AA" }}
          >
            ← Voltar para {barbershop.name}
          </Link>
          <h1
            className="font-black text-white mt-4 mb-2"
            style={{
              fontSize: "clamp(24px, 5vw, 34px)",
              letterSpacing: "-0.6px",
              lineHeight: 1.1,
            }}
          >
            Pacotes
          </h1>
          <p className="text-sm" style={{ color: "#A1A1AA" }}>
            Combos de serviços pré-pagos da {barbershop.name}. Para adquirir,
            fale com a barbearia.
          </p>
        </div>
      </header>

      {/* ── Conteúdo ──────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-4">
        {barbershop.packages.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: "var(--bg-card)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-sm" style={{ color: "#A1A1AA" }}>
              Esta barbearia ainda não tem pacotes disponíveis.
            </p>
          </div>
        ) : (
          barbershop.packages.map((pkg) => {
            const mensagem = `Olá! Quero saber mais sobre o pacote "${pkg.name}" da ${barbershop.name}.`;
            const waHref = phoneDigits
              ? `https://wa.me/55${phoneDigits}?text=${encodeURIComponent(mensagem)}`
              : null;

            return (
              <div
                key={pkg.id}
                className="rounded-2xl p-5"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h2
                    className="font-black text-white"
                    style={{ fontSize: "18px", letterSpacing: "-0.3px" }}
                  >
                    {pkg.name}
                  </h2>
                  <p
                    className="font-black shrink-0"
                    style={{ color: "#FFFFFF", fontSize: "18px", letterSpacing: "-0.5px" }}
                  >
                    {formatBRL(pkg.priceInCents)}
                  </p>
                </div>

                {pkg.description && (
                  <p className="text-sm mb-3" style={{ color: "#A1A1AA", lineHeight: 1.5 }}>
                    {pkg.description}
                  </p>
                )}

                {/* Serviços inclusos */}
                <div className="flex flex-col gap-1.5 mb-3">
                  {pkg.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "#E4E4E7" }}
                    >
                      <span style={{ color: "#00D4A0" }}>✓</span>
                      <span>
                        {item.service.name}
                        {item.quantity > 1 ? ` x${item.quantity}` : ""}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Validade */}
                {pkg.validityDays != null && (
                  <p className="text-xs mb-4" style={{ color: "#52525B" }}>
                    Válido por {pkg.validityDays} dias após a compra
                  </p>
                )}

                {/* CTA WhatsApp */}
                {waHref ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm transition-opacity"
                    style={{ background: "#25D366", color: "#0A0A0A" }}
                  >
                    Falar com a Barbearia
                  </a>
                ) : (
                  <p className="text-xs" style={{ color: "#52525B" }}>
                    Fale com a barbearia para adquirir este pacote.
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
