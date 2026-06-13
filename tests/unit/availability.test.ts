/**
 * TEST-04 — Agenda: Pure unit tests for availability.ts
 *
 * No mocks needed — these are pure functions.
 * SLOT_CONFIG.SLOT_MINUTES = 10 (from src/lib/slot-config.ts)
 *
 * Failure criterion:
 *   - Change slot interval → slot list changes
 *   - Change conflict formula → wrong slots blocked/available
 *   - Change isToday buffer (30 min) → past-blocking changes
 */

import { describe, it, expect } from "vitest";
import {
  timeToMinutes,
  minutesToTime,
  generateAvailableSlots,
} from "@/lib/availability";

// ── timeToMinutes ──────────────────────────────────────────────────────────────

describe("timeToMinutes()", () => {
  it("converts '00:00' to 0", () => {
    expect(timeToMinutes("00:00")).toBe(0);
  });

  it("converts '09:00' to 540", () => {
    expect(timeToMinutes("09:00")).toBe(540);
  });

  it("converts '09:30' to 570", () => {
    expect(timeToMinutes("09:30")).toBe(570);
  });

  it("converts '18:00' to 1080", () => {
    expect(timeToMinutes("18:00")).toBe(1080);
  });

  it("converts '23:59' to 1439", () => {
    expect(timeToMinutes("23:59")).toBe(1439);
  });

  it("converts '01:05' to 65", () => {
    expect(timeToMinutes("01:05")).toBe(65);
  });
});

// ── minutesToTime ──────────────────────────────────────────────────────────────

describe("minutesToTime()", () => {
  it("converts 0 to '00:00'", () => {
    expect(minutesToTime(0)).toBe("00:00");
  });

  it("converts 540 to '09:00'", () => {
    expect(minutesToTime(540)).toBe("09:00");
  });

  it("converts 570 to '09:30'", () => {
    expect(minutesToTime(570)).toBe("09:30");
  });

  it("converts 1080 to '18:00'", () => {
    expect(minutesToTime(1080)).toBe("18:00");
  });

  it("pads single-digit hours and minutes with leading zero", () => {
    expect(minutesToTime(65)).toBe("01:05");
  });

  it("is the inverse of timeToMinutes", () => {
    expect(minutesToTime(timeToMinutes("14:20"))).toBe("14:20");
  });
});

// ── generateAvailableSlots ─────────────────────────────────────────────────────
//
// SLOT_MINUTES=10 means each iteration advances 10 min.
// Window 09:00–10:00 = 540–600. Service 30 min.
// Slots that fit (slotStart+30 <= 600): 540,550,560,570 → ["09:00","09:10","09:20","09:30"]

