/**
 * Unit tests for src/lib/agenda-drag.ts
 *
 * Tests pure functions calcDropMinute and checkClientConflict.
 * No React, no mocks — deterministic logic only.
 */

import { describe, it, expect } from "vitest";
import { calcDropMinute, checkClientConflict } from "@/lib/agenda-drag";

// ── calcDropMinute ─────────────────────────────────────────────────────────────

describe("calcDropMinute", () => {
  const OPEN = 480;   // 08:00
  const CLOSE = 1200; // 20:00
  const PPM = 2;      // 2 px per minute

  it("converts offset 0 to openingMin", () => {
    expect(calcDropMinute(0, OPEN, PPM, CLOSE)).toBe(480);
  });

  it("rounds to nearest 10 minutes", () => {
    // 9 px → rawMin = 480 + 4.5 → rounds to 480
    expect(calcDropMinute(9, OPEN, PPM, CLOSE)).toBe(480);
    // 10 px → rawMin = 480 + 5 → rounds to 490 (08:10 is 480+10)
    expect(calcDropMinute(10, OPEN, PPM, CLOSE)).toBe(490);
    // 11 px → rawMin = 480 + 5.5 → rounds to 490
    expect(calcDropMinute(11, OPEN, PPM, CLOSE)).toBe(490);
  });

  it("snaps 30-minute slot correctly (60px offset)", () => {
    // 60px → 30 min → 480+30=510 (08:30)
    expect(calcDropMinute(60, OPEN, PPM, CLOSE)).toBe(510);
  });

  it("snaps 1-hour slot correctly (120px offset)", () => {
    // 120px → 60 min → 480+60=540 (09:00)
    expect(calcDropMinute(120, OPEN, PPM, CLOSE)).toBe(540);
  });

  it("clamps negative offset to openingMin", () => {
    expect(calcDropMinute(-50, OPEN, PPM, CLOSE)).toBe(480);
  });

  it("clamps beyond closingMin to closingMin - 10", () => {
    // offset beyond end of day
    expect(calcDropMinute(9999, OPEN, PPM, CLOSE)).toBe(CLOSE - 10); // 1190
  });

  it("handles different pxPerMinute scales", () => {
    // PPM=1: 60px → 60 min → 480+60=540
    expect(calcDropMinute(60, OPEN, 1, CLOSE)).toBe(540);
    // PPM=4: 80px → 20 min → 480+20=500
    expect(calcDropMinute(80, OPEN, 4, CLOSE)).toBe(500);
  });
});

// ── checkClientConflict ────────────────────────────────────────────────────────

type TestAppt = {
  id: string;
  date: string;
  endTime: string | null;
  professionalId: string;
  status: string;
};

function appt(
  id: string,
  start: string,
  end: string | null,
  profId = "prof-1",
  status = "confirmed",
): TestAppt {
  return { id, date: start, endTime: end, professionalId: profId, status };
}

