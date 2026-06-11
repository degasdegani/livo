// src/lib/appointment-core.ts
// Única fonte de verdade para criação, edição e atualização de status de Appointments.
// Todos os writers (book, AgendaBoard) devem usar estas funções.
// Nenhum outro arquivo deve conter lógica de criação direta de Appointment.

import { type AppointmentStatus, ComandaStatus } from "@prisma/client";
import { db } from "@/lib/db";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface CreateAppointmentInput {
  barbershopId: string;
  professionalId: string;
  serviceId: string;
  /** UTC ISO string gerado pelo caller — ex: new Date(`${date}T${time}:00-03:00`).toISOString() */
  dateISO: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  notes?: string | null;
  status?: "pending" | "confirmed";
}

export interface UpdateAppointmentInput {
  appointmentId: string;
  serviceId: string;
  /** UTC ISO string */
  dateISO: string;
  clientName: string;
  clientPhone: string;
  notes?: string | null;
}

export interface AppointmentAuthContext {
  role: string;
  professionalId: string | null;
  barbershopId: string;
}

export interface AppointmentCoreResult {
  success: boolean;
  appointmentId?: string;
  error?: string;
}

// ─── Validação de conflito ────────────────────────────────────────────────────

async function checkConflict(
  professionalId: string,
  startDate: Date,
  endDate: Date,
  excludeId?: string,
): Promise<boolean> {
  const where = {
    professionalId,
    status: { notIn: ["cancelled", "no_show"] as AppointmentStatus[] },
    date: { lt: endDate },
    endTime: { gt: startDate },
    ...(excludeId ? { NOT: { id: excludeId } } : {}),
  };

  const conflict = await db.appointment.findFirst({
    where,
    select: { id: true },
  });
  return conflict !== null;
}

// ─── createAppointmentCore ────────────────────────────────────────────────────

export async function createAppointmentCore(
  input: CreateAppointmentInput,
): Promise<AppointmentCoreResult> {
  const service = await db.service.findFirst({
    where: {
      id: input.serviceId,
      barbershopId: input.barbershopId,
      isActive: true,
    },
    select: { durationMin: true },
  });
  if (!service) return { success: false, error: "Serviço não encontrado." };

  const startDate = new Date(input.dateISO);
  const endDate = new Date(startDate.getTime() + service.durationMin * 60_000);

  if (await checkConflict(input.professionalId, startDate, endDate)) {
    return {
      success: false,
      error: "Horário em conflito com outro agendamento.",
    };
  }

  const normalizedPhone = input.clientPhone.replace(/\D/g, "");

  const appointment = await db.$transaction(async (tx) => {
    let clientId: string | null = null;

    if (normalizedPhone) {
      const existing = await tx.client.findFirst({
        where: { phone: normalizedPhone, barbershopId: input.barbershopId },
        select: { id: true, email: true },
      });

      if (existing) {
        // CRM stats (totalVisits/lastVisitAt) são atualizados em fecharComanda, não aqui
        if (input.clientEmail?.trim() && !existing.email) {
          await tx.client.update({
            where: { id: existing.id },
            data: { email: input.clientEmail.trim() },
          });
        }
        clientId = existing.id;
      } else {
        const created = await tx.client.create({
          data: {
            name: input.clientName.trim(),
            phone: normalizedPhone,
            email: input.clientEmail?.trim() || null,
            barbershopId: input.barbershopId,
            totalVisits: 0,
            lastVisitAt: null,
          },
        });
        clientId = created.id;
      }
    }

    return tx.appointment.create({
      data: {
        date: startDate,
        endTime: endDate,
        status: input.status ?? "pending",
        clientName: input.clientName.trim(),
        clientPhone: normalizedPhone || input.clientPhone.trim(),
        clientEmail: input.clientEmail?.trim() || null,
        notes: input.notes?.trim() || null,
        barbershopId: input.barbershopId,
        professionalId: input.professionalId,
        serviceId: input.serviceId,
        clientId,
      },
    });
  });

  return { success: true, appointmentId: appointment.id };
}

// ─── updateAppointmentCore ────────────────────────────────────────────────────

