// src/lib/posthog.ts
// Server-side PostHog client — lazy singleton, server-only.
//
// Instantiated on first use (not at module load / not in instrumentation.ts)
// so importing this file never triggers a network client in a shared or
// edge-adjacent execution context. If POSTHOG_API_KEY is unset, capture()
// is a no-op — product analytics is treated as non-critical (see env.ts).
//
// Do NOT import this file on the client side.

import { PostHog } from "posthog-node";

let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client !== undefined) return client;

  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) {
    client = null;
    return client;
  }

  client = new PostHog(apiKey, {
    host: process.env.POSTHOG_HOST || "https://app.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });

  return client;
}

export function captureEvent(
  distinctId: string,
  event: string,
  barbershopId: string,
  properties?: Record<string, unknown>,
): void {
  const posthog = getClient();
  if (!posthog) return;

  posthog.capture({ distinctId, event, properties: { ...properties, barbershopId } });
}

export async function shutdownPostHog(): Promise<void> {
  if (client) {
    await client.shutdown();
  }
}
