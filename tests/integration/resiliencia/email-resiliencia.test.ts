/**
 * TEST-09 — Resiliência: email.ts
 *
 * Three functions, three failure contracts:
 *
 *   sendAppointmentConfirmation — swallows all errors (fire-and-forget)
 *   sendWelcomeEmail            — swallows all errors (fire-and-forget)
 *   sendInvitationEmail         — logs AND rethrows as user-friendly error
 *
 * Failure criteria:
 *   - Change sendAppointmentConfirmation to rethrow → appointment booking crashes on email failure
 *   - Change sendInvitationEmail to swallow → silent invite failure, user confused
 *   - Remove early-return on empty email → Resend called with no recipient
 *   - Remove log.email.error → failures invisible in observability
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { log } from "@/lib/logger";
import {
  sendAppointmentConfirmation,
  sendWelcomeEmail,
  sendInvitationEmail,
} from "@/lib/email";

// ── Mocks ──────────────────────────────────────────────────────────────────────

// email.ts creates a module-level Resend instance — share mock across all instances
const mockSend = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

vi.mock("@/lib/logger", () => ({
  log: {
    email: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const confirmData = {
  clientEmail: "joao@example.com",
  clientName: "João",
  barbershopName: "Barbearia Test",
  barbershopSlug: "barbearia-test",
  serviceName: "Corte Social",
  servicePrice: 3500,
  date: "2026-07-15",
  time: "10:00",
  professional: "Pedro",
};

const invitePayload = {
  to: "barbeiro@example.com",
  barbershopName: "Barbearia Test",
  inviterName: "Dono",
  role: "barber" as const,
  token: "token-abc-123",
};

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockSend.mockResolvedValue({ id: "msg-ok" });
});

// ── sendAppointmentConfirmation ───────────────────────────────────────────────

describe("sendAppointmentConfirmation() — fire-and-forget (swallows errors)", () => {
  it("resolves normally even when Resend throws a 500", async () => {
    mockSend.mockRejectedValue(new Error("Resend 500"));

    await expect(sendAppointmentConfirmation(confirmData)).resolves.toBeUndefined();
  });

  it("resolves normally even when Resend throws a network error", async () => {
    mockSend.mockRejectedValue(new TypeError("fetch failed"));

    await expect(sendAppointmentConfirmation(confirmData)).resolves.toBeUndefined();
  });

  it("logs email.error with recipient and barbershopName on failure", async () => {
    const sendErr = new Error("SMTP timeout");
    mockSend.mockRejectedValue(sendErr);

    await sendAppointmentConfirmation(confirmData);

    expect(vi.mocked(log.email.error)).toHaveBeenCalledWith(
      expect.stringContaining("falha ao enviar confirmação"),
      expect.objectContaining({
        to: "joao@example.com",
        barbershopName: "Barbearia Test",
      }),
      sendErr,
    );
  });

  it("does NOT call Resend when clientEmail is empty (skips silently)", async () => {
    await sendAppointmentConfirmation({ ...confirmData, clientEmail: "" });

    expect(mockSend).not.toHaveBeenCalled();
    expect(vi.mocked(log.email.error)).not.toHaveBeenCalled();
  });
});

// ── sendWelcomeEmail ──────────────────────────────────────────────────────────

describe("sendWelcomeEmail() — fire-and-forget (swallows errors)", () => {
  it("resolves normally even when Resend throws", async () => {
    mockSend.mockRejectedValue(new Error("Resend 429 rate limit"));

    await expect(sendWelcomeEmail("maria@example.com", "Maria")).resolves.toBeUndefined();
  });

  it("logs email.error with recipient on failure", async () => {
    const sendErr = new Error("auth failure");
    mockSend.mockRejectedValue(sendErr);

    await sendWelcomeEmail("maria@example.com", "Maria");

    expect(vi.mocked(log.email.error)).toHaveBeenCalledWith(
      expect.stringContaining("falha ao enviar e-mail de boas-vindas"),
      expect.objectContaining({ to: "maria@example.com" }),
      sendErr,
    );
  });

  it("does NOT call Resend when email is empty (skips silently)", async () => {
    await sendWelcomeEmail("", "Maria");

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("logs success when Resend succeeds", async () => {
    await sendWelcomeEmail("maria@example.com", "Maria");

    expect(vi.mocked(log.email.info)).toHaveBeenCalledWith(
      "e-mail de boas-vindas enviado",
      expect.objectContaining({ to: "maria@example.com" }),
    );
  });
});

// ── sendInvitationEmail ───────────────────────────────────────────────────────

describe("sendInvitationEmail() — rethrows with user-friendly message", () => {
  it("throws 'Falha ao enviar o e-mail de convite' when Resend throws", async () => {
    mockSend.mockRejectedValue(new Error("Resend 503"));

    await expect(sendInvitationEmail(invitePayload)).rejects.toThrow(
      "Falha ao enviar o e-mail de convite. Tente novamente.",
    );
  });

  it("does NOT swallow the error — caller always sees a failure", async () => {
    mockSend.mockRejectedValue(new Error("internal error"));

    let caughtErr: Error | null = null;
    try {
      await sendInvitationEmail(invitePayload);
    } catch (e) {
      caughtErr = e as Error;
    }

    expect(caughtErr).not.toBeNull();
    // Original error is REPLACED by a user-friendly message
    expect(caughtErr?.message).toBe(
      "Falha ao enviar o e-mail de convite. Tente novamente.",
    );
  });

  it("logs email.error BEFORE rethrowing, with recipient and barbershopName", async () => {
    const sendErr = new Error("service down");
    mockSend.mockRejectedValue(sendErr);

    try {
      await sendInvitationEmail(invitePayload);
    } catch {
      // expected
    }

    expect(vi.mocked(log.email.error)).toHaveBeenCalledWith(
      expect.stringContaining("falha ao enviar e-mail de convite"),
      expect.objectContaining({
        to: "barbeiro@example.com",
        barbershopName: "Barbearia Test",
      }),
      sendErr,
    );
  });

  it("logs email.info on success", async () => {
    await sendInvitationEmail(invitePayload);

    expect(vi.mocked(log.email.info)).toHaveBeenCalledWith(
      "e-mail de convite enviado",
      expect.objectContaining({
        to: "barbeiro@example.com",
        barbershopName: "Barbearia Test",
      }),
    );
  });

  it("does NOT throw when Resend succeeds", async () => {
    await expect(sendInvitationEmail(invitePayload)).resolves.toBeUndefined();
  });
});
