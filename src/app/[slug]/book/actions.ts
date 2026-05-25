// ============================================================
// LIVO — Server Actions: Agendamento
// getAvailableSlots: retorna horários disponíveis para uma data
// createAppointment: cria o agendamento no banco
// ============================================================

"use server";

import { generateAvailableSlots } from "@/lib/availability";
import { db } from "@/lib/db";

// ── Buscar slots disponíveis ──────────────────────────────────
// Chamada pelo cliente ao selecionar uma data
// Retorna array de strings como ["09:00", "09:30", "10:30"]

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
    // Busca o serviço para obter a duração
    const service = await db.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) return [];

    // Identifica o dia da semana da data selecionada
    // IMPORTANTE: usa "T12:00:00" para evitar problemas de fuso horário
    // (new Date("2026-05-25") pode retornar dia 24 dependendo do fuso)
    const dateObj = new Date(`${date}T12:00:00`);
    const dayOfWeek = dateObj.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb

    // Busca o horário de funcionamento para esse dia
    const businessHour = await db.businessHour.findFirst({
      where: { barbershopId, dayOfWeek },
    });

    // Se não funciona nesse dia, retorna vazio
    if (!businessHour || !businessHour.isOpen) return [];

    // Busca agendamentos existentes para esse profissional nessa data
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const existingAppointments = await db.appointment.findMany({
      where: {
        professionalId,
        status: { notIn: ["cancelled", "no_show"] },
        date: { gte: dayStart, lte: dayEnd },
      },
    });

    // Converte agendamentos para o formato de minutos desde meia-noite
    const appointmentsForCalculation = existingAppointments.map((appt) => ({
      startMinutes: appt.date.getHours() * 60 + appt.date.getMinutes(),
      endMinutes: appt.endTime.getHours() * 60 + appt.endTime.getMinutes(),
    }));

    // Verifica se a data selecionada é hoje
    const today = new Date();
    const isToday = dateObj.toDateString() === today.toDateString();
    const currentMinutes = today.getHours() * 60 + today.getMinutes();

    // Calcula os slots disponíveis
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
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
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
    // Valida campos obrigatórios
    if (!data.clientName?.trim()) return { error: "Informe seu nome." };
    if (!data.clientPhone?.trim()) return { error: "Informe seu telefone." };
    if (!data.date || !data.time) return { error: "Selecione data e horário." };

    // Busca o serviço para obter a duração
    const service = await db.service.findUnique({
      where: { id: data.serviceId },
    });
    if (!service) return { error: "Serviço não encontrado." };

    // Monta a data e hora do agendamento
    // "2026-05-25" + "10:30" → Date object
    const [year, month, day] = data.date.split("-").map(Number);
    const [hour, minute] = data.time.split(":").map(Number);
    const appointmentDate = new Date(year, month - 1, day, hour, minute, 0);
    const endTime = new Date(
      appointmentDate.getTime() + service.durationMin * 60 * 1000,
    );

    // Cria o agendamento no banco
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

    // Atualiza ou cria o cliente no CRM da barbearia
    // Identifica pelo telefone (único por barbearia)
    const existingClient = await db.client.findFirst({
      where: {
        phone: data.clientPhone.trim(),
        barbershopId: data.barbershopId,
      },
    });

    if (existingClient) {
      // Cliente já existe → atualiza contadores
      await db.client.update({
        where: { id: existingClient.id },
        data: {
          totalVisits: { increment: 1 },
          lastVisitAt: appointmentDate,
          // Atualiza email se veio preenchido e o cliente não tinha
          ...(data.clientEmail && !existingClient.email
            ? { email: data.clientEmail.trim() }
            : {}),
        },
      });
    } else {
      // Cliente novo → cria no CRM
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

    return { success: true, appointmentId: appointment.id };
  } catch (err) {
    console.error("[createAppointment]", err);
    return { error: "Erro ao criar agendamento. Tente novamente." };
  }
}
