// ============================================================
// LIVO — Server Actions: Agendamento Público
// getAvailableSlots: retorna todos os slots do expediente com status
// createAppointment: cria o agendamento + envia e-mail
// ============================================================

"use server";

import { headers } from "next/headers";
import { createAppointmentCore } from "@/lib/appointment-core";
import { generateAvailableSlots, type SlotInfo } from "@/lib/availability";
import { db } from "@/lib/db";
import { sendAppointmentConfirmation } from "@/lib/email";
import { log } from "@/lib/logger";

// ── Rate limit: agendamento público ──────────────────────────
// In-memory por instância serverless — mesmo padrão de src/auth.ts.
type BookingRateLimitEntry = { count: number; resetAt: number };
const bookingRateLimitMap = new Map<string, BookingRateLimitEntry>();
const BOOKING_RATE_LIMIT_MAX = 10;
const BOOKING_RATE_LIMIT_WINDOW_MS = 60 * 60_000; // 1 hora

async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    const real = h.get("x-real-ip");
    if (real) return real.trim();
  } catch {
    // headers() indisponível fora de contexto Next.js (ex: testes)
  }
  return "unknown";
}

function isBookingRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = bookingRateLimitMap.get(ip);
  if (!entry || now >= entry.resetAt) {
    bookingRateLimitMap.set(ip, { count: 1, resetAt: now + BOOKING_RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= BOOKING_RATE_LIMIT_MAX) return true;
  entry.count += 1;
  return false;
}

// ── Buscar slots disponíveis ──────────────────────────────────
// Retorna TODOS os slots do expediente com available: boolean.
// Guarda de cross-tenant: todos os serviceIds devem pertencer ao barbershopId.
interface GetSlotsParams {
  barbershopId: string;
  professionalId: string;
  serviceIds: string[]; // múltiplos serviços; duração somada internamente
  date: string; // "YYYY-MM-DD"
}

export async function getAvailableSlots({
  barbershopId,
  professionalId,
  serviceIds,
  date,
}: GetSlotsParams): Promise<SlotInfo[]> {
  try {
    const uniqueIds = [...new Set(serviceIds)];

    const services = await db.service.findMany({
      where: { id: { in: uniqueIds }, barbershopId },
    });

    // Cross-tenant guard: todos os IDs solicitados devem existir nesta barbearia
    if (services.length === 0 || services.length !== uniqueIds.length) return [];

    const totalDuration = services.reduce((sum, s) => sum + s.durationMin, 0);

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
      // Datas armazenadas em UTC; converte para Brasília (UTC-3) via getUTC*
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
      serviceDuration: totalDuration,
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
  serviceIds: string[]; // múltiplos serviços
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
    const ip = await getClientIp();
    if (ip === "unknown") {
      log.agenda.warn("agendamento público sem IP identificável", { barbershopId: data.barbershopId });
    } else if (isBookingRateLimited(ip)) {
      log.agenda.warn("rate limit de agendamento público atingido", { ip, barbershopId: data.barbershopId });
      return { error: "Muitas tentativas. Tente novamente em algumas horas." };
    }

    if (!data.clientName?.trim()) return { error: "Informe seu nome." };
    if (!data.clientPhone?.trim()) return { error: "Informe seu telefone." };
    if (!data.date || !data.time) return { error: "Selecione data e horário." };

    const uniqueServiceIds = [...new Set(data.serviceIds)];

    // Busca todos os dados em paralelo — todas as leituras tenant-scoped
    const [services, professional, barbershop] = await Promise.all([
      db.service.findMany({
        where: { id: { in: uniqueServiceIds }, barbershopId: data.barbershopId },
      }),
      db.professional.findFirst({
        where: { id: data.professionalId, barbershopId: data.barbershopId },
      }),
      db.barbershop.findUnique({ where: { id: data.barbershopId } }),
    ]);

    // Cross-tenant guard: todos os serviços solicitados devem pertencer à barbearia
    if (services.length === 0 || services.length !== uniqueServiceIds.length) {
      return { error: "Serviço não encontrado." };
    }

    // -03:00 = UTC-3 (Brasília, sem DST desde 2019)
    const dateISO = new Date(`${data.date}T${data.time}:00-03:00`).toISOString();

    const result = await createAppointmentCore({
      barbershopId: data.barbershopId,
      professionalId: data.professionalId,
      serviceIds: uniqueServiceIds,
      dateISO,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      clientEmail: data.clientEmail || null,
      status: "confirmed",
    });

    if (!result.success) return { error: result.error };

    if (data.clientEmail && barbershop && professional) {
      const serviceName = services.map((s) => s.name).join(" + ");
      const servicePrice = services.reduce((sum, s) => sum + s.priceInCents, 0);
      await sendAppointmentConfirmation({
        clientEmail: data.clientEmail,
        clientName: data.clientName.trim(),
        barbershopName: barbershop.name,
        barbershopSlug: barbershop.slug,
        serviceName,
        servicePrice,
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
