// src/app/[slug]/page.tsx

import { BarbershopMap } from "@/components/barbershop-map";
import { db } from "@/lib/db";
import { isEmailGateBlocked } from "@/lib/email-gate";
import { formatPhoneBR } from "@/lib/masks";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ServicePicker } from "./service-picker";
import { PublicUnavailable } from "./unavailable";

// Iniciais para fallback de avatar (mesmo padrão do ProfAvatar do booking).
function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Círculo de logo/perfil da barbearia (estilo Facebook). `overlay` posiciona
// sobrepondo a base da capa; sem `overlay`, entra no fluxo normal do header.
// Borda 4px var(--bg-base) (cor do fundo do <main>) recorta o círculo sobre a capa.
const LOGO_SIZE = 96;
function BarbershopLogo({
  logoUrl,
  name,
  overlay,
}: {
  logoUrl: string | null;
  name: string;
  overlay: boolean;
}) {
  const wrapperStyle: React.CSSProperties = overlay
    ? { position: "absolute", bottom: -32, left: 24 }
    : {};

  return (
    <div style={wrapperStyle}>
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={`Logo da ${name}`}
          width={LOGO_SIZE}
          height={LOGO_SIZE}
          priority
          style={{
            width: LOGO_SIZE,
            height: LOGO_SIZE,
            borderRadius: 9999,
            objectFit: "cover",
            border: "4px solid var(--bg-base)",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            width: LOGO_SIZE,
            height: LOGO_SIZE,
            borderRadius: 9999,
            border: "4px solid var(--bg-base)",
            boxShadow: "inset 0 0 0 1px rgba(255,45,85,0.2)",
            background: "rgba(255,45,85,0.12)",
            color: "#FF2D55",
            fontWeight: 700,
            fontSize: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {initials(name)}
        </div>
      )}
    </div>
  );
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

// Dias da semana em português
const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function BarbershopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const barbershop = await db.barbershop.findUnique({
    where: { slug, isActive: true },
    include: {
      services: { where: { isActive: true }, orderBy: { priceInCents: "asc" } },
      professionals: { where: { isActive: true } },
      businessHours: { orderBy: { dayOfWeek: "asc" } },
      owner: { select: { emailVerified: true } },
    },
  });

  if (!barbershop) notFound();

  // Portão suave: dono sem e-mail confirmado (exceto lifetime) → página oculta.
  // Tela neutra ao público, sem expor o motivo interno.
  if (
    isEmailGateBlocked({
      planStatus: barbershop.planStatus,
      emailVerified: barbershop.owner.emailVerified,
    })
  ) {
    return <PublicUnavailable />;
  }

  const todayDayOfWeek = new Date().getDay();
  const todayHours = barbershop.businessHours.find(
    (h) => h.dayOfWeek === todayDayOfWeek,
  );

  const professional = barbershop.professionals[0];

  // Verifica se tem endereço suficiente para mostrar o mapa
  const hasAddress = barbershop.street && barbershop.city;

  const hasCover = !!barbershop.coverPhotoUrl;
  const hasLogo = !!barbershop.logoUrl;

  return (
    <main
      className="min-h-screen"
      data-theme="dark"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      {/* ── Hero / capa compacta (dentro de container, não full-bleed) ─────
          Estilo Facebook: capa 200px arredondada + logo circular sobreposto
          na base. O logo só entra aqui quando há capa; sem capa, ele é
          renderizado no fluxo do header (abaixo). Sem capa nem logo, o
          header permanece idêntico ao original (zero regressão). */}
      {hasCover && (
        <div
          className="max-w-2xl mx-auto px-6"
          style={{ position: "relative", paddingBottom: 56 }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 240,
              borderRadius: 16,
              overflow: "hidden",
              background: "var(--bg-card)",
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
          <BarbershopLogo
            logoUrl={barbershop.logoUrl}
            name={barbershop.name}
            overlay
          />
        </div>
      )}

      {/* ── Header da barbearia ────────────────────────────── */}
      <header
        style={{
          background: "var(--bg-card)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* Logo/perfil sem capa: entra no fluxo do header (sem overlap). */}
          {!hasCover && hasLogo && (
            <div className="mb-5">
              <BarbershopLogo
                logoUrl={barbershop.logoUrl}
                name={barbershop.name}
                overlay={false}
              />
            </div>
          )}

          {/* Nome e info da barbearia */}
          <h1
            className="font-black text-white mb-3"
            style={{
              fontSize: "clamp(28px, 6vw, 40px)",
              letterSpacing: "-1px",
              lineHeight: 1.1,
            }}
          >
            {barbershop.name}
          </h1>

          {/* Info: endereço e telefone */}
          <div className="flex flex-wrap gap-4 mb-4">
            {(barbershop.street || barbershop.city) && (
              <span
                className="flex items-center gap-1.5 text-sm"
                style={{ color: "#A1A1AA" }}
              >
                📍{" "}
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
            {!barbershop.street && barbershop.city && (
              <span
                className="flex items-center gap-1.5 text-sm"
                style={{ color: "#A1A1AA" }}
              >
                📍 {barbershop.city}
              </span>
            )}
            {barbershop.phone && (
              <span
                className="flex items-center gap-1.5 text-sm"
                style={{ color: "#A1A1AA" }}
              >
                📞 {formatPhoneBR(barbershop.phone)}
              </span>
            )}
          </div>

          {/* Status de hoje */}
          {todayHours && (
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: todayHours.isOpen
                  ? "rgba(0,212,160,0.08)"
                  : "rgba(255,255,255,0.04)",
                border: todayHours.isOpen
                  ? "1px solid rgba(0,212,160,0.2)"
                  : "1px solid rgba(255,255,255,0.08)",
                color: todayHours.isOpen ? "#00D4A0" : "#52525B",
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: todayHours.isOpen ? "#00D4A0" : "#52525B",
                  display: "inline-block",
                }}
              />
              {todayHours.isOpen
                ? `Aberto hoje · ${todayHours.openTime} às ${todayHours.closeTime}`
                : "Fechado hoje"}
            </div>
          )}
        </div>
      </header>

      {/* ── Conteúdo principal ────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* ── Serviços ──────────────────────────────────────── */}
        <section>
          <h2
            className="font-black text-white mb-4"
            style={{ fontSize: "18px", letterSpacing: "-0.3px" }}
          >
            Serviços
          </h2>

          {barbershop.services.length === 0 ? (
            <p style={{ color: "#52525B", fontSize: "14px" }}>
              Nenhum serviço disponível no momento.
            </p>
          ) : professional ? (
            <ServicePicker
              services={barbershop.services.map((s) => ({
                id: s.id,
                name: s.name,
                durationMin: s.durationMin,
                priceInCents: s.priceInCents,
              }))}
              slug={slug}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {barbershop.services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 rounded-2xl"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-bold text-white text-sm mb-0.5">
                      {service.name}
                    </p>
                    <p className="text-xs" style={{ color: "#52525B" }}>
                      {service.durationMin} minutos
                    </p>
                  </div>
                  <p
                    className="font-black shrink-0"
                    style={{ color: "#FFFFFF", fontSize: "16px", letterSpacing: "-0.5px" }}
                  >
                    R$ {(service.priceInCents / 100).toFixed(0)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Nossa equipe ─────────────────────────────────── */}
        {barbershop.professionals.length > 0 && (
          <section>
            <h2
              className="font-black text-white mb-4"
              style={{ fontSize: "18px", letterSpacing: "-0.3px" }}
            >
              Nossa equipe
            </h2>
            <div className="flex flex-wrap gap-5">
              {barbershop.professionals.map((prof) => (
                <div
                  key={prof.id}
                  className="flex flex-col items-center gap-2"
                  style={{ width: 72 }}
                >
                  {prof.avatarUrl ? (
                    <Image
                      src={prof.avatarUrl}
                      alt={prof.name}
                      width={56}
                      height={56}
                      className="rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "rgba(255,45,85,0.12)",
                        border: "1px solid rgba(255,45,85,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FF2D55",
                        fontWeight: 700,
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      {initials(prof.name)}
                    </div>
                  )}
                  <p
                    className="text-xs font-semibold text-center leading-tight"
                    style={{ color: "#E4E4E7" }}
                  >
                    {prof.name}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Horários de funcionamento ────────────────────── */}
        <section>
          <h2
            className="font-black text-white mb-4"
            style={{ fontSize: "18px", letterSpacing: "-0.3px" }}
          >
            Horários
          </h2>

          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {barbershop.businessHours.map((hour, i) => {
              const isToday = hour.dayOfWeek === todayDayOfWeek;
              return (
                <div
                  key={hour.id}
                  className="flex items-center justify-between px-5 py-3"
                  style={{
                    background: isToday ? "rgba(255,45,85,0.04)" : "var(--bg-card)",
                    borderBottom:
                      i < barbershop.businessHours.length - 1
                        ? "1px solid rgba(255,255,255,0.04)"
                        : undefined,
                  }}
                >
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color: isToday ? "#FFFFFF" : "#A1A1AA",
                      minWidth: "40px",
                    }}
                  >
                    {DAYS[hour.dayOfWeek]}
                    {isToday && (
                      <span
                        className="ml-2 text-xs"
                        style={{ color: "#FF2D55" }}
                      >
                        hoje
                      </span>
                    )}
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: hour.isOpen ? "#A1A1AA" : "#3F3F46" }}
                  >
                    {hour.isOpen
                      ? `${hour.openTime} – ${hour.closeTime}`
                      : "Fechado"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Mapa ─────────────────────────────────────────── */}
        {hasAddress && (
          <section>
            <h2
              className="font-black text-white mb-4"
              style={{ fontSize: "18px", letterSpacing: "-0.3px" }}
            >
              Localização
            </h2>
            <BarbershopMap
              name={barbershop.name}
              street={barbershop.street}
              neighborhood={barbershop.neighborhood}
              city={barbershop.city}
              state={barbershop.state}
              cep={barbershop.cep}
              height="250px"
            />
            {/* Link para abrir no Google Maps */}
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(
                [
                  barbershop.name,
                  barbershop.street,
                  barbershop.neighborhood,
                  barbershop.city,
                  barbershop.state,
                ]
                  .filter(Boolean)
                  .join(", "),
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 mt-3 text-sm transition-colors"
              style={{ color: "#52525B" }}
            >
              <span>Abrir no Google Maps →</span>
            </a>
          </section>
        )}

      </div>
    </main>
  );
}
