import crypto from 'crypto';

/**
 * Stateless, HMAC-signed registration reference.
 *
 * There is no database this sprint (see verification report §18/19), so a
 * registration reference cannot be looked up server-side. Instead the server
 * mints a signed, tamper-evident token at registration time; "View My
 * Registration" re-verifies the signature instead of querying a store. This
 * keeps the reference server-authoritative (a client cannot forge one, since
 * it cannot produce a valid signature without the secret) without pretending
 * data is durably persisted.
 *
 * No PII (name/email/mobile) is embedded in the token — it can end up in
 * browser history, referrer headers, or server logs, so only non-identifying
 * fields are signed.
 *
 * LIMITATION: this only proves "the server issued this reference for this
 * event"; it cannot answer "what did I submit" or survive a secret rotation.
 * Real durable storage is deferred to the CCAvenue integration sprint.
 */

export interface RegistrationTokenPayload {
    v: 1;
    registrationId: string;
    slug: string;
    type: 'free';
    issuedAt: string; // ISO 8601
}

function getSecret(): string {
    const secret = process.env.EVENTS_TOKEN_SECRET;
    if (secret && secret.length >= 16) {
        return secret;
    }
    // Foundation-only fallback so local/dev doesn't crash. Documented as a
    // known limitation — production readiness requires EVENTS_TOKEN_SECRET
    // to be set as a real Vercel environment variable.
    return 'dev-only-insecure-fallback-secret-set-EVENTS_TOKEN_SECRET';
}

function base64url(input: Buffer): string {
    return input.toString('base64url');
}

export function signRegistrationToken(payload: RegistrationTokenPayload): string {
    const json = JSON.stringify(payload);
    const body = base64url(Buffer.from(json, 'utf8'));
    const signature = base64url(
        crypto.createHmac('sha256', getSecret()).update(body).digest()
    );
    return `${body}.${signature}`;
}

export function verifyRegistrationToken(token: string): RegistrationTokenPayload | null {
    if (typeof token !== 'string' || token.length > 2048) {
        return null;
    }
    const parts = token.split('.');
    if (parts.length !== 2) {
        return null;
    }
    const [body, signature] = parts;
    const expected = base64url(
        crypto.createHmac('sha256', getSecret()).update(body).digest()
    );

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return null;
    }

    try {
        const json = Buffer.from(body, 'base64url').toString('utf8');
        const payload = JSON.parse(json) as RegistrationTokenPayload;
        if (payload.v !== 1 || typeof payload.registrationId !== 'string' || typeof payload.slug !== 'string') {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}
