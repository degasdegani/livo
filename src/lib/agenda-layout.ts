// Pure utility for computing absolute pixel positions of appointments in the day-view grid.
// No side-effects, no API calls — tested in isolation in tests/unit/agenda-layout.test.ts.

// Minimal structural interface — AgendaAppointment satisfies this automatically.
export interface AppointmentForLayout {
  id: string;
  date: string; // ISO UTC string
  status: string; // only "cancelled" / "no_show" branching matters here
  serviceDurationMin: number; // legacy fallback duration
  services: { serviceDurationMin: number }[]; // preferred: sum these
}

export interface PositionedAppointment<
  T extends AppointmentForLayout = AppointmentForLayout,
> {
  appointment: T;
  columnIndex: number; // 0-based sub-column within the overlap cluster
  columnCount: number; // total sub-columns in the cluster
  topPx: number; // distance from top of grid
  heightPx: number; // card height
}

// Returns minutes since midnight in Brasília (UTC-3, no DST since 2019).
function getStartMinBRT(isoStr: string): number {
  const utcMs = new Date(isoStr).getTime();
  const brtMs = utcMs - 3 * 60 * 60 * 1_000;
  const d = new Date(brtMs);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function getTotalDurationMin(a: AppointmentForLayout): number {
  return a.services.length > 0
    ? a.services.reduce((sum, s) => sum + s.serviceDurationMin, 0)
    : a.serviceDurationMin;
}

// Mirrors checkConflict logic: cancelled/no_show do not block slots.
function isActive(status: string): boolean {
  return status !== "cancelled" && status !== "no_show";
}

/**
 * Converts a flat list of appointments for ONE professional into absolutely-
 * positioned cards, assigning sub-columns when appointments overlap.
 *
 * @param appointments  All appointments for a single professional on one day.
 * @param openingMinute Minutes-since-midnight of the grid's top edge (e.g. 8*60=480).
 * @param pxPerMinute   Pixels per minute (e.g. 2).
 */
export function layoutAppointments<T extends AppointmentForLayout>(
  appointments: T[],
  openingMinute: number,
  pxPerMinute: number,
): PositionedAppointment<T>[] {
  if (appointments.length === 0) return [];

  type Enriched = { item: T; startMin: number; endMin: number; durationMin: number };

  const active: Enriched[] = [];
  const inactive: Enriched[] = [];

  for (const appt of appointments) {
    const startMin = getStartMinBRT(appt.date);
    const durationMin = Math.max(10, getTotalDurationMin(appt));
    const e: Enriched = { item: appt, startMin, endMin: startMin + durationMin, durationMin };
    (isActive(appt.status) ? active : inactive).push(e);
  }

  // Sort active by start time; break ties by longer duration first (stable columns).
  active.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const result: PositionedAppointment<T>[] = [];

  // Sweep-line cluster detection + greedy column assignment.
  // A cluster is a maximal set of appointments transitively connected by overlap.
  let i = 0;
  while (i < active.length) {
    let clusterEnd = active[i].endMin;
    let j = i + 1;
    while (j < active.length && active[j].startMin < clusterEnd) {
      if (active[j].endMin > clusterEnd) clusterEnd = active[j].endMin;
      j++;
    }
    // Cluster = active[i .. j-1]

    const columnEndTimes: number[] = [];
    const colIdx: number[] = [];

    for (let k = i; k < j; k++) {
      const e = active[k];
      // First column whose last occupant already ended before this one starts.
      let col = columnEndTimes.findIndex((end) => e.startMin >= end);
      if (col === -1) {
        col = columnEndTimes.length;
        columnEndTimes.push(0);
      }
      columnEndTimes[col] = e.endMin;
      colIdx.push(col);
    }

    const columnCount = columnEndTimes.length;

    for (let k = i; k < j; k++) {
      const e = active[k];
      result.push({
        appointment: e.item,
        columnIndex: colIdx[k - i],
        columnCount,
        topPx: Math.max(0, (e.startMin - openingMinute) * pxPerMinute),
        heightPx: e.durationMin * pxPerMinute,
      });
    }

    i = j;
  }

  // Inactive appointments render at full column width, behind active cards.
  for (const e of inactive) {
    result.push({
      appointment: e.item,
      columnIndex: 0,
      columnCount: 1,
      topPx: Math.max(0, (e.startMin - openingMinute) * pxPerMinute),
      heightPx: e.durationMin * pxPerMinute,
    });
  }

  return result;
}
