// Next.js App Router instrumentation entry-point.
// Called once per runtime before the application starts.
// Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
    const { validateEnv } = await import("./lib/env");
    validateEnv();
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Automatically captures every unhandled server-side error:
// Server Actions, Route Handlers, Server Components, Middleware.
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string> },
  context: { routerKind: string; routePath: string; routeType: string },
): Promise<void> {
  const { captureException } = await import("@sentry/nextjs");
  captureException(err, {
    extra: {
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
    },
  });
}
