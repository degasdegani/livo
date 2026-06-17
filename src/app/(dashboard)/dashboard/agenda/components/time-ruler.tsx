"use client";

import { PX_PER_MINUTE, RULER_WIDTH, minToTimeStr } from "./shared";

export function TimeRuler({
  openingMin,
  closingMin,
}: {
  openingMin: number;
  closingMin: number;
}) {
  const totalMin = closingMin - openingMin;
  const marks: { offset: number; isHour: boolean }[] = [];
  for (let i = 0; i <= totalMin; i += 10) {
    const absMin = openingMin + i;
    marks.push({ offset: i, isHour: absMin % 60 === 0 });
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
            <span className="text-xs tabular-nums" style={{ color: "var(--text-tertiary)" }}>
              {minToTimeStr(openingMin + offset)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
