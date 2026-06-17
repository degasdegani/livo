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
  type DragStartEvent,
} from "@dnd-kit/core";
import { useEffect, useState, useTransition } from "react";
import { layoutAppointments } from "@/lib/agenda-layout";
import { calcDropMinute, checkClientConflict } from "@/lib/agenda-drag";
import { updateAppointmentStatus } from "../actions";
import { abrirComanda } from "../comandas/actions";
import type {
  AgendaAppointment,
  AgendaService,
  AgendaWeekData,
} from "./agenda-actions";
import {
  createQuickAppointment,
  getAgendaWeek,
  moveAppointment,
  rescheduleAppointment,
  updateAppointment,
} from "./agenda-actions";
import { AppointmentCard, type DragData } from "./components/appointment-card";
import { ProfessionalFilter } from "./components/professional-filter";
import { CreateModal } from "./components/create-modal";
import { DetailModal } from "./components/detail-modal";
import { EditModal } from "./components/edit-modal";
import { MoveModal } from "./components/move-modal";
import {
  PX_PER_MINUTE,
  RULER_WIDTH,
  STATUS_CONFIG,
  dateTimeToISO,
  formatDateKey,
  isoToDateKeyBRT,
  isTodayKey,
  minToTimeStr,
  timeStrToMin,
} from "./components/shared";
import { TimeRuler } from "./components/time-ruler";

// ─── Constantes ───────────────────────────────────────────────────────────────

const DAY_MIN_WIDTH = 120;
const DEFAULT_OPEN = "08:00";
const DEFAULT_CLOSE = "20:00";

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type ModalState =
  | { type: "none" }
  | { type: "detail"; appointment: AgendaAppointment }
  | { type: "edit"; appointment: AgendaAppointment }
  | { type: "move"; appointment: AgendaAppointment }
  | { type: "create"; professionalId: string; suggestedMinute: number; dateKey: string };

type Toast = { msg: string; kind: "success" | "error" } | null;

// ─── Props ────────────────────────────────────────────────────────────────────

interface WeekViewProps {
  initialData: AgendaWeekData;
  initialWeekStart: string;
  services: AgendaService[];
}

// ── DnD configuration ─────────────────────────────────────────────────────────

const DND_MEASURING = {
  droppable: { strategy: MeasuringStrategy.WhileDragging },
};

// ── Helpers locais ────────────────────────────────────────────────────────────

function dayColumnLabel(dateKey: string): { weekday: string; day: string } {
  const d = new Date(`${dateKey}T12:00:00`);
  return {
    weekday: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase(),
    day: String(d.getDate()).padStart(2, "0"),
  };
}

