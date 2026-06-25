"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { TV_TOKEN_KEY, POLL_INTERVAL_MS } from "./tv-constants";

// ── Tipos ──────────────────────────────────────────────────────────
type TvPeriod = "DAY" | "WEEK" | "MONTH";

interface RankingEntry {
  id: string;
  name: string;
  avatarUrl: string | null;
  servicesCount: number;
  goalTarget: number;
  goalPercent: number;
}

interface TvData {
  barbershopName: string;
  period: TvPeriod;
  generalProgressPercent: number;
  achieved: boolean;
  ranking: RankingEntry[];
  generatedAt: string;
}

interface Props {
  token: string;
  onRevoked: () => void; // chamado quando o servidor retorna 401
  onCelebrate: (data: TvData) => void; // Etapa 6 vai usar isso
}

const PERIOD_LABELS: Record<TvPeriod, string> = {
  DAY: "HOJE",
  WEEK: "SEMANA",
  MONTH: "MES",
};

// ── Relógio ────────────────────────────────────────────────────────
function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function formatDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

// ── Barra de progresso ─────────────────────────────────────────────
function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.min(percent, 100);
  return (
    <div style={{
      width: "100%", height: "0.75rem",
      background: "rgba(255,255,255,0.08)",
      borderRadius: "999px", overflow: "hidden",
    }}>
      <div style={{
        width: `${clamped}%`, height: "100%",
        background: color,
        borderRadius: "999px",
        transition: "width 0.6s ease",
      }} />
    </div>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────
function Avatar({ name, url, size }: { name: string; url: string | null; size: number }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} style={{
      width: size, height: size, borderRadius: "50%",
      objectFit: "cover", flexShrink: 0,
    }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "#C8102E", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.36, flexShrink: 0,
    }}>{initials}</div>
  );
}

// ── Componente principal ───────────────────────────────────────────
export function TvDisplay({ token, onRevoked, onCelebrate }: Props) {
  const [period, setPeriod] = useState<TvPeriod>("DAY");
  const [data, setData] = useState<TvData | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const prevAchievedRef = useRef(false);
  const now = useClock();

  const fetchData = useCallback(async (p: TvPeriod) => {
    try {
      const res = await fetch(`/tv/api/data?token=${token}&period=${p}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        onRevoked();
        return;
      }
      if (!res.ok) throw new Error("non-ok");
      const json: TvData = await res.json();

      // Disparar celebração se META ATINGIDA cruzou 100% agora (Etapa 6 usa onCelebrate)
      if (!prevAchievedRef.current && json.achieved) {
        onCelebrate(json);
      }
      prevAchievedRef.current = json.achieved;

      setData(json);
      setReconnecting(false);
    } catch {
      setReconnecting(true);
      // Mantém os últimos dados — não limpa setData
    }
  }, [token, onRevoked, onCelebrate]);

  // Polling
  useEffect(() => {
    fetchData(period);
    const id = setInterval(() => fetchData(period), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [period, fetchData]);

  // ── Loading inicial ──────────────────────────────────────────────
  if (!data) {
    return (
      <div style={{
        minHeight: "100dvh", background: "#0d0d0d",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Inter, sans-serif",
      }}>
        <p style={{ color: "#555", fontSize: "1.25rem" }}>Carregando...</p>
      </div>
    );
  }

  const topScore = data.ranking[0]?.servicesCount ?? 0;

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0d0d0d",
      color: "#fff",
      fontFamily: "Inter, sans-serif",
      display: "flex",
      flexDirection: "column",
      padding: "2rem 2.5rem",
      boxSizing: "border-box",
      overflow: "hidden",
      position: "relative",
    }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "1.5rem", flexShrink: 0,
      }}>
        {/* Marca + barbearia */}
        <div>
          <p style={{ margin: 0, fontSize: "1rem", color: "#666", fontWeight: 500 }}>LIVO</p>
          <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>
            {data.barbershopName}
          </p>
        </div>

        {/* Toggle de período */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["DAY", "WEEK", "MONTH"] as TvPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "0.5rem 1.25rem",
                border: "none",
                borderRadius: "999px",
                fontSize: "0.95rem",
                fontWeight: 700,
                cursor: "pointer",
                background: period === p ? "#C8102E" : "rgba(255,255,255,0.08)",
                color: period === p ? "#fff" : "#888",
                transition: "background 0.2s",
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Relógio */}
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: "2.25rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {formatTime(now)}
          </p>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#666", textTransform: "capitalize" }}>
            {formatDate(now)}
          </p>
        </div>
      </div>

      {/* ── Meta geral ── */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "1rem",
        padding: "1.25rem 1.75rem",
        marginBottom: "1.5rem",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.625rem" }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "1rem", color: "#aaa" }}>
            META {PERIOD_LABELS[period]}
          </p>
          <p style={{
            margin: 0, fontWeight: 800, fontSize: "2rem",
            color: data.achieved ? "#C8A24C" : "#fff",
          }}>
            {data.generalProgressPercent}%
          </p>
        </div>
        <ProgressBar
          percent={data.generalProgressPercent}
          color={data.achieved ? "#C8A24C" : "#C8102E"}
        />
      </div>

      {/* ── Ranking ── */}
      <div style={{ flex: 1, overflowY: "hidden", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        <p style={{ margin: "0 0 0.25rem", fontSize: "0.85rem", fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>
          Ranking — {PERIOD_LABELS[period]}
        </p>

        {data.ranking.map((entry, idx) => {
          const isFirst = idx === 0;
          const medalColor = idx === 0 ? "#C8A24C" : idx === 1 ? "#9ca3af" : idx === 2 ? "#b45309" : "transparent";

          return (
            <div
              key={entry.id}
              style={{
                display: "flex", alignItems: "center", gap: "1rem",
                background: isFirst ? "rgba(200,16,46,0.12)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${isFirst ? "rgba(200,16,46,0.3)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: "0.75rem",
                padding: "0.75rem 1.25rem",
                flexShrink: 0,
              }}
            >
              {/* Posição */}
              <span style={{
                width: "1.75rem", textAlign: "center",
                fontWeight: 800, fontSize: "1.25rem",
                color: medalColor !== "transparent" ? medalColor : "#555",
                flexShrink: 0,
              }}>
                {idx + 1}
              </span>

              {/* Avatar */}
              <Avatar name={entry.name} url={entry.avatarUrl} size={44} />

              {/* Nome + barra */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "1.1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {entry.name}
                </p>
                {entry.goalTarget > 0 && (
                  <div style={{ marginTop: "0.25rem" }}>
                    <ProgressBar percent={entry.goalPercent} color="#C8102E" />
                  </div>
                )}
              </div>

              {/* Contagem + meta */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: "1.5rem", color: isFirst ? "#C8102E" : "#fff" }}>
                  {entry.servicesCount}
                </p>
                {entry.goalTarget > 0 && (
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#555" }}>
                    de {entry.goalTarget} ({entry.goalPercent}%)
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {data.ranking.length === 0 && (
          <p style={{ color: "#444", textAlign: "center", marginTop: "2rem" }}>
            Nenhum atendimento registrado no periodo.
          </p>
        )}
      </div>

      {/* ── Indicador de reconexão ── */}
      {reconnecting && (
        <div style={{
          position: "absolute", bottom: "1rem", right: "1.5rem",
          background: "rgba(0,0,0,0.7)",
          border: "1px solid #333",
          borderRadius: "999px",
          padding: "0.25rem 0.875rem",
          fontSize: "0.75rem", color: "#888",
        }}>
          reconectando...
        </div>
      )}

    </div>
  );
}
