// ============================================================
// LIVO — Server Actions: Agendamento Público
// getAvailableSlots: retorna horários disponíveis para uma data
// createAppointment: cria o agendamento + envia e-mail
// ============================================================

"use server";

import { createAppointmentCore } from "@/lib/appointment-core";
import { generateAvailableSlots } from "@/lib/availability";
import { db } from "@/lib/db";
import { sendAppointmentConfirmation } from "@/lib/email";

// ── Buscar slots disponíveis ──────────────────────────────────
interface GetSlotsParams {
  barbershopId: string;
  professionalId: string;
  serviceId: string;
  date: string; // "YYYY-MM-DD"
}

export async function getAvailableSlots({
  barbershopId,
  professionalId,
  serviceId,
  date,
}: GetSlotsParams): Promise<string[]> {
  try {
    const service = await db.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) return [];

    // IMPORTANTE: usa T12:00:00 para evitar problemas de fuso horário
    const dateObj = new Date(`${date}T12:00:00`);
    const dayOfWeek = dateObj.getDay();

    const businessHour = await db.businessHour.findFirst({
      where: { barbershopId, dayOfWeek },
    });

    if (!businessHour || !businessHour.isOpen) return [];

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const existingAppointments = await db.appointment.findMany({
      where: {
        professionalId,
        status: { notIn: ["cancelled", "no_show"] },
        date: { gte: dayStart, lte: dayEnd },
      },
    });

    const appointmentsForCalculation = existingAppointments.map((appt) => ({
      startMinutes: appt.date.getHours() * 60 + appt.date.getMinutes(),
      endMinutes: appt.endTime
        ? appt.endTime.getHours() * 60 + appt.endTime.getMinutes()
        : 0,
    }));

    const today = new Date();
    const isToday = dateObj.toDateString() === today.toDateString();
    const currentMinutes = today.getHours() * 60 + today.getMinutes();

    return generateAvailableSlots({
      openTime: businessHour.openTime,
      closeTime: businessHour.closeTime,
      serviceDuration: service.durationMin,
      appointments: appointmentsForCalculation,
      isToday,
      currentMinutes,
    });
  } catch (err) {
    console.error("[getAvailableSlots]", err);
    return [];
  }
}

// ── Criar agendamento ─────────────────────────────────────────
interface CreateAppointmentParams {
  barbershopId: string;
  professionalId: string;
  serviceId: string;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
}

interface AppointmentResult {
  success?: boolean;
  error?: string;
  appointmentId?: string;
}

export async function createAppointment(
  data: CreateAppointmentParams,
): Promise<AppointmentResult> {
  try {
    if (!data.clientName?.trim()) return { error: "Informe seu nome." };
    if (!data.clientPhone?.trim()) return { error: "Informe seu telefone." };
    if (!data.date || !data.time) return { error: "Selecione data e horário." };

    // Busca dados para o e-mail em paralelo
    const [service, professional, barbershop] = await Promise.all([
      db.service.findUnique({ where: { id: data.serviceId } }),
      db.professional.findUnique({ where: { id: data.professionalId } }),
      db.barbershop.findUnique({ where: { id: data.barbershopId } }),
    ]);
    if (!service) return { error: "Serviço não encontrado." };

    // -03:00 = UTC-3 (Brasília, sem DST desde 2019)
    const dateISO = new Date(
      `${data.date}T${data.time}:00-03:00`,
    ).toISOString();

    const result = await createAppointmentCore({
      barbershopId: data.barbershopId,
      professionalId: data.professionalId,
      serviceId: data.serviceId,
      dateISO,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      clientEmail: data.clientEmail || null,
      status: "confirmed",
    });

    if (!result.success) return { error: result.error };

    if (data.clientEmail && barbershop && professional) {
      await sendAppointmentConfirmation({
        clientEmail: data.clientEmail,
        clientName: data.clientName.trim(),
        barbershopName: barbershop.name,
        barbershopSlug: barbershop.slug,
        serviceName: service.name,
        servicePrice: service.priceInCents,
        date: data.date,
        time: data.time,
        professional: professional.name,
      });
    }

    return { success: true, appointmentId: result.appointmentId };
  } catch (err) {
    console.error("[createAppointment]", err);
    return { error: "Erro ao criar agendamento. Tente novamente." };
  }
}
