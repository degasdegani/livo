/**
 * Tests for src/lib/agenda-layout.ts
 *
 * The function layoutAppointments is pure — no mocks needed.
 * All times use Brasília (UTC-3) convention: 08:00 BRT = 11:00 UTC.
 */

import { describe, it, expect } from "vitest";
import {
  layoutAppointments,
  type AppointmentForLayout,
} from "@/lib/agenda-layout";

// ── Helpers ────────────────────────────────────────────────────────────────────

// Build an ISO UTC string for a given BRT hour/minute.
function brtISO(hourBRT: number, minuteBRT = 0): string {
  const utcH = hourBRT + 3;
  return `2026-06-15T${String(utcH).padStart(2, "0")}:${String(minuteBRT).padStart(2, "0")}:00.000Z`;
}

function makeAppt(
  id: string,
  hourBRT: number,
  durationMin: number,
  status = "pending",
  minuteBRT = 0,
): AppointmentForLayout {
  return {
    id,
    date: brtISO(hourBRT, minuteBRT),
    status,
    serviceDurationMin: durationMin,
    services: [{ serviceDurationMin: durationMin }],
  };
}

const OPENING = 8 * 60; // 480 — 08:00 BRT
const PPM = 2; // 2 px per minute

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("layoutAppointments() — single appointment", () => {
  it("returns columnIndex 0, columnCount 1", () => {
    const result = layoutAppointments([makeAppt("a", 9, 30)], OPENING, PPM);

    expect(result).toHaveLength(1);
    expect(result[0].columnIndex).toBe(0);
    expect(result[0].columnCount).toBe(1);
  });

  it("computes correct topPx", () => {
    // 09:00 BRT = 60 min after opening → topPx = 60 * 2 = 120
    const result = layoutAppointments([makeAppt("a", 9, 30)], OPENING, PPM);
    expect(result[0].topPx).toBe(120);
  });

  it("computes correct heightPx", () => {
    // 30 min * 2 px = 60px
    const result = layoutAppointments([makeAppt("a", 9, 30)], OPENING, PPM);
    expect(result[0].heightPx).toBe(60);
  });

  it("returns empty array for empty input", () => {
    expect(layoutAppointments([], OPENING, PPM)).toEqual([]);
  });
});

describe("layoutAppointments() — overlapping appointments", () => {
  it("two overlapping → both columnCount 2, distinct columnIndex 0 and 1", () => {
    // a: 09:00–09:30, b: 09:15–09:45 — overlap by 15 min
    const a = makeAppt("a", 9, 30);
    const b = makeAppt("b", 9, 30, "pending", 15);

    const result = layoutAppointments([a, b], OPENING, PPM);

    expect(result).toHaveLength(2);
    const posA = result.find((r) => r.appointment.id === "a")!;
    const posB = result.find((r) => r.appointment.id === "b")!;

    expect(posA.columnCount).toBe(2);
    expect(posB.columnCount).toBe(2);
    expect(posA.columnIndex).not.toBe(posB.columnIndex);
    expect(new Set([posA.columnIndex, posB.columnIndex])).toEqual(new Set([0, 1]));
  });

  it("three all-overlapping → columnCount 3, indices 0/1/2 exhausted", () => {
    // a: 09:00–10:00, b: 09:20–10:20, c: 09:40–10:40
    const a = makeAppt("a", 9, 60);
    const b = makeAppt("b", 9, 60, "pending", 20);
    const c = makeAppt("c", 9, 60, "pending", 40);

    const result = layoutAppointments([a, b, c], OPENING, PPM);

    expect(result).toHaveLength(3);
    for (const r of result) {
      expect(r.columnCount).toBe(3);
    }
    expect(new Set(result.map((r) => r.columnIndex))).toEqual(new Set([0, 1, 2]));
  });

  it("transitively overlapping cluster (A overlaps B, B overlaps C, A does not overlap C)", () => {
    // a: 09:00–09:30, b: 09:20–09:50, c: 09:40–10:10
    // a∩b: YES (09:20 < 09:30), b∩c: YES (09:40 < 09:50), a∩c: NO (09:40 ≥ 09:30)
    // All three are in one cluster; a and c can share column 0.
    const a = makeAppt("a", 9, 30);
    const b = makeAppt("b", 9, 30, "pending", 20);
    const c = makeAppt("c", 9, 30, "pending", 40);

    const result = layoutAppointments([a, b, c], OPENING, PPM);

    // Cluster size = 2 columns (a takes col 0, b takes col 1, c can reuse col 0)
    const posA = result.find((r) => r.appointment.id === "a")!;
    const posC = result.find((r) => r.appointment.id === "c")!;

    // a and c should be in the same column (they don't overlap each other)
    expect(posA.columnIndex).toBe(posC.columnIndex);
    expect(posA.columnCount).toBe(2); // cluster still needs 2 columns
  });
});

