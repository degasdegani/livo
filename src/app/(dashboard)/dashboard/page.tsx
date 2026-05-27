// ============================================================
// LIVO — Dashboard Real
// Painel principal com KPIs, agenda e ações rápidas
// ============================================================

import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AppointmentActions } from "./appointment-actions";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
                  livo.com.br/{barbershop.slug}
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
      </main>
    </div>
  );
}
