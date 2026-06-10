// ============================================================
// LIVO — Server Actions: Agendamento Manual
// Usado pelo barbeiro para registrar walk-ins e pedidos
// por telefone diretamente pelo dashboard
// ============================================================

"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createAppointmentCore } from "@/lib/appointment-core";
import { generateAvailableSlots } from "@/lib/availability";
import { db } from "@/lib/db";

// ── Buscar slots disponíveis ──────────────────────────────────
// Mesma lógica do agendamento público — garante sem conflitos
export async function getBarberAvailableSlots({
  barbershopId,
  professionalId,
  serviceId,
  date,
}: {
  barbershopId: string;
  professionalId: string;
  serviceId: string;
  date: string;
}): Promise<string[]> {
  try {
    const service = await db.service.findUnique({ where: { id: serviceId } });
    if (!service) return [];

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

    const appointmentsForCalc = existingAppointments.map((a) => ({
      startMinutes: a.date.getHours() * 60 + a.date.getMinutes(),
      endMinutes: a.endTime
        ? a.endTime.getHours() * 60 + a.endTime.getMinutes()
        : 0,
    }));

    const today = new Date();
    const isToday = dateObj.toDateString() === today.toDateString();
    const currentMinutes = today.getHours() * 60 + today.getMinutes();

    return generateAvailableSlots({
      openTime: businessHour.openTime,
      closeTime: businessHour.closeTime,
      serviceDuration: service.durationMin,
      appointments: appointmentsForCalc,
      isToday,
      currentMinutes,
    });
  } catch (err) {
    console.error("[getBarberAvailableSlots]", err);
    return [];
  }
}

// ── Criar agendamento manual ──────────────────────────────────
export async function createManualAppointment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const barbershop = await db.barbershop.findUnique({
    where: { ownerId: session.user.id },
  });
  if (!barbershop) redirect("/onboarding");

  const serviceId = formData.get("serviceId") as string;
  const professionalId = formData.get("professionalId") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const clientName = formData.get("clientName") as string;
  const clientPhone = formData.get("clientPhone") as string;

  if (!serviceId || !professionalId || !date || !time) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }
  if (!clientName?.trim()) throw new Error("Informe o nome do cliente.");
  if (!clientPhone?.trim()) throw new Error("Informe o telefone do cliente.");

  // -03:00 = UTC-3 (Brasília, sem DST desde 2019)
  const dateISO = new Date(`${date}T${time}:00-03:00`).toISOString();

  const result = await createAppointmentCore({
    barbershopId: barbershop.id,
    professionalId,
    serviceId,
    dateISO,
    clientName,
    clientPhone,
    notes: (formData.get("notes") as string | null)?.trim() || null,
    status: "confirmed",
  });

  if (!result.success) throw new Error(result.error);

  redirect(`/dashboard/agenda?date=${date}`);
}
