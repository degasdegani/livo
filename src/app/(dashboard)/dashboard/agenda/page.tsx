// ============================================================
// LIVO — Agenda Completa
// Visualiza e gerencia agendamentos de qualquer data
// ============================================================

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DateNavigator } from "./date-navigator";

// Server Action inline para atualizar status
async function updateStatus(appointmentId: string, status: string) {
  "use server";
  await db.appointment.update({
    where: { id: appointmentId },
    data: {
      status: status as "confirmed" | "completed" | "cancelled" | "no_show",
    },
  });
  revalidatePath("/dashboard/agenda");
}

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

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const barbershop = await db.barbershop.findUnique({
    where: { ownerId: session.user.id },
  });
  if (!barbershop) redirect("/onboarding");

  // Data selecionada (padrão: hoje)
  const { date } = await searchParams;
  const selectedDate = date || new Date().toISOString().split("T")[0];

  const dayStart = new Date(`${selectedDate}T00:00:00`);
  const dayEnd = new Date(`${selectedDate}T23:59:59`);

  const appointments = await db.appointment.findMany({
    where: {
      barbershopId: barbershop.id,
      date: { gte: dayStart, lte: dayEnd },
    },
    include: { service: true, professional: true },
    orderBy: { date: "asc" },
  });

  // Receita do dia (confirmados + concluídos)
  const revenue = appointments
    .filter((a) => a.status === "confirmed" || a.status === "completed")
    .reduce((sum, a) => sum + a.service.priceInCents, 0);

  const confirmed = appointments.filter(
    (a) => a.status === "confirmed" || a.status === "pending",
  ).length;
  const completed = appointments.filter((a) => a.status === "completed").length;

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
            Agenda
          </span>
        </div>
        <a
          href="/dashboard/agenda/new"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-white transition-all hover:opacity-80"
          style={{
            background: "#FF2D55",
            boxShadow: "0 4px 16px rgba(255,45,85,0.3)",
          }}
        >
          + Novo
        </a>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 flex flex-col gap-6">
        {/* Navegador de datas */}
        <div className="flex items-center justify-center">
          <DateNavigator currentDate={selectedDate} />
        </div>

        {/* KPIs do dia */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "AGENDADOS",
              value: confirmed.toString(),
              color: "#FF2D55",
            },
            {
              label: "CONCLUIDOS",
              value: completed.toString(),
              color: "#00D4A0",
            },
            {
              label: "RECEITA",
              value: `R$${(revenue / 100).toFixed(0)}`,
              color: "#7C3AED",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl p-4 text-center"
              style={{
                background: "#0A0A0A",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p
                className="text-xs font-bold tracking-widest mb-1"
                style={{ color: "#3F3F46", fontFamily: "var(--font-mono)" }}
              >
                {kpi.label}
              </p>
              <p
                className="font-black"
                style={{
                  fontSize: "24px",
                  color: kpi.color,
                  letterSpacing: "-0.5px",
                }}
              >
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Lista de agendamentos */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{
              background: "#0A0A0A",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="font-bold text-white text-sm">
              {appointments.length} agendamento
              {appointments.length !== 1 ? "s" : ""}
            </p>
          </div>

          {appointments.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              style={{ background: "#080808" }}
            >
              <div className="text-4xl mb-3">📅</div>
              <p className="font-bold text-white mb-1">Nenhum agendamento</p>
              <p className="text-sm mb-6" style={{ color: "#52525B" }}>
                Nenhum atendimento registrado para este dia.
              </p>
              <a
                href="/dashboard/agenda/new"
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-80"
                style={{ background: "#FF2D55" }}
              >
                + Registrar atendimento
              </a>
            </div>
          ) : (
            <div style={{ background: "#080808" }}>
              {appointments.map((appointment, i) => {
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
                    className="flex items-center gap-4 px-5 py-4"
                    style={{
                      borderBottom:
                        i < appointments.length - 1
                          ? "1px solid rgba(255,255,255,0.04)"
                          : undefined,
                    }}
                  >
                    {/* Horário */}
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

                    {/* Barra de status */}
                    <div
                      style={{
                        width: 3,
                        alignSelf: "stretch",
                        borderRadius: "2px",
                        background: color,
                        flexShrink: 0,
                      }}
                    />

                    {/* Avatar */}
                    <div
                      className="flex items-center justify-center rounded-full shrink-0 font-bold text-sm"
                      style={{
                        width: 34,
                        height: 34,
                        background: "#1A1A1A",
                        border: `1.5px solid ${color}40`,
                        color: "#A1A1AA",
                      }}
                    >
                      {appointment.clientName.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate text-white">
                        {appointment.clientName}
                      </p>
                      <p className="text-xs" style={{ color: "#52525B" }}>
                        {appointment.service.name} · R${" "}
                        {(appointment.service.priceInCents / 100).toFixed(0)}
                      </p>
                    </div>

                    {/* Ações */}
                    {isActive ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <form
                          action={async () => {
                            "use server";
                            await updateStatus(appointment.id, "completed");
                          }}
                        >
                          <button
                            type="submit"
                            title="Concluir"
                            className="flex items-center justify-center rounded-lg font-bold text-xs transition-all hover:opacity-80"
                            style={{
                              width: 28,
                              height: 28,
                              background: "rgba(0,212,160,0.1)",
                              color: "#00D4A0",
                              border: "1px solid rgba(0,212,160,0.2)",
                            }}
                          >
                            ✓
                          </button>
                        </form>
                        <form
                          action={async () => {
                            "use server";
                            await updateStatus(appointment.id, "cancelled");
                          }}
                        >
                          <button
                            type="submit"
                            title="Cancelar"
                            className="flex items-center justify-center rounded-lg font-bold text-xs transition-all hover:opacity-80"
                            style={{
                              width: 28,
                              height: 28,
                              background: "rgba(255,255,255,0.04)",
                              color: "#52525B",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            ✕
                          </button>
                        </form>
                        <form
                          action={async () => {
                            "use server";
                            await updateStatus(appointment.id, "no_show");
                          }}
                        >
                          <button
                            type="submit"
                            title="Faltou"
                            className="flex items-center justify-center rounded-lg font-bold text-xs transition-all hover:opacity-80"
                            style={{
                              width: 28,
                              height: 28,
                              background: "rgba(255,176,32,0.08)",
                              color: "#FFB020",
                              border: "1px solid rgba(255,176,32,0.2)",
                            }}
                          >
                            !
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-full shrink-0"
                        style={{
                          background: `${color}15`,
                          color,
                          border: `1px solid ${color}30`,
                        }}
                      >
                        {statusLabels[appointment.status]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