describe("generateAvailableSlots()", () => {
  it("generates all slots when no appointments and isToday=false", () => {
    const slots = generateAvailableSlots({
      openTime: "09:00",
      closeTime: "10:00",
      serviceDuration: 30,
      appointments: [],
      isToday: false,
      currentMinutes: 0,
    });
    expect(slots).toEqual(["09:00", "09:10", "09:20", "09:30"]);
  });

  it("returns empty array when service duration exceeds operating window", () => {
    const slots = generateAvailableSlots({
      openTime: "09:00",
      closeTime: "09:20",
      serviceDuration: 30,
      appointments: [],
      isToday: false,
      currentMinutes: 0,
    });
    expect(slots).toEqual([]);
  });

  it("returns exactly one slot when service fills the full window", () => {
    // openTime 09:00, closeTime 09:30, service 30 min → only slot 09:00 fits (end=09:30=closeTime)
    const slots = generateAvailableSlots({
      openTime: "09:00",
      closeTime: "09:30",
      serviceDuration: 30,
      appointments: [],
      isToday: false,
      currentMinutes: 0,
    });
    expect(slots).toEqual(["09:00"]);
  });

  it("blocks slot with total overlap from appointment", () => {
    // Appointment 09:00–09:30 (540–570).
    // Slot 09:00(540–570): 540<570 && 570>540 → conflict
    // Slot 09:10(550–580): 550<570 && 580>540 → conflict
    // Slot 09:20(560–590): 560<570 && 590>540 → conflict
    // Slot 09:30(570–600): 570 NOT < 570 → no conflict
    const slots = generateAvailableSlots({
      openTime: "09:00",
      closeTime: "10:00",
      serviceDuration: 30,
      appointments: [{ startMinutes: 540, endMinutes: 570 }],
      isToday: false,
      currentMinutes: 0,
    });
    expect(slots).not.toContain("09:00");
    expect(slots).not.toContain("09:10");
    expect(slots).not.toContain("09:20");
    expect(slots).toContain("09:30");
  });

  it("allows adjacent slot starting exactly when previous appointment ends", () => {
    // Appointment 09:00–09:30 (540–570). Slot 09:30 starts at 570 = endMinutes.
    // slotStart=570 NOT < endMinutes=570 → no conflict
    const slots = generateAvailableSlots({
      openTime: "09:00",
      closeTime: "10:00",
      serviceDuration: 30,
      appointments: [{ startMinutes: 540, endMinutes: 570 }],
      isToday: false,
      currentMinutes: 0,
    });
    expect(slots).toContain("09:30");
  });

  it("blocks past slots with 30-minute buffer when isToday=true", () => {
    // currentMinutes=540 (09:00). Buffer cutoff: 540+30=570.
    // slotStart <= 570 → blocked: 09:00(540), 09:10(550), 09:20(560), 09:30(570)
    // 09:40(580) > 570 → available
    const slots = generateAvailableSlots({
      openTime: "09:00",
      closeTime: "11:00",
      serviceDuration: 30,
      appointments: [],
      isToday: true,
      currentMinutes: 540,
    });
    expect(slots).not.toContain("09:00");
    expect(slots).not.toContain("09:10");
    expect(slots).not.toContain("09:20");
    expect(slots).not.toContain("09:30");
    expect(slots).toContain("09:40");
  });

  it("does not apply past-blocking when isToday=false", () => {
    // Even if currentMinutes is past all slots, isToday=false → no blocking
    const slots = generateAvailableSlots({
      openTime: "09:00",
      closeTime: "10:00",
      serviceDuration: 30,
      appointments: [],
      isToday: false,
      currentMinutes: 700, // well past all slots
    });
    expect(slots).toContain("09:00");
    expect(slots).toContain("09:30");
  });

  it("blocks slot with partial start overlap (appointment starts mid-slot)", () => {
    // Appointment 09:15–09:45 (555–585).
    // Slot 09:40(580–610): 580 < 585 AND 610 > 555 → conflict
    // Slot 09:50(590–620): 590 NOT < 585 → no conflict → available
    const slots = generateAvailableSlots({
      openTime: "09:00",
      closeTime: "10:30",
      serviceDuration: 30,
      appointments: [{ startMinutes: 555, endMinutes: 585 }],
      isToday: false,
      currentMinutes: 0,
    });
    expect(slots).not.toContain("09:40");
    expect(slots).toContain("09:50");
  });

  it("handles multiple appointments with a gap between them", () => {
    // Appointments: 09:00–09:30 (540–570) and 10:00–10:30 (600–630).
    // Slot 09:30(570–600): 570 NOT < 570 (appt1) AND 600 NOT > 630 (appt2 check: 570<630 && 600>600? NO) → available
    // Slot 10:30(630–660): 630 NOT < 570 AND 630 NOT < 630 → available
    const slots = generateAvailableSlots({
      openTime: "09:00",
      closeTime: "11:00",
      serviceDuration: 30,
      appointments: [
        { startMinutes: 540, endMinutes: 570 },
        { startMinutes: 600, endMinutes: 630 },
      ],
      isToday: false,
      currentMinutes: 0,
    });
    expect(slots).toContain("09:30");
    expect(slots).toContain("10:30");
    expect(slots).not.toContain("09:00");
    expect(slots).not.toContain("10:00");
  });

  it("uses slot interval of 10 minutes (SLOT_CONFIG.SLOT_MINUTES)", () => {
    // If slot interval were different (e.g. 30), we'd get fewer slots
    const slots = generateAvailableSlots({
      openTime: "09:00",
      closeTime: "10:00",
      serviceDuration: 30,
      appointments: [],
      isToday: false,
      currentMinutes: 0,
    });
    // 10-min interval → 09:00, 09:10, 09:20, 09:30 (not 09:00 and 09:30 only)
    expect(slots).toContain("09:10");
    expect(slots).toContain("09:20");
  });
});
