/**
 * Pure drag-and-drop utilities for the agenda time-grid.
 * No React, no I/O — safe to unit-test in isolation.
 */

/**
 * Convert a Y pixel offset within a time-grid column into a snapped minute value.
 *
 * @param dropOffsetPx  Y distance (px) from the top of the droppable zone.
 * @param openingMin    Minute-of-day at which the grid starts (e.g. 480 for 08:00).
 * @param pxPerMinute   Grid scale factor (e.g. 2).
 * @param closingMin    Minute-of-day at which the grid ends — used to clamp the result.
 * @returns Minutes-since-midnight, rounded to the nearest 10, clamped inside the grid.
 */
export function calcDropMinute(
  dropOffsetPx: number,
  openingMin: number,
  pxPerMinute: number,
  closingMin: number,
): number {
  const rawMin = openingMin + dropOffsetPx / pxPerMinute;
  const rounded = Math.round(rawMin / 10) * 10;
  return Math.max(openingMin, Math.min(closingMin - 10, rounded));
}

type ConflictAppointment = {
  id: string;
  date: string;            // ISO UTC
  endTime: string | null;  // ISO UTC
  professionalId: string;
  status: string;
};

/**
 * Optimistic client-side conflict check.
 *
 * Returns true when any appointment for `targetProfessionalId` overlaps the
 * interval [newStartISO, newStartISO + durationMin). Mirrors the server-side
 * `checkConflict` logic: cancelled / no_show statuses do not block slots.
 *
 * The server remains the authoritative source — this is UX feedback only.
 */
export function checkClientConflict(
  appointments: readonly ConflictAppointment[],
  targetProfessionalId: string,
  newStartISO: string,
  durationMin: number,
  excludeId: string,
): boolean {
  const newStart = new Date(newStartISO).getTime();
  const newEnd = newStart + durationMin * 60_000;

  for (const a of appointments) {
    if (a.id === excludeId) continue;
    if (a.professionalId !== targetProfessionalId) continue;
    if (a.status === "cancelled" || a.status === "no_show") continue;
    if (!a.endTime) continue;

    const aStart = new Date(a.date).getTime();
    const aEnd = new Date(a.endTime).getTime();

    // Overlap: a.start < new.end  AND  a.end > new.start
    if (aStart < newEnd && aEnd > newStart) return true;
  }

  return false;
}