describe("checkClientConflict", () => {
  const TARGET_PROF = "prof-1";

  it("returns false when there are no appointments", () => {
    expect(
      checkClientConflict([], TARGET_PROF, "2026-06-17T10:00:00.000Z", 30, "new-id"),
    ).toBe(false);
  });

  it("returns false when only excluded appointment overlaps", () => {
    const appts = [appt("a1", "2026-06-17T10:00:00.000Z", "2026-06-17T10:30:00.000Z")];
    expect(
      checkClientConflict(appts, TARGET_PROF, "2026-06-17T10:00:00.000Z", 30, "a1"),
    ).toBe(false);
  });

  it("detects exact overlap (same start)", () => {
    const appts = [appt("a1", "2026-06-17T10:00:00.000Z", "2026-06-17T10:30:00.000Z")];
    expect(
      checkClientConflict(appts, TARGET_PROF, "2026-06-17T10:00:00.000Z", 30, "new-id"),
    ).toBe(true);
  });

  it("detects partial overlap (new starts before existing ends)", () => {
    const appts = [appt("a1", "2026-06-17T10:00:00.000Z", "2026-06-17T10:30:00.000Z")];
    // New: 10:15–10:45 overlaps 10:00–10:30
    expect(
      checkClientConflict(appts, TARGET_PROF, "2026-06-17T10:15:00.000Z", 30, "new-id"),
    ).toBe(true);
  });

  it("detects partial overlap (new starts before existing, ends during existing)", () => {
    const appts = [appt("a1", "2026-06-17T10:00:00.000Z", "2026-06-17T10:30:00.000Z")];
    // New: 09:45–10:15 overlaps 10:00–10:30
    expect(
      checkClientConflict(appts, TARGET_PROF, "2026-06-17T09:45:00.000Z", 30, "new-id"),
    ).toBe(true);
  });

  it("detects containment (new contains existing)", () => {
    const appts = [appt("a1", "2026-06-17T10:00:00.000Z", "2026-06-17T10:30:00.000Z")];
    // New: 09:30–11:00 contains 10:00–10:30
    expect(
      checkClientConflict(appts, TARGET_PROF, "2026-06-17T09:30:00.000Z", 90, "new-id"),
    ).toBe(true);
  });

  it("returns false when new slot is adjacent (touches but no overlap)", () => {
    const appts = [appt("a1", "2026-06-17T10:00:00.000Z", "2026-06-17T10:30:00.000Z")];
    // New: 10:30–11:00 — starts exactly when existing ends → no overlap
    expect(
      checkClientConflict(appts, TARGET_PROF, "2026-06-17T10:30:00.000Z", 30, "new-id"),
    ).toBe(false);
  });

  it("returns false when new slot ends before existing starts", () => {
    const appts = [appt("a1", "2026-06-17T10:00:00.000Z", "2026-06-17T10:30:00.000Z")];
    // New: 09:00–09:30 — before 10:00
    expect(
      checkClientConflict(appts, TARGET_PROF, "2026-06-17T09:00:00.000Z", 30, "new-id"),
    ).toBe(false);
  });

  it("ignores appointments for a different professional", () => {
    const appts = [appt("a1", "2026-06-17T10:00:00.000Z", "2026-06-17T10:30:00.000Z", "prof-2")];
    expect(
      checkClientConflict(appts, TARGET_PROF, "2026-06-17T10:00:00.000Z", 30, "new-id"),
    ).toBe(false);
  });

  it("ignores cancelled appointments", () => {
    const appts = [
      appt("a1", "2026-06-17T10:00:00.000Z", "2026-06-17T10:30:00.000Z", TARGET_PROF, "cancelled"),
    ];
    expect(
      checkClientConflict(appts, TARGET_PROF, "2026-06-17T10:00:00.000Z", 30, "new-id"),
    ).toBe(false);
  });

  it("ignores no_show appointments", () => {
    const appts = [
      appt("a1", "2026-06-17T10:00:00.000Z", "2026-06-17T10:30:00.000Z", TARGET_PROF, "no_show"),
    ];
    expect(
      checkClientConflict(appts, TARGET_PROF, "2026-06-17T10:00:00.000Z", 30, "new-id"),
    ).toBe(false);
  });

  it("ignores appointments with null endTime", () => {
    const appts = [appt("a1", "2026-06-17T10:00:00.000Z", null)];
    expect(
      checkClientConflict(appts, TARGET_PROF, "2026-06-17T10:00:00.000Z", 30, "new-id"),
    ).toBe(false);
  });

  it("finds conflict among multiple appointments", () => {
    const appts = [
      appt("a1", "2026-06-17T09:00:00.000Z", "2026-06-17T09:30:00.000Z"),
      appt("a2", "2026-06-17T10:00:00.000Z", "2026-06-17T10:30:00.000Z"),
      appt("a3", "2026-06-17T11:00:00.000Z", "2026-06-17T11:30:00.000Z"),
    ];
    // Conflicts with a2 only
    expect(
      checkClientConflict(appts, TARGET_PROF, "2026-06-17T10:00:00.000Z", 30, "new-id"),
    ).toBe(true);
  });

  it("returns false when slot fits between two appointments", () => {
    const appts = [
      appt("a1", "2026-06-17T09:00:00.000Z", "2026-06-17T09:30:00.000Z"),
      appt("a2", "2026-06-17T10:00:00.000Z", "2026-06-17T10:30:00.000Z"),
    ];
    // New: 09:30–10:00 — fits exactly in the gap
    expect(
      checkClientConflict(appts, TARGET_PROF, "2026-06-17T09:30:00.000Z", 30, "new-id"),
    ).toBe(false);
  });
});
