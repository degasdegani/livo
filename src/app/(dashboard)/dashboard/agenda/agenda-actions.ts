"use server";

import type { AppointmentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  createAppointmentCore,
  moveAppointmentCore,
  updateAppointmentCore,
} from "@/lib/appointment-core";
import { db } from "@/lib/db";
import {
  appointmentScope,
  clientScope,
  requireMembership,
  requireRole,
} from "@/lib/permissions";

// ─── Tipos exportados ────────────────────────────────────────────────────────

export type AgendaProfessional = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type AgendaAppointmentService = {
  id: string;
  serviceId: string | null;
  serviceName: string;
  servicePriceInCents: number;
  serviceDurationMin: number;
};

export type AgendaAppointment = {
  id: string;
  date: string;
  endTime: string | null;
  status: AppointmentStatus;
  clientId: string | null;
  comandaId: string | null;
  clientName: string;
  clientPhone: string | null;
  notes: string | null;
  professionalId: string;
  // Campos legado (primeiro serviço) — mantidos para compatibilidade com UI ainda não migrada
  serviceId: string;
  serviceName: string;
  serviceDurationMin: number;
  servicePriceInCents: number;
  // Todos os serviços do agendamento via AppointmentService
  services: AgendaAppointmentService[];
};

export type AgendaBusinessHour = {
  openTime: string; // "HH:MM"
  closeTime: string; // "HH:MM"
  isOpen: boolean;
};

export type AgendaDayData = {
  professionals: AgendaProfessional[];
  appointments: AgendaAppointment[];
  timeBlocks: AgendaTimeBlock[];
  userRole: string;
  userProfessionalId: string | null;
  // Null when barbershop has no BusinessHour row for this weekday — caller falls back to defaults.
  businessHour: AgendaBusinessHour | null;
};

export type AgendaService = {
  id: string;
  name: string;
  durationMin: number;
  priceInCents: number;
};

// ─── Buscar dados do dia ─────────────────────────────────────────────────────

export async function getAgendaDay(dateStr: string): Promise<AgendaDayData> {
  const membership = await requireMembership();

  const date = new Date(`${dateStr}T00:00:00-03:00`);
  const nextDay = new Date(`${dateStr}T23:59:59.999-03:00`);

  // Day-of-week from the date string (0=Sunday … 6=Saturday) resolved in UTC
  // using the BRT date, which is reliable on any server timezone.
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(y, mo - 1, d)).getDay();

  const [professionals, appointments, timeBlockRows, businessHourRow] = await Promise.all([
    db.professional.findMany({
      where: { barbershopId: membership.barbershopId, isActive: true },
      orderBy: { name: "asc" },
    }),
    db.appointment.findMany({
      where: {
        ...appointmentScope(membership),
        date: { gte: date, lte: nextDay },
        status: { notIn: ["cancelled"] },
      },
      include: {
        service: {
          select: { name: true, durationMin: true, priceInCents: true },
        },
        comanda: { select: { id: true } },
        services: {
          select: {
            id: true,
            serviceId: true,
            serviceName: true,
            servicePriceInCents: true,
            serviceDurationMin: true,
          },
        },
      },
      orderBy: { date: "asc" },
    }),
    db.timeBlock.findMany({
      where: { barbershopId: membership.barbershopId, date: { gte: date, lte: nextDay } },
      select: { id: true, professionalId: true, date: true, endTime: true, reason: true },
      orderBy: { date: "asc" },
    }),
    db.businessHour.findFirst({
      where: { barbershopId: membership.barbershopId, dayOfWeek },
      select: { openTime: true, closeTime: true, isOpen: true },
    }),
  ]);

  return {
    professionals: professionals.map((p) => ({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatarUrl,
    })),
    appointments: appointments.map((a) => ({
      id: a.id,
      date: a.date.toISOString(),
      endTime: a.endTime ? a.endTime.toISOString() : null,
      status: a.status,
      clientId: a.clientId,
      comandaId: a.comanda?.id ?? null,
      clientName: a.clientName,
      clientPhone: a.clientPhone,
      notes: a.notes,
      professionalId: a.professionalId,
      serviceId: a.serviceId,
      serviceName: a.service.name,
      serviceDurationMin: a.service.durationMin,
      servicePriceInCents: a.service.priceInCents,
      services: a.services.map((s) => ({
        id: s.id,
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        servicePriceInCents: s.servicePriceInCents,
        serviceDurationMin: s.serviceDurationMin,
      })),
    })),
    timeBlocks: timeBlockRows.map((b) => ({
      id: b.id,
      professionalId: b.professionalId,
      date: b.date.toISOString(),
      endTime: b.endTime.toISOString(),
      reason: b.reason,
    })),
    userRole: membership.role,
    userProfessionalId: membership.professionalId,
    businessHour: businessHourRow
      ? {
          openTime: businessHourRow.openTime,
          closeTime: businessHourRow.closeTime,
          isOpen: businessHourRow.isOpen,
        }
      : null,
  };
}

