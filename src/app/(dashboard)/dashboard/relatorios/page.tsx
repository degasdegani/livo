// ============================================================
// LIVO — Relatórios
// Visão financeira e operacional da barbearia
// ============================================================

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

// ── Utilitários de data ───────────────────────────────────────
const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const MONTHS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Gera os últimos N meses como chaves "YYYY-MM"
function getLastNMonths(n: number) {
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: MONTHS_SHORT[d.getMonth()],
      fullLabel: `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`,
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return months;
}

export default async function RelatoriosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const barbershop = await db.barbershop.findUnique({
    where: { ownerId: session.user.id },
  });
  if (!barbershop) redirect("/onboarding");

  // ── Datas do mês atual ─────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
  );

  // ── Dados do mês atual ─────────────────────────────────────
  const monthAppointments = await db.appointment.findMany({
    where: {
      barbershopId: barbershop.id,
      date: { gte: monthStart, lte: monthEnd },
    },
    include: { service: true },
  });

  const completed = monthAppointments.filter((a) => a.status === "completed");
  const active = monthAppointments.filter(
    (a) =>
      a.status === "confirmed" ||
      a.status === "completed" ||
      a.status === "pending",
  );
  const cancelled = monthAppointments.filter(
    (a) => a.status === "cancelled" || a.status === "no_show",
  );

  const totalRevenue = completed.reduce(
    (sum, a) => sum + a.service.priceInCents,
    0,
  );
  const totalActive = active.length;
  const totalCancelled = cancelled.length;
  const completionRate =
    totalActive + totalCancelled > 0
      ? Math.round(
          (completed.length / (completed.length + totalCancelled)) * 100,
        )
      : 0;
  const avgTicket =
    completed.length > 0 ? Math.round(totalRevenue / completed.length) : 0;

  // ── Clientes novos no mês ──────────────────────────────────
  const newClientsCount = await db.client.count({
    where: {
      barbershopId: barbershop.id,
      createdAt: { gte: monthStart },
    },
  });

  const totalClientsCount = await db.client.count({
    where: { barbershopId: barbershop.id },
  });

  // ── Últimos 6 meses ────────────────────────────────────────
  const last6Months = getLastNMonths(6);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const recentAppointments = await db.appointment.findMany({
    where: {
      barbershopId: barbershop.id,
      date: { gte: sixMonthsAgo },
      status: { notIn: ["cancelled", "no_show"] },
    },
    include: { service: true },
  });

  // Agrupa por mês
  const monthlyMap: Record<string, { count: number; revenue: number }> = {};
  last6Months.forEach((m) => {
    monthlyMap[m.key] = { count: 0, revenue: 0 };
  });
  recentAppointments.forEach((apt) => {
    const d = new Date(apt.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap[key]) {
      monthlyMap[key].count++;
      monthlyMap[key].revenue += apt.service.priceInCents;
    }
  });

  const monthlyData = last6Months.map((m) => ({
    ...m,
    count: monthlyMap[m.key].count,
    revenue: monthlyMap[m.key].revenue,
  }));

  const maxCount = Math.max(...monthlyData.map((m) => m.count), 1);
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // ── Top serviços do mês ─────────────────────────────────────
  const serviceMap: Record<
    string,
    { name: string; count: number; revenue: number }
  > = {};
  active.forEach((apt) => {
    const key = apt.service.id;
    if (!serviceMap[key]) {
      serviceMap[key] = { name: apt.service.name, count: 0, revenue: 0 };
    }
    serviceMap[key].count++;
    serviceMap[key].revenue += apt.service.priceInCents;
  });
  const topServices = Object.values(serviceMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxServiceCount = Math.max(...topServices.map((s) => s.count), 1);

  // ── Melhores clientes ──────────────────────────────────────
  const topClients = await db.client.findMany({
    where: { barbershopId: barbershop.id },
    orderBy: { totalVisits: "desc" },
    take: 5,
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#050505" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 h-14"
        style={{
          background: "rgba(5,5,5,0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <a
            href="/dashboard"
            className="text-xs hover:opacity-70 transition-opacity mr-2"
            style={{ color: "#52525B" }}
          >
            ← Dashboard
          </a>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#FF2D55",
              display: "inline-block",
            }}
          />
          <span
            className="font-black text-white"
            style={{ fontSize: "16px", letterSpacing: "-0.3px" }}
          >
            Relatórios
          </span>
        </div>
        <span className="text-xs font-semibold" style={{ color: "#52525B" }}>
          {MONTHS_PT[now.getMonth()]} {now.getFullYear()}
        </span>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* ── KPIs do mês ───────────────────────────────────── */}
        <section>
          <p
            className="text-xs font-bold tracking-widest mb-4"
            style={{ color: "#3F3F46", fontFamily: "var(--font-mono)" }}
          >
            RESUMO DO MÊS
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              {
                label: "RECEITA",
                value: formatCurrency(totalRevenue),
                sub: "concluídos",
                color: "#00D4A0",
              },
              {
                label: "ATENDIMENTOS",
                value: totalActive.toString(),
                sub: "realizados",
                color: "#FF2D55",
              },
              {
                label: "TICKET MÉDIO",
                value: formatCurrency(avgTicket),
                sub: "por atendimento",
                color: "#7C3AED",
              },
              {
                label: "CLIENTES NOVOS",
                value: newClientsCount.toString(),
                sub: `de ${totalClientsCount} total`,
                color: "#00D4FF",
              },
              {
                label: "CONCLUSÃO",
                value: `${completionRate}%`,
                sub: "taxa de conclusão",
                color: "#FFB020",
              },
              {
                label: "CANCELAMENTOS",
                value: totalCancelled.toString(),
                sub: "este mês",
                color: "#3F3F46",
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
                  className="font-black mb-1"
                  style={{
                    fontSize: "26px",
                    letterSpacing: "-0.5px",
                    color: kpi.color,
                    lineHeight: 1,
                  }}
                >
                  {kpi.value}
                </p>
                <p className="text-xs" style={{ color: "#52525B" }}>
                  {kpi.sub}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Gráfico: últimos 6 meses ──────────────────────── */}
        <section
          className="rounded-2xl p-6"
          style={{
            background: "#0A0A0A",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-bold text-white text-sm">
                Agendamentos por mês
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#52525B" }}>
                Últimos 6 meses (sem cancelamentos)
              </p>
            </div>
          </div>

          {/* Barras */}
          <div className="flex items-end gap-3" style={{ height: "120px" }}>
            {monthlyData.map((month) => {
              const isCurrentMonth = month.key === currentMonthKey;
              const heightPct =
                month.count > 0
                  ? Math.max((month.count / maxCount) * 100, 8)
                  : 0;

              return (
                <div
                  key={month.key}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                >
                  {/* Valor acima da barra */}
                  {month.count > 0 && (
                    <span
                      className="text-xs font-bold"
                      style={{ color: isCurrentMonth ? "#FF2D55" : "#52525B" }}
                    >
                      {month.count}
                    </span>
                  )}

                  {/* Barra */}
                  <div
                    style={{
                      width: "100%",
                      height: `${heightPct}%`,
                      background: isCurrentMonth
                        ? "#FF2D55"
                        : month.count > 0
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(255,255,255,0.03)",
                      borderRadius: "6px 6px 0 0",
                      minHeight: month.count > 0 ? "8px" : "3px",
                      boxShadow: isCurrentMonth
                        ? "0 0 16px rgba(255,45,85,0.3)"
                        : "none",
                      transition: "height 0.3s ease",
                    }}
                  />

                  {/* Mês */}
                  <span
                    className="text-xs font-semibold"
                    style={{ color: isCurrentMonth ? "#FF2D55" : "#3F3F46" }}
                  >
                    {month.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Top serviços + Melhores clientes ─────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top serviços */}
          <section
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div
              className="px-5 py-4"
              style={{
                background: "#0A0A0A",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p className="font-bold text-white text-sm">Top serviços</p>
              <p className="text-xs mt-0.5" style={{ color: "#52525B" }}>
                Mais solicitados este mês
              </p>
            </div>

            <div style={{ background: "#080808" }}>
              {topServices.length === 0 ? (
                <p
                  className="px-5 py-8 text-center text-sm"
                  style={{ color: "#52525B" }}
                >
                  Nenhum atendimento este mês ainda.
                </p>
              ) : (
                topServices.map((service, i) => (
                  <div
                    key={service.name}
                    className="px-5 py-3"
                    style={{
                      borderBottom:
                        i < topServices.length - 1
                          ? "1px solid rgba(255,255,255,0.04)"
                          : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-semibold text-sm text-white">
                        {service.name}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: "#52525B" }}>
                          {formatCurrency(service.revenue)}
                        </span>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: "rgba(255,45,85,0.08)",
                            color: "#FF2D55",
                          }}
                        >
                          {service.count}×
                        </span>
                      </div>
                    </div>
                    {/* Barra de progresso */}
                    <div
                      className="w-full rounded-full overflow-hidden"
                      style={{
                        height: 4,
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <div
                        style={{
                          width: `${(service.count / maxServiceCount) * 100}%`,
                          height: "100%",
                          background: "#FF2D55",
                          borderRadius: "9999px",
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Melhores clientes */}
          <section
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div
              className="px-5 py-4"
              style={{
                background: "#0A0A0A",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p className="font-bold text-white text-sm">Clientes fiéis</p>
              <p className="text-xs mt-0.5" style={{ color: "#52525B" }}>
                Por número de visitas
              </p>
            </div>

            <div style={{ background: "#080808" }}>
              {topClients.length === 0 ? (
                <p
                  className="px-5 py-8 text-center text-sm"
                  style={{ color: "#52525B" }}
                >
                  Nenhum cliente cadastrado ainda.
                </p>
              ) : (
                topClients.map((client, i) => {
                  const colors = [
                    "#FF2D55",
                    "#7C3AED",
                    "#00D4FF",
                    "#00D4A0",
                    "#FFB020",
                  ];
                  const color = colors[i % colors.length];

                  return (
                    <div
                      key={client.id}
                      className="flex items-center gap-3 px-5 py-3"
                      style={{
                        borderBottom:
                          i < topClients.length - 1
                            ? "1px solid rgba(255,255,255,0.04)"
                            : undefined,
                      }}
                    >
                      {/* Posição */}
                      <span
                        className="font-black text-xs shrink-0"
                        style={{ color, minWidth: "16px" }}
                      >
                        #{i + 1}
                      </span>

                      {/* Avatar */}
                      <div
                        className="flex items-center justify-center rounded-full shrink-0 font-bold text-xs"
                        style={{
                          width: 30,
                          height: 30,
                          background: `${color}20`,
                          border: `1.5px solid ${color}40`,
                          color,
                        }}
                      >
                        {client.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate text-white">
                          {client.name}
                        </p>
                        <p className="text-xs" style={{ color: "#52525B" }}>
                          {client.phone}
                        </p>
                      </div>

                      {/* Visitas */}
                      <div className="text-right shrink-0">
                        <p className="font-black text-sm" style={{ color }}>
                          {client.totalVisits}
                        </p>
                        <p className="text-xs" style={{ color: "#3F3F46" }}>
                          {client.totalVisits === 1 ? "visita" : "visitas"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
