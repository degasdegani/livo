// ============================================================
// LIVO — Página Pública da Barbearia
// URL: livo.com.br/[slug]
// Acessível por qualquer pessoa sem login
// ============================================================

import { db } from "@/lib/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

// Gera o título da aba dinamicamente para cada barbearia
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const barbershop = await db.barbershop.findUnique({
    where: { slug, isActive: true },
  });

  if (!barbershop) return { title: "Barbearia não encontrada | Livo" };

  return {
    title: `${barbershop.name} | Livo`,
    description: `Agende seu horário na ${barbershop.name} pelo Livo.`,
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

  // Busca a barbearia com todos os dados relacionados
  const barbershop = await db.barbershop.findUnique({
    where: { slug, isActive: true },
    include: {
      services: { where: { isActive: true }, orderBy: { priceInCents: "asc" } },
      professionals: { where: { isActive: true } },
      businessHours: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  // Barbearia não existe ou está inativa → 404
  if (!barbershop) notFound();

  // Horário de hoje
  const todayDayOfWeek = new Date().getDay();
  const todayHours = barbershop.businessHours.find(
    (h) => h.dayOfWeek === todayDayOfWeek,
  );

  // Pega o primeiro profissional (Livo Start tem apenas 1)
  const professional = barbershop.professionals[0];

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#050505" }}>
      {/* ── Header da barbearia ────────────────────────────── */}
      <header
        style={{
          background: "#0A0A0A",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* Logo do Livo */}
          <div className="flex items-center gap-1.5 mb-6">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#FF2D55",
                display: "inline-block",
              }}
            />
            <span className="text-xs font-bold" style={{ color: "#52525B" }}>
              livo
            </span>
          </div>

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

          {/* Info: cidade e telefone */}
          <div className="flex flex-wrap gap-4 mb-4">
            {barbershop.city && (
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
                📞 {barbershop.phone}
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
          ) : (
            <div className="flex flex-col gap-3">
              {barbershop.services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 rounded-2xl"
                  style={{
                    background: "#0A0A0A",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {/* Info do serviço */}
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-bold text-white text-sm mb-0.5">
                      {service.name}
                    </p>
                    <p className="text-xs" style={{ color: "#52525B" }}>
                      {service.durationMin} minutos
                    </p>
                  </div>

                  {/* Preço + botão */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p
                        className="font-black"
                        style={{
                          color: "#FFFFFF",
                          fontSize: "16px",
                          letterSpacing: "-0.5px",
                        }}
                      >
                        R$ {(service.priceInCents / 100).toFixed(0)}
                      </p>
                    </div>

                    {professional && (
                      <a
                        href={`/${slug}/book?serviceId=${service.id}`}
                        className="px-4 py-2 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 whitespace-nowrap"
                        style={{
                          background: "#FF2D55",
                          boxShadow: "0 4px 16px rgba(255,45,85,0.3)",
                        }}
                      >
                        Agendar
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

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
                    background: isToday ? "rgba(255,45,85,0.04)" : "#0A0A0A",
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

        {/* ── Rodapé ────────────────────────────────────────── */}
        <footer className="text-center pb-4">
          <p className="text-xs" style={{ color: "#27272A" }}>
            Agendamento online por{" "}
            <a
              href="/"
              className="hover:text-white transition-colors"
              style={{ color: "#3F3F46" }}
            >
              Livo
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
