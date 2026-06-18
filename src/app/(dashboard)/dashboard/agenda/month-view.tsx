"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Popover } from "@/components/ui/popover";
import {
  createQuickAppointment,
  getAgendaMonthSummary,
  type AgendaMonthSummary,
  type AgendaProfessional,
  type AgendaService,
} from "./agenda-actions";
import { CreateModal } from "./components/create-modal";
import { isoToDateKeyBRT } from "./components/shared";

// ─── Constantes ───────────────────────────────────────────────────────────────

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ─── Props ────────────────────────────────────────────────────────────────────

interface MonthViewProps {
  initialDaysSummary: AgendaMonthSummary["daysSummary"];
  initialYear: number;
  initialMonth: number; // 0-indexed (0 = Janeiro)
  services: AgendaService[];
  professionals: AgendaProfessional[];
  userRole: string;
  userProfessionalId: string | null;
}

// ── Popover state ─────────────────────────────────────────────────────────────

type VerMaisState = {
  dateKey: string;
  anchorX: number;
  anchorY: number;
} | null;

type CreateState = {
  dateKey: string;
  anchorX: number;
  anchorY: number;
} | null;

// ══════════════════════════════════════════════════════════════════════════════
// MonthView
// ══════════════════════════════════════════════════════════════════════════════

