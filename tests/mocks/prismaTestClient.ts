/**
 * Unified Prisma mock layer for integration tests.
 *
 * Provides:
 *   - makeTxMock(): complete transaction context with $executeRaw, all models
 *   - makeTransactionHandler(tx): db.$transaction mock that supports both
 *     callback form (async fn => fn(tx)) and array form (Promise.all([...]))
 *
 * Advisory lock (pg_advisory_xact_lock) is a no-op in tests:
 *   $executeRaw resolves immediately without touching any DB.
 */

import { vi } from "vitest";

export function makeTxMock() {
  return {
    /** Noop — pg_advisory_xact_lock and any other raw SQL just resolves. */
    $executeRaw: vi.fn().mockResolvedValue(0),

    user: {
      create: vi.fn().mockResolvedValue({ id: "tx-user-id" }),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },

    membership: {
      create: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },

    invitation: {
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
    },

    appointment: {
      /** In-transaction conflict check — returns null (no conflict) by default. */
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "tx-appt-id" }),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },

    client: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "tx-client-id" }),
      update: vi.fn().mockResolvedValue({}),
    },

    comanda: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },

    comandaItem: {
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },

    product: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      /** Atomic stock decrement — returns { count: 1 } (success) by default. */
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },

    stockMovement: {
      create: vi.fn().mockResolvedValue({}),
    },

    service: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
}

export type TxMock = ReturnType<typeof makeTxMock>;

/**
 * Returns a mock implementation for db.$transaction that supports both:
 *   - Callback form: db.$transaction(async tx => { ... })
 *   - Array form:    db.$transaction([promise1, promise2, ...])
 */
export function makeTransactionHandler(tx: TxMock) {
  return async (arg: unknown): Promise<unknown> => {
    if (typeof arg === "function") {
      return (arg as (t: TxMock) => unknown)(tx);
    }
    return Promise.all(arg as Promise<unknown>[]);
  };
}
