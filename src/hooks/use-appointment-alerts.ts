"use client";

import { useMemo } from "react";

export type AlertType = "confirmation" | "reminder" | "noshow";

export type AppointmentAlert = {
  id: string;
  type: AlertType;
  clientName: string;
  clientPhone: string | null;
  professionalName: string;
  serviceName: string;
  startTime: Date;
  durationMinutes: number;
  notificationSentAt: Date | null;
  reminderSentAt: Date | null;
  noShowReportedAt: Date | null;
};

export type AlertItem = {
  appointmentId: string;
  type: AlertType;
  clientName: string;
  clientPhone: string | null;
  professionalName: string;
  serviceName: string;
  timeLabel: string;
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function useAppointmentAlerts(
  appointments: AppointmentAlert[],
): AlertItem[] {
  return useMemo(() => {
    const now = new Date();
    const alerts: AlertItem[] = [];

    for (const apt of appointments) {
      const start = new Date(apt.startTime);
      const end = new Date(start.getTime() + apt.durationMinutes * 60_000);
      const msUntilStart = start.getTime() - now.getTime();
      const timeLabel = formatTime(start);

      const base = {
        appointmentId: apt.id,
        clientName: apt.clientName,
        clientPhone: apt.clientPhone,
        professionalName: apt.professionalName,
        serviceName: apt.serviceName,
        timeLabel,
      };

      // Fluxo 1 — confirmação: qualquer agendamento ativo sem notificationSentAt.
      // Não há gate por status aqui — a query (getTodayAppointmentsForAlerts) já
      // entrega apenas agendamentos ativos (pending + confirmed), então basta
      // verificar se a notificação ainda não foi enviada.
      if (!apt.notificationSentAt) {
        alerts.push({ ...base, type: "confirmation" });
        continue;
      }

      // Fluxo 2 — lembrete 3h antes: entre agora e 3h, sem reminderSentAt
      if (
        !apt.reminderSentAt &&
        msUntilStart > 0 &&
        msUntilStart <= 3 * 60 * 60_000
      ) {
        alerts.push({ ...base, type: "reminder" });
        continue;
      }

      // Fluxo 3 — no-show: horário + duração já passou, sem noShowReportedAt
      if (!apt.noShowReportedAt && now > end) {
        alerts.push({ ...base, type: "noshow" });
      }
    }

    return alerts;
  }, [appointments]);
}
