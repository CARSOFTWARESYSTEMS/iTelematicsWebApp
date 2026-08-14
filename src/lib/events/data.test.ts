import { describe, it, expect } from 'vitest';
import { EVENTS, getEventBySlug, getAllEventSlugs, computePricing } from './data';

describe('EVENTS seed data', () => {
    it('covers all three domains', () => {
        const domains = new Set(EVENTS.map((e) => e.domain));
        expect(domains).toEqual(new Set(['Electric Mobility', 'Aerospace', 'Space']));
    });

    it('covers all three modes', () => {
        const modes = new Set(EVENTS.map((e) => e.mode));
        expect(modes).toEqual(new Set(['In-Person', 'Online', 'Hybrid']));
    });

    it('covers both free and paid types', () => {
        const types = new Set(EVENTS.map((e) => e.type));
        expect(types.has('Free')).toBe(true);
        expect(types.has('Paid')).toBe(true);
    });

    it('has exactly one ₹1 CCAvenue validation pilot event', () => {
        const pilots = EVENTS.filter((e) => e.isPilot);
        expect(pilots).toHaveLength(1);
        expect(pilots[0].baseFeeInr).toBe(1);
        expect(pilots[0].currency).toBe('INR');
        expect(pilots[0].type).toBe('Paid');
    });
});

describe('getEventBySlug / getAllEventSlugs', () => {
    it('finds a known event', () => {
        expect(getEventBySlug('event-registration-payment-pilot')?.title).toBe('Event Registration & Payment Pilot');
    });

    it('returns undefined for an unknown slug', () => {
        expect(getEventBySlug('does-not-exist')).toBeUndefined();
    });

    it('returns undefined for slugs containing path traversal or script content', () => {
        expect(getEventBySlug('../../etc/passwd')).toBeUndefined();
        expect(getEventBySlug('<script>alert(1)</script>')).toBeUndefined();
    });

    it('lists every seeded slug', () => {
        expect(getAllEventSlugs()).toEqual(EVENTS.map((e) => e.slug));
    });
});

describe('computePricing', () => {
    it('is always ₹0 for free events regardless of any stray fee fields', () => {
        const pricing = computePricing({
            slug: 'x', title: 'x', domain: 'Space', mode: 'Online', type: 'Free', status: 'registration_open',
            organizer: 'x', description: 'x', startDateTime: '2026-01-01T00:00:00+05:30', timezone: 'Asia/Kolkata',
            organizerContactEmail: 'x@x.com', currency: 'INR',
            // @ts-expect-error - simulating a stray/unexpected fee field on a Free event
            baseFeeInr: 999,
        });
        expect(pricing.finalPayableInr).toBe(0);
    });

    it('computes the ₹1 pilot as exactly ₹1.00, never ₹1.18 or any other amount', () => {
        const pilot = getEventBySlug('event-registration-payment-pilot')!;
        const pricing = computePricing(pilot);
        expect(pricing.baseFeeInr).toBe(1);
        expect(pricing.taxesFeesInr).toBe(0);
        expect(pricing.finalPayableInr).toBe(1);
        expect(pricing.currency).toBe('INR');
    });

    it('sums base fee and taxes for a hypothetical paid event with taxes', () => {
        const pricing = computePricing({
            slug: 'x', title: 'x', domain: 'Space', mode: 'Online', type: 'Paid', status: 'registration_open',
            organizer: 'x', description: 'x', startDateTime: '2026-01-01T00:00:00+05:30', timezone: 'Asia/Kolkata',
            organizerContactEmail: 'x@x.com', currency: 'INR', baseFeeInr: 100, taxesFeesInr: 18,
        });
        expect(pricing.finalPayableInr).toBe(118);
    });
});