describe("layoutAppointments() — sequential (non-overlapping) appointments", () => {
  it("two back-to-back appointments → each gets its own cluster, columnCount 1", () => {
    // a: 09:00–09:30, b: 09:30–10:00
    // Half-open interval: 09:30 is NOT < 09:30, so they do not overlap.
    const a = makeAppt("a", 9, 30);
    const b = makeAppt("b", 9, 30, "pending", 30);

    const result = layoutAppointments([a, b], OPENING, PPM);

    expect(result).toHaveLength(2);
    for (const r of result) {
      expect(r.columnCount).toBe(1);
      expect(r.columnIndex).toBe(0);
    }
  });

  it("two well-separated appointments → independent clusters", () => {
    const a = makeAppt("a", 9, 30); // 09:00–09:30
    const b = makeAppt("b", 11, 30); // 11:00–11:30

    const result = layoutAppointments([a, b], OPENING, PPM);

    expect(result[0].columnCount).toBe(1);
    expect(result[1].columnCount).toBe(1);
  });
});

describe("layoutAppointments() — inactive statuses (cancelled / no_show)", () => {
  it("cancelled does not join the overlap cluster — active gets columnCount 1", () => {
    const a = makeAppt("a", 9, 30, "pending");
    const b = makeAppt("b", 9, 30, "cancelled", 15); // overlaps a but cancelled

    const result = layoutAppointments([a, b], OPENING, PPM);

    const posA = result.find((r) => r.appointment.id === "a")!;
    const posB = result.find((r) => r.appointment.id === "b")!;

    expect(posA.columnCount).toBe(1); // active is alone in its cluster
    expect(posA.columnIndex).toBe(0);
    expect(posB.columnCount).toBe(1); // inactive always renders at full width
    expect(posB.columnIndex).toBe(0);
  });

  it("no_show does not join the overlap cluster", () => {
    const a = makeAppt("a", 9, 30, "pending");
    const b = makeAppt("b", 9, 30, "no_show", 15);

    const result = layoutAppointments([a, b], OPENING, PPM);

    const posA = result.find((r) => r.appointment.id === "a")!;
    expect(posA.columnCount).toBe(1);
  });

  it("two cancelled appointments that overlap each other — both render, columnCount 1 each", () => {
    const a = makeAppt("a", 9, 30, "cancelled");
    const b = makeAppt("b", 9, 30, "cancelled", 15);

    const result = layoutAppointments([a, b], OPENING, PPM);

    expect(result).toHaveLength(2);
    for (const r of result) {
      expect(r.columnCount).toBe(1);
      expect(r.columnIndex).toBe(0);
    }
  });
});

describe("layoutAppointments() — multi-service duration", () => {
  it("uses services array sum when populated (ignores legacy serviceDurationMin)", () => {
    const appt: AppointmentForLayout = {
      id: "multi",
      date: brtISO(9, 0),
      status: "pending",
      serviceDurationMin: 30, // legacy field — should be ignored
      services: [
        { serviceDurationMin: 30 },
        { serviceDurationMin: 45 },
      ], // total: 75 min
    };

    const result = layoutAppointments([appt], OPENING, PPM);
    expect(result[0].heightPx).toBe(75 * PPM); // 150px
  });

  it("falls back to serviceDurationMin when services array is empty", () => {
    const appt: AppointmentForLayout = {
      id: "legacy",
      date: brtISO(9, 0),
      status: "pending",
      serviceDurationMin: 45,
      services: [],
    };

    const result = layoutAppointments([appt], OPENING, PPM);
    expect(result[0].heightPx).toBe(45 * PPM);
  });
});

describe("layoutAppointments() — appointment identity preserved", () => {
  it("result contains the original appointment object (not a copy)", () => {
    const appt = makeAppt("a", 9, 30);
    const result = layoutAppointments([appt], OPENING, PPM);
    expect(result[0].appointment).toBe(appt);
  });
});
