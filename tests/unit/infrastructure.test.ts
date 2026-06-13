import { describe, expect, it } from "vitest";
import { MemberRole, PlanStatus } from "@prisma/client";
import {
  makeAppointment,
  makeBarbershop,
  makeClient,
  makeInvitation,
  makeMembership,
  makeProfessional,
  makeService,
  makeUser,
} from "../factories";
import { PLAN_FIXTURES } from "../fixtures";
import { createDbMock } from "../helpers/db";
import { makeMembershipContext } from "../helpers/membership";
import { createTenantContext, createTwoTenants } from "../helpers/multi-tenant";

describe("TEST-01 — Unit infrastructure", () => {
  describe("factories", () => {
    it("makeUser produces a valid User shape", () => {
      const user = makeUser();
      expect(user.id).toBeDefined();
      expect(user.email).toContain("@");
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it("makeUser accepts overrides", () => {
      const user = makeUser({ email: "custom@livo.com.br", name: "Custom" });
      expect(user.email).toBe("custom@livo.com.br");
      expect(user.name).toBe("Custom");
    });

    it("makeBarbershop produces a valid Barbershop shape", () => {
      const shop = makeBarbershop();
      expect(shop.id).toBeDefined();
      expect(shop.slug).toBeDefined();
      expect(shop.planStatus).toBe(PlanStatus.trial);
      expect(shop.trialEndsAt).toBeInstanceOf(Date);
    });

    it("makeMembership defaults to owner role", () => {
      const m = makeMembership();
      expect(m.role).toBe(MemberRole.owner);
      expect(m.isActive).toBe(true);
    });

    it("makeProfessional is active by default", () => {
      const p = makeProfessional();
      expect(p.isActive).toBe(true);
    });

    it("makeService has positive durationMin", () => {
      const s = makeService();
      expect(s.durationMin).toBeGreaterThan(0);
      expect(s.priceInCents).toBeGreaterThanOrEqual(0);
    });

    it("makeClient defaults to 0 visits", () => {
      const c = makeClient();
      expect(c.totalVisits).toBe(0);
      expect(c.bloqueado).toBe(false);
    });

    it("makeAppointment defaults to pending status", () => {
      const a = makeAppointment();
      expect(a.status).toBe("pending");
      expect(a.endTime).toBeInstanceOf(Date);
    });

    it("makeInvitation defaults to pending status", () => {
      const inv = makeInvitation();
      expect(inv.status).toBe("pending");
      expect(inv.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("fixtures", () => {
    it("PLAN_FIXTURES has all 6 plan states", () => {
      expect(Object.keys(PLAN_FIXTURES)).toHaveLength(6);
      expect(PLAN_FIXTURES.trial.planStatus).toBe(PlanStatus.trial);
      expect(PLAN_FIXTURES.trialExpired.trialEndsAt!.getTime()).toBeLessThan(Date.now());
      expect(PLAN_FIXTURES.active.planStatus).toBe(PlanStatus.active);
      expect(PLAN_FIXTURES.suspended.planStatus).toBe(PlanStatus.suspended);
      expect(PLAN_FIXTURES.cancelled.planStatus).toBe(PlanStatus.cancelled);
      expect(PLAN_FIXTURES.lifetime.planStatus).toBe(PlanStatus.lifetime);
    });
  });

  describe("helpers/membership", () => {
    it("makeMembershipContext defaults to owner role", () => {
      const ctx = makeMembershipContext();
      expect(ctx.role).toBe(MemberRole.owner);
      expect(ctx.barbershopId).toBeDefined();
      expect(ctx.membershipId).toBeDefined();
    });

    it("makeMembershipContext accepts overrides", () => {
      const ctx = makeMembershipContext({ role: MemberRole.barber });
      expect(ctx.role).toBe(MemberRole.barber);
    });
  });

  describe("helpers/multi-tenant", () => {
    it("createTenantContext generates unique IDs", () => {
      const t1 = createTenantContext();
      const t2 = createTenantContext();
      expect(t1.barbershopId).not.toBe(t2.barbershopId);
    });

    it("createTwoTenants returns tenants with different barbershopIds", () => {
      const { tenantA, tenantB } = createTwoTenants();
      expect(tenantA.barbershopId).not.toBe(tenantB.barbershopId);
      expect(tenantA.userId).not.toBe(tenantB.userId);
    });

    it("createTenantContext embeds membership with correct barbershopId", () => {
      const { barbershopId, membership } = createTenantContext();
      expect(membership.barbershopId).toBe(barbershopId);
    });
  });

  describe("helpers/db", () => {
    it("createDbMock returns an object with mocked model methods", () => {
      const db = createDbMock();
      expect(typeof db.user.findUnique).toBe("function");
      expect(typeof db.barbershop.findFirst).toBe("function");
      expect(typeof db.appointment.create).toBe("function");
      expect(typeof db.$transaction).toBe("function");
    });

    it("mock functions start with no calls", () => {
      const db = createDbMock();
      expect(db.user.findUnique).not.toHaveBeenCalled();
    });

    it("mock functions can be configured per-test", async () => {
      const db = createDbMock();
      const user = makeUser({ id: "fixed-id" });
      db.user.findUnique.mockResolvedValue(user);

      const result = await db.user.findUnique({ where: { id: "fixed-id" } });
      expect(result?.id).toBe("fixed-id");
    });

    it("$transaction calls the callback with a tx context", async () => {
      const db = createDbMock();
      const called = vi.fn().mockResolvedValue("result");
      await db.$transaction(called);
      expect(called).toHaveBeenCalledOnce();
    });
  });
});
