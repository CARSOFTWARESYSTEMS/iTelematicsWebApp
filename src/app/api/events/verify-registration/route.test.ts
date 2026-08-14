// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { signRegistrationToken } from '@/lib/events/token';

function postRequest(reference: unknown) {
    return new NextRequest('http://localhost/api/events/verify-registration', {
        method: 'POST',
        body: JSON.stringify({ reference }),
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('POST /api/events/verify-registration', () => {
    it('confirms a genuine, server-issued reference', async () => {
        const token = signRegistrationToken({
            v: 1,
            registrationId: 'reg-abc',
            slug: 'space-systems-mission-design-workshop',
            type: 'free',
            issuedAt: new Date().toISOString(),
        });
        const res = await POST(postRequest(token));
        const data = await res.json();
        expect(data.valid).toBe(true);
        expect(data.event.slug).toBe('space-systems-mission-design-workshop');
    });

    it('does not enumerate: guessed/garbage references are always invalid', async () => {
        const guesses = ['', 'abc', '123456', 'reg-1.reg-2', 'a'.repeat(50) + '.' + 'b'.repeat(50)];
        for (const guess of guesses) {
            const res = await POST(postRequest(guess));
            const data = await res.json();
            expect(data.valid).toBe(false);
            expect(data.event).toBeUndefined();
        }
    });

    it('rejects a reference for an event that no longer exists in the catalogue', async () => {
        const token = signRegistrationToken({
            v: 1,
            registrationId: 'reg-xyz',
            slug: 'this-event-was-removed',
            type: 'free',
            issuedAt: new Date().toISOString(),
        });
        const res = await POST(postRequest(token));
        const data = await res.json();
        expect(data.valid).toBe(false);
    });

    it('rejects a non-string reference without crashing', async () => {
        const res = await POST(postRequest(12345));
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.valid).toBe(false);
    });
});
