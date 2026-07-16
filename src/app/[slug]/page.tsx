// src/app/[slug]/page.tsx
import { db } from "@/lib/db";
import { isEmailGateBlocked } from "@/lib/email-gate";
import { formatPhoneBR } from "@/lib/masks";
import { Award, MapPin, Menu, Phone, Sparkles, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PublicUnavailable } from "./unavailable";

// Iniciais para fallback de avatar/logo quando não há imagem.
function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Gera o título da aba dinamicamente para cada barbearia
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const barbershop = await db.barbershop.findUnique({
    where: { slug, isActive: true },
    include: { services: { where: { isActive: true }, take: 3 } },
  });
  if (!barbershop) {
    return {
      title: "Barbearia não encontrada | Livo",
    };
  }
  const serviceNames = barbershop.services.map((s) => s.name).join(", ");
  const city = barbershop.city ? ` em ${barbershop.city}` : "";
  const description = `Agende seu horário na ${barbershop.name}${city}. Serviços: ${serviceNames}. Agendamento online rápido e fácil pelo Livo.`;
  return {
    title: `${barbershop.name} | Livo`,
    description,
    openGraph: {
      title: barbershop.name,
      description,
      type: "website",
      locale: "pt_BR",
      siteName: "Livo",
    },
    twitter: {
      card: "summary",
      title: barbershop.name,
      description,
    },
  };
}

const TRUST_BADGES = [
  { icon: Users, label: "Profissionais especializados" },
  { icon: Sparkles, label: "Ambiente premium" },
  { icon: Award, label: "Atendimento de excelência" },
];

export default async function BarbershopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const barbershop = await db.barbershop.findUnique({
    where: { slug, isActive: true },
    include: {
      owner: { select: { emailVerified: true } },
    },
  });
  if (!barbershop) notFound();

  // Portão suave: dono sem e-mail confirmado (exceto lifetime) → página oculta.
  if (
    isEmailGateBlocked({
      planStatus: barbershop.planStatus,
      emailVerified: barbershop.owner.emailVerified,
    })
  ) {
    return <PublicUnavailable />;
  }

  const hasAddress = barbershop.street && barbershop.city;
  const hasCover = !!barbershop.coverPhotoUrl;
  const hasLogo = !!barbershop.logoUrl;

  return (
    <main
      className="min-h-screen"
      data-theme="dark"
      style={{ backgroundColor: "var(--pb-bg)" }}
    >
      {/* ── Navbar compacta ──────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {hasLogo ? (
            <Image
              src={barbershop.logoUrl as string}
              alt={`Logo da ${barbershop.name}`}
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-full shrink-0"
              style={{
                width: 32,
                height: 32,
                background: "var(--pb-red-selected-bg)",
                color: "var(--pb-red)",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {initials(barbershop.name)}
            </div>
          )}
          <span
            className="font-extrabold"
            style={{
              color: "var(--pb-text-primary)",
              fontSize: "14px",
              letterSpacing: "2px",
            }}
          >
            {barbershop.name.toUpperCase()}
          </span>
        </div>
        <button
          type="button"
          aria-label="Menu"
          className="p-2 rounded-lg transition-opacity hover:opacity-70"
          style={{ background: "transparent" }}
        >
          <Menu size={22} color="var(--pb-text-primary)" />
        </button>
      </div>

      {/* ── Foto de capa (sem texto sobreposto) ─────────────── */}
      {hasCover && (
        <div className="max-w-2xl mx-auto px-6">
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 280,
              borderRadius: 24,
              overflow: "hidden",
              background: "var(--pb-card)",
            }}
          >
            <Image
              src={barbershop.coverPhotoUrl as string}
              alt={`Foto de capa da ${barbershop.name}`}
              fill
              sizes="(max-width: 672px) 100vw, 672px"
              priority
              style={{ objectFit: "cover" }}
            />
          </div>
        </div>
      )}

      {/* ── Título, descrição, CTAs, selos de confiança ─────── */}
      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">
        <div>
          <h1
            className="font-bold"
            style={{
              color: "var(--pb-text-primary)",
              fontSize: "40px",
              lineHeight: 1.15,
              letterSpacing: "-0.5px",
            }}
          >
            Sua próxima
            <br />
            <span style={{ color: "var(--pb-red)" }}>experiência</span>
            <br />
            começa aqui
          </h1>
          <p
            className="mt-4"
            style={{
              color: "var(--pb-text-secondary)",
              fontSize: "15px",
              maxWidth: "400px",
              lineHeight: 1.6,
            }}
          >
            Escolha seu serviço e agende em menos de 60 segundos.
          </p>
        </div>

        <div className="flex flex-col gap-3" style={{ maxWidth: "320px" }}>
          <a
            href={`/${slug}/book`}
            className="flex items-center justify-center gap-2 rounded-xl font-semibold text-center transition-all hover:opacity-90"
            style={{
              height: "48px",
              background: "var(--pb-red)",
              color: "var(--pb-text-primary)",
              fontSize: "15px",
              boxShadow: "0 8px 24px var(--pb-red-glow)",
            }}
          >
            Agendar agora →
          </a>
          <a
            href={`/${slug}/book`}
            className="flex items-center justify-center rounded-xl font-semibold text-center transition-all hover:opacity-80"
            style={{
              height: "48px",
              background: "transparent",
              border: "1px solid var(--pb-border)",
              color: "var(--pb-text-primary)",
              fontSize: "15px",
            }}
          >
            Ver serviços
          </a>
        </div>

        <div className="flex flex-wrap gap-6">
          {TRUST_BADGES.map((badge) => (
            <div
              key={badge.label}
              className="flex flex-col items-center gap-2 text-center"
              style={{ width: "104px" }}
            >
              <badge.icon size={20} color="var(--pb-text-secondary)" />
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--pb-text-secondary)",
                  lineHeight: 1.3,
                }}
              >
                {badge.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Rodapé: endereço e telefone ──────────────────────── */}
      {(hasAddress || barbershop.phone) && (
        <div
          className="max-w-2xl mx-auto px-6 py-5 flex flex-wrap gap-4"
          style={{ borderTop: "1px solid var(--pb-separator)" }}
        >
          {hasAddress && (
            <span
              className="flex items-center gap-1.5 text-sm"
              style={{ color: "var(--pb-text-secondary)" }}
            >
              <MapPin size={16} />
              {[
                barbershop.street,
                barbershop.neighborhood,
                barbershop.city,
                barbershop.state,
              ]
                .filter(Boolean)
                .join(", ")}
            </span>
          )}
          {barbershop.phone && (
            <span
              className="flex items-center gap-1.5 text-sm"
              style={{ color: "var(--pb-text-secondary)" }}
            >
              <Phone size={16} />
              {formatPhoneBR(barbershop.phone)}
            </span>
          )}
        </div>
      )}
    </main>
  );
}
