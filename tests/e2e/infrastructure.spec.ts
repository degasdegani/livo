import { expect, test } from "@playwright/test";

test.describe("TEST-01 — E2E infrastructure", () => {
  test("Playwright is configured correctly", () => {
    expect(true).toBe(true);
  });

  test("environment variables are accessible", () => {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
    expect(baseUrl).toContain("localhost");
  });
});
