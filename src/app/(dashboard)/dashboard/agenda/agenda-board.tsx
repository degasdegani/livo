"use client";

import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Scissors,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type {
  AgendaAppointment,
  AgendaDayData,
  AgendaProfessional,
  AgendaService,
} from "./agenda-actions";
import {
  createQuickAppointment,
  moveAppointment,
  updateAppointmentStatus,
} from "./agenda-actions";

// ─── Constantes ──────────────────────────────────────────────────────────────

const HOUR_START = 8;
const HOUR_END = 20;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 56;
const TOTAL_SLOTS = ((HOUR_END - HOUR_START) * 60) / SLOT_MINUTES;

const STATUS_CONFIG = {
  pending: {
    label: "Pendente",
    bg: "bg-yellow-500/15",
    border: "border-yellow-500/40",
    dot: "bg-yellow-500",
    text: "text-yellow-400",
  },
  confirmed: {
    label: "Confirmado",
    bg: "bg-green-500/15",
    border: "border-green-500/40",
    dot: "bg-green-500",
    text: "text-green-400",
  },
  completed: {
    label: "Concluído",
    bg: "bg-zinc-600/20",
    border: "border-zinc-600/40",
    dot: "bg-zinc-500",
    text: "text-zinc-400",
  },
  cancelled: {
    label: "Cancelado",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    dot: "bg-red-500",
    text: "text-red-400",
  },
  no_show: {
    label: "Não compareceu",
    bg: "bg-zinc-700/20",
    border: "border-zinc-700/40",
    dot: "bg-zinc-600",
    text: "text-zinc-500",
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLabel(dateKey: string): string {
  const d = new Date(dateKey + "T12:00:00");
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function isTodayKey(dateKey: string): boolean {
  return dateKey === formatDateKey(new Date());
}

function getSlotIndex(date: Date): number {
  const h = date.getHours();
  const m = date.getMinutes();
  return (h - HOUR_START) * (60 / SLOT_MINUTES) + Math.floor(m / SLOT_MINUTES);
}

function getSlotCount(durationMin: number): number {
  return Math.max(1, Math.ceil(durationMin / SLOT_MINUTES));
}

function slotToTime(slotIndex: number): string {
  const totalMin = HOUR_START * 60 + slotIndex * SLOT_MINUTES;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function slotToDateISO(dateKey: string, slotIndex: number): string {
  const timeStr = slotToTime(slotIndex);
  return `${dateKey}T${timeStr}:00.000Z`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

// ─── Tipos de modal ───────────────────────────────────────────────────────────

type ModalState =
  | { type: "none" }
  | { type: "appointment"; appointment: AgendaAppointment }
  | { type: "move"; appointment: AgendaAppointment }
  | { type: "new"; professionalId: string; slotIndex: number; dateKey: string };

// ─── Componente principal ─────────────────────────────────────────────────────

type Props = {
  initialData: AgendaDayData;
  initialDateKey: string;
  services: AgendaService[];
};

export default function AgendaBoard({
  initialData,
  initialDateKey,
  services,
}: Props) {
  const router = useRouter();
  const [data, setData] = useState<AgendaDayData>(initialData);
  const [dateKey, setDateKey] = useState(initialDateKey);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [loadingNav, setLoadingNav] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Navegação ────────────────────────────────────────────────────────────

  async function navigate(delta: number) {
    const next = new Date(dateKey + "T12:00:00");
    next.setDate(next.getDate() + delta);
    const nextKey = formatDateKey(next);
    setLoadingNav(true);
    setDateKey(nextKey);
    router.push(`/dashboard/agenda?date=${nextKey}`);
    const { getAgendaDay } = await import("./agenda-actions");
    const fresh = await getAgendaDay(nextKey);
    setData(fresh);
    setLoadingNav(false);
  }

  async function goToday() {
    const todayKey = formatDateKey(new Date());
    setLoadingNav(true);
    setDateKey(todayKey);
    router.push("/dashboard/agenda");
    const { getAgendaDay } = await import("./agenda-actions");
    const fresh = await getAgendaDay(todayKey);
    setData(fresh);
    setLoadingNav(false);
  }

  async function refreshData() {
    const { getAgendaDay } = await import("./agenda-actions");
    const fresh = await getAgendaDay(dateKey);
    setData(fresh);
  }

  // ── Toast ────────────────────────────────────────────────────────────────

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Ações ────────────────────────────────────────────────────────────────

  async function handleStatusChange(
    appointmentId: string,
    status: "confirmed" | "completed" | "cancelled" | "no_show",
  ) {
    startTransition(async () => {
      const res = await updateAppointmentStatus(appointmentId, status);
      if (res.success) {
        showToast("Status atualizado!", "success");
        setModal({ type: "none" });
        await refreshData();
      } else {
        showToast(res.error ?? "Erro ao atualizar.", "error");
      }
    });
  }

  async function handleMove(appointmentId: string, newProfessionalId: string) {
    startTransition(async () => {
      const res = await moveAppointment(appointmentId, newProfessionalId);
      if (res.success) {
        showToast("Agendamento movido!", "success");
        setModal({ type: "none" });
        await refreshData();
      } else {
        showToast(res.error ?? "Erro ao mover.", "error");
      }
    });
  }

  async function handleCreate(formData: {
    serviceId: string;
    clientName: string;
    clientPhone: string;
    notes: string;
    professionalId: string;
    dateISO: string;
  }) {
    startTransition(async () => {
      const res = await createQuickAppointment(formData);
      if (res.success) {
        showToast("Agendamento criado!", "success");
        setModal({ type: "none" });
        await refreshData();
      } else {
        showToast(res.error ?? "Erro ao criar.", "error");
      }
    });
  }

  // ── Profissionais visíveis por papel ─────────────────────────────────────

  const visibleProfessionals =
    data.userRole === "barber" && data.userProfessionalId
      ? data.professionals.filter((p) => p.id === data.userProfessionalId)
      : data.professionals;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-xl flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-green-500/20 border border-green-500/40 text-green-400"
              : "bg-red-500/20 border border-red-500/40 text-red-400"
          }`}
        >
          {toast.type === "success" ? (
            <Check size={14} />
          ) : (
            <AlertCircle size={14} />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A33] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-[#1F1F27] text-[#9A9AA6] hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-center min-w-48">
            <p className="text-white font-semibold capitalize">
              {formatDateLabel(dateKey)}
            </p>
            {isTodayKey(dateKey) && (
              <span className="text-xs text-[#C8102E] font-medium">HOJE</span>
            )}
          </div>

          <button
            onClick={() => navigate(1)}
            className="p-2 rounded-lg hover:bg-[#1F1F27] text-[#9A9AA6] hover:text-white transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {!isTodayKey(dateKey) && (
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-sm rounded-lg border border-[#2A2A33] text-[#9A9AA6] hover:text-white hover:border-[#3A3A43] transition-colors"
            >
              Hoje
            </button>
          )}
          <span className="text-xs text-[#6E6E78]">
            {data.appointments.length} agendamento
            {data.appointments.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Grade */}
      <div className="flex-1 overflow-auto min-h-0">
        {loadingNav ? (
          <div className="flex items-center justify-center h-64 text-[#6E6E78]">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-[#C8102E] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Carregando...</span>
            </div>
          </div>
        ) : visibleProfessionals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-[#6E6E78]">
            <Scissors size={32} className="opacity-40" />
            <p className="text-sm">Nenhum profissional ativo cadastrado.</p>
            <p className="text-xs">Adicione profissionais em Configurações.</p>
          </div>
        ) : (
          <div className="flex min-w-max">
            <TimeColumn />
            {visibleProfessionals.map((prof) => (
              <ProfessionalColumn
                key={prof.id}
                professional={prof}
                appointments={data.appointments.filter(
                  (a) => a.professionalId === prof.id,
                )}
                dateKey={dateKey}
                canMove={
                  data.userRole === "owner" || data.userRole === "reception"
                }
                onAppointmentClick={(apt) =>
                  setModal({ type: "appointment", appointment: apt })
                }
                onSlotClick={(slotIndex) => {
                  if (
                    data.userRole === "barber" &&
                    prof.id !== data.userProfessionalId
                  )
                    return;
                  setModal({
                    type: "new",
                    professionalId: prof.id,
                    slotIndex,
                    dateKey,
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modais */}
      {modal.type === "appointment" && (
        <AppointmentModal
          appointment={modal.appointment}
          professionals={data.professionals}
          userRole={data.userRole}
          userProfessionalId={data.userProfessionalId}
          isPending={isPending}
          onClose={() => setModal({ type: "none" })}
          onStatusChange={handleStatusChange}
          onMove={() =>
            setModal({ type: "move", appointment: modal.appointment })
          }
        />
      )}

      {modal.type === "move" && (
        <MoveModal
          appointment={modal.appointment}
          professionals={data.professionals}
          isPending={isPending}
          onClose={() => setModal({ type: "none" })}
          onMove={(newProfId) => handleMove(modal.appointment.id, newProfId)}
        />
      )}

      {modal.type === "new" && (
        <NewAppointmentModal
          professionalId={modal.professionalId}
          slotIndex={modal.slotIndex}
          dateKey={modal.dateKey}
          professionals={visibleProfessionals}
          services={services}
          isPending={isPending}
          onClose={() => setModal({ type: "none" })}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

// ─── TimeColumn ───────────────────────────────────────────────────────────────

function TimeColumn() {
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => i);
  return (
    <div className="w-14 flex-shrink-0 border-r border-[#2A2A33] sticky left-0 bg-[#0B0B0D] z-10">
      <div
        className="border-b border-[#2A2A33] flex items-center justify-center"
        style={{ height: 48 }}
      >
        <Clock size={12} className="text-[#6E6E78]" />
      </div>
      {slots.map((i) => (
        <div
          key={i}
          className="border-b border-[#2A2A33]/50 flex items-start px-2 pt-1"
          style={{ height: SLOT_HEIGHT }}
        >
          {i % 2 === 0 && (
            <span className="text-[10px] text-[#6E6E78] font-mono leading-none">
              {slotToTime(i)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── ProfessionalColumn ───────────────────────────────────────────────────────

type ProfessionalColumnProps = {
  professional: AgendaProfessional;
  appointments: AgendaAppointment[];
  dateKey: string;
  canMove: boolean;
  onAppointmentClick: (apt: AgendaAppointment) => void;
  onSlotClick: (slotIndex: number) => void;
};

function ProfessionalColumn({
  professional,
  appointments,
  onAppointmentClick,
  onSlotClick,
}: ProfessionalColumnProps) {
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => i);

  const slotMap: Record<number, { apt: AgendaAppointment; isFirst: boolean }> =
    {};

  for (const apt of appointments) {
    const start = new Date(apt.date);
    const slotStart = getSlotIndex(start);
    const slotCount = getSlotCount(apt.serviceDurationMin);
    for (let i = 0; i < slotCount; i++) {
      const si = slotStart + i;
      if (si >= 0 && si < TOTAL_SLOTS) {
        slotMap[si] = { apt, isFirst: i === 0 };
      }
    }
  }

  return (
    <div className="w-48 flex-shrink-0 border-r border-[#2A2A33]">
      {/* Header */}
      <div
        className="border-b border-[#2A2A33] flex items-center gap-2 px-3"
        style={{ height: 48 }}
      >
        <div className="w-7 h-7 rounded-full bg-[#C8102E]/20 flex items-center justify-center flex-shrink-0">
          {professional.avatarUrl ? (
            <img
              src={professional.avatarUrl}
              alt={professional.name}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <span className="text-[10px] font-bold text-[#C8102E]">
              {professional.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-white truncate">
          {professional.name}
        </span>
      </div>

      {/* Slots */}
      <div className="relative">
        {slots.map((i) => {
          const entry = slotMap[i];

          if (entry && !entry.isFirst) {
            return (
              <div
                key={i}
                className="border-b border-[#2A2A33]/50"
                style={{ height: SLOT_HEIGHT }}
              />
            );
          }

          if (entry && entry.isFirst) {
            const { apt } = entry;
            const slotCount = getSlotCount(apt.serviceDurationMin);
            const cfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.pending;

            return (
              <div
                key={i}
                className="border-b border-[#2A2A33]/50 px-1 py-0.5 relative"
                style={{ height: SLOT_HEIGHT }}
              >
                <button
                  onClick={() => onAppointmentClick(apt)}
                  className={`absolute left-1 right-1 top-0.5 rounded-md border px-2 py-1 text-left overflow-hidden transition-all hover:brightness-125 cursor-pointer ${cfg.bg} ${cfg.border}`}
                  style={{ height: slotCount * SLOT_HEIGHT - 4, zIndex: 1 }}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`}
                    />
                    <span className="text-[11px] font-semibold text-white truncate">
                      {apt.clientName}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#9A9AA6] truncate">
                    {apt.serviceName}
                  </p>
                  {slotCount >= 2 && (
                    <p className="text-[10px] text-[#6E6E78]">
                      {formatTime(new Date(apt.date))}
                      {apt.endTime
                        ? ` → ${formatTime(new Date(apt.endTime))}`
                        : ""}
                    </p>
                  )}
                </button>
              </div>
            );
          }

          return (
            <div
              key={i}
              onClick={() => onSlotClick(i)}
              className="border-b border-[#2A2A33]/50 hover:bg-[#1F1F27]/60 cursor-pointer transition-colors group"
              style={{ height: SLOT_HEIGHT }}
            >
              <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus size={12} className="text-[#6E6E78]" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AppointmentModal ─────────────────────────────────────────────────────────

type AppointmentModalProps = {
  appointment: AgendaAppointment;
  professionals: AgendaProfessional[];
  userRole: string;
  userProfessionalId: string | null;
  isPending: boolean;
  onClose: () => void;
  onStatusChange: (
    id: string,
    status: "confirmed" | "completed" | "cancelled" | "no_show",
  ) => void;
  onMove: () => void;
};

function AppointmentModal({
  appointment,
  professionals,
  userRole,
  userProfessionalId,
  isPending,
  onClose,
  onStatusChange,
  onMove,
}: AppointmentModalProps) {
  const cfg = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.pending;
  const prof = professionals.find((p) => p.id === appointment.professionalId);
  const canManage =
    userRole === "owner" ||
    userRole === "reception" ||
    appointment.professionalId === userProfessionalId;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-[#17171C] border border-[#2A2A33] rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A33]">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className={`text-xs font-medium ${cfg.text}`}>
              {cfg.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#6E6E78] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1F1F27] flex items-center justify-center flex-shrink-0 mt-0.5">
              <User size={14} className="text-[#9A9AA6]" />
            </div>
            <div>
              <p className="text-white font-semibold">
                {appointment.clientName}
              </p>
              <p className="text-sm text-[#9A9AA6]">
                {appointment.clientPhone ?? "Sem telefone"}
              </p>
            </div>
          </div>

          <div className="bg-[#1F1F27] rounded-lg p-3 space-y-2">
            <InfoRow
              label="Serviço"
              value={`${appointment.serviceName} — ${formatCurrency(appointment.servicePriceInCents)}`}
            />
            <InfoRow
              label="Horário"
              value={`${formatTime(new Date(appointment.date))}${
                appointment.endTime
                  ? ` → ${formatTime(new Date(appointment.endTime))}`
                  : ` (${appointment.serviceDurationMin}min)`
              }`}
            />
            {prof && <InfoRow label="Barbeiro" value={prof.name} />}
            {appointment.notes && (
              <InfoRow label="Observações" value={appointment.notes} />
            )}
          </div>

          {canManage &&
            appointment.status !== "completed" &&
            appointment.status !== "cancelled" && (
              <div className="space-y-2">
                {appointment.status === "pending" && (
                  <button
                    disabled={isPending}
                    onClick={() => onStatusChange(appointment.id, "confirmed")}
                    className="w-full py-2.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-medium hover:bg-green-500/25 transition-colors disabled:opacity-50"
                  >
                    ✓ Confirmar agendamento
                  </button>
                )}
                {(appointment.status === "pending" ||
                  appointment.status === "confirmed") && (
                  <>
                    <button
                      disabled={isPending}
                      onClick={() =>
                        onStatusChange(appointment.id, "completed")
                      }
                      className="w-full py-2.5 rounded-lg bg-[#2A2A33] border border-[#3A3A43] text-white text-sm font-medium hover:bg-[#3A3A43] transition-colors disabled:opacity-50"
                    >
                      Marcar como concluído
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => onStatusChange(appointment.id, "no_show")}
                      className="w-full py-2.5 rounded-lg bg-[#2A2A33] border border-[#3A3A43] text-[#9A9AA6] text-sm font-medium hover:bg-[#3A3A43] transition-colors disabled:opacity-50"
                    >
                      Não compareceu
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() =>
                        onStatusChange(appointment.id, "cancelled")
                      }
                      className="w-full py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            )}

          {(userRole === "owner" || userRole === "reception") &&
            appointment.status !== "completed" &&
            appointment.status !== "cancelled" && (
              <button
                onClick={onMove}
                className="w-full py-2.5 rounded-lg border border-[#2A2A33] text-[#9A9AA6] text-sm font-medium hover:bg-[#1F1F27] hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <ArrowRight size={14} />
                Mover para outro barbeiro
              </button>
            )}
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── MoveModal ────────────────────────────────────────────────────────────────

type MoveModalProps = {
  appointment: AgendaAppointment;
  professionals: AgendaProfessional[];
  isPending: boolean;
  onClose: () => void;
  onMove: (newProfessionalId: string) => void;
};

function MoveModal({
  appointment,
  professionals,
  isPending,
  onClose,
  onMove,
}: MoveModalProps) {
  const others = professionals.filter(
    (p) => p.id !== appointment.professionalId,
  );

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-[#17171C] border border-[#2A2A33] rounded-xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A33]">
          <p className="text-white font-semibold text-sm">Mover agendamento</p>
          <button
            onClick={onClose}
            className="text-[#6E6E78] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-[#9A9AA6] mb-3">
            Selecione o novo barbeiro para{" "}
            <span className="text-white">{appointment.clientName}</span>:
          </p>
          {others.length === 0 ? (
            <p className="text-sm text-[#6E6E78] text-center py-4">
              Não há outros profissionais disponíveis.
            </p>
          ) : (
            <div className="space-y-2">
              {others.map((prof) => (
                <button
                  key={prof.id}
                  disabled={isPending}
                  onClick={() => onMove(prof.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[#2A2A33] hover:border-[#C8102E]/40 hover:bg-[#C8102E]/5 transition-colors disabled:opacity-50"
                >
                  <div className="w-7 h-7 rounded-full bg-[#C8102E]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-[#C8102E]">
                      {prof.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-white">{prof.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── NewAppointmentModal ──────────────────────────────────────────────────────

type NewAppointmentModalProps = {
  professionalId: string;
  slotIndex: number;
  dateKey: string;
  professionals: AgendaProfessional[];
  services: AgendaService[];
  isPending: boolean;
  onClose: () => void;
  onCreate: (data: {
    serviceId: string;
    clientName: string;
    clientPhone: string;
    notes: string;
    professionalId: string;
    dateISO: string;
  }) => void;
};

function NewAppointmentModal({
  professionalId,
  slotIndex,
  dateKey,
  professionals,
  services,
  isPending,
  onClose,
  onCreate,
}: NewAppointmentModalProps) {
  const [selectedProfId, setSelectedProfId] = useState(professionalId);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");

  const timeStr = slotToTime(slotIndex);
  const dateISO = slotToDateISO(dateKey, slotIndex);
  const selectedService = services.find((s) => s.id === serviceId);

  function handleSubmit() {
    if (!clientName.trim() || !clientPhone.trim() || !serviceId) return;
    onCreate({
      serviceId,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      notes,
      professionalId: selectedProfId,
      dateISO,
    });
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-[#17171C] border border-[#2A2A33] rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A33]">
          <div>
            <p className="text-white font-semibold text-sm">Novo agendamento</p>
            <p className="text-xs text-[#9A9AA6]">
              {timeStr} —{" "}
              {professionals.find((p) => p.id === selectedProfId)?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#6E6E78] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {professionals.length > 1 && (
            <div>
              <label className="block text-xs text-[#9A9AA6] mb-1.5">
                Barbeiro
              </label>
              <select
                value={selectedProfId}
                onChange={(e) => setSelectedProfId(e.target.value)}
                className="w-full bg-[#1F1F27] border border-[#2A2A33] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C8102E]/50"
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-[#9A9AA6] mb-1.5">
              Serviço
            </label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full bg-[#1F1F27] border border-[#2A2A33] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C8102E]/50"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatCurrency(s.priceInCents)} ({s.durationMin}
                  min)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#9A9AA6] mb-1.5">
              Nome do cliente
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex: João Silva"
              className="w-full bg-[#1F1F27] border border-[#2A2A33] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#6E6E78] focus:outline-none focus:border-[#C8102E]/50"
            />
          </div>

          <div>
            <label className="block text-xs text-[#9A9AA6] mb-1.5">
              Telefone / WhatsApp
            </label>
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full bg-[#1F1F27] border border-[#2A2A33] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#6E6E78] focus:outline-none focus:border-[#C8102E]/50"
            />
          </div>

          <div>
            <label className="block text-xs text-[#9A9AA6] mb-1.5">
              Observações (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: cliente prefere tesoura"
              className="w-full bg-[#1F1F27] border border-[#2A2A33] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#6E6E78] focus:outline-none focus:border-[#C8102E]/50 resize-none"
            />
          </div>

          {selectedService && (
            <div className="bg-[#1F1F27] rounded-lg px-3 py-2 text-xs text-[#9A9AA6]">
              {timeStr} → termina ~
              {(() => {
                const end = new Date(dateISO);
                end.setMinutes(end.getMinutes() + selectedService.durationMin);
                return formatTime(end);
              })()}{" "}
              · {selectedService.durationMin}min ·{" "}
              {formatCurrency(selectedService.priceInCents)}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={
              isPending ||
              !clientName.trim() ||
              !clientPhone.trim() ||
              !serviceId
            }
            className="w-full py-2.5 bg-[#C8102E] hover:bg-[#E0263D] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {isPending ? "Criando..." : "Criar agendamento"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── ModalOverlay ─────────────────────────────────────────────────────────────

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-[#6E6E78] flex-shrink-0">{label}</span>
      <span className="text-[#9A9AA6] text-right">{value}</span>
    </div>
  );
}
