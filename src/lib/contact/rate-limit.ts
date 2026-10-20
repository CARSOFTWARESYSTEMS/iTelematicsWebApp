/**
 * Process-local, in-memory submission limiter. It protects a warm serverless
 * instance from rapid repeat submissions but resets on cold start and is not
 * shared across instances. It is a first line of defence, not a durable quota.
 */

const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

export function isRateLimited(key: string, now = Date.now()): boolean {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) hits.clear(); // bound memory under abuse
    return recent.length > MAX_PER_WINDOW;
}

export function resetRateLimitForTests(): void {
    hits.clear();
}
