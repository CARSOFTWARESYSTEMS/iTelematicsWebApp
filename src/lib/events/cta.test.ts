import { describe, it, expect } from 'vitest';
import { getPrimaryCta, isPubliclyVisible } from './cta';
import { EventRecord } from './types';

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
    return {
        slug: 'test-event',
        title: 'Test Event',
        domain: 'Electric Mobility',
        mode: 'Online',
        type: 'Free',
        status: 'registration_open',
        organizer: 'iTelematics Software Private Limited',
        description: 'Test description',
        startDateTime: '2026-09-15T10:00:00+05:30',
        timezone: 'Asia/Kolkata',
        organizerContactEmail: 'info@iTelematics.com',
        currency: 'INR',
        ...overrides,
    };
}

describe('getPrimaryCta', () => {
    it('returns Free Registration for a free, open event', () => {
        const cta = getPrimaryCta(makeEvent({ type: 'Free', status: 'registration_open' }));
        expect(cta.disabled).toBe(false);
        expect(cta.label).toBe('Free Registration');
        expect(cta.href).toBe('/events/test-event/register');
    });

    it('returns Register & Pay ₹X for a paid, open event using server-side pricing only', () => {
        const cta = getPrimaryCta(
            makeEvent({ type: 'Paid', status: 'registration_open', baseFeeInr: 1, taxesFeesInr: 0 })
        );
        expect(cta.disabled).toBe(false);
        expect(cta.label).toBe('Register & Pay ₹1');
    });

    it('sums base fee and taxes into the CTA amount', () => {
        const cta = getPrimaryCta(
            makeEvent({ type: 'Paid', status: 'registration_open', baseFeeInr: 100, taxesFeesInr: 18 })
        );
        expect(cta.label).toBe('Register & Pay ₹118');
    });

    it('disables CTA with Registration Closed label when closed', () => {
        const cta = getPrimaryCta(makeEvent({ status: 'registration_closed' }));
        expect(cta.disabled).toBe(true);
        expect(cta.label).toBe('Registration Closed');
        expect(cta.href).toBeUndefined();
    });

    it('disables CTA with Event Completed label when completed', () => {
        const cta = getPrimaryCta(makeEvent({ status: 'completed' }));
        expect(cta.disabled).toBe(true);
        expect(cta.label).toBe('Event Completed');
    });

    it('disables CTA with Event Cancelled label when cancelled', () => {
        const cta = getPrimaryCta(makeEvent({ status: 'cancelled' }));
        expect(cta.disabled).toBe(true);
        expect(cta.label).toBe('Event Cancelled');
    });

    it('never returns a paid CTA with a hardcoded amount independent of the event record', () => {
        const cheap = getPrimaryCta(makeEvent({ type: 'Paid', status: 'registration_open', baseFeeInr: 1 }));
        const expensive = getPrimaryCta(makeEvent({ type: 'Paid', status: 'registration_open', baseFeeInr: 5000 }));
        expect(cheap.label).not.toBe(expensive.label);
    });
});

describe('isPubliclyVisible', () => {
    it('hides draft events', () => {
        expect(isPubliclyVisible(makeEvent({ status: 'draft' }))).toBe(false);
    });

    it('shows every other status', () => {
        for (const status of ['registration_open', 'registration_closed', 'completed', 'cancelled'] as const) {
            expect(isPubliclyVisible(makeEvent({ status }))).toBe(true);
        }
    });
});
