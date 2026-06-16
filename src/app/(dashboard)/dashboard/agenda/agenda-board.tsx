// src/app/(dashboard)/dashboard/agenda/agenda-board.tsx
"use client";

import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Plus,
  Receipt,
  Scissors,
  Search,
  User,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SLOT_CONFIG, TOTAL_SLOTS } from "@/lib/slot-config";
import { updateAppointmentStatus } from "../actions";
import { abrirComanda } from "../comandas/actions";
import type {
  AgendaAppointment,
  AgendaClientResult,
  AgendaDayData,
  AgendaProfessional,
  AgendaService,
} from "./agenda-actions";
import {
  createQuickAppointment,
  moveAppointment,
  searchClientsForAgenda,
  updateAppointment,
} from "./agenda-actions";

// ─── Constantes ───────────────────────────────────────────────────────────────

const { HOUR_START, SLOT_MINUTES, SLOT_HEIGHT } = SLOT_CONFIG;

// STATUS_CONFIG usa classes Tailwind semânticas — mantidas pois não são hardcodes de tema
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
  const d = new Date(`${dateKey}T12:00:00`);
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
  const h = parseInt(
    date.toLocaleString("pt-BR", {
      hour: "2-digit",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }),
    10,
  );
  const m = parseInt(
    date.toLocaleString("pt-BR", {
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }),
    10,
  );
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
  // Sufixo -03:00 ancora em Brasília (sem DST desde 2019), independente do timezone do browser.
  return new Date(`${dateKey}T${timeStr}:00-03:00`).toISOString();
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
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
  | { type: "edit"; appointment: AgendaAppointment }
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
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const [data, setData] = useState<AgendaDayData>(initialData);
  const [dateKey, setDateKey] = useState(initialDateKey);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [loadingNav, setLoadingNav] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function navigate(delta: number) {
    const next = new Date(`${dateKey}T12:00:00`);
    next.setDate(next.getDate() + delta);
    const nextKey = formatDateKey(next);
    setLoadingNav(true);
    setDateKey(nextKey);
    const params = new URLSearchParams({ date: nextKey });
    if (viewParam) params.set("view", viewParam);
    router.push(`/dashboard/agenda?${params.toString()}`);
    const { getAgendaDay } = await import("./agenda-actions");
    const fresh = await getAgendaDay(nextKey);
    setData(fresh);
    setLoadingNav(false);
  }

  async function goToday() {
    const todayKey = formatDateKey(new Date());
    setLoadingNav(true);
    setDateKey(todayKey);
    const params = new URLSearchParams();
    if (viewParam) params.set("view", viewParam);
    const query = params.toString();
    router.push(`/dashboard/agenda${query ? `?${query}` : ""}`);
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

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

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

  async function handleAbrirComanda(appointment: AgendaAppointment) {
    startTransition(async () => {
      try {
        await abrirComanda({
          professionalId: appointment.professionalId,
          clientId: appointment.clientId ?? undefined,
          clientName: appointment.clientName,
          notes: appointment.notes ?? undefined,
          appointmentId: appointment.id,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("NEXT_REDIRECT")) return;
        showToast("Erro ao abrir comanda.", "error");
      }
    });
  }

  async function handleEdit(formData: {
    serviceId: string;
    dateISO: string;
    clientName: string;
    clientPhone: string;
    notes: string;
  }) {
    if (modal.type !== "edit") return;
    const id = modal.appointment.id;
    startTransition(async () => {
      const res = await updateAppointment(id, formData);
      if (res.success) {
        showToast("Agendamento atualizado!", "success");
        setModal({ type: "none" });
        await refreshData();
      } else {
        showToast(res.error ?? "Erro ao editar.", "error");
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

  const visibleProfessionals =
    data.userRole === "barber" && data.userProfessionalId
      ? data.professionals.filter((p) => p.id === data.userProfessionalId)
      : data.professionals;

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
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-card-elevated)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-center min-w-48">
            <p
              className="font-semibold capitalize"
              style={{ color: "var(--text-primary)" }}
            >
              {formatDateLabel(dateKey)}
            </p>
            {isTodayKey(dateKey) && (
              <span
                className="text-xs font-medium"
                style={{ color: "var(--color-primary)" }}
              >
                HOJE
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate(1)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-card-elevated)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {!isTodayKey(dateKey) && (
            <button
              type="button"
              onClick={goToday}
              className="px-3 py-1.5 text-sm rounded-lg transition-colors"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              Hoje
            </button>
          )}
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {data.appointments.length} agendamento
            {data.appointments.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Grade */}
      <div className="flex-1 overflow-auto min-h-0">
        {loadingNav ? (
          <div
            className="flex items-center justify-center h-64"
            style={{ color: "var(--text-tertiary)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                style={{
                  borderColor: "var(--color-primary)",
                  borderTopColor: "transparent",
                }}
              />
              <span className="text-sm">Carregando...</span>
            </div>
          </div>
        ) : visibleProfessionals.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-64 gap-3"
            style={{ color: "var(--text-tertiary)" }}
          >
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
          onEdit={() =>
            setModal({ type: "edit", appointment: modal.appointment })
          }
          onMove={() =>
            setModal({ type: "move", appointment: modal.appointment })
          }
          onAbrirComanda={() => handleAbrirComanda(modal.appointment)}
        />
      )}

      {modal.type === "edit" && (
        <EditAppointmentModal
          appointment={modal.appointment}
          services={services}
          isPending={isPending}
          onClose={() => setModal({ type: "none" })}
          onEdit={handleEdit}
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
    <div
      className="w-14 flex-shrink-0 sticky left-0 z-10"
      style={{
        borderRight: "1px solid var(--border)",
        backgroundColor: "var(--bg-base)",
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{ height: 48, borderBottom: "1px solid var(--border)" }}
      >
        <Clock size={12} style={{ color: "var(--text-tertiary)" }} />
      </div>
      {slots.map((i) => (
        <div
          key={i}
          className="flex items-start px-2 pt-1"
          style={{
            height: SLOT_HEIGHT,
            borderBottom: "1px solid var(--border)",
            opacity: 0.5,
          }}
        >
          {i % 6 === 0 && (
            <span
              className="text-[10px] font-mono leading-none"
              style={{ color: "var(--text-tertiary)" }}
            >
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
    <div
      className="w-48 flex-shrink-0"
      style={{ borderRight: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3"
        style={{ height: 48, borderBottom: "1px solid var(--border)" }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "var(--color-primary-10)" }}
        >
          {professional.avatarUrl ? (
            // biome-ignore lint/performance/noImgElement: avatar externo, sem domínio fixo para next/image
            <img
              src={professional.avatarUrl}
              alt={professional.name}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <span
              className="text-[10px] font-bold"
              style={{ color: "var(--color-primary)" }}
            >
              {professional.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <span
          className="text-xs font-medium truncate"
          style={{ color: "var(--text-primary)" }}
        >
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
                style={{
                  height: SLOT_HEIGHT,
                  borderBottom: "1px solid var(--border)",
                }}
              />
            );
          }

          if (entry?.isFirst) {
            const { apt } = entry;
            const slotCount = getSlotCount(apt.serviceDurationMin);
            const cfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.pending;

            return (
              <div
                key={i}
                className="px-1 py-0.5 relative"
                style={{
                  height: SLOT_HEIGHT,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <button
                  type="button"
                  onClick={() => onAppointmentClick(apt)}
                  className={`absolute left-1 right-1 top-0.5 rounded-md border px-2 py-1 text-left overflow-hidden transition-all hover:brightness-125 cursor-pointer ${cfg.bg} ${cfg.border}`}
                  style={{ height: slotCount * SLOT_HEIGHT - 4, zIndex: 1 }}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`}
                    />
                    <span
                      className="text-[11px] font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {apt.clientName}
                    </span>
                  </div>
                  <p
                    className="text-[10px] truncate"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {apt.serviceName}
                  </p>
                  {slotCount >= 2 && (
                    <p
                      className="text-[10px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
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
            <button
              key={i}
              type="button"
              onClick={() => onSlotClick(i)}
              className="w-full cursor-pointer transition-colors group"
              style={{
                height: SLOT_HEIGHT,
                borderBottom: "1px solid var(--border)",
                background: "transparent",
                padding: 0,
                display: "block",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--bg-card-elevated)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus size={12} style={{ color: "var(--text-tertiary)" }} />
              </div>
            </button>
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
  onEdit: () => void;
  onMove: () => void;
  onAbrirComanda: () => void;
};

function AppointmentModal({
  appointment,
  professionals,
  userRole,
  userProfessionalId,
  isPending,
  onClose,
  onStatusChange,
  onEdit,
  onMove,
  onAbrirComanda,
}: AppointmentModalProps) {
  const router = useRouter();
  const cfg = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.pending;
  const prof = professionals.find((p) => p.id === appointment.professionalId);
  const canManage =
    userRole === "owner" ||
    userRole === "reception" ||
    appointment.professionalId === userProfessionalId;

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={appointment.clientName}
      description={cfg.label}
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: "var(--bg-card-elevated)" }}
          >
            <User size={14} style={{ color: "var(--text-secondary)" }} />
          </div>
          <div>
            <p
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {appointment.clientName}
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {appointment.clientPhone ?? "Sem telefone"}
            </p>
          </div>
        </div>

        <div
          className="rounded-lg p-3 space-y-2"
          style={{ backgroundColor: "var(--bg-card-elevated)" }}
        >
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

        {/* Ver Comanda: quando já existe (qualquer status não-cancelado) */}
        {appointment.comandaId && appointment.status !== "cancelled" && (
          <button
            type="button"
            onClick={() => {
              const id = appointment.comandaId;
              if (id) router.push(`/dashboard/comandas/${id}`);
            }}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "var(--color-primary-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-primary)";
            }}
          >
            <Receipt size={14} />
            Ver Comanda
          </button>
        )}

        {canManage &&
          appointment.status !== "completed" &&
          appointment.status !== "cancelled" && (
            <div className="space-y-2">
              {/* Abrir Comanda: apenas quando ainda não existe comanda */}
              {!appointment.comandaId &&
                (appointment.status === "pending" ||
                  appointment.status === "confirmed") && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={onAbrirComanda}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--color-primary)",
                      color: "#fff",
                    }}
                    onMouseEnter={(e) => {
                      if (!isPending)
                        e.currentTarget.style.backgroundColor =
                          "var(--color-primary-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "var(--color-primary)";
                    }}
                  >
                    <Receipt size={14} />
                    {isPending ? "Abrindo comanda..." : "Abrir Comanda"}
                  </button>
                )}
              {appointment.status === "pending" && (
                <button
                  type="button"
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
                    type="button"
                    disabled={isPending}
                    onClick={() => onStatusChange(appointment.id, "completed")}
                    className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--bg-card-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Marcar como concluído
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onStatusChange(appointment.id, "no_show")}
                    className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--bg-card-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Não compareceu
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onStatusChange(appointment.id, "cancelled")}
                    className="w-full py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          )}

        {canManage &&
          appointment.status !== "completed" &&
          appointment.status !== "cancelled" &&
          appointment.status !== "no_show" && (
            <button
              type="button"
              onClick={onEdit}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--bg-card-elevated)";
                e.currentTarget.style.borderColor = "var(--color-primary)";
                e.currentTarget.style.color = "var(--color-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <Pencil size={14} />
              Editar agendamento
            </button>
          )}

        {(userRole === "owner" || userRole === "reception") &&
          appointment.status !== "completed" &&
          appointment.status !== "cancelled" && (
            <button
              type="button"
              onClick={onMove}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--bg-card-elevated)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <ArrowRight size={14} />
              Mover para outro barbeiro
            </button>
          )}
      </div>
    </Modal>
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
    <Modal open={true} onClose={onClose} title="Mover agendamento" size="sm">
      <div>
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          Selecione o novo barbeiro para{" "}
          <span style={{ color: "var(--text-primary)" }}>
            {appointment.clientName}
          </span>
          :
        </p>
        {others.length === 0 ? (
          <p
            className="text-sm text-center py-4"
            style={{ color: "var(--text-tertiary)" }}
          >
            Não há outros profissionais disponíveis.
          </p>
        ) : (
          <div className="space-y-2">
            {others.map((prof) => (
              <button
                type="button"
                key={prof.id}
                disabled={isPending}
                onClick={() => onMove(prof.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                style={{ border: "1px solid var(--border)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                  e.currentTarget.style.backgroundColor =
                    "var(--color-primary-10)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "var(--color-primary-10)" }}
                >
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {prof.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <span
                  className="text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {prof.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── EditAppointmentModal ─────────────────────────────────────────────────────

type EditAppointmentModalProps = {
  appointment: AgendaAppointment;
  services: AgendaService[];
  isPending: boolean;
  onClose: () => void;
  onEdit: (data: {
    serviceId: string;
    dateISO: string;
    clientName: string;
    clientPhone: string;
    notes: string;
  }) => void;
};

function EditAppointmentModal({
  appointment,
  services,
  isPending,
  onClose,
  onEdit,
}: EditAppointmentModalProps) {
  const aptDate = new Date(appointment.date);
  const initialDate = aptDate
    .toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "America/Sao_Paulo",
    })
    .split("/")
    .reverse()
    .join("-");
  const initialSlot = getSlotIndex(aptDate);

  const [serviceId, setServiceId] = useState(appointment.serviceId);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedSlot, setSelectedSlot] = useState(
    Math.max(0, Math.min(initialSlot, TOTAL_SLOTS - 1)),
  );
  const [clientName, setClientName] = useState(appointment.clientName);
  const [clientPhone, setClientPhone] = useState(appointment.clientPhone ?? "");
  const [notes, setNotes] = useState(appointment.notes ?? "");

  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => i);
  const selectedService = services.find((s) => s.id === serviceId);
  const selectedTimeStr = slotToTime(selectedSlot);

  function handleSubmit() {
    if (
      !clientName.trim() ||
      !clientPhone.trim() ||
      !serviceId ||
      !selectedDate
    )
      return;
    const dateISO = slotToDateISO(selectedDate, selectedSlot);
    onEdit({ serviceId, dateISO, clientName, clientPhone, notes });
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Editar agendamento"
      description={appointment.clientName}
      size="md"
    >
      <div className="space-y-3">
        <div>
          <label htmlFor="edit-service" className="mb-1.5 block text-xs" style={{ color: "var(--text-secondary)" }}>
            Serviço
          </label>
          <Select
            id="edit-service"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {formatCurrency(s.priceInCents)} ({s.durationMin}
                min)
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data"
            id="edit-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <div>
            <label htmlFor="edit-slot" className="mb-1.5 block text-xs" style={{ color: "var(--text-secondary)" }}>
              Horário
            </label>
            <Select
              id="edit-slot"
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(Number(e.target.value))}
            >
              {slots.map((i) => (
                <option key={i} value={i}>
                  {slotToTime(i)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Input
          label="Nome do cliente"
          id="edit-client-name"
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Ex: João Silva"
        />

        <Input
          label="Telefone / WhatsApp"
          id="edit-phone"
          type="tel"
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          placeholder="(11) 99999-9999"
        />

        <div>
          <label htmlFor="edit-notes" className="mb-1.5 block text-xs" style={{ color: "var(--text-secondary)" }}>
            Observações (opcional)
          </label>
          <Textarea
            id="edit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ex: cliente prefere tesoura"
            style={{ resize: "none" }}
          />
        </div>

        {selectedService && (
          <div
            className="rounded-lg px-3 py-2 text-xs"
            style={{
              backgroundColor: "var(--bg-card-elevated)",
              color: "var(--text-secondary)",
            }}
          >
            {selectedTimeStr} → termina ~{(() => {
              const start = new Date(slotToDateISO(selectedDate, selectedSlot));
              const end = new Date(
                start.getTime() + selectedService.durationMin * 60_000,
              );
              return formatTime(end);
            })()} · {selectedService.durationMin}min ·{" "}
            {formatCurrency(selectedService.priceInCents)}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            isPending ||
            !clientName.trim() ||
            !clientPhone.trim() ||
            !serviceId ||
            !selectedDate
          }
          className="w-full py-2.5 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: "var(--color-primary)" }}
          onMouseEnter={(e) => {
            if (!isPending)
              e.currentTarget.style.backgroundColor =
                "var(--color-primary-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-primary)";
          }}
        >
          {isPending ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </Modal>
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
  const [notes, setNotes] = useState("");

  // ── Autocomplete de cliente ────────────────────────────────
  const [selectedClient, setSelectedClient] =
    useState<AgendaClientResult | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<AgendaClientResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timeStr = slotToTime(slotIndex);
  const dateISO = slotToDateISO(dateKey, slotIndex);
  const selectedService = services.find((s) => s.id === serviceId);

  const finalClientName =
    selectedClient?.name ?? (isManualMode ? manualName : "");
  const finalClientPhone =
    selectedClient?.phone ?? (isManualMode ? manualPhone : "");
  const canSubmit =
    !isPending &&
    !!serviceId &&
    !!finalClientName.trim() &&
    !!finalClientPhone.trim();

  function handleSearchInput(term: string) {
    setSearchTerm(term);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (term.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setShowDropdown(false);
      return;
    }
    setShowDropdown(true);
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchClientsForAgenda(term.trim());
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
  }

  function selectClient(client: AgendaClientResult) {
    setSelectedClient(client);
    setSearchTerm("");
    setSearchResults([]);
    setShowDropdown(false);
    setIsManualMode(false);
  }

  function clearClient() {
    setSelectedClient(null);
    setSearchTerm("");
    setSearchResults([]);
    setIsManualMode(false);
  }

  function enterManualMode() {
    setIsManualMode(true);
    setSelectedClient(null);
    setShowDropdown(false);
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onCreate({
      serviceId,
      clientName: finalClientName.trim(),
      clientPhone: finalClientPhone.trim(),
      notes,
      professionalId: selectedProfId,
      dateISO,
    });
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Novo agendamento"
      description={`${timeStr} — ${professionals.find((p) => p.id === selectedProfId)?.name ?? ""}`}
      size="md"
    >
      <div className="space-y-3">
        {/* Barbeiro */}
        {professionals.length > 1 && (
          <div>
            <label htmlFor="create-professional" className="mb-1.5 block text-xs" style={{ color: "var(--text-secondary)" }}>
              Barbeiro
            </label>
            <Select
              id="create-professional"
              value={selectedProfId}
              onChange={(e) => setSelectedProfId(e.target.value)}
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Serviço */}
        <div>
          <label htmlFor="create-service" className="mb-1.5 block text-xs" style={{ color: "var(--text-secondary)" }}>
            Serviço
          </label>
          <Select
            id="create-service"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {formatCurrency(s.priceInCents)} ({s.durationMin}
                min)
              </option>
            ))}
          </Select>
        </div>

        {/* Cliente */}
        <div>
          <label htmlFor="client-search" className="mb-1.5 block text-xs" style={{ color: "var(--text-secondary)" }}>
            Cliente
          </label>

          {selectedClient ? (
            /* Chip: cliente selecionado */
            <div
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
              style={{
                border: "1px solid var(--color-primary-20)",
                backgroundColor: "var(--color-primary-10)",
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: "var(--color-primary-20)" }}
              >
                <span
                  className="text-[10px] font-bold"
                  style={{ color: "var(--color-primary)" }}
                >
                  {selectedClient.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {selectedClient.name}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {selectedClient.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={clearClient}
                className="transition-colors shrink-0"
                style={{ color: "var(--text-tertiary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-tertiary)";
                }}
              >
                <X size={14} />
              </button>
            </div>
          ) : isManualMode ? (
            /* Modo manual: nome + telefone livres */
            <div className="space-y-2">
              <Input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Nome do cliente"
                // biome-ignore lint/a11y/noAutofocus: campo principal do modo manual
                autoFocus
              />
              <Input
                type="tel"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
              <button
                type="button"
                onClick={() => {
                  setIsManualMode(false);
                  setManualName("");
                  setManualPhone("");
                }}
                className="text-xs transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                ← Buscar cliente existente
              </button>
            </div>
          ) : (
            /* Busca com autocomplete */
            <div className="relative">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--text-tertiary)" }}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => {
                    if (searchTerm.trim().length >= 2) setShowDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  id="client-search"
                  placeholder="Buscar por nome ou telefone..."
                  className="livo-input" style={{ paddingLeft: 32 }}
                />
                {isSearching && (
                  <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                    style={{
                      borderColor: "var(--color-primary)",
                      borderTopColor: "transparent",
                    }}
                  />
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && searchTerm.trim().length >= 2 && (
                <div
                  className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg shadow-xl overflow-hidden"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {searchResults.length > 0 ? (
                    searchResults.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onMouseDown={() => selectClient(client)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left"
                        style={{
                          borderBottom: "1px solid var(--border)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "var(--bg-card-elevated)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: "var(--color-primary-10)",
                          }}
                        >
                          <span
                            className="text-[10px] font-bold"
                            style={{ color: "var(--color-primary)" }}
                          >
                            {client.name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {client.name}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {client.phone}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : !isSearching ? (
                    <div className="p-3">
                      <p
                        className="text-xs text-center mb-2.5"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Nenhum cliente encontrado
                      </p>
                      <button
                        type="button"
                        onMouseDown={enterManualMode}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          border: "1px dashed var(--border)",
                          color: "var(--text-secondary)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor =
                            "var(--color-primary)";
                          e.currentTarget.style.color = "var(--color-primary)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--border)";
                          e.currentTarget.style.color = "var(--text-secondary)";
                        }}
                      >
                        <Plus size={12} />
                        Criar novo cliente
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Observações */}
        <div>
          <label htmlFor="create-notes" className="mb-1.5 block text-xs" style={{ color: "var(--text-secondary)" }}>
            Observações (opcional)
          </label>
          <Textarea
            id="create-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ex: cliente prefere tesoura"
            style={{ resize: "none" }}
          />
        </div>

        {/* Preview de horário */}
        {selectedService && (
          <div
            className="rounded-lg px-3 py-2 text-xs"
            style={{
              backgroundColor: "var(--bg-card-elevated)",
              color: "var(--text-secondary)",
            }}
          >
            {timeStr} → termina ~{(() => {
              const end = new Date(dateISO);
              end.setMinutes(end.getMinutes() + selectedService.durationMin);
              return formatTime(end);
            })()} · {selectedService.durationMin}min ·{" "}
            {formatCurrency(selectedService.priceInCents)}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-2.5 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: "var(--color-primary)" }}
          onMouseEnter={(e) => {
            if (canSubmit)
              e.currentTarget.style.backgroundColor =
                "var(--color-primary-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-primary)";
          }}
        >
          {isPending ? "Criando..." : "Criar agendamento"}
        </button>
      </div>
    </Modal>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="flex-shrink-0" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <span className="text-right" style={{ color: "var(--text-secondary)" }}>
        {value}
      </span>
    </div>
  );
}
