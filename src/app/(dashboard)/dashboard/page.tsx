// ============================================================
// LIVO — Dashboard Real
// Painel principal com KPIs, agenda e ações rápidas
// ============================================================

import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { getCurrentMembership } from "@/lib/permissions";
import { MemberRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getDashboardAnalytics } from "./actions";
import { AppointmentActions } from "./appointment-actions";
import { getComissoesData } from "./comandas/actions";

// ── Componente auxiliar: mini gráfico de barras CSS ──────────
function MiniGrafico({
  dados,
}: {
  dados: { label: string; totalInCents: number }[];
}) {
  const maxValor = Math.max(...dados.map((d) => d.totalInCents), 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {dados.map((d, i) => {
        const pct =
          d.totalInCents > 0
            ? Math.max(8, (d.totalInCents / maxValor) * 100)
            : 4;
        const ehAtual = i === dados.length - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              title={`${d.label}: ${(d.totalInCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
              style={{
                height: `${pct}%`,
                background: ehAtual ? "#C8102E" : "#2A2A33",
                borderRadius: 3,
                width: "100%",
                transition: "height 0.3s",
              }}
            />
            {dados.length <= 12 && (
              <span
                style={{ fontSize: 7, color: "#6E6E78", whiteSpace: "nowrap" }}
              >
                {d.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getCurrentMembership();

  const barbershop = await db.barbershop.findUnique({
    where: { ownerId: session.user.id },
    include: {
      services: { where: { isActive: true }, orderBy: { name: "asc" } },
      professionals: { where: { isActive: true } },
      _count: {
        select: { clients: true, appointments: true },
      },
    },
  });
  if (!barbershop) redirect("/onboarding");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayAppointments = await db.appointment.findMany({
    where: {
      barbershopId: barbershop.id,
      date: { gte: todayStart, lte: todayEnd },
    },
    include: { service: true, professional: true },
    orderBy: { date: "asc" },
  });

  const todayRevenue = todayAppointments
    .filter((a) => a.status === "confirmed" || a.status === "completed")
    .reduce((sum, a) => sum + a.service.priceInCents, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthAppointments = await db.appointment.count({
    where: {
      barbershopId: barbershop.id,
      date: { gte: monthStart },
      status: { notIn: ["cancelled", "no_show"] },
    },
  });

  // Card de comissões — só para barbeiros
  const comissoesDoMes =
    membership?.role === MemberRole.barber && membership.professionalId
      ? await getComissoesData("mes_atual", membership.professionalId)
      : null;

  // Analytics — só para owner (Dia 8)
  const analytics =
    membership?.role === MemberRole.owner
      ? await getDashboardAnalytics(barbershop.id)
      : null;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const statusColors = {
    pending: "#FFB020",
    confirmed: "#FF2D55",
    completed: "#00D4A0",
    cancelled: "#3F3F46",
    no_show: "#3F3F46",
  } as const;

  const statusLabels = {
    pending: "Pendente",
    confirmed: "Confirmado",
    completed: "Concluido",
    cancelled: "Cancelado",
    no_show: "Faltou",
  } as const;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#050505" }}>
      {/* ── Header ────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 h-14"
        style={{
          background: "rgba(5,5,5,0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#FF2D55",
              display: "inline-block",
              boxShadow: "0 0 10px rgba(255,45,85,0.5)",
            }}
          />
          <span
            className="font-black text-white"
            style={{ fontSize: "16px", letterSpacing: "-0.3px" }}
          >
            {barbershop.name}
          </span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(255,45,85,0.08)",
              color: "#FF2D55",
              border: "1px solid rgba(255,45,85,0.2)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "1px",
            }}
          >
            START
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span
            className="text-sm hidden sm:block"
            style={{ color: "#52525B" }}
          >
            {session.user.name}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-xs font-semibold transition-colors hover:text-white"
              style={{ color: "#52525B" }}
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* ── Conteúdo ──────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Saudação */}
        <div>
          <h1
            className="font-black text-white mb-1"
            style={{ fontSize: "28px", letterSpacing: "-0.5px" }}
          >
            {greeting}, {session.user.name?.split(" ")[0]} ✦
          </h1>
          <p style={{ color: "#52525B", fontSize: "14px" }}>
            {todayAppointments.length === 0
              ? "Nenhum agendamento para hoje ainda."
              : `Hoje voce tem ${todayAppointments.length} agendamento${todayAppointments.length > 1 ? "s" : ""}.`}
          </p>
        </div>

        {/* ── KPIs ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "HOJE",
              value: todayAppointments.length.toString(),
              sub: "agendamentos",
              color: "#FF2D55",
            },
            {
              label: "RECEITA",
              value: `R$${(todayRevenue / 100).toFixed(0)}`,
              sub: "hoje",
              color: "#00D4A0",
            },
            {
              label: "CLIENTES",
              value: barbershop._count.clients.toString(),
              sub: "cadastrados",
              color: "#00D4FF",
            },
            {
              label: "MES",
              value: monthAppointments.toString(),
              sub: "agendamentos",
              color: "#7C3AED",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl p-5"
              style={{
                background: "#0A0A0A",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p
                className="text-xs font-bold tracking-widest mb-3"
                style={{ color: "#3F3F46", fontFamily: "var(--font-mono)" }}
              >
                {kpi.label}
              </p>
              <p
                className="font-black"
                style={{
                  fontSize: "32px",
                  letterSpacing: "-1px",
                  color: kpi.color,
                  lineHeight: 1,
                }}
              >
                {kpi.value}
              </p>
              <p className="text-xs mt-1" style={{ color: "#52525B" }}>
                {kpi.sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── Card de Comissões (só para barbeiros) ─────────── */}
        {comissoesDoMes &&
          comissoesDoMes.resumo.length > 0 &&
          (() => {
            const meu = comissoesDoMes.resumo[0];
            return (
              <div>
                <h2
                  className="font-bold text-white mb-4"
                  style={{ fontSize: "16px", letterSpacing: "-0.3px" }}
                >
                  Minhas Comissões — Este Mês
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div
                    className="rounded-2xl p-5"
                    style={{
                      background: "#0A0A0A",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p
                      className="text-xs font-bold tracking-widest mb-3"
                      style={{
                        color: "#3F3F46",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      COMANDAS
                    </p>
                    <p
                      className="font-black"
                      style={{
                        fontSize: "32px",
                        letterSpacing: "-1px",
                        color: "#FFFFFF",
                        lineHeight: 1,
                      }}
                    >
                      {meu.totalComandas}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#52525B" }}>
                      fechadas
                    </p>
                  </div>
                  <div
                    className="rounded-2xl p-5"
                    style={{
                      background: "#0A0A0A",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p
                      className="text-xs font-bold tracking-widest mb-3"
                      style={{
                        color: "#3F3F46",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      FATURAMENTO
                    </p>
                    <p
                      className="font-black"
                      style={{
                        fontSize: "26px",
                        letterSpacing: "-1px",
                        color: "#FFFFFF",
                        lineHeight: 1,
                      }}
                    >
                      {(meu.totalFaturamento / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#52525B" }}>
                      no período
                    </p>
                  </div>
                  <div
                    className="rounded-2xl p-5"
                    style={{
                      background: "#0A0A0A",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p
                      className="text-xs font-bold tracking-widest mb-3"
                      style={{
                        color: "#3F3F46",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      COM. SERVIÇOS
                    </p>
                    <p
                      className="font-black"
                      style={{
                        fontSize: "26px",
                        letterSpacing: "-1px",
                        color: "#3FB950",
                        lineHeight: 1,
                      }}
                    >
                      {(meu.totalComissaoServicos / 100).toLocaleString(
                        "pt-BR",
                        { style: "currency", currency: "BRL" },
                      )}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#52525B" }}>
                      este mês
                    </p>
                  </div>
                  <div
                    className="rounded-2xl p-5"
                    style={{
                      background: "#0A0A0A",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p
                      className="text-xs font-bold tracking-widest mb-3"
                      style={{
                        color: "#3F3F46",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      TOTAL COMISSÃO
                    </p>
                    <p
                      className="font-black"
                      style={{
                        fontSize: "26px",
                        letterSpacing: "-1px",
                        color: "#C8A24C",
                        lineHeight: 1,
                      }}
                    >
                      {(meu.totalComissao / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#52525B" }}>
                      <a
                        href="/dashboard/comissoes"
                        style={{ color: "#C8102E" }}
                      >
                        ver histórico →
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* ── Agenda do dia ────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{
              background: "#0A0A0A",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div>
              <p className="font-bold text-white text-sm">Agenda de hoje</p>
              <p className="text-xs" style={{ color: "#52525B" }}>
                {new Date().toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{
                background:
                  todayAppointments.length > 0
                    ? "rgba(0,212,160,0.1)"
                    : "rgba(255,255,255,0.04)",
                color: todayAppointments.length > 0 ? "#00D4A0" : "#3F3F46",
                fontFamily: "var(--font-mono)",
              }}
            >
              {todayAppointments.length} confirmado
              {todayAppointments.length !== 1 ? "s" : ""}
            </span>
          </div>

          {todayAppointments.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              style={{ background: "#080808" }}
            >
              <div className="text-4xl mb-4">📅</div>
              <p className="font-bold text-white mb-2">
                Nenhum agendamento hoje
              </p>
              <p
                className="text-sm mb-6"
                style={{ color: "#52525B", maxWidth: "280px" }}
              >
                Compartilhe o link da sua pagina para seus clientes agendarem
                online.
              </p>
              <div
                className="px-4 py-2 rounded-xl"
                style={{
                  background: "rgba(255,45,85,0.06)",
                  border: "1px solid rgba(255,45,85,0.15)",
                }}
              >
                <span
                  className="text-xs"
                  style={{ color: "#FF2D55", fontFamily: "var(--font-mono)" }}
                >
                  livobarber.com.br/{barbershop.slug}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ background: "#080808" }}>
              {todayAppointments.map((appointment) => {
                const time = new Date(appointment.date).toLocaleTimeString(
                  "pt-BR",
                  { hour: "2-digit", minute: "2-digit" },
                );
                const color = statusColors[appointment.status];
                const isActive =
                  appointment.status === "confirmed" ||
                  appointment.status === "pending";

                return (
                  <div
                    key={appointment.id}
                    className="flex items-center gap-4 px-6 py-4"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <span
                      className="font-bold shrink-0"
                      style={{
                        color: "#A1A1AA",
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        minWidth: "45px",
                      }}
                    >
                      {time}
                    </span>
                    <div
                      style={{
                        width: 3,
                        alignSelf: "stretch",
                        borderRadius: "2px",
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    <div
                      className="flex items-center justify-center rounded-full shrink-0 font-bold text-sm"
                      style={{
                        width: 36,
                        height: 36,
                        background: "#1A1A1A",
                        border: `1.5px solid ${color}40`,
                        color: "#A1A1AA",
                      }}
                    >
                      {appointment.clientName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-semibold text-sm truncate"
                        style={{ color: "#FFFFFF" }}
                      >
                        {appointment.clientName}
                      </p>
                      <p className="text-xs" style={{ color: "#52525B" }}>
                        {appointment.service.name} ·{" "}
                        {appointment.professional.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0 mr-3 hidden sm:block">
                      <p
                        className="text-sm font-bold"
                        style={{ color: "#A1A1AA" }}
                      >
                        R$ {(appointment.service.priceInCents / 100).toFixed(0)}
                      </p>
                      <p className="text-xs" style={{ color }}>
                        {statusLabels[appointment.status]}
                      </p>
                    </div>

                    {isActive ? (
                      <AppointmentActions appointmentId={appointment.id} />
                    ) : (
                      <div className="shrink-0">
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full"
                          style={{
                            background: `${color}15`,
                            color,
                            border: `1px solid ${color}30`,
                          }}
                        >
                          {statusLabels[appointment.status]}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Ações rápidas ────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: "📊",
              label: "Relatorios",
              desc: "Receita e desempenho",
              href: "/dashboard/relatorios",
            },
            {
              icon: "👥",
              label: "Clientes",
              desc: `${barbershop._count.clients} cadastrados`,
              href: "/dashboard/clients",
            },
            {
              icon: "⚙️",
              label: "Configuracoes",
              desc: "Servicos e horarios",
              href: "/dashboard/settings",
            },
          ].map((action) => (
            <a
              href={action.href}
              key={action.label}
              className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 hover:opacity-80"
              style={{
                background: "#0A0A0A",
                border: "1px solid rgba(255,255,255,0.06)",
                textDecoration: "none",
              }}
            >
              <span className="text-2xl">{action.icon}</span>
              <div>
                <p className="font-bold text-white text-sm">{action.label}</p>
                <p className="text-xs" style={{ color: "#52525B" }}>
                  {action.desc}
                </p>
              </div>
            </a>
          ))}
        </div>

        {/* ── Analytics do owner (Dia 8) ───────────────────── */}
        {analytics && (
          <div className="space-y-6">
            <div className="border-t border-[#2A2A33] pt-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Performance do mês
              </h2>
            </div>

            {/* Mini KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  titulo: "Faturamento",
                  valor: (analytics.faturamentoMes / 100).toLocaleString(
                    "pt-BR",
                    { style: "currency", currency: "BRL" },
                  ),
                  cor: "#3FB950",
                },
                {
                  titulo: "Comandas",
                  valor: String(analytics.totalComandasMes),
                  cor: "#C8A24C",
                },
                {
                  titulo: "Ticket médio",
                  valor: (analytics.ticketMedio / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }),
                  cor: "#C8102E",
                },
                {
                  titulo: "Top serviço",
                  valor: analytics.topServicos[0]?.nome ?? "—",
                  cor: "#9A9AA6",
                },
              ].map((k, i) => (
                <div
                  key={i}
                  style={{
                    background: "#17171C",
                    border: "1px solid #2A2A33",
                    borderRadius: 12,
                    padding: 20,
                  }}
                >
                  <p className="text-xs text-[#6E6E78] uppercase tracking-wider mb-1">
                    {k.titulo}
                  </p>
                  <p className="text-xl font-bold" style={{ color: k.cor }}>
                    {k.valor}
                  </p>
                </div>
              ))}
            </div>

            {/* Evolução 12 meses — gráfico CSS */}
            <div
              style={{
                background: "#17171C",
                border: "1px solid #2A2A33",
                borderRadius: 12,
                padding: 24,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#9A9AA6] uppercase tracking-wider">
                  Evolução — últimos 12 meses
                </h3>
                <a
                  href="/dashboard/relatorios"
                  className="text-xs text-[#C8102E] hover:underline"
                >
                  Ver relatório completo →
                </a>
              </div>
              <MiniGrafico dados={analytics.evolucaoMensal} />
            </div>

            {/* Top 5 serviços */}
            {analytics.topServicos.length > 0 && (
              <div
                style={{
                  background: "#17171C",
                  border: "1px solid #2A2A33",
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <h3 className="text-sm font-semibold text-[#9A9AA6] uppercase tracking-wider mb-4">
                  Serviços mais vendidos este mês
                </h3>
                <div className="space-y-2">
                  {analytics.topServicos.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-white">
                        {i + 1}. {s.nome}
                      </span>
                      <span className="text-[#9A9AA6]">
                        {s.quantidade}× ·{" "}
                        {(s.totalInCents / 100).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
