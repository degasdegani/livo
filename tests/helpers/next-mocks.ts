import { vi } from "vitest";

/**
 * Sets up vi.mock() calls for Next.js server-side modules.
 * Import this file at the TOP of a test file that exercises server actions.
 *
 * Usage:
 *   import "../helpers/next-mocks";  // auto-executes the mocks
 *
 * Then access mocked functions via vi.mocked():
 *   import { redirect } from "next/navigation";
 *   expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard");
 */

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: () => unknown) => fn),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Map([["x-correlation-id", "test-correlation-id"]])),
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
  })),
}));