// ─── Buscar serviços ─────────────────────────────────────────────────────────

export async function getServicesForAgenda(): Promise<AgendaService[]> {
  const membership = await requireMembership();

  const services = await db.service.findMany({
    where: {
      barbershopId: membership.barbershopId,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  return services.map((s) => ({
    id: s.id,
    name: s.name,
    durationMin: s.durationMin,
    priceInCents: s.priceInCents,
  }));
}

// ─── Buscar profissionais e contexto do usuário ──────────────────────────────

export async function getProfessionalsForAgenda(): Promise<{
  professionals: AgendaProfessional[];
  userRole: string;
  userProfessionalId: string | null;
}> {
  const membership = await requireMembership();

  const professionals = await db.professional.findMany({
    where: { barbershopId: membership.barbershopId, isActive: true },
    orderBy: { name: "asc" },
  });

  return {
    professionals: professionals.map((p) => ({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatarUrl,
    })),
    userRole: membership.role,
    userProfessionalId: membership.professionalId,
  };
}

// ─── Mover entre barbeiros ───────────────────────────────────────────────────

export async function moveAppointment(
  appointmentId: string,
  newProfessionalId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const membership = await requireRole(["owner", "reception"]);
    const result = await moveAppointmentCore(
      { appointmentId, newProfessionalId },
      membership,
    );
    if (!result.success) return { success: false, error: result.error };
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agenda");
    return { success: true };
  } catch {
    return { success: false, error: "Sem permissão para mover agendamento." };
  }
}

// ─── Editar agendamento ──────────────────────────────────────────────────────

export async function updateAppointment(
  appointmentId: string,
  data: {
    serviceIds: string[];
    dateISO: string;
    clientName: string;
    clientPhone: string;
    notes?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const membership = await requireMembership();
    const result = await updateAppointmentCore(
      {
        appointmentId,
        serviceIds: data.serviceIds,
        dateISO: data.dateISO,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        notes: data.notes,
      },
      membership,
    );
    if (!result.success) return { success: false, error: result.error };
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agenda");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao editar agendamento." };
  }
}

// ─── Criar agendamento rápido ────────────────────────────────────────────────

export async function createQuickAppointment(data: {
  professionalId: string;
  serviceIds: string[];
  dateISO: string;
  clientName: string;
  clientPhone: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const membership = await requireMembership();

    if (
      membership.role === "barber" &&
      data.professionalId !== membership.professionalId
    ) {
      return { success: false, error: "Sem permissão para este profissional." };
    }

    const result = await createAppointmentCore({
      barbershopId: membership.barbershopId,
      professionalId: data.professionalId,
      serviceIds: data.serviceIds,
      dateISO: data.dateISO,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      notes: data.notes,
      status: "pending",
    });

    if (!result.success) return { success: false, error: result.error };
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agenda");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao criar agendamento." };
  }
}

// ─── Helpers de data (inline — agenda-actions é "use server", sem deps de UI) ──

