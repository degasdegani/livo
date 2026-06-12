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
import { log } from "@/lib/logger";

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
    const service = await db.service.findFirst({
      where: { id: serviceId, barbershopId },
    });
    if (!service) return [];

    // Ancora em Brasília (UTC-3, sem DST desde 2019) para dayOfWeek correto
    const dateObj = new Date(`${date}T12:00:00-03:00`);
    const dayOfWeek = dateObj.getDay();

    const businessHour = await db.businessHour.findFirst({
      where: { barbershopId, dayOfWeek },
    });

    if (!businessHour || !businessHour.isOpen) return [];

    const dayStart = new Date(`${date}T00:00:00-03:00`);
    const dayEnd = new Date(`${date}T23:59:59-03:00`);

    const existingAppointments = await db.appointment.findMany({
      where: {
        barbershopId,
        professionalId,
        status: { notIn: ["cancelled", "no_show"] },
        date: { gte: dayStart, lte: dayEnd },
      },
    });

    const appointmentsForCalculation = existingAppointments.map((appt) => ({
      // Datas são armazenadas em UTC; converte para Brasília (UTC-3) via getUTC*
      startMinutes: appt.date.getUTCHours() * 60 + appt.date.getUTCMinutes() - 180,
      endMinutes: appt.endTime
        ? appt.endTime.getUTCHours() * 60 + appt.endTime.getUTCMinutes() - 180
        : 0,
    }));

    // Hora atual em Brasília — independente do timezone do servidor
    const BRAZIL_OFFSET_MS = -3 * 60 * 60 * 1000;
    const nowBrasilia = new Date(Date.now() + BRAZIL_OFFSET_MS);
    const todayBrasiliaStr = nowBrasilia.toISOString().slice(0, 10);
    const isToday = date === todayBrasiliaStr;
    const currentMinutes = nowBrasilia.getUTCHours() * 60 + nowBrasilia.getUTCMinutes();

    return generateAvailableSlots({
      openTime: businessHour.openTime,
      closeTime: businessHour.closeTime,
      serviceDuration: service.durationMin,
      appointments: appointmentsForCalculation,
      isToday,
      currentMinutes,
    });
  } catch (err) {
    log.agenda.error("falha ao buscar slots disponíveis", { barbershopId, professionalId, date }, err);
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

    // Busca dados para o e-mail em paralelo — todas as leituras tenant-scoped
    const [service, professional, barbershop] = await Promise.all([
      db.service.findFirst({
        where: { id: data.serviceId, barbershopId: data.barbershopId },
      }),
      db.professional.findFirst({
        where: { id: data.professionalId, barbershopId: data.barbershopId },
      }),
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

    log.agenda.info("agendamento público criado", {
      barbershopId: data.barbershopId,
      professionalId: data.professionalId,
      appointmentId: result.appointmentId,
    });

    return { success: true, appointmentId: result.appointmentId };
  } catch (err) {
    log.agenda.error("falha ao criar agendamento público", {
      barbershopId: data.barbershopId,
      professionalId: data.professionalId,
      date: data.date,
    }, err);
    return { error: "Erro ao criar agendamento. Tente novamente." };
  }
}
