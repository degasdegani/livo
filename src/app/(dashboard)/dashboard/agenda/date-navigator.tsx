// ============================================================
// LIVO — Navegador de Datas da Agenda
// Botões ← → para navegar entre dias
// ============================================================

"use client";

import { useRouter } from "next/navigation";

const DAYS_FULL = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
const MONTHS_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

interface Props {
  currentDate: string; // "YYYY-MM-DD"
}

export function DateNavigator({ currentDate }: Props) {
  const router = useRouter();

  const dateObj = new Date(`${currentDate}T12:00:00`);
  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = currentDate === todayStr;

  function navigate(offsetDays: number) {
    const newDate = new Date(`${currentDate}T12:00:00`);
    newDate.setDate(newDate.getDate() + offsetDays);
    const newDateStr = newDate.toISOString().split("T")[0];
    router.push(`/dashboard/agenda?date=${newDateStr}`);
  }

  function goToToday() {
    router.push("/dashboard/agenda");
  }

  const navButtonStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#A1A1AA",
    borderRadius: "10px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "opacity 0.15s",
  };

  return (
    <div className="flex items-center gap-3">
      {/* Anterior */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={navButtonStyle}
        onMouseOver={(e) => {
          (e.target as HTMLElement).style.opacity = "0.7";
        }}
        onMouseOut={(e) => {
          (e.target as HTMLElement).style.opacity = "1";
        }}
      >
        ←
      </button>

      {/* Data atual */}
      <div className="text-center" style={{ minWidth: "200px" }}>
        <p
          className="font-black text-white"
          style={{ fontSize: "16px", letterSpacing: "-0.3px" }}
        >
          {DAYS_FULL[dateObj.getDay()]}, {dateObj.getDate()} de{" "}
          {MONTHS_PT[dateObj.getMonth()]}
        </p>
        {isToday && (
          <p className="text-xs font-bold" style={{ color: "#FF2D55" }}>
            Hoje
          </p>
        )}
      </div>

      {/* Próximo */}
      <button
        type="button"
        onClick={() => navigate(1)}
        style={navButtonStyle}
        onMouseOver={(e) => {
          (e.target as HTMLElement).style.opacity = "0.7";
        }}
        onMouseOut={(e) => {
          (e.target as HTMLElement).style.opacity = "1";
        }}
      >
        →
      </button>

      {/* Botão Hoje (só aparece quando não está no dia atual) */}
      {!isToday && (
        <button
          type="button"
          onClick={goToToday}
          className="text-xs font-bold px-3 py-2 rounded-xl transition-all hover:opacity-80"
          style={{
            background: "rgba(255,45,85,0.08)",
            color: "#FF2D55",
            border: "1px solid rgba(255,45,85,0.2)",
          }}
        >
          Hoje
        </button>
      )}
    </div>
  );
}
