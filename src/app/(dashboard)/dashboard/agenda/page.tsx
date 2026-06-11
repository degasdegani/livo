// src/app/(dashboard)/dashboard/agenda/page.tsx
import Link from "next/link";
import type { AppointmentForCalendar } from "@/components/day-panel";
import { MonthlyCalendar } from "@/components/monthly-calendar";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/permissions";
import { getAgendaDay, getServicesForAgenda } from "./agenda-actions";
import AgendaBoard from "./agenda-board";

export const metadata = { title: "Agenda | LIVO" };

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const { view, date } = await searchParams;

  // ── Visão operacional ────────────────────────────────────────────────────────
  if (view === "operacional") {
    const dateKey =
      date ??
      new Date()
        .toLocaleDateString("pt-BR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          timeZone: "America/Sao_Paulo",
        })
        .split("/")
        .reverse()
        .join("-");

    const [dayData, services] = await Promise.all([
      getAgendaDay(dateKey),
      getServicesForAgenda(),
    ]);

    return (
      <div className="h-full flex flex-col min-h-0">
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Agenda
            </h1>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Visão operacional — gerenciamento em tempo real
            </p>
          </div>
          <ViewToggle current="operacional" />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <AgendaBoard
            initialData={dayData}
            initialDateKey={dateKey}
            services={services}
          />
        </div>
      </div>
    );
  }

  // ── Visão mensal (default) ───────────────────────────────────────────────────
  const membership = await requireMembership();
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1, 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 4, 0, 23, 59, 59, 999),
  );

  const rawAppointments = await db.appointment.findMany({
    where:
      membership.role === "barber" && membership.professionalId
        ? {
            barbershopId: membership.barbershopId,
            date: { gte: start, lte: end },
            professionalId: membership.professionalId,
          }
        : {
            barbershopId: membership.barbershopId,
            date: { gte: start, lte: end },
          },
    orderBy: { date: "asc" },
    include: {
      client: { select: { name: true, phone: true } },
      professional: { select: { name: true } },
      service: { select: { name: true, priceInCents: true } },
    },
  });

  const appointments: AppointmentForCalendar[] = rawAppointments.map((a) => ({
    id: a.id,
    startTime: a.date,
    endTime: a.endTime ?? null,
    status: a.status as AppointmentForCalendar["status"],
    clientName: a.client?.name ?? a.clientName,
    clientPhone: a.client?.phone ?? a.clientPhone ?? null,
    professionalName: a.professional.name,
    serviceName: a.service.name,
    priceInCents: a.service.priceInCents,
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Agenda
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Alterne entre visão por mês, semana ou dia
          </p>
        </div>
        <ViewToggle current="mensal" />
      </div>
      <MonthlyCalendar
        initialYear={now.getFullYear()}
        initialMonth={now.getMonth()}
        appointments={appointments}
      />
    </div>
  );
}

// ─── Toggle de visualização ──────────────────────────────────────────────────

function ViewToggle({ current }: { current: "mensal" | "operacional" }) {
  return (
    <div
      className="flex items-center rounded-lg p-0.5 gap-0.5"
      style={{
        backgroundColor: "var(--bg-card-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      <Link
        href="/dashboard/agenda"
        className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
        style={
          current === "mensal"
            ? { backgroundColor: "var(--color-primary)", color: "#fff" }
            : { color: "var(--text-secondary)" }
        }
      >
        Mensal
      </Link>
      <Link
        href="/dashboard/agenda?view=operacional"
        className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
        style={
          current === "operacional"
            ? { backgroundColor: "var(--color-primary)", color: "#fff" }
            : { color: "var(--text-secondary)" }
        }
      >
        Operacional
      </Link>
    </div>
  );
}
