/**
 * TEST-04 — Agenda: Pure unit tests for availability.ts
 *
 * No mocks needed — these are pure functions.
 * SLOT_CONFIG.SLOT_MINUTES = 10 (from src/lib/slot-config.ts)
 *
 * generateAvailableSlots now returns SlotInfo[] (all slots in operating hours
 * with available: boolean). Slots are unavailable when the service doesn't fit
 * before closing, there's a conflict, or the slot is in the past.
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

// Helper: check availability of a specific slot time
function avail(
  slots: { time: string; available: boolean }[],
  time: string,
): boolean | undefined {
  return slots.find((s) => s.time === time)?.available;
}

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
// Returns ALL slots from openTime to closeTime (step 10 min).
// available=false when: service doesn't fit before close, has conflict, or is past.
//
// Window 09:00–10:00 = 540–600. Service 30 min. SLOT_INTERVAL=10.
// All slots: 09:00, 09:10, 09:20, 09:30, 09:40, 09:50 (6 total).
// Available (slotEnd ≤ 600): 09:00(570≤600✓), 09:10(580≤600✓), 09:20(590≤600✓), 09:30(600≤600✓).
// Unavailable: 09:40(610>600✗), 09:50(620>600✗).

describe("generateAvailableSlots()", () => {
  it("returns all operating-hours slots; only those that fit the service are available", () => {
    const slots = generateAvailableSlots({
      openTime: "09:00",
      closeTime: "10:00",
      serviceDuration: 30,
      appointments: [],
      isToday: false,
      currentMinutes: 0,
    });
    // 6 total slots (09:00, 09:10, 09:20, 09:30, 09:40, 09:50)
    expect(slots).toHaveLength(6);
    // Available: 09:00–09:30 (service fits); unavailable: 09:40, 09:50
    expect(slots.filter((s) => s.available).map((s) => s.time)).toEqual([
      "09:00",
      "09:10",
      "09:20",
      "09:30",
    ]);
    expect(avail(slots, "09:40")).toBe(false);
    expect(avail(slots, "09:50")).toBe(false);
  });

  it("returns no available slots when service duration exceeds operating window", () => {
    // Window 09:00–09:20 (20 min), service 30 min — no slot fits.
    // But slots 09:00 and 09:10 are still returned (just unavailable).
    const slots = generateAvailableSlots({
      openTime: "09:00",
      closeTime: "09:20",
      serviceDuration: 30,
      appointments: [],
      isToday: false,
      currentMinutes: 0,
    });
    expect(slots.filter((s) => s.available)).toHaveLength(0);
  });

  it("returns exactly one available slot when service fills the full window", () => {
    // Window 09:00–09:30 (30 min), service 30 min → only 09:00 fits (end=09:30=closeTime).
    // Slots returned: 09:00 (available), 09:10 (unavailable), 09:20 (unavailable).
    const slots = generateAvailableSlots({
      openTime: "09:00",
      closeTime: "09:30",
      serviceDuration: 30,
      appointments: [],
      isToday: false,
      currentMinutes: 0,
    });
    expect(slots.filter((s) => s.available).map((s) => s.time)).toEqual([
      "09:00",
    ]);
  });

  it("marks slot unavailable (not removes) when it conflicts with an appointment", () => {
    // Appointment 09:00–09:30 (540–570).
    // Slot 09:00(540–570): 540<570 && 570>540 → conflict → unavailable
    // Slot 09:10(550–580): 550<570 && 580>540 → conflict → unavailable
    // Slot 09:20(560–590): 560<570 && 590>540 → conflict → unavailable
    // Slot 09:30(570–600): 570 NOT<570 → no conflict → available
    const slots = generateAvailableSlots({
      openTime: "09:00",
      closeTime: "10:00",
      serviceDuration: 30,
      appointments: [{ startMinutes: 540, endMinutes: 570 }],
      isToday: false,
      currentMinutes: 0,
    });
    expect(avail(slots, "09:00")).toBe(false);
    expect(avail(slots, "09:10")).toBe(false);
    expect(avail(slots, "09:20")).toBe(false);
    expect(avail(slots, "09:30")).toBe(true);
    // All blocked slots still appear in the list
    expect(slots.find((s) => s.time === "09:00")).toBeDefined();
    expect(slots.find((s) => s.time === "09:10")).toBeDefined();
  });

  it("allows adjacent slot starting exactly when previous appointment ends", () => {
    // Appointment 09:00–09:30 (540–570). Slot 09:30 starts at 570 = endMinutes.
    // slotStart=570 NOT < endMinutes=570 → no conflict → available
    const slots = generateAvailableSlots({
      openTime: "09:00",
      closeTime: "10:00",
      serviceDuration: 30,
      appointments: [{ startMinutes: 540, endMinutes: 570 }],
      isToday: false,
      currentMinutes: 0,
    });
    expect(avail(slots, "09:30")).toBe(true);
  });

  it("marks past slots unavailable (with 30-min buffer) when isToday=true", () => {
    // currentMinutes=540 (09:00). Buffer cutoff: 540+30=570.
    // slotStart ≤ 570 → unavailable: 09:00(540), 09:10(550), 09:20(560), 09:30(570)
    // 09:40(580) > 570 → available (if no conflict and fits)
    const slots = generateAvailableSlots({
      openTime: "09:00",
      closeTime: "11:00",
      serviceDuration: 30,
      appointments: [],
      isToday: true,
      currentMinutes: 540,
    });
    expect(avail(slots, "09:00")).toBe(false);
    expect(avail(slots, "09:10")).toBe(false);
    expect(avail(slots, "09:20")).toBe(false);
    expect(avail(slots, "09:30")).toBe(false);
    expect(avail(slots, "09:40")).toBe(true);
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
    expect(avail(slots, "09:00")).toBe(true);
    expect(avail(slots, "09:30")).toBe(true);
  });

  it("marks slot unavailable with partial start overlap (appointment starts mid-slot)", () => {
    // Appointment 09:15–09:45 (555–585).
    // Slot 09:40(580–610): 580 < 585 AND 610 > 555 → conflict → unavailable
    // Slot 09:50(590–620): 590 NOT < 585 → no conflict → available
    const slots = generateAvailableSlots({
      openTime: "09:00",
      closeTime: "10:30",
      serviceDuration: 30,
      appointments: [{ startMinutes: 555, endMinutes: 585 }],
      isToday: false,
      currentMinutes: 0,
    });
    expect(avail(slots, "09:40")).toBe(false);
    expect(avail(slots, "09:50")).toBe(true);
  });

  it("handles multiple appointments with a gap between them", () => {
    // Appointments: 09:00–09:30 (540–570) and 10:00–10:30 (600–630).
    // Slot 09:30(570–600): no conflict with either → available
    // Slot 10:30(630–660): no conflict → available
    // Slot 09:00(540–570): conflicts with first → unavailable
    // Slot 10:00(600–630): conflicts with second → unavailable
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
    expect(avail(slots, "09:30")).toBe(true);
    expect(avail(slots, "10:30")).toBe(true);
    expect(avail(slots, "09:00")).toBe(false);
    expect(avail(slots, "10:00")).toBe(false);
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
    // 10-min interval → includes 09:10 and 09:20 (not just 09:00 and 09:30)
    expect(avail(slots, "09:10")).toBe(true);
    expect(avail(slots, "09:20")).toBe(true);
    // All 6 slots present
    expect(slots).toHaveLength(6);
  });
});
