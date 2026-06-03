// src/app/(dashboard)/dashboard/page.tsx
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { getCurrentMembership } from "@/lib/permissions";
import { MemberRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getDashboardAnalytics } from "./actions";
import { AppointmentActions } from "./appointment-actions";
import { getComissoesData } from "./comandas/actions";

const PLAN_LABELS: Record<string, string> = {
  start: "START",
  pro: "PRO",
  prime: "PRIME",
};

const PLAN_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  start: {
    bg: "rgba(94,94,104,0.12)",
    text: "var(--text-secondary)",
    border: "rgba(94,94,104,0.3)",
  },
  pro: {
    bg: "var(--color-primary-10)",
    text: "var(--color-primary)",
    border: "var(--color-primary-20)",
  },
  prime: {
    bg: "rgba(212,175,55,0.12)",
    text: "var(--color-gold)",
    border: "rgba(212,175,55,0.3)",
  },
};

function getSaudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

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
                background: ehAtual ? "var(--color-primary)" : "var(--border)",
                borderRadius: 3,
                width: "100%",
                transition: "height 0.3s",
              }}
            />
            {dados.length <= 12 && (
              <span
                style={{
                  fontSize: 7,
                  color: "var(--text-tertiary)",
                  whiteSpace: "nowrap",
                }}
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
      _count: { select: { clients: true, appointments: true } },
    },
  });
  if (!barbershop) redirect("/onboarding");

  const planKey = barbershop.plan as string;
  const planLabel = PLAN_LABELS[planKey] ?? planKey.toUpperCase();
  const planColor = PLAN_COLORS[planKey] ?? PLAN_COLORS.start;

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

  const comissoesDoMes =
    membership?.role === MemberRole.barber && membership.professionalId
      ? await getComissoesData("mes_atual", membership.professionalId)
      : null;

  const analytics =
    membership?.role === MemberRole.owner
      ? await getDashboardAnalytics(barbershop.id)
      : null;

  const greeting = getSaudacao();

  const statusColors = {
    pending: "var(--status-yellow)",
    confirmed: "var(--color-primary)",
    completed: "var(--status-green)",
    cancelled: "var(--status-gray)",
    no_show: "var(--status-gray)",
  } as const;

  const statusLabels = {
    pending: "Pendente",
    confirmed: "Confirmado",
    completed: "Concluído",
    cancelled: "Cancelado",
    no_show: "Faltou",
  } as const;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 h-14"
        style={{
          backgroundColor: "var(--bg-base)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
          opacity: 0.97,
        }}
      >
        <div className="flex items-center gap-3">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--status-green)",
              display: "inline-block",
              boxShadow: "0 0 8px rgba(0,212,160,0.5)",
            }}
          />
          <span
            className="font-black"
            style={{
              fontSize: "16px",
              letterSpacing: "-0.3px",
              color: "var(--text-primary)",
            }}
          >
            {barbershop.name}
          </span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: planColor.bg,
              color: planColor.text,
              border: `1px solid ${planColor.border}`,
              letterSpacing: "1px",
            }}
          >
            {planLabel}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span
            className="text-sm hidden sm:block"
            style={{ color: "var(--text-tertiary)" }}
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
              style={{ color: "var(--text-tertiary)" }}
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Saudação */}
        <div>
          <h1
            className="font-black mb-1"
            style={{
              fontSize: "28px",
              letterSpacing: "-0.5px",
              color: "var(--text-primary)",
            }}
          >
            {greeting}, {barbershop.name} ✦
          </h1>
          <p style={{ color: "var(--text-tertiary)", fontSize: "14px" }}>
            {todayAppointments.length === 0
              ? "Nenhum agendamento para hoje ainda."
              : `Hoje você tem ${todayAppointments.length} agendamento${todayAppointments.length > 1 ? "s" : ""}.`}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "HOJE",
              value: todayAppointments.length.toString(),
              sub: "agendamentos",
              color: "var(--color-primary)",
            },
            {
              label: "RECEITA",
              value: `R$${(todayRevenue / 100).toFixed(0)}`,
              sub: "hoje",
              color: "var(--status-green)",
            },
            {
              label: "CLIENTES",
              value: barbershop._count.clients.toString(),
              sub: "cadastrados",
              color: "#00D4FF",
            },
            {
              label: "MÊS",
              value: monthAppointments.toString(),
              sub: "agendamentos",
              color: "#7C3AED",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl p-5"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <p
                className="text-xs font-bold tracking-widest mb-3"
                style={{ color: "var(--text-tertiary)" }}
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
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                {kpi.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Comissões do barbeiro */}
        {comissoesDoMes &&
          comissoesDoMes.resumo.length > 0 &&
          (() => {
            const meu = comissoesDoMes.resumo[0];
            return (
              <div>
                <h2
                  className="font-bold mb-4"
                  style={{
                    fontSize: "16px",
                    letterSpacing: "-0.3px",
                    color: "var(--text-primary)",
                  }}
                >
                  Minhas Comissões — Este Mês
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: "COMANDAS",
                      value: meu.totalComandas,
                      sub: "fechadas",
                      color: "var(--text-primary)",
                      size: "32px",
                    },
                    {
                      label: "FATURAMENTO",
                      value: (meu.totalFaturamento / 100).toLocaleString(
                        "pt-BR",
                        { style: "currency", currency: "BRL" },
                      ),
                      sub: "no período",
                      color: "var(--text-primary)",
                      size: "26px",
                    },
                    {
                      label: "COM. SERVIÇOS",
                      value: (meu.totalComissaoServicos / 100).toLocaleString(
                        "pt-BR",
                        { style: "currency", currency: "BRL" },
                      ),
                      sub: "este mês",
                      color: "var(--status-green)",
                      size: "26px",
                    },
                    {
                      label: "TOTAL COMISSÃO",
                      value: (meu.totalComissao / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }),
                      sub: "ver histórico →",
                      color: "var(--color-gold)",
                      size: "26px",
                      href: "/dashboard/comissoes",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="rounded-2xl p-5"
                      style={{
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <p
                        className="text-xs font-bold tracking-widest mb-3"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {card.label}
                      </p>
                      <p
                        className="font-black"
                        style={{
                          fontSize: card.size,
                          letterSpacing: "-1px",
                          color: card.color,
                          lineHeight: 1,
                        }}
                      >
                        {card.value}
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {"href" in card && card.href ? (
                          <a
                            href={card.href}
                            style={{ color: "var(--color-primary)" }}
                          >
                            {card.sub}
                          </a>
                        ) : (
                          card.sub
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        {/* Agenda do dia */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{
              backgroundColor: "var(--bg-card)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div>
              <p
                className="font-bold text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                Agenda de hoje
              </p>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
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
                backgroundColor:
                  todayAppointments.length > 0
                    ? "rgba(0,212,160,0.1)"
                    : "var(--bg-card-elevated)",
                color:
                  todayAppointments.length > 0
                    ? "var(--status-green)"
                    : "var(--text-tertiary)",
              }}
            >
              {todayAppointments.length} confirmado
              {todayAppointments.length !== 1 ? "s" : ""}
            </span>
          </div>

          {todayAppointments.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              style={{ backgroundColor: "var(--bg-card-elevated)" }}
            >
              <div className="text-4xl mb-4">📅</div>
              <p
                className="font-bold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Nenhum agendamento hoje
              </p>
              <p
                className="text-sm mb-6"
                style={{ color: "var(--text-tertiary)", maxWidth: "280px" }}
              >
                Compartilhe o link da sua página para seus clientes agendarem
                online.
              </p>
              <div
                className="px-4 py-2 rounded-xl"
                style={{
                  backgroundColor: "var(--color-primary-10)",
                  border: "1px solid var(--color-primary-20)",
                }}
              >
                <span
                  className="text-xs"
                  style={{ color: "var(--color-primary)" }}
                >
                  livobarber.com.br/{barbershop.slug}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: "var(--bg-card-elevated)" }}>
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
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <span
                      className="font-bold shrink-0"
                      style={{
                        color: "var(--text-secondary)",
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
                        backgroundColor: "var(--bg-card)",
                        border: `1.5px solid ${color}`,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {appointment.clientName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-semibold text-sm truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {appointment.clientName}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {appointment.service.name} ·{" "}
                        {appointment.professional.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0 mr-3 hidden sm:block">
                      <p
                        className="text-sm font-bold"
                        style={{ color: "var(--text-secondary)" }}
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
                            backgroundColor: `${color}20`,
                            color,
                            border: `1px solid ${color}40`,
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

        {/* Ações rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: "📊",
              label: "Relatórios",
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
              label: "Configurações",
              desc: "Serviços e horários",
              href: "/dashboard/settings",
            },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 hover:opacity-80"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                textDecoration: "none",
              }}
            >
              <span className="text-2xl">{action.icon}</span>
              <div>
                <p
                  className="font-bold text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {action.label}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {action.desc}
                </p>
              </div>
            </a>
          ))}
        </div>

        {/* Analytics do owner */}
        {analytics && (
          <div className="space-y-6">
            <div
              className="border-t pt-6"
              style={{ borderColor: "var(--border)" }}
            >
              <h2
                className="text-lg font-semibold mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                Performance do mês
              </h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  titulo: "Faturamento",
                  valor: (analytics.faturamentoMes / 100).toLocaleString(
                    "pt-BR",
                    { style: "currency", currency: "BRL" },
                  ),
                  cor: "var(--status-green)",
                },
                {
                  titulo: "Comandas",
                  valor: String(analytics.totalComandasMes),
                  cor: "var(--color-gold)",
                },
                {
                  titulo: "Ticket médio",
                  valor: (analytics.ticketMedio / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }),
                  cor: "var(--color-primary)",
                },
                {
                  titulo: "Top serviço",
                  valor: analytics.topServicos[0]?.nome ?? "—",
                  cor: "var(--text-secondary)",
                },
              ].map((k, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 20,
                  }}
                >
                  <p
                    className="text-xs uppercase tracking-wider mb-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {k.titulo}
                  </p>
                  <p className="text-xl font-bold" style={{ color: k.cor }}>
                    {k.valor}
                  </p>
                </div>
              ))}
            </div>

            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 24,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-sm font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Evolução — últimos 12 meses
                </h3>
                <a
                  href="/dashboard/relatorios"
                  className="text-xs hover:underline"
                  style={{ color: "var(--color-primary)" }}
                >
                  Ver relatório completo →
                </a>
              </div>
              <MiniGrafico dados={analytics.evolucaoMensal} />
            </div>

            {analytics.topServicos.length > 0 && (
              <div
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <h3
                  className="text-sm font-semibold uppercase tracking-wider mb-4"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Serviços mais vendidos este mês
                </h3>
                <div className="space-y-2">
                  {analytics.topServicos.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span style={{ color: "var(--text-primary)" }}>
                        {i + 1}. {s.nome}
                      </span>
                      <span style={{ color: "var(--text-secondary)" }}>
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