function _formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function _isoToDateKeyBRT(isoStr: string): string {
  const utcMs = new Date(isoStr).getTime();
  const brtMs = utcMs - 3 * 60 * 60 * 1_000;
  const d = new Date(brtMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function _isoToTimeBRT(isoStr: string): string {
  const utcMs = new Date(isoStr).getTime();
  const brtMs = utcMs - 3 * 60 * 60 * 1_000;
  const d = new Date(brtMs);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

// ─── Tipos da visão semanal ───────────────────────────────────────────────────

export type AgendaWeekData = {
  professionals: AgendaProfessional[];
  /** dateKey → appointments for that day (todos os profissionais). */
  appointmentsByDay: Record<string, AgendaAppointment[]>;
  /** dateKey → time blocks for that day. */
  timeBlocksByDay: Record<string, AgendaTimeBlock[]>;
  userRole: string;
  userProfessionalId: string | null;
  /** dayOfWeek (0=Dom … 6=Sab) → BusinessHour, para grades de abertura por dia. */
  businessHours: Record<number, AgendaBusinessHour>;
  /** 7 dateKeys ordenados (segunda → domingo, formato ISO). */
  weekDates: string[];
};

// ─── Buscar dados da semana (1 query de appointments, sem N+1) ────────────────

export async function getAgendaWeek(weekStartDate: string): Promise<AgendaWeekData> {
  const membership = await requireMembership();

  // Build the 7 dateKeys starting from weekStartDate (expected to be a Monday).
  const weekDates: string[] = [];
  const pivot = new Date(`${weekStartDate}T12:00:00`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(pivot);
    d.setDate(pivot.getDate() + i);
    weekDates.push(_formatDateKey(d));
  }

  const rangeStart = new Date(`${weekDates[0]}T00:00:00-03:00`);
  const rangeEnd   = new Date(`${weekDates[6]}T23:59:59.999-03:00`);

  const [professionals, appointments, timeBlockRows, businessHourRows] = await Promise.all([
    db.professional.findMany({
      where: { barbershopId: membership.barbershopId, isActive: true },
      orderBy: { name: "asc" },
    }),
    db.appointment.findMany({
      where: {
        ...appointmentScope(membership),
        date: { gte: rangeStart, lte: rangeEnd },
        status: { notIn: ["cancelled"] },
      },
      include: {
        service: { select: { name: true, durationMin: true, priceInCents: true } },
        comanda: { select: { id: true } },
        services: {
          select: {
            id: true,
            serviceId: true,
            serviceName: true,
            servicePriceInCents: true,
            serviceDurationMin: true,
          },
        },
      },
      orderBy: { date: "asc" },
    }),
    db.timeBlock.findMany({
      where: { barbershopId: membership.barbershopId, date: { gte: rangeStart, lte: rangeEnd } },
      select: { id: true, professionalId: true, date: true, endTime: true, reason: true },
      orderBy: { date: "asc" },
    }),
    db.businessHour.findMany({
      where: { barbershopId: membership.barbershopId },
      select: { dayOfWeek: true, openTime: true, closeTime: true, isOpen: true },
    }),
  ]);

  // Group appointments by BRT dateKey.
  const appointmentsByDay: Record<string, AgendaAppointment[]> = {};
  for (const dk of weekDates) {
    appointmentsByDay[dk] = [];
  }
  for (const a of appointments) {
    const dk = _isoToDateKeyBRT(a.date.toISOString());
    if (appointmentsByDay[dk]) {
      appointmentsByDay[dk].push({
        id: a.id,
        date: a.date.toISOString(),
        endTime: a.endTime ? a.endTime.toISOString() : null,
        status: a.status,
        clientId: a.clientId,
        comandaId: a.comanda?.id ?? null,
        clientName: a.clientName,
        clientPhone: a.clientPhone,
        notes: a.notes,
        professionalId: a.professionalId,
        serviceId: a.serviceId,
        serviceName: a.service.name,
        serviceDurationMin: a.service.durationMin,
        servicePriceInCents: a.service.priceInCents,
        services: a.services.map((s) => ({
          id: s.id,
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          servicePriceInCents: s.servicePriceInCents,
          serviceDurationMin: s.serviceDurationMin,
        })),
      });
    }
  }

  const businessHours: Record<number, AgendaBusinessHour> = {};
  for (const row of businessHourRows) {
    businessHours[row.dayOfWeek] = {
      openTime: row.openTime,
      closeTime: row.closeTime,
      isOpen: row.isOpen,
    };
  }

  const timeBlocksByDay: Record<string, AgendaTimeBlock[]> = {};
  for (const dk of weekDates) {
    timeBlocksByDay[dk] = [];
  }
  for (const b of timeBlockRows) {
    const dk = _isoToDateKeyBRT(b.date.toISOString());
    if (timeBlocksByDay[dk]) {
      timeBlocksByDay[dk].push({
        id: b.id,
        professionalId: b.professionalId,
        date: b.date.toISOString(),
        endTime: b.endTime.toISOString(),
        reason: b.reason,
      });
    }
  }

  return {
    professionals: professionals.map((p) => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl })),
    appointmentsByDay,
    timeBlocksByDay,
    userRole: membership.role,
    userProfessionalId: membership.professionalId,
    businessHours,
    weekDates,
  };
}

// ─── Resumo mensal (agendamentos por dia com detalhes para o MonthView) ──────

export type AgendaMonthSummaryItem = {
  id: string;
  time: string;        // "HH:MM" BRT
  clientName: string;
};

export type AgendaMonthSummary = {
  /** dateKey (YYYY-MM-DD BRT) → count + up to 5 appointments sorted by time. */
  daysSummary: Record<string, { count: number; appointments: AgendaMonthSummaryItem[] }>;
};

export async function getAgendaMonthSummary(
  monthStartDate: string, // "YYYY-MM-01"
): Promise<AgendaMonthSummary> {
  const membership = await requireMembership();

  const [y, mo] = monthStartDate.split("-").map(Number); // mo is 1-indexed

  const rangeStart = new Date(`${monthStartDate}T00:00:00-03:00`);

  // Last day of the month: day 0 of the NEXT month (UTC-safe arithmetic).
  const lastDayDate = new Date(Date.UTC(y, mo, 0));
  const lastDayStr = `${y}-${String(mo).padStart(2, "0")}-${String(lastDayDate.getUTCDate()).padStart(2, "0")}`;
  const rangeEnd = new Date(`${lastDayStr}T23:59:59.999-03:00`);

  const rows = await db.appointment.findMany({
    where: {
      ...appointmentScope(membership),
      date: { gte: rangeStart, lte: rangeEnd },
      status: { notIn: ["cancelled", "no_show"] },
    },
    select: { id: true, date: true, clientName: true },
    orderBy: { date: "asc" },
  });

  const daysSummary: Record<string, { count: number; appointments: AgendaMonthSummaryItem[] }> = {};
  for (const row of rows) {
    const dk = _isoToDateKeyBRT(row.date.toISOString());
    if (!daysSummary[dk]) {
      daysSummary[dk] = { count: 0, appointments: [] };
    }
    daysSummary[dk].count++;
    if (daysSummary[dk].appointments.length < 5) {
      daysSummary[dk].appointments.push({
        id: row.id,
        time: _isoToTimeBRT(row.date.toISOString()),
        clientName: row.clientName,
      });
    }
  }

  return { daysSummary };
}

// ─── Reagendar via drag-and-drop (muda data + profissional em uma operação) ───

export async function rescheduleAppointment(
  appointmentId: string,
  /** UTC ISO string for the new start time. */
  newDateISO: string,
  newProfessionalId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const membership = await requireMembership();

    const existing = await db.appointment.findFirst({
      where: { id: appointmentId, barbershopId: membership.barbershopId },
      select: { professionalId: true, date: true, endTime: true, status: true },
    });

    if (!existing) return { success: false, error: "Agendamento não encontrado." };

    // RBAC: barber can only reschedule own appointments.
    if (
      membership.role === "barber" &&
      existing.professionalId !== membership.professionalId
    ) {
      return { success: false, error: "Sem permissão para este agendamento." };
    }

    if (
      existing.status === "completed" ||
      existing.status === "cancelled" ||
      existing.status === "no_show"
    ) {
      return {
        success: false,
        error: "Apenas agendamentos pendentes ou confirmados podem ser reagendados.",
      };
    }

    const startDate = new Date(newDateISO);
    // Preserve original duration; fall back to 30 min if endTime is missing.
    const durationMs = existing.endTime
      ? existing.endTime.getTime() - existing.date.getTime()
      : 30 * 60_000;
    const endDate = new Date(startDate.getTime() + durationMs);

    await db.$transaction(async (tx) => {
      // Advisory lock on the destination professional — same pattern as createAppointmentCore.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${newProfessionalId}))`;

      const [apptConflict, blockConflict] = await Promise.all([
        tx.appointment.findFirst({
          where: {
            professionalId: newProfessionalId,
            status: { notIn: ["cancelled", "no_show"] as AppointmentStatus[] },
            date: { lt: endDate },
            endTime: { gt: startDate },
            NOT: { id: appointmentId },
          },
          select: { id: true },
        }),
        tx.timeBlock.findFirst({
          where: {
            professionalId: newProfessionalId,
            date: { lt: endDate },
            endTime: { gt: startDate },
          },
          select: { id: true },
        }),
      ]);

      if (apptConflict || blockConflict) {
        throw Object.assign(new Error("conflict"), { isConflict: true });
      }

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { date: startDate, endTime: endDate, professionalId: newProfessionalId },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agenda");
    return { success: true };
  } catch (err) {
    if (err && typeof err === "object" && "isConflict" in err) {
      return { success: false, error: "Horário em conflito com outro agendamento." };
    }
    return { success: false, error: "Erro ao reagendar agendamento." };
  }
}

// ─── TimeBlock types ─────────────────────────────────────────────────────────

export type AgendaTimeBlock = {
  id: string;
  professionalId: string;
  date: string;
  endTime: string;
  reason: string | null;
};

// ─── createTimeBlock ──────────────────────────────────────────────────────────

export async function createTimeBlock(
  professionalId: string,
  dateISO: string,
  durationMin: number,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const membership = await requireMembership();

    if (
      membership.role === "barber" &&
      professionalId !== membership.professionalId
    ) {
      return { success: false, error: "Sem permissão para bloquear este profissional." };
    }

    const professional = await db.professional.findFirst({
      where: { id: professionalId, barbershopId: membership.barbershopId },
      select: { id: true },
    });
    if (!professional) return { success: false, error: "Profissional não encontrado." };

    const startDate = new Date(dateISO);
    const endDate = new Date(startDate.getTime() + durationMin * 60_000);

    // Check conflict with existing appointments
    const apptConflict = await db.appointment.findFirst({
      where: {
        professionalId,
        status: { notIn: ["cancelled", "no_show"] },
        date: { lt: endDate },
        endTime: { gt: startDate },
      },
      select: { id: true },
    });
    if (apptConflict) {
      return { success: false, error: "Horário em conflito com um agendamento existente." };
    }

    await db.timeBlock.create({
      data: {
        professionalId,
        barbershopId: membership.barbershopId,
        date: startDate,
        endTime: endDate,
        reason: reason?.trim() || null,
      },
    });

    revalidatePath("/dashboard/agenda");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao criar bloqueio de horário." };
  }
}

// ─── deleteTimeBlock ──────────────────────────────────────────────────────────

export async function deleteTimeBlock(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const membership = await requireMembership();

    const block = await db.timeBlock.findFirst({
      where: { id, barbershopId: membership.barbershopId },
      select: { professionalId: true },
    });
    if (!block) return { success: false, error: "Bloqueio não encontrado." };

    if (
      membership.role === "barber" &&
      block.professionalId !== membership.professionalId
    ) {
      return { success: false, error: "Sem permissão para remover este bloqueio." };
    }

    await db.timeBlock.delete({ where: { id } });
    revalidatePath("/dashboard/agenda");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao remover bloqueio." };
  }
}

