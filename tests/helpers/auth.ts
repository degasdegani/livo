import { vi } from "vitest";

export type MockSessionUser = {
  id: string;
  email: string;
  name?: string | null;
};

/**
 * Mocks `@/auth` to return an authenticated session.
 * Call inside vi.mock() or beforeEach with vi.doMock().
 */
export function mockAuthSession(user: MockSessionUser = defaultTestUser()) {
  vi.mock("@/auth", () => ({
    auth: vi.fn().mockResolvedValue({ user }),
  }));
}

/**
 * Mocks `@/auth` to return an unauthenticated session (null).
 */
export function mockAuthUnauthenticated() {
  vi.mock("@/auth", () => ({
    auth: vi.fn().mockResolvedValue(null),
  }));
}

export function defaultTestUser(): MockSessionUser {
  return {
    id: "user-test-id-001",
    email: "test@livo.com.br",
    name: "Test User",
  };
}
