// ============================================================
// LIVO — Server Actions: Agendamento
// getAvailableSlots: retorna horários disponíveis para uma data
// createAppointment: cria o agendamento + envia e-mail
// ============================================================

"use server";

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
      endMinutes: appt.endTime.getHours() * 60 + appt.endTime.getMinutes(),
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

    const service = await db.service.findUnique({
      where: { id: data.serviceId },
    });
    if (!service) return { error: "Serviço não encontrado." };

    // Busca o profissional para o e-mail
    const professional = await db.professional.findUnique({
      where: { id: data.professionalId },
    });

    // Busca a barbearia para o e-mail
    const barbershop = await db.barbershop.findUnique({
      where: { id: data.barbershopId },
    });

    // Monta data e hora do agendamento
    const [year, month, day] = data.date.split("-").map(Number);
    const [hour, minute] = data.time.split(":").map(Number);
    const appointmentDate = new Date(year, month - 1, day, hour, minute, 0);
    const endTime = new Date(
      appointmentDate.getTime() + service.durationMin * 60 * 1000,
    );

    // ── Cria o agendamento no banco ───────────────────────────
    const appointment = await db.appointment.create({
      data: {
        date: appointmentDate,
        endTime,
        status: "confirmed",
        clientName: data.clientName.trim(),
        clientPhone: data.clientPhone.trim(),
        clientEmail: data.clientEmail?.trim() || null,
        barbershopId: data.barbershopId,
        professionalId: data.professionalId,
        serviceId: data.serviceId,
      },
    });

    // ── Atualiza CRM: cria ou atualiza cliente ────────────────
    const existingClient = await db.client.findFirst({
      where: {
        phone: data.clientPhone.trim(),
        barbershopId: data.barbershopId,
      },
    });

    if (existingClient) {
      await db.client.update({
        where: { id: existingClient.id },
        data: {
          totalVisits: { increment: 1 },
          lastVisitAt: appointmentDate,
          ...(data.clientEmail && !existingClient.email
            ? { email: data.clientEmail.trim() }
            : {}),
        },
      });
    } else {
      await db.client.create({
        data: {
          name: data.clientName.trim(),
          phone: data.clientPhone.trim(),
          email: data.clientEmail?.trim() || null,
          barbershopId: data.barbershopId,
          totalVisits: 1,
          lastVisitAt: appointmentDate,
        },
      });
    }

    // ── Envia e-mail de confirmação (não bloqueia o fluxo) ────
    // Só envia se o cliente forneceu e-mail
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

    return { success: true, appointmentId: appointment.id };
  } catch (err) {
    console.error("[createAppointment]", err);
    return { error: "Erro ao criar agendamento. Tente novamente." };
  }
}
