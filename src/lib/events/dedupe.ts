import crypto from 'crypto';

/**
 * FOUNDATION ONLY — process-local, in-memory duplicate/rapid-submission
 * guard. There is no database this sprint, so this only protects against
 * duplicate/rapid submissions handled by the *same warm serverless
 * instance*; it resets on cold start and is not shared across instances.
 * It is a real server-side control (not purely a frontend double-click
 * guard) but is NOT a durable, cross-instance duplicate-registration
 * guarantee. Durable dedupe requires the database deferred to the next
 * sprint. See verification report §7/§19.
 */

interface Entry {
    count: number;
    firstSeenMs: number;
}

const seen = new Map<string, Entry>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;

function keyFor(slug: string, email: string, mobile: string): string {
    return crypto
        .createHash('sha256')
        .update(`${slug}|${email.trim().toLowerCase()}|${mobile.trim()}`)
        .digest('hex');
}

export function isRateLimitedOrDuplicate(slug: string, email: string, mobile: string): boolean {
    const key = keyFor(slug, email, mobile);
    const now = Date.now();
    const entry = seen.get(key);

    if (!entry || now - entry.firstSeenMs > WINDOW_MS) {
        seen.set(key, { count: 1, firstSeenMs: now });
        return false;
    }

    entry.count += 1;
    return entry.count > MAX_PER_WINDOW;
}

const ipHits = new Map<string, number[]>();
const IP_WINDOW_MS = 60_000;
const IP_MAX_PER_WINDOW = 10;

export function isIpRateLimited(ip: string): boolean {
    const now = Date.now();
    const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
    hits.push(now);
    ipHits.set(ip, hits);
    return hits.length > IP_MAX_PER_WINDOW;
}