export async function updateAppointmentCore(
  input: UpdateAppointmentInput,
  auth: AppointmentAuthContext,
): Promise<AppointmentCoreResult> {
  const existing = await db.appointment.findFirst({
    where: { id: input.appointmentId, barbershopId: auth.barbershopId },
    select: { status: true, professionalId: true },
  });
  if (!existing)
    return { success: false, error: "Agendamento não encontrado." };

  if (
    auth.role === "barber" &&
    existing.professionalId !== auth.professionalId
  ) {
    return { success: false, error: "Sem permissão para este agendamento." };
  }

  if (existing.status !== "pending" && existing.status !== "confirmed") {
    return {
      success: false,
      error: "Apenas agendamentos pendentes ou confirmados podem ser editados.",
    };
  }

  const service = await db.service.findFirst({
    where: {
      id: input.serviceId,
      barbershopId: auth.barbershopId,
      isActive: true,
    },
    select: { durationMin: true },
  });
  if (!service) return { success: false, error: "Serviço não encontrado." };

  const startDate = new Date(input.dateISO);
  const endDate = new Date(startDate.getTime() + service.durationMin * 60_000);

  if (
    await checkConflict(
      existing.professionalId,
      startDate,
      endDate,
      input.appointmentId,
    )
  ) {
    return {
      success: false,
      error: "Horário em conflito com outro agendamento.",
    };
  }

  await db.appointment.update({
    where: { id: input.appointmentId },
    data: {
      serviceId: input.serviceId,
      date: startDate,
      endTime: endDate,
      clientName: input.clientName.trim(),
      clientPhone: input.clientPhone.trim(),
      notes: input.notes?.trim() || null,
    },
  });

  return { success: true };
}

// ─── updateAppointmentStatusCore ─────────────────────────────────────────────

export async function updateAppointmentStatusCore(
  appointmentId: string,
  status: AppointmentStatus,
  auth: AppointmentAuthContext,
): Promise<AppointmentCoreResult> {
  const appointment = await db.appointment.findFirst({
    where: { id: appointmentId, barbershopId: auth.barbershopId },
    select: { professionalId: true, clientId: true, status: true },
  });
  if (!appointment) {
    return { success: false, error: "Agendamento não encontrado." };
  }

  if (
    auth.role === "barber" &&
    appointment.professionalId !== auth.professionalId
  ) {
    return { success: false, error: "Sem permissão para este agendamento." };
  }

  const shouldUpdateCRM =
    appointment.status !== "completed" && status === "completed";

  await db.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: appointmentId },
      data: { status },
    });

    // Sync: appointment cancelado → cancela comanda aberta vinculada (idempotente)
    if (status === "cancelled") {
      await tx.comanda.updateMany({
        where: {
          appointmentId,
          status: ComandaStatus.open,
        },
        data: { status: ComandaStatus.cancelled },
      });
    }

    if (shouldUpdateCRM && appointment.clientId) {
      const linkedComanda = await tx.comanda.findFirst({
        where: {
          appointmentId,
          status: { in: [ComandaStatus.open, ComandaStatus.closed] },
        },
        select: { id: true },
      });
      if (!linkedComanda) {
        await tx.client.update({
          where: { id: appointment.clientId },
          data: {
            totalVisits: { increment: 1 },
            lastVisitAt: new Date(),
          },
        });
      }
    }
  });

  return { success: true };
}

// ─── moveAppointmentCore ──────────────────────────────────────────────────────

export interface MoveAppointmentInput {
  appointmentId: string;
  newProfessionalId: string;
}

export async function moveAppointmentCore(
  input: MoveAppointmentInput,
  auth: AppointmentAuthContext,
): Promise<AppointmentCoreResult> {
  const appointment = await db.appointment.findFirst({
    where: { id: input.appointmentId, barbershopId: auth.barbershopId },
    select: { professionalId: true, date: true, endTime: true, status: true },
  });

  if (!appointment) {
    return { success: false, error: "Agendamento não encontrado." };
  }

  if (
    appointment.status === "completed" ||
    appointment.status === "cancelled" ||
    appointment.status === "no_show"
  ) {
    return {
      success: false,
      error: "Apenas agendamentos pendentes ou confirmados podem ser movidos.",
    };
  }

  if (input.newProfessionalId === appointment.professionalId) {
    return { success: true };
  }

  const professional = await db.professional.findFirst({
    where: {
      id: input.newProfessionalId,
      barbershopId: auth.barbershopId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!professional) {
    return { success: false, error: "Profissional não encontrado." };
  }

  if (appointment.endTime !== null) {
    if (
      await checkConflict(
        input.newProfessionalId,
        appointment.date,
        appointment.endTime,
        input.appointmentId,
      )
    ) {
      return {
        success: false,
        error: "Horário em conflito com outro agendamento deste profissional.",
      };
    }
  }

  await db.appointment.update({
    where: { id: input.appointmentId },
    data: { professionalId: input.newProfessionalId },
  });

  return { success: true };
}
