// src/app/(dashboard)/dashboard/agenda/page.tsx
import type { AppointmentForCalendar } from "@/components/day-panel";
import { MonthlyCalendar } from "@/components/monthly-calendar";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/permissions";

export const metadata = { title: "Agenda | LIVO" };

export default async function AgendaPage() {
  const membership = await requireMembership();

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 4, 0);

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
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Agenda
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Visão mensal de todos os agendamentos
        </p>
      </div>
      <MonthlyCalendar
        initialYear={now.getFullYear()}
        initialMonth={now.getMonth()}
        appointments={appointments}
      />
    </div>
  );
}
