"use client";

import { PX_PER_MINUTE } from "./shared";

export function TimeBlockCard({
  topPx,
  heightPx,
  reason,
  onClick,
}: {
  topPx: number;
  heightPx: number;
  reason: string | null;
  onClick: (clientX: number, clientY: number) => void;
}) {
  const h = Math.max(16, heightPx - 2);

  return (
    <div
      role="button"
      tabIndex={0}
      style={{
        position: "absolute",
        top: topPx + 1,
        left: 0,
        right: 0,
        height: h,
        zIndex: 2,
        borderRadius: 4,
        overflow: "hidden",
        cursor: "pointer",
        // Diagonal stripe pattern — visually distinct from appointments
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(100,100,100,0.18) 0px, rgba(100,100,100,0.18) 4px, transparent 4px, transparent 10px)",
        backgroundColor: "rgba(100,100,100,0.10)",
        border: "1px solid rgba(100,100,100,0.25)",
      }}
      onClick={(e) => { e.stopPropagation(); onClick(e.clientX, e.clientY); }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          onClick(rect.right + 8, rect.top);
        }
      }}
    >
      {h >= 24 && (
        <div className="px-1.5 py-0.5 pointer-events-none">
          <p style={{ fontSize: 10, fontWeight: 500, color: "var(--text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Bloqueado{reason ? ` · ${reason}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

/** Convert ISO UTC → pixel offset from top of grid (GRID_START_MIN = 0). */
export function isoToTopPx(isoStr: string): number {
  const d = new Date(isoStr);
  const brtMs = d.getTime() - 3 * 60 * 60 * 1_000;
  const brt = new Date(brtMs);
  const minOfDay = brt.getUTCHours() * 60 + brt.getUTCMinutes();
  return minOfDay * PX_PER_MINUTE;
}

export function isoToHeightPx(startISO: string, endISO: string): number {
  const diffMs = new Date(endISO).getTime() - new Date(startISO).getTime();
  return Math.max(16, (diffMs / 60_000) * PX_PER_MINUTE);
}
