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

  const [professionals, appointments, businessHourRow] = await Promise.all([
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

// ─── Tipos da visão semanal ───────────────────────────────────────────────────

export type AgendaWeekData = {
  professionals: AgendaProfessional[];
  /** dateKey → appointments for that day (todos os profissionais). */
  appointmentsByDay: Record<string, AgendaAppointment[]>;
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

  const [professionals, appointments, businessHourRows] = await Promise.all([
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

  return {
    professionals: professionals.map((p) => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl })),
    appointmentsByDay,
    userRole: membership.role,
    userProfessionalId: membership.professionalId,
    businessHours,
    weekDates,
  };
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