function weekRangeLabel(weekDates: string[]): string {
  if (weekDates.length < 7) return "";
  const first = new Date(`${weekDates[0]}T12:00:00`);
  const last  = new Date(`${weekDates[6]}T12:00:00`);
  const sameMonth = first.getMonth() === last.getMonth();
  const month = last.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  if (sameMonth) return `${first.getDate()}–${last.getDate()} ${month}`;
  const firstMonth = first.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${first.getDate()} ${firstMonth} – ${last.getDate()} ${month}`;
}

function getMondayOf(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  const dow = d.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + offset);
  return formatDateKey(d);
}

function globalHours(
  weekDates: string[],
  businessHours: AgendaWeekData["businessHours"],
): { openingMin: number; closingMin: number } {
  let openingMin = timeStrToMin(DEFAULT_OPEN);
  let closingMin = timeStrToMin(DEFAULT_CLOSE);
  let found = false;

  for (const dk of weekDates) {
    const dow = new Date(`${dk}T12:00:00`).getDay();
    const bh = businessHours[dow];
    if (!bh) continue;
    const o = timeStrToMin(bh.openTime);
    const c = timeStrToMin(bh.closeTime);
    if (!found) {
      openingMin = o;
      closingMin = c;
      found = true;
    } else {
      if (o < openingMin) openingMin = o;
      if (c > closingMin) closingMin = c;
    }
  }
  return { openingMin, closingMin };
}

// ══════════════════════════════════════════════════════════════════════════════
// DayColumn — one day's column inside WeekView
// ══════════════════════════════════════════════════════════════════════════════

function DayColumn({
  dateKey,
  appointments,
  openingMin,
  closingMin,
  onGridClick,
  onCardClick,
  userRole,
  userProfessionalId,
}: {
  dateKey: string;
  appointments: AgendaAppointment[];
  openingMin: number;
  closingMin: number;
  onGridClick: (clickY: number) => void;
  onCardClick: (appt: AgendaAppointment) => void;
  userRole: string;
  userProfessionalId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `week-day-${dateKey}`,
    data: { dateKey },
  });

  const positioned = layoutAppointments(appointments, openingMin, PX_PER_MINUTE);
  const totalMin = closingMin - openingMin;
  const gridHeight = totalMin * PX_PER_MINUTE;

  const lines: { offset: number; isHour: boolean; isHalf: boolean }[] = [];
  for (let i = 0; i <= totalMin; i += 10) {
    const absMin = openingMin + i;
    lines.push({ offset: i, isHour: absMin % 60 === 0, isHalf: absMin % 30 === 0 });
  }

  const isToday = isTodayKey(dateKey);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onGridClick(e.clientY - rect.top);
  }

  return (
    <div
      ref={setNodeRef}
      className="flex-1 relative border-l"
      style={{
        minWidth: DAY_MIN_WIDTH,
        height: gridHeight,
        borderColor: "var(--border)",
        cursor: "crosshair",
        backgroundColor: isOver
          ? "rgba(99, 102, 241, 0.06)"
          : isToday
            ? "rgba(var(--color-primary-rgb, 99,102,241), 0.03)"
            : undefined,
        boxShadow: isOver ? "inset 0 0 0 2px var(--color-primary)" : undefined,
        transition: "background-color 0.1s, box-shadow 0.1s",
      }}
      onClick={handleClick}
    >
      {lines.map(({ offset, isHour, isHalf }) => (
        <div
          key={offset}
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: offset * PX_PER_MINUTE,
            height: 1,
            backgroundColor: "var(--border)",
            opacity: isHour ? 0.5 : isHalf ? 0.25 : 0.1,
          }}
        />
      ))}
      {positioned.map((pos) => {
        const durationMin = Math.round(pos.heightPx / PX_PER_MINUTE);
        const canDrag =
          pos.appointment.status !== "cancelled" &&
          pos.appointment.status !== "no_show" &&
          (userRole !== "barber" ||
            pos.appointment.professionalId === userProfessionalId);

        return (
          <AppointmentCard
            key={pos.appointment.id}
            appointment={pos.appointment}
            columnIndex={pos.columnIndex}
            columnCount={pos.columnCount}
            topPx={pos.topPx}
            heightPx={pos.heightPx}
            onClick={() => onCardClick(pos.appointment)}
            draggable={canDrag}
            durationMin={durationMin}
          />
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WeekView — componente principal
// ══════════════════════════════════════════════════════════════════════════════

export default function WeekView({ initialData, initialWeekStart, services }: WeekViewProps) {
  const [data, setData] = useState(initialData);
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [toast, setToast] = useState<Toast>(null);
  const [isPending, startTransition] = useTransition();
  const [draggingAppt, setDraggingAppt] = useState<AgendaAppointment | null>(null);
  const [selectedProfIds, setSelectedProfIds] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const { openingMin, closingMin } = globalHours(data.weekDates, data.businessHours);

  // RBAC: barber sees only own appointments (server already scoped)
  // but the grid still shows all 7 day columns.

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg: string, kind: "success" | "error") {
    setToast({ msg, kind });
  }

  async function refreshWeek(ws: string) {
    const newData = await getAgendaWeek(ws);
    setData(newData);
  }

  function navigate(deltaDays: number) {
    const d = new Date(`${weekStart}T12:00:00`);
    d.setDate(d.getDate() + deltaDays);
    const newStart = formatDateKey(d);
    setWeekStart(newStart);
    startTransition(async () => { await refreshWeek(newStart); });
  }

  function goToday() {
    const newStart = getMondayOf(formatDateKey(new Date()));
    setWeekStart(newStart);
    startTransition(async () => { await refreshWeek(newStart); });
  }

  function handleGridClick(dateKey: string, clickY: number) {
    const rawMin = openingMin + clickY / PX_PER_MINUTE;
    const rounded = Math.round(rawMin / 10) * 10;
    const clamped = Math.max(openingMin, Math.min(closingMin - 10, rounded));
    const defaultProfId = data.professionals[0]?.id ?? "";
    setModal({ type: "create", professionalId: defaultProfId, suggestedMinute: clamped, dateKey });
  }

  // ── DnD handlers ────────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const allAppts = Object.values(data.appointmentsByDay).flat();
    const appt = allAppts.find((a) => a.id === event.active.id);
    setDraggingAppt(appt ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingAppt(null);
    const { active, over } = event;
    if (!over || !active.rect.current.translated) return;

    const dragData = active.data.current as DragData | undefined;
    if (!dragData) return;

    const dropData = over.data.current as { dateKey: string } | undefined;
    if (!dropData) return;

    const translated = active.rect.current.translated;
    const cardMidY = translated.top + translated.height / 2;
    const offsetY = cardMidY - over.rect.top;

    const newMin = calcDropMinute(offsetY, openingMin, PX_PER_MINUTE, closingMin);
    const targetDateKey = dropData.dateKey;
    const newDateISO = dateTimeToISO(targetDateKey, minToTimeStr(newMin));

    // In WeekView, dragging changes date+time but keeps the same professional.
    const newProfessionalId = dragData.professionalId;

    const allAppts = Object.values(data.appointmentsByDay).flat();

    if (
      checkClientConflict(
        allAppts,
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
        await refreshWeek(weekStart);
      } else {
        showToast(res.error ?? "Erro ao reagendar.", "error");
        await refreshWeek(weekStart);
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
        await refreshWeek(weekStart);
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
        await refreshWeek(weekStart);
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
        await refreshWeek(weekStart);
      } else {
        showToast("Erro ao atualizar status.", "error");
      }
    });
  }

  function handleMove(appointment: AgendaAppointment, newProfId: string) {
    startTransition(async () => {
      const res = await moveAppointment(appointment.id, newProfId);
      if (res.success) {
        showToast("Agendamento movido!", "success");
        setModal({ type: "none" });
        await refreshWeek(weekStart);
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

  function getDateKeyForModal(): string {
    if (modal.type === "create") return modal.dateKey;
    if (modal.type === "detail" || modal.type === "edit" || modal.type === "move") {
      return isoToDateKeyBRT(modal.appointment.date);
    }
    return weekStart;
  }

  const rangeLabel = weekRangeLabel(data.weekDates);
  const isCurrentWeek = getMondayOf(formatDateKey(new Date())) === weekStart;

  return (
    <DndContext
      sensors={sensors}
      measuring={DND_MEASURING}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full min-h-0">
        {/* ── Week navigation header ─────────────────────────────────── */}
        <div
          className="shrink-0 flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <button
            type="button"
            onClick={() => navigate(-7)}
            disabled={isPending}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            aria-label="Semana anterior"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => navigate(7)}
            disabled={isPending}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            aria-label="Próxima semana"
          >
            ▶
          </button>

          <h2
            className="flex-1 text-sm font-semibold"
            style={{ color: isCurrentWeek ? "var(--color-primary)" : "var(--text-primary)" }}
          >
            {rangeLabel}
            {isCurrentWeek && (
              <span className="ml-2 text-xs font-normal" style={{ color: "var(--color-primary)" }}>
                Esta semana
              </span>
            )}
          </h2>

          {!isCurrentWeek && (
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

          <ProfessionalFilter
            professionals={data.professionals}
            selectedIds={selectedProfIds}
            onChange={setSelectedProfIds}
          />
        </div>

        {/* ── Grid body ─────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-auto">
          <div style={{ minWidth: RULER_WIDTH + data.weekDates.length * DAY_MIN_WIDTH }}>
            {/* Day name header (sticky) */}
            <div
              className="flex sticky top-0 z-10"
              style={{ backgroundColor: "var(--bg-card)" }}
            >
              <div
                className="shrink-0 border-r border-b"
                style={{ width: RULER_WIDTH, borderColor: "var(--border)" }}
              />
              {data.weekDates.map((dk) => {
                const { weekday, day } = dayColumnLabel(dk);
                const isToday = isTodayKey(dk);
                const dow = new Date(`${dk}T12:00:00`).getDay();
                const bh = data.businessHours[dow];
                const isClosed = bh ? !bh.isOpen : false;

                return (
                  <div
                    key={dk}
                    className="flex-1 border-l border-b px-1 py-1.5 text-center"
                    style={{
                      minWidth: DAY_MIN_WIDTH,
                      borderColor: "var(--border)",
                      opacity: isClosed ? 0.5 : 1,
                    }}
                  >
                    <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
                      {weekday}
                    </p>
                    <p
                      className={`text-sm font-bold ${isToday ? "w-7 h-7 flex items-center justify-center rounded-full mx-auto text-white" : ""}`}
                      style={{
                        color: isToday ? "#fff" : "var(--text-primary)",
                        backgroundColor: isToday ? "var(--color-primary)" : undefined,
                      }}
                    >
                      {day}
                    </p>
                    {isClosed && (
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        fechado
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time ruler + day columns */}
            <div className="flex">
              <TimeRuler openingMin={openingMin} closingMin={closingMin} />
              {data.weekDates.map((dk) => {
                const appts = (data.appointmentsByDay[dk] ?? []).filter(
                  (a) => selectedProfIds.length === 0 || selectedProfIds.includes(a.professionalId),
                );
                return (
                  <DayColumn
                    key={dk}
                    dateKey={dk}
                    appointments={appts}
                    openingMin={openingMin}
                    closingMin={closingMin}
                    onGridClick={(y) => handleGridClick(dk, y)}
                    onCardClick={(appt) => setModal({ type: "detail", appointment: appt })}
                    userRole={data.userRole}
                    userProfessionalId={data.userProfessionalId}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Toast ─────────────────────────────────────────────────── */}
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
              className={`rounded border px-1.5 py-1 shadow-xl ${STATUS_CONFIG[draggingAppt.status].bg} ${STATUS_CONFIG[draggingAppt.status].border}`}
              style={{ width: 110, minHeight: 38, opacity: 0.95, cursor: "grabbing" }}
            >
              <p
                className="text-xs font-semibold leading-tight truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {draggingAppt.clientName}
              </p>
              <p
                className="text-xs leading-tight truncate mt-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {draggingAppt.serviceName}
              </p>
            </div>
          ) : null}
        </DragOverlay>

        {/* ── Modals ────────────────────────────────────────────────── */}
        {modal.type === "detail" && (
          <DetailModal
            appointment={modal.appointment}
            userRole={data.userRole}
            isPending={isPending}
            onClose={() => setModal({ type: "none" })}
            onEdit={() => setModal({ type: "edit", appointment: modal.appointment })}
            onMove={() => setModal({ type: "move", appointment: modal.appointment })}
            onStatusChange={(status) => handleStatusChange(modal.appointment, status)}
            onAbrirComanda={() => handleAbrirComanda(modal.appointment)}
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
            dateKey={getDateKeyForModal()}
            services={services}
            professionals={data.professionals}
            userRole={data.userRole}
            userProfessionalId={data.userProfessionalId}
            isPending={isPending}
            onClose={() => setModal({ type: "none" })}
            onCreate={handleCreate}
          />
        )}
      </div>
    </DndContext>
  );
}
