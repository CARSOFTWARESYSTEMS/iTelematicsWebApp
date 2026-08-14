// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

function postRequest(body: unknown, headers: Record<string, string> = {}) {
    // Each call gets a distinct simulated client IP unless a test overrides
    // it, so the shared in-memory IP rate limiter (tested separately below)
    // doesn't interfere with unrelated assertions in this file.
    return new NextRequest('http://localhost/api/events/register', {
        method: 'POST',
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': crypto.randomUUID(),
            ...headers,
        },
    });
}

const validGuest = { fullName: 'Jane Doe', email: 'jane@example.com', mobile: '9876543210' };

describe('POST /api/events/register', () => {
    it('confirms a free event registration with a server-issued reference', async () => {
        const res = await POST(postRequest({ slug: 'ai-for-space-situational-awareness', ...validGuest }));
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.registrationStatus).toBe('confirmed');
        expect(typeof data.registrationReference).toBe('string');
        expect(data.pricing.finalPayableInr).toBe(0);
    });

    it('never confirms a paid event — returns awaiting_payment with server-authoritative ₹1 pricing', async () => {
        const res = await POST(
            postRequest({ slug: 'event-registration-payment-pilot', ...validGuest })
        );
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.registrationStatus).toBe('awaiting_payment');
        expect(data.registrationReference).toBeUndefined();
        expect(data.pricing.finalPayableInr).toBe(1);
        expect(data.pricing.currency).toBe('INR');
    });

    it('ignores client-supplied amount/currency/status tampering fields entirely', async () => {
        const res = await POST(
            postRequest({
                slug: 'event-registration-payment-pilot',
                ...validGuest,
                amount: 0,
                finalPayableInr: 999999,
                currency: 'USD',
                status: 'success',
                discount: '100%',
            })
        );
        const data = await res.json();
        expect(data.pricing.finalPayableInr).toBe(1);
        expect(data.pricing.currency).toBe('INR');
        expect(data.registrationStatus).not.toBe('confirmed');
        expect(JSON.stringify(data)).not.toContain('success');
    });

    it('returns 404 for an unknown or crafted slug', async () => {
        const res = await POST(postRequest({ slug: '../../secret', ...validGuest }));
        expect(res.status).toBe(404);
    });

    it('returns 409 for a registration-closed event', async () => {
        const res = await POST(postRequest({ slug: 'electric-powertrain-bootcamp', ...validGuest }));
        expect(res.status).toBe(409);
    });

    it('returns 400 with field errors for invalid/XSS input', async () => {
        const res = await POST(
            postRequest({
                slug: 'ai-for-space-situational-awareness',
                fullName: '<img src=x onerror=alert(1)>',
                email: 'not-an-email',
                mobile: '123',
            })
        );
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.fieldErrors.fullName).toBeDefined();
        expect(data.fieldErrors.email).toBeDefined();
        expect(data.fieldErrors.mobile).toBeDefined();
    });

    it('rejects malformed JSON bodies safely', async () => {
        const res = await POST(postRequest('{not json'));
        expect(res.status).toBe(400);
    });

    it('rejects oversized request bodies', async () => {
        const res = await POST(
            postRequest({ slug: 'ai-for-space-situational-awareness', ...validGuest, junk: 'x'.repeat(10_000) })
        );
        expect(res.status).toBe(413);
    });

    it('applies server-side duplicate detection beyond the per-window threshold', async () => {
        const guest = { fullName: 'Dup Test', email: `dup-${Date.now()}@example.com`, mobile: '9123456780' };
        const slug = 'space-systems-mission-design-workshop';
        for (let i = 0; i < 3; i++) {
            await POST(postRequest({ slug, ...guest }));
        }
        const res = await POST(postRequest({ slug, ...guest }));
        expect(res.status).toBe(409);
    });

    it('applies server-side per-IP rate limiting independent of guest details', async () => {
        const fixedIp = 'rate-limit-test-ip';
        let lastStatus = 200;
        for (let i = 0; i < 12; i++) {
            const res = await POST(
                postRequest(
                    { slug: 'space-systems-mission-design-workshop', fullName: 'Rate Test', email: `rl-${i}@example.com`, mobile: `900000${1000 + i}` },
                    { 'x-forwarded-for': fixedIp }
                )
            );
            lastStatus = res.status;
        }
        expect(lastStatus).toBe(429);
    });
});