// ─── Excluir agendamento (hard delete) ───────────────────────────────────────

export async function deleteAppointment(
  appointmentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const membership = await requireMembership();

    const appointment = await db.appointment.findFirst({
      where: { id: appointmentId, barbershopId: membership.barbershopId },
      include: { comanda: { select: { id: true } } },
    });

    if (!appointment) return { success: false, error: "Agendamento não encontrado." };

    if (membership.role === "barber" && appointment.professionalId !== membership.professionalId) {
      return { success: false, error: "Sem permissão para excluir este agendamento." };
    }

    if (appointment.comanda !== null) {
      return {
        success: false,
        error: "Não é possível excluir um agendamento com comanda vinculada. Cancele em vez disso.",
      };
    }

    // AppointmentService cascade-deletes via onDelete: Cascade (schema.prisma)
    await db.appointment.delete({ where: { id: appointmentId } });

    revalidatePath("/dashboard/agenda");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao excluir agendamento." };
  }
}

// ─── Busca de clientes para autocomplete ─────────────────────────────────────

export type AgendaClientResult = {
  id: string;
  name: string;
  phone: string;
};

export async function searchClientsForAgenda(
  search: string,
): Promise<AgendaClientResult[]> {
  if (!search || search.trim().length < 2) return [];
  const membership = await requireMembership();
  const scope = clientScope(membership);
  return db.client.findMany({
    where: {
      ...scope,
      OR: [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { phone: { contains: search.trim() } },
      ],
    },
    select: { id: true, name: true, phone: true },
    take: 8,
    orderBy: { name: "asc" },
  });
}
