// Node.js runtime Sentry initialization.
// Loaded via src/instrumentation.ts when NEXT_RUNTIME === "nodejs".
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: 0.2,
});
