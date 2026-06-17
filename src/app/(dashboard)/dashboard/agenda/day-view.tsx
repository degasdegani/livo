"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { layoutAppointments } from "@/lib/agenda-layout";
import { updateAppointmentStatus } from "../actions";
import { abrirComanda } from "../comandas/actions";
import type {
  AgendaAppointment,
  AgendaClientResult,
  AgendaDayData,
  AgendaService,
} from "./agenda-actions";
import {
  createQuickAppointment,
  getAgendaDay,
  moveAppointment,
  searchClientsForAgenda,
  updateAppointment,
} from "./agenda-actions";

// ─── Constantes ───────────────────────────────────────────────────────────────

const PX_PER_MINUTE = 2;
const MIN_COL_WIDTH = 160; // px — minimum width per professional column
const RULER_WIDTH = 56; // px — left time ruler

// Mirrors STATUS_CONFIG from agenda-board (Tailwind semântico, não hardcode de tema)
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

// ─── Helpers de data ──────────────────────────────────────────────────────────

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

/** Minutes since midnight for a BRT time string like "09:00". */
function timeStrToMin(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/** "HH:MM" string from minutes-since-midnight. */
function minToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Convert ISO UTC → "HH:MM" in BRT (UTC-3, no DST since 2019). */
function isoToTimeBRT(isoStr: string): string {
  const utcMs = new Date(isoStr).getTime();
  const brtMs = utcMs - 3 * 60 * 60 * 1_000;
  const d = new Date(brtMs);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const mn = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${mn}`;
}

/** Convert ISO UTC → "YYYY-MM-DD" in BRT. */
function isoToDateKeyBRT(isoStr: string): string {
  const utcMs = new Date(isoStr).getTime();
  const brtMs = utcMs - 3 * 60 * 60 * 1_000;
  const d = new Date(brtMs);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** Build UTC ISO from a dateKey + "HH:MM" BRT time. */
function dateTimeToISO(dateKey: string, time: string): string {
  return new Date(`${dateKey}T${time}:00-03:00`).toISOString();
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
}

// ─── Tipos de modal ───────────────────────────────────────────────────────────

type ModalState =
  | { type: "none" }
  | { type: "detail"; appointment: AgendaAppointment }
  | { type: "edit"; appointment: AgendaAppointment }
  | { type: "move"; appointment: AgendaAppointment }
  | { type: "create"; professionalId: string; suggestedMinute: number; dateKey: string };

type Toast = { msg: string; kind: "success" | "error" } | null;

// ─── Props ────────────────────────────────────────────────────────────────────

interface DayViewProps {
  initialData: AgendaDayData;
  initialDateKey: string;
  services: AgendaService[];
}

// ══════════════════════════════════════════════════════════════════════════════
// TimeRuler
// ══════════════════════════════════════════════════════════════════════════════

function TimeRuler({
  openingMin,
  closingMin,
}: {
  openingMin: number;
  closingMin: number;
}) {
  const totalMin = closingMin - openingMin;
  const marks: { offset: number; isHour: boolean; isHalf: boolean }[] = [];
  for (let i = 0; i <= totalMin; i += 10) {
    const absMin = openingMin + i;
    marks.push({ offset: i, isHour: absMin % 60 === 0, isHalf: absMin % 30 === 0 });
  }

  return (
    <div
      className="relative shrink-0 border-r select-none"
      style={{
        width: RULER_WIDTH,
        height: totalMin * PX_PER_MINUTE,
        borderColor: "var(--border)",
      }}
    >
      {marks.map(({ offset, isHour }) => (
        <div
          key={offset}
          className="absolute right-0 left-0 flex items-center justify-end pr-2"
          style={{ top: offset * PX_PER_MINUTE, transform: "translateY(-50%)" }}
        >
          {isHour && (
            <span
              className="text-xs tabular-nums"
              style={{ color: "var(--text-tertiary)" }}
            >
              {minToTimeStr(openingMin + offset)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AppointmentCard
// ══════════════════════════════════════════════════════════════════════════════

function AppointmentCard({
  appointment,
  columnIndex,
  columnCount,
  topPx,
  heightPx,
  onClick,
}: {
  appointment: AgendaAppointment;
  columnIndex: number;
  columnCount: number;
  topPx: number;
  heightPx: number;
  onClick: () => void;
}) {
  const config = STATUS_CONFIG[appointment.status];
  const isInactive =
    appointment.status === "cancelled" || appointment.status === "no_show";

  const GAP = 2; // px between sub-columns
  const totalGap = GAP * (columnCount - 1);
  // CSS calc expressions for left and width relative to the column container.
  const leftCalc =
    columnCount === 1
      ? "0px"
      : `calc((100% - ${totalGap}px) * ${columnIndex} / ${columnCount} + ${columnIndex * GAP}px)`;
  const widthCalc =
    columnCount === 1
      ? "100%"
      : `calc((100% - ${totalGap}px) / ${columnCount})`;

  const serviceLabel =
    appointment.services.length > 1
      ? `${appointment.services[0].serviceName} +${appointment.services.length - 1}`
      : appointment.serviceName;

  return (
    <div
      role="button"
      tabIndex={0}
      className={`absolute rounded border overflow-hidden cursor-pointer transition-opacity ${config.bg} ${config.border}`}
      style={{
        top: topPx + 1,
        height: Math.max(20, heightPx - 2),
        left: leftCalc,
        width: widthCalc,
        opacity: isInactive ? 0.4 : 1,
        zIndex: isInactive ? 0 : 1,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="px-1.5 py-1 h-full overflow-hidden">
        <p
          className="text-xs font-semibold leading-tight truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {appointment.clientName}
        </p>
        {heightPx > 28 && (
          <p
            className="text-xs leading-tight truncate mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            {serviceLabel}
          </p>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ProfessionalColumn
// ══════════════════════════════════════════════════════════════════════════════

function ProfessionalColumn({
  professional,
  appointments,
  openingMin,
  closingMin,
  onGridClick,
  onCardClick,
}: {
  professional: { id: string; name: string; avatarUrl: string | null };
  appointments: AgendaAppointment[];
  openingMin: number;
  closingMin: number;
  onGridClick: (clickY: number) => void;
  onCardClick: (appt: AgendaAppointment) => void;
}) {
  const positioned = layoutAppointments(appointments, openingMin, PX_PER_MINUTE);
  const totalMin = closingMin - openingMin;
  const gridHeight = totalMin * PX_PER_MINUTE;

  // Build horizontal grid lines at every 10 minutes.
  const lines: { offset: number; isHour: boolean; isHalf: boolean }[] = [];
  for (let i = 0; i <= totalMin; i += 10) {
    const absMin = openingMin + i;
    lines.push({ offset: i, isHour: absMin % 60 === 0, isHalf: absMin % 30 === 0 });
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onGridClick(e.clientY - rect.top);
  }

  return (
    <div
      className="flex-1 relative border-l"
      style={{
        minWidth: MIN_COL_WIDTH,
        height: gridHeight,
        borderColor: "var(--border)",
        cursor: "crosshair",
      }}
      onClick={handleClick}
    >
      {/* Grid lines */}
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

      {/* Appointment cards */}
      {positioned.map((pos) => (
        <AppointmentCard
          key={pos.appointment.id}
          appointment={pos.appointment}
          columnIndex={pos.columnIndex}
          columnCount={pos.columnCount}
          topPx={pos.topPx}
          heightPx={pos.heightPx}
          onClick={() => onCardClick(pos.appointment)}
        />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Client autocomplete hook (shared by Create and Edit modals)
// ══════════════════════════════════════════════════════════════════════════════

function useClientSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AgendaClientResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<AgendaClientResult | null>(null);
  const [isManual, setIsManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleInput(term: string) {
    setQuery(term);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (term.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchClientsForAgenda(term.trim());
      setResults(res);
      setShowDropdown(res.length > 0);
      setIsSearching(false);
    }, 300);
  }

  function selectClient(c: AgendaClientResult) {
    setSelected(c);
    setQuery(c.name);
    setShowDropdown(false);
  }

  function reset() {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setSelected(null);
    setIsManual(false);
    setManualName("");
    setManualPhone("");
  }

  const finalName = selected?.name ?? (isManual ? manualName : query.trim());
  const finalPhone = selected?.phone ?? (isManual ? manualPhone : "");

  return {
    query,
    results,
    isSearching,
    showDropdown,
    selected,
    isManual,
    manualName,
    manualPhone,
    finalName,
    finalPhone,
    handleInput,
    selectClient,
    setIsManual,
    setManualName,
    setManualPhone,
    reset,
    setShowDropdown,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// DetailModal — view appointment info + action buttons
// ══════════════════════════════════════════════════════════════════════════════

function DetailModal({
  appointment,
  userRole,
  onClose,
  onEdit,
  onMove,
  onStatusChange,
  onAbrirComanda,
  isPending,
}: {
  appointment: AgendaAppointment;
  userRole: string;
  onClose: () => void;
  onEdit: () => void;
  onMove: () => void;
  onStatusChange: (status: "confirmed" | "completed" | "cancelled" | "no_show") => void;
  onAbrirComanda: () => void;
  isPending: boolean;
}) {
  const config = STATUS_CONFIG[appointment.status];
  const canManage =
    userRole !== "barber";
  const isEditable =
    appointment.status === "pending" || appointment.status === "confirmed";

  const totalPrice = appointment.services.length > 0
    ? appointment.services.reduce((s, sv) => s + sv.servicePriceInCents, 0)
    : appointment.servicePriceInCents;

  return (
    <Modal open onClose={onClose} title="Agendamento" size="sm">
      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
        <span className={`text-sm font-medium ${config.text}`}>{config.label}</span>
      </div>

      {/* Info */}
      <div className="space-y-2 mt-3">
        <InfoRow label="Cliente" value={appointment.clientName} />
        {appointment.clientPhone && (
          <InfoRow label="Telefone" value={appointment.clientPhone} />
        )}
        <InfoRow label="Horário" value={`${isoToTimeBRT(appointment.date)}`} />
        {appointment.endTime && (
          <InfoRow label="Término" value={isoToTimeBRT(appointment.endTime)} />
        )}
        {appointment.services.length > 0 ? (
          <div>
            <span className="text-xs uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
              Serviços
            </span>
            <ul className="mt-1 space-y-0.5">
              {appointment.services.map((s) => (
                <li key={s.id} className="text-sm flex justify-between" style={{ color: "var(--text-primary)" }}>
                  <span>{s.serviceName}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{formatCurrency(s.servicePriceInCents)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <InfoRow label="Serviço" value={`${appointment.serviceName} — ${formatCurrency(appointment.servicePriceInCents)}`} />
        )}
        {appointment.services.length > 1 && (
          <InfoRow label="Total" value={formatCurrency(totalPrice)} />
        )}
        {appointment.notes && <InfoRow label="Obs." value={appointment.notes} />}
      </div>

      {/* Actions */}
      {canManage && isEditable && (
        <div className="space-y-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          {/* Comanda */}
          {appointment.comandaId ? (
            <a
              href={`/dashboard/comandas/${appointment.comandaId}`}
              className="block w-full text-center rounded-lg py-2 text-sm font-medium transition-colors"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              Ver Comanda
            </a>
          ) : (
            <button
              type="button"
              onClick={onAbrirComanda}
              disabled={isPending}
              className="w-full rounded-lg py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              Abrir Comanda
            </button>
          )}

          {/* Edit / Move */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 rounded-lg py-2 text-sm transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              Editar
            </button>
            {(userRole === "owner" || userRole === "reception") && (
              <button
                type="button"
                onClick={onMove}
                className="flex-1 rounded-lg py-2 text-sm transition-colors"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                Mover
              </button>
            )}
          </div>

          {/* Status transitions */}
          <div className="grid grid-cols-2 gap-2">
            {appointment.status === "pending" && (
              <button
                type="button"
                onClick={() => onStatusChange("confirmed")}
                disabled={isPending}
                className="rounded-lg py-2 text-xs font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--status-green)" }}
              >
                Confirmar
              </button>
            )}
            {isEditable && (
              <button
                type="button"
                onClick={() => onStatusChange("no_show")}
                disabled={isPending}
                className="rounded-lg py-2 text-xs font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--status-gray, #6b7280)" }}
              >
                Não compareceu
              </button>
            )}
            {isEditable && (
              <button
                type="button"
                onClick={() => onStatusChange("cancelled")}
                disabled={isPending}
                className="rounded-lg py-2 text-xs font-medium text-white disabled:opacity-50 col-span-2"
                style={{ backgroundColor: "var(--status-red)" }}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="shrink-0 w-20 text-right" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <span style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ServiceChips — multi-select service selector
// ══════════════════════════════════════════════════════════════════════════════

function ServiceChips({
  services,
  selected,
  onChange,
}: {
  services: AgendaService[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {services.map((s) => {
        const isOn = selected.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => toggle(s.id)}
            className="rounded-full px-3 py-1 text-xs font-medium transition-all border"
            style={
              isOn
                ? {
                    backgroundColor: "var(--color-primary)",
                    color: "#fff",
                    borderColor: "var(--color-primary)",
                  }
                : {
                    backgroundColor: "transparent",
                    color: "var(--text-secondary)",
                    borderColor: "var(--border)",
                  }
            }
          >
            {s.name}
            {isOn && (
              <span className="ml-1 opacity-70">
                {s.durationMin}min
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CreateModal — new appointment with multi-service
// ══════════════════════════════════════════════════════════════════════════════

function CreateModal({
  professionalId: initialProfId,
  suggestedMinute,
  dateKey,
  services,
  professionals,
  userRole,
  userProfessionalId,
  isPending,
  onClose,
  onCreate,
}: {
  professionalId: string;
  suggestedMinute: number;
  dateKey: string;
  services: AgendaService[];
  professionals: { id: string; name: string }[];
  userRole: string;
  userProfessionalId: string | null;
  isPending: boolean;
  onClose: () => void;
  onCreate: (data: {
    professionalId: string;
    serviceIds: string[];
    dateISO: string;
    clientName: string;
    clientPhone: string;
    notes: string;
  }) => void;
}) {
  const [profId, setProfId] = useState(initialProfId);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [time, setTime] = useState(minToTimeStr(suggestedMinute));
  const [notes, setNotes] = useState("");
  const cs = useClientSearch();

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.priceInCents, 0);
  const endTimeStr = totalDuration > 0 ? minToTimeStr(timeStrToMin(time) + totalDuration) : "";

  const canSubmit =
    selectedServiceIds.length > 0 && cs.finalName.trim() && cs.finalPhone.trim();

  function handleSubmit() {
    if (!canSubmit) return;
    onCreate({
      professionalId: profId,
      serviceIds: selectedServiceIds,
      dateISO: dateTimeToISO(dateKey, time),
      clientName: cs.finalName.trim(),
      clientPhone: cs.finalPhone.trim(),
      notes,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Novo Agendamento"
      size="md"
      footer={{
        cancel: { onClick: onClose },
        confirm: {
          label: "Agendar",
          onClick: handleSubmit,
          loading: isPending,
          loadingLabel: "Agendando…",
          disabled: !canSubmit,
        },
      }}
    >
      <div className="space-y-4">
        {/* Professional — only shown for owner/reception */}
        {(userRole === "owner" || userRole === "reception") && (
          <Select
            id="create-prof"
            label="Profissional"
            value={profId}
            onChange={(e) => setProfId(e.target.value)}
          >
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}

        {/* Time */}
        <Input
          id="create-time"
          label="Horário"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />

        {/* Services */}
        <div>
          <p
            className="text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            Serviços {selectedServiceIds.length === 0 && <span style={{ color: "var(--status-red)" }}>*</span>}
          </p>
          <ServiceChips
            services={services}
            selected={selectedServiceIds}
            onChange={setSelectedServiceIds}
          />
          {totalDuration > 0 && (
            <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
              Duração total: {totalDuration} min
              {endTimeStr && ` · Término: ${endTimeStr}`}
              {totalPrice > 0 && ` · ${formatCurrency(totalPrice)}`}
            </p>
          )}
        </div>

        {/* Client search */}
        <div className="relative">
          <Input
            id="create-client-search"
            label="Cliente (nome ou telefone)"
            value={cs.query}
            onChange={(e) => cs.handleInput(e.target.value)}
            placeholder="Buscar cadastrado…"
            required
          />
          {cs.isSearching && (
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              Buscando…
            </p>
          )}
          {cs.showDropdown && (
            <div
              className="absolute z-50 w-full rounded-lg mt-1 shadow-lg overflow-hidden"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              {cs.results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text-primary)" }}
                  onClick={() => cs.selectClient(c)}
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {c.phone}
                  </span>
                </button>
              ))}
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-xs border-t"
                style={{
                  color: "var(--text-secondary)",
                  borderColor: "var(--border)",
                }}
                onClick={() => {
                  cs.setIsManual(true);
                  cs.setShowDropdown(false);
                }}
              >
                + Inserir manualmente
              </button>
            </div>
          )}
        </div>

        {/* Manual client fields */}
        {cs.isManual && (
          <div className="space-y-3 p-3 rounded-lg" style={{ backgroundColor: "var(--bg-card-elevated)", border: "1px solid var(--border)" }}>
            <Input
              id="create-manual-name"
              label="Nome"
              value={cs.manualName}
              onChange={(e) => cs.setManualName(e.target.value)}
              required
            />
            <Input
              id="create-manual-phone"
              label="Telefone"
              type="tel"
              value={cs.manualPhone}
              onChange={(e) => cs.setManualPhone(e.target.value)}
              required
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label
            htmlFor="create-notes"
            className="block text-xs font-medium uppercase tracking-wide mb-1.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Observações
          </label>
          <textarea
            id="create-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="livo-input w-full resize-none"
            placeholder="Opcional…"
          />
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EditModal — edit existing appointment (multi-service)
// ══════════════════════════════════════════════════════════════════════════════

function EditModal({
  appointment,
  services,
  isPending,
  onClose,
  onEdit,
}: {
  appointment: AgendaAppointment;
  services: AgendaService[];
  isPending: boolean;
  onClose: () => void;
  onEdit: (data: {
    serviceIds: string[];
    dateISO: string;
    clientName: string;
    clientPhone: string;
    notes: string;
  }) => void;
}) {
  // Pre-populate from current services (prefer AppointmentService list over legacy field).
  const initialIds = appointment.services.length > 0
    ? (appointment.services
        .map((s) => s.serviceId)
        .filter((id): id is string => id !== null)
        .filter((id) => services.some((sv) => sv.id === id)))
    : [appointment.serviceId];

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(initialIds);
  const [dateKey, setDateKey] = useState(isoToDateKeyBRT(appointment.date));
  const [time, setTime] = useState(isoToTimeBRT(appointment.date));
  const [clientName, setClientName] = useState(appointment.clientName);
  const [clientPhone, setClientPhone] = useState(appointment.clientPhone ?? "");
  const [notes, setNotes] = useState(appointment.notes ?? "");

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
  const endTimeStr = totalDuration > 0 ? minToTimeStr(timeStrToMin(time) + totalDuration) : "";

  const canSubmit =
    selectedServiceIds.length > 0 && clientName.trim() && clientPhone.trim() && dateKey && time;

  function handleSubmit() {
    if (!canSubmit) return;
    onEdit({
      serviceIds: selectedServiceIds,
      dateISO: dateTimeToISO(dateKey, time),
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      notes,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar Agendamento"
      size="md"
      footer={{
        cancel: { onClick: onClose },
        confirm: {
          label: "Salvar",
          onClick: handleSubmit,
          loading: isPending,
          loadingLabel: "Salvando…",
          disabled: !canSubmit,
        },
      }}
    >
      <div className="space-y-4">
        {/* Date + Time */}
        <div className="flex gap-3">
          <Input
            id="edit-date"
            label="Data"
            type="date"
            value={dateKey}
            onChange={(e) => setDateKey(e.target.value)}
            required
          />
          <Input
            id="edit-time"
            label="Horário"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>

        {/* Services */}
        <div>
          <p
            className="text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            Serviços
          </p>
          <ServiceChips
            services={services}
            selected={selectedServiceIds}
            onChange={setSelectedServiceIds}
          />
          {totalDuration > 0 && (
            <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
              Duração total: {totalDuration} min
              {endTimeStr && ` · Término: ${endTimeStr}`}
            </p>
          )}
        </div>

        {/* Client */}
        <Input
          id="edit-name"
          label="Nome do cliente"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          required
        />
        <Input
          id="edit-phone"
          label="Telefone"
          type="tel"
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          required
        />

        {/* Notes */}
        <div>
          <label
            htmlFor="edit-notes"
            className="block text-xs font-medium uppercase tracking-wide mb-1.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Observações
          </label>
          <textarea
            id="edit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="livo-input w-full resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MoveModal
// ══════════════════════════════════════════════════════════════════════════════

function MoveModal({
  appointment,
  professionals,
  isPending,
  onClose,
  onMove,
}: {
  appointment: AgendaAppointment;
  professionals: { id: string; name: string }[];
  isPending: boolean;
  onClose: () => void;
  onMove: (newProfId: string) => void;
}) {
  const [profId, setProfId] = useState(appointment.professionalId);

  return (
    <Modal
      open
      onClose={onClose}
      title="Mover Agendamento"
      size="sm"
      footer={{
        cancel: { onClick: onClose },
        confirm: {
          label: "Mover",
          onClick: () => onMove(profId),
          loading: isPending,
          loadingLabel: "Movendo…",
          disabled: profId === appointment.professionalId,
        },
      }}
    >
      <Select
        id="move-prof"
        label="Novo profissional"
        value={profId}
        onChange={(e) => setProfId(e.target.value)}
      >
        {professionals.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DayView — componente principal
// ══════════════════════════════════════════════════════════════════════════════

export default function DayView({
  initialData,
  initialDateKey,
  services,
}: DayViewProps) {
  const [data, setData] = useState(initialData);
  const [dateKey, setDateKey] = useState(initialDateKey);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [toast, setToast] = useState<Toast>(null);
  const [isPending, startTransition] = useTransition();

  // Derived from businessHour — fall back to SLOT_CONFIG defaults when no row exists.
  const openingMin = timeStrToMin(data.businessHour?.openTime ?? "08:00");
  const closingMin = timeStrToMin(data.businessHour?.closeTime ?? "20:00");

  // Barbers only see their own professional column (server already filtered appointments).
  const visibleProfessionals =
    data.userRole === "barber"
      ? data.professionals.filter((p) => p.id === data.userProfessionalId)
      : data.professionals;

  // ── Toast auto-dismiss ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg: string, kind: "success" | "error") {
    setToast({ msg, kind });
  }

  // ── Data refresh ──────────────────────────────────────────────────────────────
  async function refreshData(dk: string) {
    const newData = await getAgendaDay(dk);
    setData(newData);
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  function navigate(delta: number) {
    const d = new Date(`${dateKey}T12:00:00`);
    d.setDate(d.getDate() + delta);
    const newKey = formatDateKey(d);
    setDateKey(newKey);
    startTransition(async () => {
      await refreshData(newKey);
    });
  }

  function goToday() {
    const newKey = formatDateKey(new Date());
    setDateKey(newKey);
    startTransition(async () => {
      await refreshData(newKey);
    });
  }

  // ── Grid click → open create modal ───────────────────────────────────────────
  function handleGridClick(professionalId: string, clickY: number) {
    if (data.userRole === "barber" && professionalId !== data.userProfessionalId) return;
    const rawMin = openingMin + clickY / PX_PER_MINUTE;
    const rounded = Math.round(rawMin / 10) * 10;
    const clamped = Math.max(openingMin, Math.min(closingMin - 10, rounded));
    setModal({ type: "create", professionalId, suggestedMinute: clamped, dateKey });
  }

  // ── Handlers ──────────────────────────────────────────────────────────────────
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
        // abrirComanda redirects on success (throws NEXT_REDIRECT) — this is expected.
        // Any other error is a real failure.
      }
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const dateLabel = formatDateLabel(dateKey);
  const isToday = isTodayKey(dateKey);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Day navigation header ─────────────────────────────────── */}
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
            <span
              className="ml-2 text-xs font-normal"
              style={{ color: "var(--color-primary)" }}
            >
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
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
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
      </div>

      {/* ── Grid body ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div style={{ minWidth: RULER_WIDTH + visibleProfessionals.length * MIN_COL_WIDTH }}>
          {/* Sticky professional name header */}
          <div
            className="flex sticky top-0 z-10"
            style={{ backgroundColor: "var(--bg-card)" }}
          >
            {/* Ruler spacer */}
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

          {/* Time ruler + columns */}
          <div className="flex">
            <TimeRuler openingMin={openingMin} closingMin={closingMin} />
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
                  appointments={data.appointments.filter(
                    (a) => a.professionalId === prof.id,
                  )}
                  openingMin={openingMin}
                  closingMin={closingMin}
                  onGridClick={(y) => handleGridClick(prof.id, y)}
                  onCardClick={(appt) => setModal({ type: "detail", appointment: appt })}
                />
              ))
            )}
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
          dateKey={modal.dateKey}
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
  );
}
