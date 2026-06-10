"use server";

import type { AppointmentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  appointmentScope,
  requireMembership,
  requireRole,
} from "@/lib/permissions";

// ─── Tipos exportados ────────────────────────────────────────────────────────

export type AgendaProfessional = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type AgendaAppointment = {
  id: string;
  date: string;
  endTime: string | null;
  status: AppointmentStatus;
  clientName: string;
  clientPhone: string | null;
  notes: string | null;
  professionalId: string;
  serviceId: string;
  serviceName: string;
  serviceDurationMin: number;
  servicePriceInCents: number;
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

  const date = new Date(dateStr + "T00:00:00.000Z");
  const nextDay = new Date(dateStr + "T23:59:59.999Z");

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
      clientName: a.clientName,
      clientPhone: a.clientPhone,
      notes: a.notes,
      professionalId: a.professionalId,
      serviceId: a.serviceId,
      serviceName: a.service.name,
      serviceDurationMin: a.service.durationMin,
      servicePriceInCents: a.service.priceInCents,
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

// ─── Atualizar status ────────────────────────────────────────────────────────

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
): Promise<{ success: boolean; error?: string }> {
  try {
    const membership = await requireMembership();

    const appointment = await db.appointment.findFirst({
      where: {
        id: appointmentId,
        barbershopId: membership.barbershopId,
      },
    });

    if (!appointment) {
      return { success: false, error: "Agendamento não encontrado." };
    }

    if (
      membership.role === "barber" &&
      appointment.professionalId !== membership.professionalId
    ) {
      return { success: false, error: "Sem permissão para este agendamento." };
    }

    await db.appointment.update({
      where: { id: appointmentId },
      data: { status },
    });

    revalidatePath("/dashboard/agenda");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao atualizar agendamento." };
  }
}

// ─── Mover entre barbeiros ───────────────────────────────────────────────────

export async function moveAppointment(
  appointmentId: string,
  newProfessionalId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const membership = await requireRole(["owner", "reception"]);

    const appointment = await db.appointment.findFirst({
      where: {
        id: appointmentId,
        barbershopId: membership.barbershopId,
      },
    });

    if (!appointment) {
      return { success: false, error: "Agendamento não encontrado." };
    }

    const professional = await db.professional.findFirst({
      where: {
        id: newProfessionalId,
        barbershopId: membership.barbershopId,
        isActive: true,
      },
    });

    if (!professional) {
      return { success: false, error: "Profissional não encontrado." };
    }

    await db.appointment.update({
      where: { id: appointmentId },
      data: { professionalId: newProfessionalId },
    });

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
    serviceId: string;
    dateISO: string;
    clientName: string;
    clientPhone: string;
    notes?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const membership = await requireMembership();

    const appointment = await db.appointment.findFirst({
      where: { id: appointmentId, barbershopId: membership.barbershopId },
    });

    if (!appointment) {
      return { success: false, error: "Agendamento não encontrado." };
    }

    if (
      membership.role === "barber" &&
      appointment.professionalId !== membership.professionalId
    ) {
      return { success: false, error: "Sem permissão para este agendamento." };
    }

    if (
      appointment.status !== "pending" &&
      appointment.status !== "confirmed"
    ) {
      return {
        success: false,
        error:
          "Apenas agendamentos pendentes ou confirmados podem ser editados.",
      };
    }

    const service = await db.service.findFirst({
      where: {
        id: data.serviceId,
        barbershopId: membership.barbershopId,
        isActive: true,
      },
    });

    if (!service) {
      return { success: false, error: "Serviço não encontrado." };
    }

    const startDate = new Date(data.dateISO);
    const endDate = new Date(
      startDate.getTime() + service.durationMin * 60_000,
    );

    await db.appointment.update({
      where: { id: appointmentId },
      data: {
        serviceId: data.serviceId,
        date: startDate,
        endTime: endDate,
        clientName: data.clientName.trim(),
        clientPhone: data.clientPhone.trim(),
        notes: data.notes?.trim() || null,
      },
    });

    revalidatePath("/dashboard/agenda");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao editar agendamento." };
  }
}

// ─── Criar agendamento rápido ────────────────────────────────────────────────

export async function createQuickAppointment(data: {
  professionalId: string;
  serviceId: string;
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

    const service = await db.service.findFirst({
      where: {
        id: data.serviceId,
        barbershopId: membership.barbershopId,
        isActive: true,
      },
    });

    if (!service) {
      return { success: false, error: "Serviço não encontrado." };
    }

    const startDate = new Date(data.dateISO);
    const endDate = new Date(startDate.getTime() + service.durationMin * 60000);

    await db.appointment.create({
      data: {
        date: startDate,
        endTime: endDate,
        status: "pending",
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientEmail: "",
        notes: data.notes ?? null,
        barbershopId: membership.barbershopId,
        professionalId: data.professionalId,
        serviceId: data.serviceId,
      },
    });

    revalidatePath("/dashboard/agenda");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao criar agendamento." };
  }
}
