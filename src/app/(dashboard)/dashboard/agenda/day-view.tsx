"use client";

import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useEffect, useRef, useState, useCallback, useTransition } from "react";
import { layoutAppointments } from "@/lib/agenda-layout";
import { calcDropMinute, checkClientConflict } from "@/lib/agenda-drag";
import { updateAppointmentStatus } from "../actions";
import { abrirComanda } from "../comandas/actions";
import type { AgendaAppointment, AgendaDayData, AgendaService } from "./agenda-actions";
import {
  createQuickAppointment,
  createTimeBlock,
  deleteAppointment,
  deleteTimeBlock,
  getAgendaDay,
  markWhatsappSent,
  moveAppointment,
  rescheduleAppointment,
  updateAppointment,
  type AgendaTimeBlock,
} from "./agenda-actions";
import { TimeBlockCard, isoToHeightPx, isoToTopPx } from "./components/time-block-card";
import { TimeBlockCreateModal, TimeBlockDetailModal } from "./components/time-block-modal";
import { AppointmentCard, type DragData } from "./components/appointment-card";
import { CreateModal } from "./components/create-modal";
import { NowIndicator } from "./components/now-indicator";
import { DetailModal } from "./components/detail-modal";
import { EditModal } from "./components/edit-modal";
import { MoveModal } from "./components/move-modal";
import { ProfessionalFilter } from "./components/professional-filter";
import {
  GRID_END_MIN,
  GRID_START_MIN,
  MIN_COL_WIDTH,
  PX_PER_MINUTE,
  RULER_WIDTH,
  STATUS_CONFIG,
  dateTimeToISO,
  formatDateKey,
  formatDateLabel,
  isTodayKey,
  minToTimeStr,
  timeStrToMin,
} from "./components/shared";
import { TimeRuler } from "./components/time-ruler";

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type ModalState =
  | { type: "none" }
  | { type: "detail"; appointment: AgendaAppointment; anchorX: number; anchorY: number }
  | { type: "edit"; appointment: AgendaAppointment }
  | { type: "move"; appointment: AgendaAppointment }
  | { type: "create"; professionalId: string; suggestedMinute: number; dateKey: string; anchorX: number; anchorY: number }
  | { type: "block-create"; professionalId: string; startISO: string; endISO: string; anchorX: number; anchorY: number }
  | { type: "block-detail"; block: AgendaTimeBlock; anchorX: number; anchorY: number };

type Toast = { msg: string; kind: "success" | "error" } | null;

// ─── Props ────────────────────────────────────────────────────────────────────

interface DayViewProps {
  initialData: AgendaDayData;
  initialDateKey: string;
  services: AgendaService[];
}

// ── DnD configuration ─────────────────────────────────────────────────────────

const DND_MEASURING = {
  droppable: { strategy: MeasuringStrategy.WhileDragging },
};

// ══════════════════════════════════════════════════════════════════════════════
// ProfessionalColumn — coluna por profissional (específica do DayView)
// ══════════════════════════════════════════════════════════════════════════════

