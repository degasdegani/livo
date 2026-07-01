// src/lib/logger.ts
// Central structured logger — server-side only.
// Client-side error capture: use Sentry directly inside error.tsx boundaries.

import * as Sentry from "@sentry/nextjs";

type Level = "debug" | "info" | "warn" | "error";

export type LogCtx = {
  correlationId?: string;
  userId?: string;
  barbershopId?: string;
  [key: string]: unknown;
};

function emit(
  level: Level,
  flow: string,
  msg: string,
  ctx?: LogCtx,
  err?: unknown,
): void {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const tag = `[${level.toUpperCase()}][${flow}]`;
    if (level === "error") {
      // biome-ignore lint/suspicious/noConsole: structured logging
      console.error(tag, msg, ...[ctx, err].filter(Boolean));
    } else if (level === "warn") {
      // biome-ignore lint/suspicious/noConsole: structured logging
      console.warn(tag, msg, ctx ?? "");
    } else {
      // biome-ignore lint/suspicious/noConsole: structured logging
      console.log(tag, msg, ctx ?? "");
    }
  } else {
    // Production: JSON line — ingested by Vercel/Datadog/CloudWatch
    // biome-ignore lint/suspicious/noConsole: structured logging
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level,
        flow,
        msg,
        ...ctx,
      }),
    );
  }

  if (level === "error") {
    if (err instanceof Error) {
      Sentry.captureException(err, { extra: { flow, msg, ...ctx } });
    } else if (err !== undefined) {
      Sentry.captureException(new Error(String(err)), {
        extra: { flow, msg, ...ctx },
      });
    } else {
      Sentry.captureMessage(msg, {
        level: "error",
        extra: { flow, ...ctx },
      });
    }
  }
}

function ns(flow: string) {
  return {
    debug: (msg: string, ctx?: LogCtx) => emit("debug", flow, msg, ctx),
    info: (msg: string, ctx?: LogCtx) => emit("info", flow, msg, ctx),
    warn: (msg: string, ctx?: LogCtx) => emit("warn", flow, msg, ctx),
    error: (msg: string, ctx?: LogCtx, err?: unknown) =>
      emit("error", flow, msg, ctx, err),
  };
}

export const log = {
  ...ns("app"),
  billing: ns("billing"),
  onboarding: ns("onboarding"),
  agenda: ns("agenda"),
  convite: ns("convite"),
  comanda: ns("comanda"),
  webhook: ns("webhook"),
  email: ns("email"),
  auth: ns("auth"),
  livia: ns("livia"),
  lead: ns("lead"),
};
