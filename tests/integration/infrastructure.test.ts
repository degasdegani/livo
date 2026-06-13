import { describe, expect, it } from "vitest";
import { createDbMock } from "../helpers/db";
import { makeBarbershop, makeUser } from "../factories";
import { PLAN_FIXTURES } from "../fixtures";
import { PlanStatus } from "@prisma/client";

describe("TEST-01 — Integration infrastructure", () => {
  it("DB mock supports chained mock return values", async () => {
    const db = createDbMock();
    const user = makeUser();
    const shop = makeBarbershop({ ownerId: user.id });

    db.user.findUnique.mockResolvedValue(user);
    db.barbershop.findUnique.mockResolvedValue(shop);

    const foundUser = await db.user.findUnique({ where: { id: user.id } });
    const foundShop = await db.barbershop.findUnique({ where: { id: shop.id } });

    expect(foundUser?.id).toBe(user.id);
    expect(foundShop?.ownerId).toBe(user.id);
  });

  it("DB mock $transaction passes a proxy db to the callback", async () => {
    const db = createDbMock();
    db.$transaction.mockImplementation(async (fn: (tx: ReturnType<typeof createDbMock>) => Promise<unknown>) => {
      const tx = createDbMock();
      tx.user.create.mockResolvedValue(makeUser({ id: "tx-user" }));
      return fn(tx);
    });

    const result = await db.$transaction(async (tx: ReturnType<typeof createDbMock>) => {
      return tx.user.create({ data: {} });
    });

    expect((result as { id: string }).id).toBe("tx-user");
  });

  it("plan fixtures map to correct PlanStatus values", () => {
    expect(PLAN_FIXTURES.trial.planStatus).toBe(PlanStatus.trial);
    expect(PLAN_FIXTURES.active.planStatus).toBe(PlanStatus.active);
    expect(PLAN_FIXTURES.suspended.planStatus).toBe(PlanStatus.suspended);
    expect(PLAN_FIXTURES.cancelled.planStatus).toBe(PlanStatus.cancelled);
  });

  it("barbershop factory with suspended fixture composes correctly", () => {
    const shop = makeBarbershop({ ...PLAN_FIXTURES.suspended });
    expect(shop.planStatus).toBe(PlanStatus.suspended);
    expect(shop.trialEndsAt).toBeNull();
    expect(shop.asaasCustomerId).toBe("cus_000002");
  });
});