function ProfessionalColumn({
  professional,
  appointments,
  timeBlocks,
  openingMin,
  closingMin,
  onGridClick,
  onCardClick,
  onTimeBlockCreate,
  onBlockClick,
  userRole,
  userProfessionalId,
  showNowIndicator,
  snapGuideMin,
}: {
  professional: { id: string; name: string; avatarUrl: string | null };
  appointments: AgendaAppointment[];
  timeBlocks: AgendaTimeBlock[];
  openingMin: number;
  closingMin: number;
  onGridClick: (clickY: number, clientX: number, clientY: number) => void;
  onCardClick: (appt: AgendaAppointment, clientX: number, clientY: number) => void;
  onTimeBlockCreate: (startMin: number, endMin: number, clientX: number, clientY: number) => void;
  onBlockClick: (block: AgendaTimeBlock, clientX: number, clientY: number) => void;
  userRole: string;
  userProfessionalId: string | null;
  showNowIndicator: boolean;
  snapGuideMin: number | null;
}) {
  const isOwnColumn =
    userRole !== "barber" || professional.id === userProfessionalId;

  const { setNodeRef, isOver } = useDroppable({
    id: `day-prof-${professional.id}`,
    data: { professionalId: professional.id },
    disabled: !isOwnColumn,
  });

  // Drag-to-create TimeBlock state
  const gridDragRef = useRef<{ startY: number; rect: DOMRect } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ topPx: number; heightPx: number } | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!gridDragRef.current) return;
    const { startY, rect } = gridDragRef.current;
    const currentY = e.clientY - rect.top;
    if (Math.abs(currentY - startY) < 8) { setDragPreview(null); return; }
    const minY = Math.min(startY, currentY);
    const maxY = Math.max(startY, currentY);
    const startMin = Math.round((GRID_START_MIN + minY / PX_PER_MINUTE) / 10) * 10;
    const endMin = Math.max(startMin + 10, Math.round((GRID_START_MIN + maxY / PX_PER_MINUTE) / 10) * 10);
    setDragPreview({ topPx: startMin * PX_PER_MINUTE, heightPx: (endMin - startMin) * PX_PER_MINUTE });
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!gridDragRef.current) return;
    const { startY, rect } = gridDragRef.current;
    const currentY = e.clientY - rect.top;
    gridDragRef.current = null;
    setDragPreview(null);
    if (Math.abs(currentY - startY) < 8) {
      onGridClick(startY, e.clientX, e.clientY);
      return;
    }
    const minY = Math.min(startY, currentY);
    const maxY = Math.max(startY, currentY);
    const startMin = Math.round((GRID_START_MIN + minY / PX_PER_MINUTE) / 10) * 10;
    const endMin = Math.max(startMin + 10, Math.round((GRID_START_MIN + maxY / PX_PER_MINUTE) / 10) * 10);
    onTimeBlockCreate(startMin, endMin, e.clientX, e.clientY);
  }, [onGridClick, onTimeBlockCreate]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const positioned = layoutAppointments(appointments, GRID_START_MIN, PX_PER_MINUTE);
  const totalMin = GRID_END_MIN - GRID_START_MIN;
  const gridHeight = totalMin * PX_PER_MINUTE;

  const lines: { offset: number; isHour: boolean; isHalf: boolean }[] = [];
  for (let i = 0; i <= totalMin; i += 10) {
    const absMin = GRID_START_MIN + i;
    lines.push({ offset: i, isHour: absMin % 60 === 0, isHalf: absMin % 30 === 0 });
  }

  return (
    <div
      ref={setNodeRef}
      className="flex-1 relative border-l"
      style={{
        minWidth: MIN_COL_WIDTH,
        height: gridHeight,
        borderColor: "var(--border)",
        cursor: "crosshair",
        backgroundColor: isOver ? "rgba(99, 102, 241, 0.06)" : undefined,
        boxShadow: isOver ? "inset 0 0 0 2px var(--color-primary)" : undefined,
        transition: "background-color 0.1s, box-shadow 0.1s",
        userSelect: "none",
      }}
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.button !== 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        gridDragRef.current = { startY: e.clientY - rect.top, rect };
      }}
    >
      {/* Off-hours dim */}
      <div className="absolute left-0 right-0 pointer-events-none" style={{ top: 0, height: openingMin * PX_PER_MINUTE, backgroundColor: "rgba(0,0,0,0.04)" }} />
      <div className="absolute left-0 right-0 pointer-events-none" style={{ top: closingMin * PX_PER_MINUTE, height: (GRID_END_MIN - closingMin) * PX_PER_MINUTE, backgroundColor: "rgba(0,0,0,0.04)" }} />

      {lines.map(({ offset, isHour, isHalf }) => (
        <div key={offset} className="absolute left-0 right-0 pointer-events-none" style={{ top: offset * PX_PER_MINUTE, height: 1, backgroundColor: "var(--border)", opacity: isHour ? 0.3 : isHalf ? 0.15 : 0.06 }} />
      ))}

      {/* TimeBlock cards */}
      {timeBlocks.map((b) => (
        <TimeBlockCard
          key={b.id}
          topPx={isoToTopPx(b.date)}
          heightPx={isoToHeightPx(b.date, b.endTime)}
          reason={b.reason}
          onClick={(cx, cy) => onBlockClick(b, cx, cy)}
        />
      ))}

      {/* Appointment cards */}
      {positioned.map((pos) => {
        const durationMin = Math.round(pos.heightPx / PX_PER_MINUTE);
        const canDrag =
          pos.appointment.status !== "cancelled" &&
          pos.appointment.status !== "no_show" &&
          (userRole !== "barber" || pos.appointment.professionalId === userProfessionalId);
        return (
          <AppointmentCard
            key={pos.appointment.id}
            appointment={pos.appointment}
            columnIndex={pos.columnIndex}
            columnCount={pos.columnCount}
            topPx={pos.topPx}
            heightPx={pos.heightPx}
            onClick={(cx, cy) => onCardClick(pos.appointment, cx, cy)}
            draggable={canDrag}
            durationMin={durationMin}
          />
        );
      })}

      {/* Drag-to-create preview */}
      {dragPreview && (
        <div
          className="absolute left-0 right-0 pointer-events-none z-30 rounded"
          style={{
            top: dragPreview.topPx,
            height: Math.max(16, dragPreview.heightPx),
            backgroundImage: "repeating-linear-gradient(45deg, rgba(100,100,100,0.25) 0px, rgba(100,100,100,0.25) 4px, transparent 4px, transparent 10px)",
            backgroundColor: "rgba(100,100,100,0.15)",
            border: "1px dashed rgba(100,100,100,0.4)",
          }}
        />
      )}

      {snapGuideMin !== null && (
        <div className="absolute left-0 right-0 pointer-events-none z-20" style={{ top: snapGuideMin * PX_PER_MINUTE, height: 2, backgroundColor: "var(--color-primary)", opacity: 0.6 }} />
      )}
      {showNowIndicator && <NowIndicator />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DayView — componente principal
// ══════════════════════════════════════════════════════════════════════════════

export default function DayView({ initialData, initialDateKey, services }: DayViewProps) {
  const [data, setData] = useState(initialData);
  const [dateKey, setDateKey] = useState(initialDateKey);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [toast, setToast] = useState<Toast>(null);
  const [isPending, startTransition] = useTransition();
  const [draggingAppt, setDraggingAppt] = useState<AgendaAppointment | null>(null);
  const [snapGuideMin, setSnapGuideMin] = useState<number | null>(null);
  const [selectedProfIds, setSelectedProfIds] = useState<string[]>([]);

  const gridScrollRef = useRef<HTMLDivElement>(null);

  // Scroll to current real time on mount, with ~1.5h of context before.
  useEffect(() => {
    if (gridScrollRef.current) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      gridScrollRef.current.scrollTop = Math.max(0, (nowMin - 90) * PX_PER_MINUTE);
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 8px threshold: distinguishes a click from a drag intent.
      activationConstraint: { distance: 8 },
    }),
  );

  const openingMin = timeStrToMin(data.businessHour?.openTime ?? "08:00");
  const closingMin = timeStrToMin(data.businessHour?.closeTime ?? "20:00");

  // RBAC: barbers see only their own column
  const rbacProfessionals =
    data.userRole === "barber"
      ? data.professionals.filter((p) => p.id === data.userProfessionalId)
      : data.professionals;

  // Filter overlay (no-op for barbers — rbacProfessionals already has 1 entry)
  const visibleProfessionals =
    selectedProfIds.length === 0
      ? rbacProfessionals
      : rbacProfessionals.filter((p) => selectedProfIds.includes(p.id));

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg: string, kind: "success" | "error") {
    setToast({ msg, kind });
  }

  async function refreshData(dk: string) {
    const newData = await getAgendaDay(dk);
    setData(newData);
  }

  function navigate(delta: number) {
    const d = new Date(`${dateKey}T12:00:00`);
    d.setDate(d.getDate() + delta);
    const newKey = formatDateKey(d);
    setDateKey(newKey);
    startTransition(async () => { await refreshData(newKey); });
  }

  function goToday() {
    const newKey = formatDateKey(new Date());
    setDateKey(newKey);
    startTransition(async () => { await refreshData(newKey); });
  }

  function handleGridClick(professionalId: string, clickY: number, clientX: number, clientY: number) {
    if (data.userRole === "barber" && professionalId !== data.userProfessionalId) return;
    // clickY is relative to the top of the grid (which starts at GRID_START_MIN = 0).
    const rawMin = clickY / PX_PER_MINUTE;
    const rounded = Math.round(rawMin / 10) * 10;
    const clamped = Math.max(openingMin, Math.min(closingMin - 10, rounded));
    setModal({ type: "create", professionalId, suggestedMinute: clamped, dateKey, anchorX: clientX, anchorY: clientY });
  }

  // ── DnD handlers ────────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const appt = data.appointments.find((a) => a.id === event.active.id);
    setDraggingAppt(appt ?? null);
    setSnapGuideMin(null);
  }

  function handleDragMove(event: DragMoveEvent) {
    const { active, over } = event;
    if (!over || !active.rect.current.translated) { setSnapGuideMin(null); return; }
    const translated = active.rect.current.translated;
    const cardMidY = translated.top + translated.height / 2;
    const offsetY = cardMidY - over.rect.top;
    const snapped = calcDropMinute(offsetY, GRID_START_MIN, PX_PER_MINUTE, GRID_END_MIN);
    setSnapGuideMin(snapped % 60 === 0 ? snapped : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingAppt(null);
    setSnapGuideMin(null);
    const { active, over } = event;
    if (!over || !active.rect.current.translated) return;

    const dragData = active.data.current as DragData | undefined;
    if (!dragData) return;

    const dropData = over.data.current as { professionalId: string } | undefined;
    if (!dropData) return;

    // Compute Y of card midpoint within the droppable zone (viewport coords cancel out).
    const translated = active.rect.current.translated;
    const cardMidY = translated.top + translated.height / 2;
    const offsetY = cardMidY - over.rect.top;

    const newMin = calcDropMinute(offsetY, GRID_START_MIN, PX_PER_MINUTE, GRID_END_MIN);
    const newProfessionalId = dropData.professionalId;
    const newDateISO = dateTimeToISO(dateKey, minToTimeStr(newMin));

    // Optimistic client-side conflict check for immediate UX feedback.
    if (
      checkClientConflict(
        data.appointments,
        newProfessionalId,
        newDateISO,
        dragData.durationMin,
        dragData.appointmentId,
      )
    ) {
      showToast("Horário em conflito com outro agendamento.", "error");
      return;
    }

    startTransition(async () => {
      const res = await rescheduleAppointment(
        dragData.appointmentId,
        newDateISO,
        newProfessionalId,
      );
      if (res.success) {
        showToast("Agendamento reagendado!", "success");
        await refreshData(dateKey);
      } else {
        // Server is the authority — reload to restore original card positions.
        showToast(res.error ?? "Erro ao reagendar.", "error");
        await refreshData(dateKey);
      }
    });
  }

  // ── Create / Edit / Move / Status handlers ───────────────────────────────────

  function handleCreate(formData: {
    professionalId: string;
    serviceIds: string[];
    dateISO: string;
    clientName: string;
    clientPhone: string;
    notes: string;
  }) {
    startTransition(async () => {
      const res = await createQuickAppointment({
        professionalId: formData.professionalId,
        serviceIds: formData.serviceIds,
        dateISO: formData.dateISO,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        notes: formData.notes || undefined,
      });
      if (res.success) {
        showToast("Agendamento criado!", "success");
        setModal({ type: "none" });
        await refreshData(dateKey);
      } else {
        showToast(res.error ?? "Erro ao criar agendamento.", "error");
      }
    });
  }

  function handleEdit(formData: {
    serviceIds: string[];
    dateISO: string;
    clientName: string;
    clientPhone: string;
    notes: string;
  }) {
    if (modal.type !== "edit") return;
    const id = modal.appointment.id;
    startTransition(async () => {
      const res = await updateAppointment(id, {
        serviceIds: formData.serviceIds,
        dateISO: formData.dateISO,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        notes: formData.notes || undefined,
      });
      if (res.success) {
        showToast("Agendamento atualizado!", "success");
        setModal({ type: "none" });
        await refreshData(dateKey);
      } else {
        showToast(res.error ?? "Erro ao editar.", "error");
      }
    });
  }

  function handleStatusChange(
    appointment: AgendaAppointment,
    status: "confirmed" | "completed" | "cancelled" | "no_show",
  ) {
    startTransition(async () => {
      const res = await updateAppointmentStatus(appointment.id, status);
      if (res.success) {
        showToast("Status atualizado!", "success");
        setModal({ type: "none" });
        await refreshData(dateKey);
      } else {
        showToast("Erro ao atualizar status.", "error");
      }
    });
  }

  function handleMarkWhatsapp(
    appointment: AgendaAppointment,
    type: "confirmation" | "reminder" | "noshow",
  ) {
    startTransition(async () => {
      const res = await markWhatsappSent(appointment.id, type);
      if (res.success) {
        showToast(
          type === "noshow" ? "Falta registrada." : "Notificação registrada.",
          "success",
        );
        setModal({ type: "none" });
        await refreshData(dateKey);
      } else {
        showToast(res.error ?? "Erro ao registrar notificação.", "error");
      }
    });
  }

  function handleMove(appointment: AgendaAppointment, newProfId: string) {
    startTransition(async () => {
      const res = await moveAppointment(appointment.id, newProfId);
      if (res.success) {
        showToast("Agendamento movido!", "success");
        setModal({ type: "none" });
        await refreshData(dateKey);
      } else {
        showToast(res.error ?? "Erro ao mover.", "error");
      }
    });
  }

  function handleAbrirComanda(appointment: AgendaAppointment) {
    startTransition(async () => {
      try {
        await abrirComanda({
          professionalId: appointment.professionalId,
          clientId: appointment.clientId ?? undefined,
          clientName: appointment.clientName,
          notes: appointment.notes ?? undefined,
          appointmentId: appointment.id,
        });
      } catch {
        // abrirComanda redirects on success (NEXT_REDIRECT) — expected.
      }
    });
  }

  function handleDelete(appointment: AgendaAppointment) {
    startTransition(async () => {
      const res = await deleteAppointment(appointment.id);
      if (res.success) {
        showToast("Agendamento excluído.", "success");
        setModal({ type: "none" });
        await refreshData(dateKey);
      } else {
        showToast(res.error ?? "Erro ao excluir.", "error");
      }
    });
  }

  function handleTimeBlockCreate(
    professionalId: string,
    startMin: number,
    endMin: number,
    clientX: number,
    clientY: number,
  ) {
    const startISO = dateTimeToISO(dateKey, minToTimeStr(startMin));
    const endISO = dateTimeToISO(dateKey, minToTimeStr(endMin));
    setModal({ type: "block-create", professionalId, startISO, endISO, anchorX: clientX, anchorY: clientY });
  }

  function handleTimeBlockDelete(blockId: string) {
    startTransition(async () => {
      const res = await deleteTimeBlock(blockId);
      if (res.success) {
        showToast("Bloqueio removido.", "success");
        setModal({ type: "none" });
        await refreshData(dateKey);
      } else {
        showToast(res.error ?? "Erro ao remover bloqueio.", "error");
      }
    });
  }

  function handleTimeBlockConfirm(startISO: string, endISO: string, reason: string, professionalId: string) {
    const durationMin = Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 60_000);
    startTransition(async () => {
      const res = await createTimeBlock(professionalId, startISO, durationMin, reason || undefined);
      if (res.success) {
        showToast("Horário bloqueado!", "success");
        setModal({ type: "none" });
        await refreshData(dateKey);
      } else {
        showToast(res.error ?? "Erro ao bloquear horário.", "error");
      }
    });
  }

  const dateLabel = formatDateLabel(dateKey);
  const isToday = isTodayKey(dateKey);

  return (
    <DndContext
      sensors={sensors}
      measuring={DND_MEASURING}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full min-h-0">
        {/* ── Day navigation header ─────────── */}
        <div
          className="shrink-0 flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={isPending}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            aria-label="Dia anterior"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            disabled={isPending}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            aria-label="Próximo dia"
          >
            ▶
          </button>

          <h2
            className="flex-1 text-sm font-semibold capitalize"
            style={{ color: isToday ? "var(--color-primary)" : "var(--text-primary)" }}
          >
            {dateLabel}
            {isToday && (
              <span className="ml-2 text-xs font-normal" style={{ color: "var(--color-primary)" }}>
                Hoje
              </span>
            )}
          </h2>

          {!isToday && (
            <button
              type="button"
              onClick={goToday}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              Hoje
            </button>
          )}

          {isPending && (
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Carregando…
            </span>
          )}

          {data.businessHour && !data.businessHour.isOpen && (
            <span
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: "var(--status-red-faint, #fee2e2)", color: "var(--status-red)" }}
            >
              Fechado
            </span>
          )}

          <ProfessionalFilter
            professionals={rbacProfessionals}
            selectedIds={selectedProfIds}
            onChange={setSelectedProfIds}
          />
        </div>

        {/* ── Grid body ─────────────────────── */}
        <div ref={gridScrollRef} className="flex-1 min-h-0 overflow-auto">
          <div style={{ minWidth: RULER_WIDTH + visibleProfessionals.length * MIN_COL_WIDTH }}>
            {/* Professional name header (sticky) */}
            <div
              className="flex sticky top-0 z-10"
              style={{ backgroundColor: "var(--bg-card)" }}
            >
              <div
                className="shrink-0 border-r border-b"
                style={{ width: RULER_WIDTH, borderColor: "var(--border)" }}
              />
              {visibleProfessionals.map((prof) => (
                <div
                  key={prof.id}
                  className="flex-1 border-l border-b px-2 py-2 text-center text-xs font-semibold truncate"
                  style={{
                    minWidth: MIN_COL_WIDTH,
                    borderColor: "var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {prof.name}
                </div>
              ))}
            </div>

            {/* Time ruler + professional columns */}
            <div className="flex">
              <TimeRuler openingMin={GRID_START_MIN} closingMin={GRID_END_MIN} />
              {visibleProfessionals.length === 0 ? (
                <div
                  className="flex-1 flex items-center justify-center text-sm"
                  style={{ color: "var(--text-tertiary)", minHeight: 200 }}
                >
                  Nenhum profissional ativo.
                </div>
              ) : (
                visibleProfessionals.map((prof) => (
                  <ProfessionalColumn
                    key={prof.id}
                    professional={prof}
                    appointments={data.appointments.filter((a) => a.professionalId === prof.id)}
                    timeBlocks={data.timeBlocks.filter((b) => b.professionalId === prof.id)}
                    openingMin={openingMin}
                    closingMin={closingMin}
                    onGridClick={(y, cx, cy) => handleGridClick(prof.id, y, cx, cy)}
                    onCardClick={(appt, cx, cy) => setModal({ type: "detail", appointment: appt, anchorX: cx, anchorY: cy })}
                    onTimeBlockCreate={(startMin, endMin, cx, cy) => handleTimeBlockCreate(prof.id, startMin, endMin, cx, cy)}
                    onBlockClick={(b, cx, cy) => setModal({ type: "block-detail", block: b, anchorX: cx, anchorY: cy })}
                    userRole={data.userRole}
                    userProfessionalId={data.userProfessionalId}
                    showNowIndicator={isToday}
                    snapGuideMin={snapGuideMin}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Toast ─────────────────────────── */}
        {toast && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-lg z-50"
            style={{
              backgroundColor:
                toast.kind === "success" ? "var(--status-green)" : "var(--status-red)",
            }}
          >
            {toast.msg}
          </div>
        )}

        {/* ── DragOverlay — floating card clone that follows the pointer ── */}
        <DragOverlay dropAnimation={null}>
          {draggingAppt ? (
            <div
              style={{
                width: 150,
                minHeight: 38,
                opacity: 0.95,
                cursor: "grabbing",
                backgroundColor: STATUS_CONFIG[draggingAppt.status].color,
                borderLeft: `3px solid ${STATUS_CONFIG[draggingAppt.status].color}`,
                borderRadius: "0 8px 8px 0",
                padding: "4px 8px",
              }}
            >
              <p
                className="text-xs font-semibold leading-tight truncate"
                style={{ color: "#fff" }}
              >
                {draggingAppt.clientName}
              </p>
              <p
                className="text-xs leading-tight truncate mt-0.5"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                {draggingAppt.serviceName}
              </p>
            </div>
          ) : null}
        </DragOverlay>

        {/* ── Modals ────────────────────────── */}
        {modal.type === "detail" && (
          <DetailModal
            appointment={modal.appointment}
            userRole={data.userRole}
            barbershopName={data.barbershopName}
            professionalName={
              data.professionals.find(
                (p) => p.id === modal.appointment.professionalId,
              )?.name ?? ""
            }
            anchorX={modal.anchorX}
            anchorY={modal.anchorY}
            isPending={isPending}
            onClose={() => setModal({ type: "none" })}
            onEdit={() => setModal({ type: "edit", appointment: modal.appointment })}
            onMove={() => setModal({ type: "move", appointment: modal.appointment })}
            onStatusChange={(status) => handleStatusChange(modal.appointment, status)}
            onMarkWhatsapp={(type) => handleMarkWhatsapp(modal.appointment, type)}
            onAbrirComanda={() => handleAbrirComanda(modal.appointment)}
            onDelete={() => handleDelete(modal.appointment)}
          />
        )}
        {modal.type === "edit" && (
          <EditModal
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
            onMove={(newProfId) => handleMove(modal.appointment, newProfId)}
          />
        )}
        {modal.type === "create" && (
          <CreateModal
            professionalId={modal.professionalId}
            suggestedMinute={modal.suggestedMinute}
            dateKey={modal.dateKey}
            services={services}
            professionals={data.professionals}
            userRole={data.userRole}
            userProfessionalId={data.userProfessionalId}
            anchorX={modal.anchorX}
            anchorY={modal.anchorY}
            isPending={isPending}
            onClose={() => setModal({ type: "none" })}
            onCreate={handleCreate}
          />
        )}
        {modal.type === "block-create" && (
          <TimeBlockCreateModal
            anchorX={modal.anchorX}
            anchorY={modal.anchorY}
            suggestedStartISO={modal.startISO}
            suggestedEndISO={modal.endISO}
            professionals={data.professionals}
            professionalId={modal.professionalId}
            isPending={isPending}
            onClose={() => setModal({ type: "none" })}
            onCreate={handleTimeBlockConfirm}
          />
        )}
        {modal.type === "block-detail" && (
          <TimeBlockDetailModal
            anchorX={modal.anchorX}
            anchorY={modal.anchorY}
            reason={modal.block.reason}
            isPending={isPending}
            onClose={() => setModal({ type: "none" })}
            onDelete={() => handleTimeBlockDelete(modal.block.id)}
          />
        )}
      </div>
    </DndContext>
  );
}
