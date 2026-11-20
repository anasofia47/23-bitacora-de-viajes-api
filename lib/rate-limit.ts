/**
 * Limitador de tasa de intentos de login / registro en memoria (Sección 9.1 y 9.6).
 * Complementa las reglas del Firewall de Vercel.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const DEFAULT_WINDOW_MS = 60_000; // 1 minuto
const DEFAULT_MAX_ATTEMPTS = 8;

export function checkRateLimit(
  key: string,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  windowMs = DEFAULT_WINDOW_MS
): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= maxAttempts) {
    return false;
  }

  existing.count += 1;
  return true;
}

export function resetRateLimitsForTest(): void {
  buckets.clear();
}
