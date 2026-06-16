/**
 * TEST-08 — Onboarding: createBarbershop
 *
 * Tests src/app/(onboarding)/onboarding/actions.ts → createBarbershop(formData)
 *
 * Failure criteria:
 *   - Remove auth check           → unauthenticated users create barbershops
 *   - Remove slug uniqueness      → duplicate slugs allowed
 *   - Remove CPF duplicate check  → two accounts share a CPF
 *   - Remove waitlist logic        → all users always get 30-day trial
 *   - Change planStatus            → barbershop not created in trial
 *   - Remove any transaction step  → partial data persisted (no rollback)
 *   - Remove birthDate validation  → invalid dates silently accepted
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PlanStatus } from "@prisma/client";
import { log } from "@/lib/logger";
import { createBarbershop } from "@/app/(onboarding)/onboarding/actions";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    barbershop: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    waitlistLead: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    onboarding: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const USER_ID = "user-owner-1";
const SHOP_ID = "shop-new-1";
const PROF_ID = "prof-new-1";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const defaults: Record<string, string> = {
    fullName: "João Silva",
    cpf: "",
    birthDate: "",
    phone: "11999999999",
    barbershopName: "Barbearia Test",
    slug: "barbearia-test",
    street: "Rua das Flores, 123",
    neighborhood: "Centro",
    cep: "01310100",
    city: "São Paulo",
    state: "SP",
    landline: "",
  };
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    fd.set(key, value);
  }
  return fd;
}

function makeTx() {
  return {
    user: { update: vi.fn().mockResolvedValue({}) },
    barbershop: {
      create: vi.fn().mockResolvedValue({ id: SHOP_ID, slug: "barbearia-test" }),
    },
    professional: { create: vi.fn().mockResolvedValue({ id: PROF_ID }) },
    membership: { create: vi.fn().mockResolvedValue({}) },
    service: { createMany: vi.fn().mockResolvedValue({ count: 8 }) },
    businessHour: { createMany: vi.fn().mockResolvedValue({ count: 7 }) },
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

let tx: ReturnType<typeof makeTx>;

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID } } as never);
  vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);
  // Default: owner exists with email (no CPF in form → single findUnique call)
  vi.mocked(db.user.findUnique).mockResolvedValue({
    id: USER_ID,
    email: "owner@example.com",
  } as never);
  vi.mocked(db.waitlistLead.findFirst).mockResolvedValue(null);

  tx = makeTx();
  vi.mocked(db.$transaction).mockImplementation(
    async (fn: unknown) => (fn as (t: typeof tx) => unknown)(tx),
  );
});

// ── Authentication ────────────────────────────────────────────────────────────

describe("Authentication guard", () => {
  it("redirects to /login when session is null", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when session has no user.id", async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as never);

    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/login");
  });

  it("proceeds past auth when session.user.id is present", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).not.toHaveBeenCalledWith("/login");
  });
});

// ── Required field validation ─────────────────────────────────────────────────

describe("Required field validation — personal + shop", () => {
  it("throws when fullName is blank", async () => {
    await expect(createBarbershop(makeFormData({ fullName: "" }))).rejects.toThrow(
      "Campos obrigatórios faltando.",
    );
  });

  it("throws when barbershopName is blank", async () => {
    await expect(
      createBarbershop(makeFormData({ barbershopName: "" })),
    ).rejects.toThrow("Campos obrigatórios faltando.");
  });

  it("throws when slug is blank", async () => {
    await expect(createBarbershop(makeFormData({ slug: "" }))).rejects.toThrow(
      "Campos obrigatórios faltando.",
    );
  });

  it("throws when phone is blank", async () => {
    await expect(createBarbershop(makeFormData({ phone: "" }))).rejects.toThrow(
      "Campos obrigatórios faltando.",
    );
  });
});

describe("Required field validation — address", () => {
  it("throws when street is blank", async () => {
    await expect(createBarbershop(makeFormData({ street: "" }))).rejects.toThrow(
      "Endereço completo é obrigatório.",
    );
  });

  it("throws when neighborhood is blank", async () => {
    await expect(
      createBarbershop(makeFormData({ neighborhood: "" })),
    ).rejects.toThrow("Endereço completo é obrigatório.");
  });

  it("throws when cep is blank", async () => {
    await expect(createBarbershop(makeFormData({ cep: "" }))).rejects.toThrow(
      "Endereço completo é obrigatório.",
    );
  });

  it("throws when city is blank", async () => {
    await expect(createBarbershop(makeFormData({ city: "" }))).rejects.toThrow(
      "Endereço completo é obrigatório.",
    );
  });
});

// ── Slug uniqueness & slugify ─────────────────────────────────────────────────

describe("Slug uniqueness", () => {
  it("throws when slug already exists in DB", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue({ id: "existing" } as never);

    await expect(createBarbershop(makeFormData())).rejects.toThrow(
      "Este link já está em uso. Escolha outro.",
    );
  });

  it("slugify converts accented characters to ASCII equivalents", async () => {
    await expect(
      createBarbershop(makeFormData({ slug: "Barbearia Élite" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(db.barbershop.findUnique)).toHaveBeenCalledWith({
      where: { slug: "barbearia-elite" },
    });
  });

  it("slugify replaces multiple spaces with a single hyphen", async () => {
    await expect(
      createBarbershop(makeFormData({ slug: "minha   barbearia" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(db.barbershop.findUnique)).toHaveBeenCalledWith({
      where: { slug: "minha-barbearia" },
    });
  });

  it("unique slug proceeds into the transaction", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.barbershop.create).toHaveBeenCalled();
  });
});

// ── CPF validation ────────────────────────────────────────────────────────────

describe("CPF duplicate detection", () => {
  it("throws when CPF is registered to a DIFFERENT user", async () => {
    // 1st findUnique = CPF lookup → returns OTHER user
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: "OTHER_USER",
    } as never);

    await expect(
      createBarbershop(makeFormData({ cpf: "123.456.789-01" })),
    ).rejects.toThrow("CPF já cadastrado no sistema.");
  });

  it("allows CPF already registered to the SAME user (re-submission)", async () => {
    // 1st findUnique = CPF lookup → same user → ok
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: USER_ID,
    } as never);
    // 2nd findUnique = owner email lookup (falls back to beforeEach default)

    await expect(
      createBarbershop(makeFormData({ cpf: "123.456.789-01" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard");
  });

  it("skips CPF DB check entirely when CPF field is empty", async () => {
    await expect(createBarbershop(makeFormData({ cpf: "" }))).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    // Only one findUnique: owner email lookup (no CPF check)
    expect(vi.mocked(db.user.findUnique)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.user.findUnique)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: USER_ID } }),
    );
  });
});

// ── Birth date validation ─────────────────────────────────────────────────────

describe("Birth date validation", () => {
  it("throws when birthDate is shorter than 10 characters", async () => {
    await expect(
      createBarbershop(makeFormData({ birthDate: "2000-01" })),
    ).rejects.toThrow("Data de nascimento inválida.");
  });

  it("accepts a 10-character birthDate and passes it to user.update", async () => {
    await expect(
      createBarbershop(makeFormData({ birthDate: "2000-01-15" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ birthDate: expect.any(Date) }),
      }),
    );
  });

  it("omits birthDate from user.update when field is empty", async () => {
    await expect(createBarbershop(makeFormData({ birthDate: "" }))).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    const updateArg = tx.user.update.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(updateArg.data).not.toHaveProperty("birthDate");
  });
});

// ── Waitlist lead → trial duration ───────────────────────────────────────────

describe("Trial duration — waitlist vs standard", () => {
  it("grants 60-day trial when owner email is on the waitlist", async () => {
    vi.mocked(db.waitlistLead.findFirst).mockResolvedValue({ id: "lead-1" } as never);

    const before = Date.now();
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");
    const after = Date.now();

    const { trialEndsAt } = (
      tx.barbershop.create.mock.calls[0][0] as { data: { trialEndsAt: Date } }
    ).data;
    const sixtyDays = 60 * 24 * 60 * 60 * 1000;

    expect(trialEndsAt.getTime()).toBeGreaterThanOrEqual(before + sixtyDays - 1000);
    expect(trialEndsAt.getTime()).toBeLessThanOrEqual(after + sixtyDays + 1000);
  });

  it("grants 30-day trial when owner email is NOT on the waitlist", async () => {
    vi.mocked(db.waitlistLead.findFirst).mockResolvedValue(null);

    const before = Date.now();
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");
    const after = Date.now();

    const { trialEndsAt } = (
      tx.barbershop.create.mock.calls[0][0] as { data: { trialEndsAt: Date } }
    ).data;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    expect(trialEndsAt.getTime()).toBeGreaterThanOrEqual(before + thirtyDays - 1000);
    expect(trialEndsAt.getTime()).toBeLessThanOrEqual(after + thirtyDays + 1000);
  });

  it("grants 30-day trial when owner record is not found in DB", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    const before = Date.now();
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");
    const after = Date.now();

    const { trialEndsAt } = (
      tx.barbershop.create.mock.calls[0][0] as { data: { trialEndsAt: Date } }
    ).data;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    expect(trialEndsAt.getTime()).toBeGreaterThanOrEqual(before + thirtyDays - 1000);
    expect(trialEndsAt.getTime()).toBeLessThanOrEqual(after + thirtyDays + 1000);
    expect(vi.mocked(db.waitlistLead.findFirst)).not.toHaveBeenCalled();
  });

  it("checks waitlistLead with case-insensitive email match", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(db.waitlistLead.findFirst)).toHaveBeenCalledWith({
      where: { email: { equals: "owner@example.com", mode: "insensitive" } },
      select: { id: true },
    });
  });
});

// ── Transaction: user profile update ─────────────────────────────────────────

describe("Transaction — user profile update", () => {
  it("updates user name with trimmed fullName", async () => {
    await expect(
      createBarbershop(makeFormData({ fullName: "  Maria Oliveira  " })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
        data: expect.objectContaining({ name: "Maria Oliveira" }),
      }),
    );
  });

  it("includes stripped CPF in user.update when provided", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ id: USER_ID } as never);

    await expect(
      createBarbershop(makeFormData({ cpf: "111.222.333-44" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cpf: "11122233344" }),
      }),
    );
  });
});

// ── Transaction: barbershop creation ─────────────────────────────────────────

describe("Transaction — barbershop creation", () => {
  it("creates barbershop with correct name and slugified slug", async () => {
    await expect(
      createBarbershop(makeFormData({ barbershopName: "Barbearia Test", slug: "Barbearia Test" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.barbershop.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Barbearia Test",
          slug: "barbearia-test",
        }),
      }),
    );
  });

  it("creates barbershop with planStatus = trial", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.barbershop.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ planStatus: PlanStatus.trial }),
      }),
    );
  });

  it("creates barbershop with plan = 'start'", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.barbershop.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ plan: "start" }),
      }),
    );
  });

  it("sets ownerId to the authenticated userId", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.barbershop.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: USER_ID }),
      }),
    );
  });

  it("stores all address fields from the form", async () => {
    await expect(
      createBarbershop(
        makeFormData({
          street: "Av. Paulista, 1000",
          neighborhood: "Bela Vista",
          cep: "01311000",
          city: "São Paulo",
          state: "SP",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.barbershop.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          street: "Av. Paulista, 1000",
          neighborhood: "Bela Vista",
          cep: "01311000",
          city: "São Paulo",
          state: "SP",
        }),
      }),
    );
  });
});

// ── Transaction: professional ─────────────────────────────────────────────────

describe("Transaction — professional creation", () => {
  it("creates professional with owner's fullName and isActive = true", async () => {
    await expect(
      createBarbershop(makeFormData({ fullName: "Pedro Barbeiro" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.professional.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Pedro Barbeiro",
          isActive: true,
        }),
      }),
    );
  });

  it("professional barbershopId matches the newly created barbershop", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.professional.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ barbershopId: SHOP_ID }),
      }),
    );
  });
});

// ── Transaction: membership ───────────────────────────────────────────────────

describe("Transaction — owner membership creation", () => {
  it("creates membership with role = owner", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "owner" }),
      }),
    );
  });

  it("membership userId is the authenticated user", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: USER_ID }),
      }),
    );
  });

  it("membership barbershopId matches the new barbershop", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ barbershopId: SHOP_ID }),
      }),
    );
  });

  it("membership professionalId matches the new professional", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ professionalId: PROF_ID }),
      }),
    );
  });

  it("owner membership has isActive=true (commission lives on Professional now, not Membership)", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: true }),
      }),
    );
  });
});

// ── Transaction: preset services ─────────────────────────────────────────────

describe("Transaction — preset services", () => {
  it("creates exactly 8 preset services via createMany", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    const { data } = tx.service.createMany.mock.calls[0][0] as {
      data: unknown[];
    };
    expect(data).toHaveLength(8);
  });

  it("all preset services belong to the new barbershopId", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    const { data } = tx.service.createMany.mock.calls[0][0] as {
      data: { barbershopId: string }[];
    };
    expect(data.every((s) => s.barbershopId === SHOP_ID)).toBe(true);
  });
});

// ── Transaction: business hours ───────────────────────────────────────────────

describe("Transaction — business hours", () => {
  it("creates 7 entries — one per day of the week (0–6)", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    const { data } = tx.businessHour.createMany.mock.calls[0][0] as {
      data: unknown[];
    };
    expect(data).toHaveLength(7);
  });

  it("Sunday (dayOfWeek = 0) has isOpen = false", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    const { data } = tx.businessHour.createMany.mock.calls[0][0] as {
      data: { dayOfWeek: number; isOpen: boolean }[];
    };
    expect(data.find((h) => h.dayOfWeek === 0)?.isOpen).toBe(false);
  });

  it("weekdays (dayOfWeek 1–6) have isOpen = true", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    const { data } = tx.businessHour.createMany.mock.calls[0][0] as {
      data: { dayOfWeek: number; isOpen: boolean }[];
    };
    expect(data.filter((h) => h.dayOfWeek !== 0).every((h) => h.isOpen)).toBe(true);
  });

  it("default hours are 09:00 open and 18:00 close for all days", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    const { data } = tx.businessHour.createMany.mock.calls[0][0] as {
      data: { openTime: string; closeTime: string }[];
    };
    expect(
      data.every((h) => h.openTime === "09:00" && h.closeTime === "18:00"),
    ).toBe(true);
  });

  it("all business hours are scoped to the new barbershopId", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    const { data } = tx.businessHour.createMany.mock.calls[0][0] as {
      data: { barbershopId: string }[];
    };
    expect(data.every((h) => h.barbershopId === SHOP_ID)).toBe(true);
  });
});

// ── Transaction rollback ──────────────────────────────────────────────────────

describe("Transaction rollback on failure", () => {
  it("re-throws the transaction error so caller sees the failure", async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error("DB constraint violation"));

    await expect(createBarbershop(makeFormData())).rejects.toThrow(
      "DB constraint violation",
    );
  });

  it("does NOT redirect to /dashboard when transaction fails", async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error("connection timeout"));

    try {
      await createBarbershop(makeFormData());
    } catch {
      // expected
    }

    expect(vi.mocked(redirect)).not.toHaveBeenCalledWith("/dashboard");
  });

  it("calls log.onboarding.error with userId, slug, and the original error", async () => {
    const dbError = new Error("unique constraint");
    vi.mocked(db.$transaction).mockRejectedValue(dbError);

    try {
      await createBarbershop(makeFormData());
    } catch {
      // expected
    }

    expect(vi.mocked(log.onboarding.error)).toHaveBeenCalledWith(
      expect.stringContaining("erro ao criar"),
      expect.objectContaining({ userId: USER_ID, slug: "barbearia-test" }),
      dbError,
    );
  });
});

// ── Redirect on success ───────────────────────────────────────────────────────

describe("Redirect on success", () => {
  it("redirects to /dashboard after all entities are created", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard");
  });
});

// ── Observability ─────────────────────────────────────────────────────────────

describe("Observability — log.onboarding", () => {
  it("logs info BEFORE starting the transaction with userId, slug, trialDays", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(log.onboarding.info)).toHaveBeenCalledWith(
      "criando barbearia",
      expect.objectContaining({
        userId: USER_ID,
        slug: "barbearia-test",
        trialDays: 30,
        isWaitlistLead: false,
      }),
    );
  });

  it("logs info INSIDE transaction on success with barbershopId", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(log.onboarding.info)).toHaveBeenCalledWith(
      "barbearia criada com sucesso",
      expect.objectContaining({ barbershopId: SHOP_ID }),
    );
  });

  it("logs trialDays=60 and isWaitlistLead=true when lead exists", async () => {
    vi.mocked(db.waitlistLead.findFirst).mockResolvedValue({ id: "lead-1" } as never);

    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(log.onboarding.info)).toHaveBeenCalledWith(
      "criando barbearia",
      expect.objectContaining({ trialDays: 60, isWaitlistLead: true }),
    );
  });

  it("does NOT log onboarding.error on a successful creation", async () => {
    await expect(createBarbershop(makeFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(log.onboarding.error)).not.toHaveBeenCalled();
  });
});
