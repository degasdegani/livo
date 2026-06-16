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

export type AgendaDayData = {
  professionals: AgendaProfessional[];
  appointments: AgendaAppointment[];
  userRole: string;
  userProfessionalId: string | null;
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

  const professionals = await db.professional.findMany({
    where: {
      barbershopId: membership.barbershopId,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  const scope = appointmentScope(membership);

  const appointments = await db.appointment.findMany({
    where: {
      ...scope,
      date: {
        gte: date,
        lte: nextDay,
      },
      status: {
        notIn: ["cancelled"],
      },
    },
    include: {
      service: {
        select: {
          name: true,
          durationMin: true,
          priceInCents: true,
        },
      },
      comanda: {
        select: { id: true },
      },
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
  });

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
