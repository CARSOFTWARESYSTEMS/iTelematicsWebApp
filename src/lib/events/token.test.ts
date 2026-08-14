import { describe, it, expect } from 'vitest';
import { signRegistrationToken, verifyRegistrationToken, RegistrationTokenPayload } from './token';

function payload(overrides: Partial<RegistrationTokenPayload> = {}): RegistrationTokenPayload {
    return {
        v: 1,
        registrationId: 'reg-123',
        slug: 'space-systems-mission-design-workshop',
        type: 'free',
        issuedAt: new Date().toISOString(),
        ...overrides,
    };
}

describe('registration token sign/verify', () => {
    it('round-trips a valid token', () => {
        const token = signRegistrationToken(payload());
        const verified = verifyRegistrationToken(token);
        expect(verified).not.toBeNull();
        expect(verified?.registrationId).toBe('reg-123');
        expect(verified?.slug).toBe('space-systems-mission-design-workshop');
    });

    it('rejects a token with a tampered payload (changed slug)', () => {
        const token = signRegistrationToken(payload());
        const [body, signature] = token.split('.');
        const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
        decoded.slug = 'event-registration-payment-pilot';
        const tamperedBody = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url');
        const tamperedToken = `${tamperedBody}.${signature}`;

        expect(verifyRegistrationToken(tamperedToken)).toBeNull();
    });

    it('rejects a token with an invalid signature', () => {
        const token = signRegistrationToken(payload());
        const [body] = token.split('.');
        expect(verifyRegistrationToken(`${body}.not-a-real-signature`)).toBeNull();
    });

    it('rejects garbage input', () => {
        expect(verifyRegistrationToken('')).toBeNull();
        expect(verifyRegistrationToken('not-a-token')).toBeNull();
        expect(verifyRegistrationToken('a.b.c')).toBeNull();
        // @ts-expect-error - deliberately wrong type
        expect(verifyRegistrationToken(null)).toBeNull();
    });

    it('rejects an oversized token', () => {
        expect(verifyRegistrationToken('a'.repeat(3000) + '.sig')).toBeNull();
    });

    it('never embeds guest PII (name/email/mobile) in the signed payload', () => {
        const token = signRegistrationToken(payload());
        const [body] = token.split('.');
        const decoded = Buffer.from(body, 'base64url').toString('utf8');
        expect(decoded).not.toMatch(/@/); // no email-shaped content
        expect(Object.keys(JSON.parse(decoded)).sort()).toEqual(['issuedAt', 'registrationId', 'slug', 'type', 'v']);
    });
});
