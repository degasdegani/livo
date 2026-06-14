import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

type HealthStatus = "ok" | "degraded" | "unhealthy";

type HealthCheck = {
  status: HealthStatus;
  timestamp: string;
  version: string;
  checks: {
    database: { status: HealthStatus; latencyMs?: number; error?: string };
    env: { status: HealthStatus; missingCritical: string[]; missingOptional: string[] };
  };
};

export async function GET(): Promise<NextResponse<HealthCheck>> {
  // Database health check
  let dbStatus: HealthStatus = "ok";
  let dbLatencyMs: number | undefined;
  let dbError: string | undefined;

  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch (err) {
    dbStatus = "unhealthy";
    dbError = err instanceof Error ? err.message : "unknown database error";
  }

  // Environment variable check (never expose values)
  const envResult = validateEnv();
  const criticalMissing = envResult.missing
    .filter((v) => v.critical)
    .map((v) => v.key);
  const optionalMissing = envResult.missing
    .filter((v) => !v.critical)
    .map((v) => v.key);

  let envStatus: HealthStatus = "ok";
  if (criticalMissing.length > 0) envStatus = "unhealthy";
  else if (optionalMissing.length > 0) envStatus = "degraded";

  // Overall status: worst of all checks
  // dbStatus is only "ok" | "unhealthy" (no degraded state for db in this impl)
  const overallStatus: HealthStatus =
    dbStatus === "unhealthy" || envStatus === "unhealthy"
      ? "unhealthy"
      : envStatus === "degraded"
        ? "degraded"
        : "ok";

  const body: HealthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
    checks: {
      database: {
        status: dbStatus,
        ...(dbLatencyMs !== undefined && { latencyMs: dbLatencyMs }),
        ...(dbError && { error: dbError }),
      },
      env: {
        status: envStatus,
        missingCritical: criticalMissing,
        missingOptional: optionalMissing,
      },
    },
  };

  const httpStatus = overallStatus === "ok" ? 200 : overallStatus === "degraded" ? 200 : 503;

  return NextResponse.json(body, { status: httpStatus });
}