export default function MonthView({
  initialDaysSummary,
  initialYear,
  initialMonth,
  services,
  professionals,
  userRole,
  userProfessionalId,
}: MonthViewProps) {
  const router = useRouter();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [daysSummary, setDaysSummary] = useState(initialDaysSummary);
  const [isPending, startTransition] = useTransition();
  const [verMais, setVerMais] = useState<VerMaisState>(null);
  const [createState, setCreateState] = useState<CreateState>(null);

  // Computed once on mount — BRT today regardless of browser timezone.
  const todayKey = useMemo(() => isoToDateKeyBRT(new Date().toISOString()), []);

  // ── Month navigation ─────────────────────────────────────────────────────

  async function loadMonth(y: number, m: number) {
    const monthStart = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const data = await getAgendaMonthSummary(monthStart);
    setDaysSummary(data.daysSummary);
  }

  function navigate(delta: number) {
    let y = year;
    let m = month + delta;
    if (m < 0) { y -= 1; m = 11; }
    if (m > 11) { y += 1; m = 0; }
    setYear(y);
    setMonth(m);
    startTransition(async () => { await loadMonth(y, m); });
  }

  function goToday() {
    const today = isoToDateKeyBRT(new Date().toISOString());
    const [todayYearStr, todayMonthStr] = today.split("-");
    const y = Number(todayYearStr);
    const m = Number(todayMonthStr) - 1; // 0-indexed
    setYear(y);
    setMonth(m);
    startTransition(async () => { await loadMonth(y, m); });
  }

  // ── Day navigation (to Visão Dia) ────────────────────────────────────────

  function navigateToDay(dateKey: string) {
    router.push(`/dashboard/agenda?view=operacional&date=${dateKey}`);
  }

  // ── Quick-create from month view ─────────────────────────────────────────

  function openCreateModal(dateKey: string, anchorX: number, anchorY: number) {
    setCreateState({ dateKey, anchorX, anchorY });
  }

  function handleCreate(data: {
    professionalId: string;
    serviceIds: string[];
    dateISO: string;
    clientName: string;
    clientPhone: string;
    notes: string;
  }) {
    startTransition(async () => {
      const result = await createQuickAppointment(data);
      if (result.success) {
        setCreateState(null);
        await loadMonth(year, month);
      }
    });
  }

  // ── Grid computation ─────────────────────────────────────────────────────

  const cells = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();    // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) result.push(null);  // leading blanks
    for (let d = 1; d <= daysInMonth; d++) result.push(d);
    while (result.length % 7 !== 0) result.push(null);      // trailing blanks
    return result;
  }, [year, month]);

  const totalRows = cells.length / 7;

  const isCurrentMonth = (() => {
    const [tkYear, tkMonth] = todayKey.split("-").map(Number);
    return tkYear === year && tkMonth - 1 === month;
  })();

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        {/* ── Header: navegação de mês ─────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {MONTHS[month]} de {year}
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={isPending}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-40"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-card-elevated)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
              aria-label="Mês anterior"
            >
              ◀
            </button>

            {!isCurrentMonth && (
              <button
                type="button"
                onClick={goToday}
                disabled={isPending}
                className="px-3 h-8 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-card-elevated)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
              >
                Hoje
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate(1)}
              disabled={isPending}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-40"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-card-elevated)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
              aria-label="Próximo mês"
            >
              ▶
            </button>
          </div>
        </div>

        {/* ── Cabeçalho dos dias da semana ────────────────────────────────── */}
        <div
          className="grid grid-cols-7"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="py-3 text-center text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              {w}
            </div>
          ))}
        </div>

        {/* ── Grid de dias ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const col = i % 7;
            const row = Math.floor(i / 7);
            const borderRight = col < 6 ? "1px solid var(--border)" : "none";
            const borderBottom = row < totalRows - 1 ? "1px solid var(--border)" : "none";

            // Empty padding cell (days outside this month)
            if (d === null) {
              return (
                <div
                  key={`blank-${i}`}
                  className="min-h-[88px]"
                  style={{
                    borderRight,
                    borderBottom,
                    backgroundColor: "var(--bg-base)",
                    opacity: 0.4,
                  }}
                />
              );
            }

            // Real day cell
            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const summary = daysSummary[dateKey];
            const count = summary?.count ?? 0;
            const isToday = dateKey === todayKey;

            return (
              <div
                key={dateKey}
                className="min-h-[88px] p-2 flex flex-col transition-colors"
                style={{ borderRight, borderBottom }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-card-elevated)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
              >
                {/* Day number — opens quick-create popover */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openCreateModal(dateKey, e.clientX, e.clientY); }}
                  className="self-start outline-none"
                  aria-label={`Criar agendamento em ${d} de ${MONTHS[month]}`}
                >
                  <span
                    className="w-7 h-7 flex items-center justify-center rounded-full text-sm"
                    style={{
                      backgroundColor: isToday ? "var(--color-primary)" : undefined,
                      color: isToday ? "#fff" : "var(--text-primary)",
                      fontWeight: isToday ? 700 : 400,
                    }}
                  >
                    {d}
                  </span>
                </button>

                {/* Up to 2 appointment lines */}
                {summary?.appointments.slice(0, 2).map((appt) => (
                  <button
                    key={appt.id}
                    type="button"
                    onClick={() => navigateToDay(dateKey)}
                    className="flex items-center gap-1 overflow-hidden w-full text-left outline-none mt-0.5"
                    style={{ minHeight: 18 }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: "var(--color-primary)" }}
                    />
                    <span
                      className="text-xs truncate"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {appt.time} {appt.clientName}
                    </span>
                  </button>
                ))}

                {/* "Ver mais" when there are more than 2 */}
                {count > 2 && (
                  <button
                    type="button"
                    className="text-xs text-left outline-none mt-0.5"
                    style={{ color: "var(--color-primary)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setVerMais({ dateKey, anchorX: e.clientX, anchorY: e.clientY });
                    }}
                  >
                    Ver mais
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Loading indicator durante navegação de mês */}
        {isPending && (
          <div
            className="text-center py-2 text-xs"
            style={{
              color: "var(--text-tertiary)",
              borderTop: "1px solid var(--border)",
            }}
          >
            Carregando…
          </div>
        )}
      </div>

      {/* ── CreateModal (criação rápida a partir da visão mensal) ─────────── */}
      {createState && professionals.length > 0 && (
        <CreateModal
          professionalId={
            userRole === "barber" && userProfessionalId
              ? userProfessionalId
              : (professionals[0]?.id ?? "")
          }
          suggestedMinute={8 * 60}
          dateKey={createState.dateKey}
          services={services}
          professionals={professionals}
          userRole={userRole}
          userProfessionalId={userProfessionalId}
          isPending={isPending}
          anchorX={createState.anchorX}
          anchorY={createState.anchorY}
          onClose={() => setCreateState(null)}
          onCreate={handleCreate}
        />
      )}

      {/* ── "Ver mais" Popover ───────────────────────────────────────────────── */}
      {verMais && (
        <Popover
          anchorX={verMais.anchorX}
          anchorY={verMais.anchorY}
          onClose={() => setVerMais(null)}
          width={240}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {new Date(`${verMais.dateKey}T12:00:00`).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
              })}
            </h3>
            <button
              type="button"
              onClick={() => setVerMais(null)}
              aria-label="Fechar"
              className="w-6 h-6 flex items-center justify-center rounded text-xs transition-colors"
              style={{ color: "var(--text-tertiary)" }}
            >
              ✕
            </button>
          </div>

          {/* Appointment list */}
          <div className="space-y-0.5">
            {daysSummary[verMais.dateKey]?.appointments.map((appt) => (
              <button
                key={appt.id}
                type="button"
                className="w-full text-left flex items-center gap-2 py-1.5 px-2 rounded-lg outline-none"
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
                onClick={() => {
                  setVerMais(null);
                  navigateToDay(verMais.dateKey);
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "var(--color-primary)" }}
                />
                <span
                  className="text-xs tabular-nums flex-shrink-0"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {appt.time}
                </span>
                <span
                  className="text-sm truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {appt.clientName}
                </span>
              </button>
            ))}
          </div>

          {/* Footer: navigate to day */}
          <button
            type="button"
            className="w-full mt-3 py-2 rounded-lg text-xs font-medium transition-colors outline-none"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-card)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
            onClick={() => {
              setVerMais(null);
              navigateToDay(verMais.dateKey);
            }}
          >
            Ver todos os agendamentos
          </button>
        </Popover>
      )}
    </>
  );
}
