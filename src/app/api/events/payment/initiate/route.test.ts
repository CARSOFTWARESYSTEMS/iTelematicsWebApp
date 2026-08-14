// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

function postRequest(body: unknown) {
    return new NextRequest('http://localhost/api/events/payment/initiate', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': crypto.randomUUID() },
    });
}

const validGuest = { fullName: 'Jane Doe', email: 'jane@example.com', mobile: '9876543210' };

describe('POST /api/events/payment/initiate', () => {
    it('reaches a safe boundary and never reports a paid/success status', async () => {
        const res = await POST(postRequest({ slug: 'event-registration-payment-pilot', ...validGuest }));
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.boundary).toBe('SAFE_INTEGRATION_BOUNDARY_REACHED');
        expect(data.paymentStatus).toBe('not_processed');
        expect(data.pricing.finalPayableInr).toBe(1);
        expect(data.pricing.currency).toBe('INR');
    });

    it('ignores every client-supplied tampering field', async () => {
        const res = await POST(
            postRequest({
                slug: 'event-registration-payment-pilot',
                ...validGuest,
                amount: 0.01,
                currency: 'USD',
                status: 'success',
                paymentStatus: 'success',
                discount: '100%',
            })
        );
        const data = await res.json();
        expect(data.pricing.finalPayableInr).toBe(1);
        expect(data.pricing.currency).toBe('INR');
        expect(data.paymentStatus).toBe('not_processed');
    });

    it('rejects a free event (no paid boundary for non-paid events)', async () => {
        const res = await POST(postRequest({ slug: 'ai-for-space-situational-awareness', ...validGuest }));
        expect(res.status).toBe(409);
    });

    it('rejects an unknown event', async () => {
        const res = await POST(postRequest({ slug: 'not-a-real-event', ...validGuest }));
        expect(res.status).toBe(404);
    });

    it('rejects invalid guest details', async () => {
        const res = await POST(
            postRequest({ slug: 'event-registration-payment-pilot', fullName: '', email: 'bad', mobile: 'x' })
        );
        expect(res.status).toBe(400);
    });
});
