// src/lib/rate-limit.ts
// Upstash Redis-backed rate limiting — lazy singleton, server-only.
//
// Instantiated on first use (not at module load) so importing this file
// never triggers a network client in a shared or edge-adjacent execution
// context. Same pattern as src/lib/posthog.ts.
//
// Fail-open: if UPSTASH_REDIS_REST_URL/TOKEN are unset or the Redis call
// fails/times out, checkRateLimit() logs a warning and returns success — a
// Redis outage must never block login/register/booking (see env.ts, both
// vars are critical: false).
//
// Do NOT import this file on the client side.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { log } from "@/lib/logger";

let client: Redis | null | undefined;

function getRedis(): Redis | null {
  if (client !== undefined) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    client = null;
    return client;
  }

  client = new Redis({ url, token });
  return client;
}

const limiters = new Map<string, Ratelimit>();

function getLimiter(redis: Redis, limit: number, windowSeconds: number): Ratelimit {
  const cacheKey = `${limit}:${windowSeconds}`;
  const cached = limiters.get(cacheKey);
  if (cached) return cached;

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
  });
  limiters.set(cacheKey, ratelimit);
  return ratelimit;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ success: boolean; reset?: number }> {
  const redis = getRedis();
  if (!redis) return { success: true };

  try {
    const ratelimit = getLimiter(redis, limit, windowSeconds);
    const result = await ratelimit.limit(key);
    return { success: result.success, reset: result.reset };
  } catch (error) {
    log.warn("falha ao checar rate limit no Redis — fail-open", { key, error });
    return { success: true };
  }
}

// Zera o contador de um identificador — usado quando um evento de sucesso
// (ex: login correto) deve "perdoar" as tentativas anteriores, mesmo padrão
// de trackLoginFailure/loginRateLimitMap.delete() do rate limit em memória.
export async function resetRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const ratelimit = getLimiter(redis, limit, windowSeconds);
    await ratelimit.resetUsedTokens(key);
  } catch (error) {
    log.warn("falha ao resetar rate limit no Redis", { key, error });
  }
}
