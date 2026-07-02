/**
 * TEST-04 — Agenda: Core appointment business logic
 *
 * Tests src/lib/appointment-core.ts
 *   - createAppointmentCore: service validation, conflict guard, client auto-create/link
 *   - updateAppointmentCore: ownership, status guard, self-exclusion, phone change
 *   - moveAppointmentCore: status guard, same-prof early return, cross-tenant prof guard, conflict
 *   - updateAppointmentStatusCore: barber ownership, basic transitions (CRM in crm.test.ts)
 *
 * Failure criterion:
 *   - Remove barbershopId from service query → cross-tenant service accepted
 *   - Remove conflict check → double-booking allowed
 *   - Remove barber ownership check → barber edits any appointment
 *   - Remove status guard → completed appointments can be mutated
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import {
  createAppointmentCore,
  updateAppointmentCore,
  moveAppointmentCore,
  updateAppointmentStatusCore,
} from "@/lib/appointment-core";
import {
  makeService,
  makeAppointment,
  makeProfessional,
} from "../../factories";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    service: { findMany: vi.fn() },
    appointment: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    timeBlock: { findFirst: vi.fn().mockResolvedValue(null) },
    client: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    professional: { findFirst: vi.fn() },
    comanda: { updateMany: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  log: {
    agenda: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-a";
const PROF_A = "prof-a";
const SVC_A = "svc-a";
// 2026-06-15 13:00 UTC = 10:00 Brasília
const DATE_ISO = "2026-06-15T13:00:00.000Z";

const ownerAuth = { role: "owner", professionalId: null, barbershopId: SHOP_A };
const barberAuth = { role: "barber", professionalId: PROF_A, barbershopId: SHOP_A };

const baseCreateInput = {
  barbershopId: SHOP_A,
  professionalId: PROF_A,
  serviceIds: [SVC_A],
  dateISO: DATE_ISO,
  clientName: "João Silva",
  clientPhone: "11999999999",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeTxMock() {
  return {
    $executeRaw: vi.fn().mockResolvedValue(undefined),
    client: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "new-client-id" }),
      update: vi.fn().mockResolvedValue({}),
    },
    appointment: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "new-appt-id" }),
      update: vi.fn().mockResolvedValue({}),
    },
    timeBlock: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    comanda: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    appointmentService: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// createAppointmentCore
// ══════════════════════════════════════════════════════════════════════════════

describe("createAppointmentCore()", () => {
  it("returns error when service not found in barbershop", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([]);

    const result = await createAppointmentCore(baseCreateInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Serviço não encontrado");
    expect(vi.mocked(db.appointment.findFirst)).not.toHaveBeenCalled();
  });

  it("validates service by barbershopId to prevent cross-tenant access", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([]);

    await createAppointmentCore({ ...baseCreateInput, barbershopId: "shop-other" });

    expect(vi.mocked(db.service.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ barbershopId: "shop-other" }),
      }),
    );
  });

  it("returns conflict error when slot is already occupied", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue(
      [makeService({ durationMin: 30 })],
    );
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({ id: "conflict-appt-id" }),
    );

    const result = await createAppointmentCore(baseCreateInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain("conflito");
    expect(vi.mocked(db.$transaction)).not.toHaveBeenCalled();
  });

  it("creates appointment and returns appointmentId on success", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue(
      [makeService({ durationMin: 30 })],
    );
    vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    const result = await createAppointmentCore(baseCreateInput);

    expect(result.success).toBe(true);
    expect(result.appointmentId).toBe("new-appt-id");
  });

  it("sums durations of all services for endTime calculation", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([
      makeService({ id: "svc-1", durationMin: 30 }),
      makeService({ id: "svc-2", durationMin: 45 }),
    ]);
    vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    const startDate = new Date(DATE_ISO);
    await createAppointmentCore({
      ...baseCreateInput,
      serviceIds: ["svc-1", "svc-2"],
    });

    const expectedEnd = new Date(startDate.getTime() + 75 * 60_000); // 30+45=75 min
    expect(tx.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          endTime: expectedEnd,
        }),
      }),
    );
  });

  it("auto-creates new client when phone not in database", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue(
      [makeService({ durationMin: 30 })],
    );
    vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

    const tx = makeTxMock();
    tx.client.findFirst.mockResolvedValue(null); // phone not found → create
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await createAppointmentCore(baseCreateInput);

    expect(tx.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phone: "11999999999",
          barbershopId: SHOP_A,
        }),
      }),
    );
  });

  it("links existing client when phone already exists in database", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue(
      [makeService({ durationMin: 30 })],
    );
    vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

    const tx = makeTxMock();
    tx.client.findFirst.mockResolvedValue({ id: "existing-client-id", email: null });
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await createAppointmentCore(baseCreateInput);

    expect(tx.client.create).not.toHaveBeenCalled();
    expect(tx.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clientId: "existing-client-id" }),
      }),
    );
  });

  it("normalizes phone by stripping non-digit characters", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue(
      [makeService({ durationMin: 30 })],
    );
    vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await createAppointmentCore({
      ...baseCreateInput,
      clientPhone: "(11) 99999-9999",
    });

    expect(tx.client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ phone: "11999999999" }),
      }),
    );
  });

  it("validates service is active — inactive service returns error", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([]); // isActive: false filtered by Prisma query

    const result = await createAppointmentCore(baseCreateInput);

    expect(result.success).toBe(false);
    // service query must include isActive: true filter
    expect(vi.mocked(db.service.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      }),
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// updateAppointmentCore
// ══════════════════════════════════════════════════════════════════════════════

describe("updateAppointmentCore()", () => {
  const baseUpdateInput = {
    appointmentId: "appt-a",
    serviceIds: [SVC_A],
    dateISO: DATE_ISO,
    clientName: "João Silva",
    clientPhone: "11999999999",
  };

  it("returns error when appointment not found in barbershop", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

    const result = await updateAppointmentCore(baseUpdateInput, ownerAuth);

    expect(result.success).toBe(false);
    expect(result.error).toContain("não encontrado");
  });

  it("blocks barber from editing another professional's appointment", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({
        professionalId: "prof-other",
        status: "pending",
        clientPhone: "11888888888",
        clientId: null,
      }),
    );

    const result = await updateAppointmentCore(baseUpdateInput, {
      ...barberAuth,
      professionalId: "prof-own",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("permissão");
    expect(vi.mocked(db.service.findMany)).not.toHaveBeenCalled();
  });

  it("allows owner to edit any professional's appointment", async () => {
    vi.mocked(db.appointment.findFirst)
      .mockResolvedValueOnce(
        makeAppointment({
          professionalId: "prof-other",
          status: "pending",
          clientPhone: "11999999999",
          clientId: null,
        }),
      )
      .mockResolvedValueOnce(null); // checkConflict: no conflict
    vi.mocked(db.service.findMany).mockResolvedValue(
      [makeService({ durationMin: 30 })],
    );

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    const result = await updateAppointmentCore(baseUpdateInput, ownerAuth);

    expect(result.success).toBe(true);
  });

  it("rejects update when appointment status is completed", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({
        status: "completed",
        professionalId: PROF_A,
        clientPhone: "11999999999",
      }),
    );

    const result = await updateAppointmentCore(baseUpdateInput, ownerAuth);

    expect(result.success).toBe(false);
    expect(result.error).toContain("pendentes ou confirmados");
    expect(vi.mocked(db.service.findMany)).not.toHaveBeenCalled();
  });

  it("rejects update when appointment status is no_show", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({
        status: "no_show",
        professionalId: PROF_A,
        clientPhone: "11999999999",
      }),
    );

    const result = await updateAppointmentCore(baseUpdateInput, ownerAuth);

    expect(result.success).toBe(false);
    expect(result.error).toContain("pendentes ou confirmados");
  });

  it("passes appointmentId as excludeId for self-exclusion in conflict check", async () => {
    vi.mocked(db.appointment.findFirst)
      .mockResolvedValueOnce(
        makeAppointment({
          id: "appt-a",
          professionalId: PROF_A,
          status: "pending",
          clientPhone: "11999999999",
          clientId: null,
        }),
      )
      .mockResolvedValueOnce(null); // no conflict after self-exclusion
    vi.mocked(db.service.findMany).mockResolvedValue(
      [makeService({ durationMin: 30 })],
    );

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await updateAppointmentCore(baseUpdateInput, ownerAuth);

    // Second findFirst call is the conflict check with NOT: { id: appointmentId }
    const conflictCall = vi.mocked(db.appointment.findFirst).mock.calls[1];
    expect(conflictCall[0]).toMatchObject({
      where: expect.objectContaining({
        NOT: { id: "appt-a" },
      }),
    });
  });

  it("re-links to existing client when phone number changes", async () => {
    vi.mocked(db.appointment.findFirst)
      .mockResolvedValueOnce(
        makeAppointment({
          professionalId: PROF_A,
          status: "pending",
          clientPhone: "11888888888", // original phone
          clientId: null,
        }),
      )
      .mockResolvedValueOnce(null); // no conflict
    vi.mocked(db.service.findMany).mockResolvedValue(
      [makeService({ durationMin: 30 })],
    );

    const tx = makeTxMock();
    tx.client.findFirst.mockResolvedValue({ id: "found-client-id" });
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await updateAppointmentCore(
      { ...baseUpdateInput, clientPhone: "11999999999" },
      ownerAuth,
    );

    expect(tx.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clientId: "found-client-id" }),
      }),
    );
  });

  it("creates new client when phone changes to unknown number", async () => {
    vi.mocked(db.appointment.findFirst)
      .mockResolvedValueOnce(
        makeAppointment({
          professionalId: PROF_A,
          status: "pending",
          clientPhone: "11888888888",
          clientId: null,
        }),
      )
      .mockResolvedValueOnce(null);
    vi.mocked(db.service.findMany).mockResolvedValue(
      [makeService({ durationMin: 30 })],
    );

    const tx = makeTxMock();
    tx.client.findFirst.mockResolvedValue(null); // new phone not found → create
    tx.client.create.mockResolvedValue({ id: "brand-new-client-id" });
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await updateAppointmentCore(
      { ...baseUpdateInput, clientPhone: "11999999999" },
      ownerAuth,
    );

    expect(tx.client.create).toHaveBeenCalled();
    expect(tx.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clientId: "brand-new-client-id" }),
      }),
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// moveAppointmentCore
// ══════════════════════════════════════════════════════════════════════════════

describe("moveAppointmentCore()", () => {
  const baseMoveInput = {
    appointmentId: "appt-a",
    newProfessionalId: "prof-b",
  };

  it("returns error when appointment not found in barbershop", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

    const result = await moveAppointmentCore(baseMoveInput, ownerAuth);

    expect(result.success).toBe(false);
    expect(result.error).toContain("não encontrado");
  });

  it("rejects move when appointment is completed", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({ status: "completed" }),
    );

    const result = await moveAppointmentCore(baseMoveInput, ownerAuth);

    expect(result.success).toBe(false);
    expect(result.error).toContain("pendentes ou confirmados");
  });

  it("rejects move when appointment is cancelled", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({ status: "cancelled" }),
    );

    const result = await moveAppointmentCore(baseMoveInput, ownerAuth);

    expect(result.success).toBe(false);
  });

  it("rejects move when appointment is no_show", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({ status: "no_show" }),
    );

    const result = await moveAppointmentCore(baseMoveInput, ownerAuth);

    expect(result.success).toBe(false);
  });

  it("returns success immediately when same professional is assigned (no re-assignment)", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({ professionalId: "prof-b", status: "pending" }),
    );

    const result = await moveAppointmentCore(baseMoveInput, ownerAuth);

    expect(result.success).toBe(true);
    expect(vi.mocked(db.professional.findFirst)).not.toHaveBeenCalled();
    expect(vi.mocked(db.$transaction)).not.toHaveBeenCalled();
  });

  it("validates new professional by barbershopId (cross-tenant guard)", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({ professionalId: PROF_A, status: "pending" }),
    );
    vi.mocked(db.professional.findFirst).mockResolvedValue(null);

    const result = await moveAppointmentCore(baseMoveInput, ownerAuth);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Profissional não encontrado");
    expect(vi.mocked(db.professional.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ barbershopId: SHOP_A }),
      }),
    );
  });

  it("returns conflict error when new professional has scheduling overlap", async () => {
    const appt = makeAppointment({
      professionalId: PROF_A,
      status: "pending",
      date: new Date(DATE_ISO),
      endTime: new Date(new Date(DATE_ISO).getTime() + 30 * 60_000),
    });
    vi.mocked(db.appointment.findFirst)
      .mockResolvedValueOnce(appt)
      .mockResolvedValueOnce(makeAppointment({ id: "conflict-id" }));
    vi.mocked(db.professional.findFirst).mockResolvedValue(
      makeProfessional({ id: "prof-b" }),
    );

    const result = await moveAppointmentCore(baseMoveInput, ownerAuth);

    expect(result.success).toBe(false);
    expect(result.error).toContain("conflito");
  });

  it("updates professionalId on successful move via transaction", async () => {
    const appt = makeAppointment({
      professionalId: PROF_A,
      status: "pending",
      date: new Date(DATE_ISO),
      endTime: new Date(new Date(DATE_ISO).getTime() + 30 * 60_000),
    });
    vi.mocked(db.appointment.findFirst)
      .mockResolvedValueOnce(appt)
      .mockResolvedValueOnce(null); // no conflict
    vi.mocked(db.professional.findFirst).mockResolvedValue(
      makeProfessional({ id: "prof-b" }),
    );

    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(undefined),
      appointment: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({}),
      },
      timeBlock: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    const result = await moveAppointmentCore(baseMoveInput, ownerAuth);

    expect(result.success).toBe(true);
    expect(tx.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "appt-a" },
        data: { professionalId: "prof-b" },
      }),
    );
  });

  it("acquires advisory lock on newProfessionalId before updating", async () => {
    const appt = makeAppointment({
      professionalId: PROF_A,
      status: "pending",
      date: new Date(DATE_ISO),
      endTime: new Date(new Date(DATE_ISO).getTime() + 30 * 60_000),
    });
    vi.mocked(db.appointment.findFirst)
      .mockResolvedValueOnce(appt)
      .mockResolvedValueOnce(null); // no conflict
    vi.mocked(db.professional.findFirst).mockResolvedValue(
      makeProfessional({ id: "prof-b" }),
    );

    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(undefined),
      appointment: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({}),
      },
      timeBlock: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await moveAppointmentCore(baseMoveInput, ownerAuth);

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// updateAppointmentStatusCore — ownership and basic transitions
// CRM-specific scenarios are in crm.test.ts
// ══════════════════════════════════════════════════════════════════════════════

describe("updateAppointmentStatusCore()", () => {
  it("returns error when appointment not found in barbershop", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

    const result = await updateAppointmentStatusCore(
      "appt-a",
      "completed",
      ownerAuth,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("não encontrado");
    expect(vi.mocked(db.$transaction)).not.toHaveBeenCalled();
  });

  it("blocks barber from updating another professional's appointment status", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({
        professionalId: "prof-other",
        clientId: null,
        status: "pending",
      }),
    );

    const result = await updateAppointmentStatusCore(
      "appt-a",
      "completed",
      barberAuth,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("permissão");
    expect(vi.mocked(db.$transaction)).not.toHaveBeenCalled();
  });

  it("allows barber to update their own appointment's status", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({
        professionalId: PROF_A, // matches barberAuth.professionalId
        clientId: null,
        status: "pending",
      }),
    );

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    const result = await updateAppointmentStatusCore(
      "appt-a",
      "no_show",
      barberAuth,
    );

    expect(result.success).toBe(true);
  });

  it("succeeds for owner regardless of professionalId", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({
        professionalId: "prof-other",
        clientId: null,
        status: "pending",
      }),
    );

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    const result = await updateAppointmentStatusCore(
      "appt-a",
      "no_show",
      ownerAuth,
    );

    expect(result.success).toBe(true);
  });
});
