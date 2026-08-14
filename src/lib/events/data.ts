import { EventRecord } from './types';

/**
 * Phase-1 event catalogue. iTelematics Admin only: events are published by
 * editing this file and deploying — there is no live admin UI this sprint
 * (see verification report, "Admin Governance").
 *
 * Pricing here is the single source of truth for all registration/payment
 * amounts. Nothing on the client (CTA text, form input, query params) may
 * override it.
 */
export const EVENTS: EventRecord[] = [
    {
        slug: 'event-registration-payment-pilot',
        title: 'Event Registration & Payment Pilot',
        domain: 'Electric Mobility',
        mode: 'Online',
        type: 'Paid',
        status: 'registration_open',
        organizer: 'iTelematics Software Private Limited',
        description:
            'A limited pilot for validating the iTelematics event registration and online payment workflow ahead of CCAvenue test-gateway integration. This is not a production event fee.',
        startDateTime: '2026-09-15T10:00:00+05:30',
        endDateTime: '2026-09-15T10:30:00+05:30',
        timezone: 'Asia/Kolkata',
        organizerContactEmail: 'info@iTelematics.com',
        registrationDeadline: '2026-09-14T23:59:00+05:30',
        baseFeeInr: 1,
        taxesFeesInr: 0,
        currency: 'INR',
        refundSummary:
            'This ₹1 pilot registration is refundable on request within 7 days if no confirmed payment capture occurred. See Cancellation & Refund Policy.',
        isPilot: true,
    },
    {
        slug: 'space-systems-mission-design-workshop',
        title: 'Space Systems & Mission Design Workshop',
        domain: 'Space',
        mode: 'In-Person',
        type: 'Free',
        status: 'registration_open',
        organizer: 'iTelematics Software Private Limited',
        description:
            'A hands-on workshop covering spacecraft subsystem design, mission planning fundamentals, and small-satellite architecture, delivered by iTelematics engineers.',
        startDateTime: '2026-09-20T09:30:00+05:30',
        endDateTime: '2026-09-20T17:00:00+05:30',
        timezone: 'Asia/Kolkata',
        venue: 'iTelematics Software Private Limited, Bhoganahalli, Bangalore - 560103, India',
        organizerContactEmail: 'info@iTelematics.com',
        registrationDeadline: '2026-09-18T23:59:00+05:30',
        capacity: 60,
        currency: 'INR',
    },
    {
        slug: 'ai-for-space-situational-awareness',
        title: 'AI for Space Situational Awareness',
        domain: 'Space',
        mode: 'Online',
        type: 'Free',
        status: 'registration_open',
        organizer: 'iTelematics Software Private Limited',
        description:
            'A technical session on applying AI copilots and predictive analytics to space situational awareness and satellite telemetry monitoring.',
        startDateTime: '2026-09-25T18:00:00+05:30',
        endDateTime: '2026-09-25T19:15:00+05:30',
        timezone: 'Asia/Kolkata',
        organizerContactEmail: 'info@iTelematics.com',
        currency: 'INR',
    },
    {
        slug: 'electric-powertrain-bootcamp',
        title: 'Electric Powertrain Bootcamp',
        domain: 'Electric Mobility',
        mode: 'Hybrid',
        type: 'Free',
        status: 'registration_closed',
        organizer: 'iTelematics Software Private Limited',
        description:
            'An intensive bootcamp on EV powertrain fundamentals, battery management systems, and diagnostics — attend in person or join online.',
        startDateTime: '2026-08-30T09:30:00+05:30',
        endDateTime: '2026-08-30T16:30:00+05:30',
        timezone: 'Asia/Kolkata',
        venue: 'iTelematics Software Private Limited, Bhoganahalli, Bangalore - 560103, India',
        organizerContactEmail: 'info@iTelematics.com',
        registrationDeadline: '2026-08-20T23:59:00+05:30',
        capacity: 40,
        currency: 'INR',
    },
    {
        slug: 'rocketry-fundamentals-seminar',
        title: 'Rocketry Fundamentals Seminar',
        domain: 'Aerospace',
        mode: 'In-Person',
        type: 'Free',
        status: 'completed',
        organizer: 'iTelematics Software Private Limited',
        description:
            'A completed seminar on rocketry fundamentals, propulsion basics, and structural design for early-stage aerospace engineers.',
        startDateTime: '2026-07-10T09:30:00+05:30',
        endDateTime: '2026-07-10T13:00:00+05:30',
        timezone: 'Asia/Kolkata',
        venue: 'iTelematics Software Private Limited, Bhoganahalli, Bangalore - 560103, India',
        organizerContactEmail: 'info@iTelematics.com',
        currency: 'INR',
    },
];

export function getEventBySlug(slug: string): EventRecord | undefined {
    return EVENTS.find((event) => event.slug === slug);
}

export function getAllEventSlugs(): string[] {
    return EVENTS.map((event) => event.slug);
}

/** Server-authoritative pricing derived solely from the event record. */
export function computePricing(event: EventRecord): {
    baseFeeInr: number;
    taxesFeesInr: number;
    finalPayableInr: number;
    currency: 'INR';
} {
    const baseFeeInr = event.type === 'Paid' ? event.baseFeeInr ?? 0 : 0;
    const taxesFeesInr = event.type === 'Paid' ? event.taxesFeesInr ?? 0 : 0;
    return {
        baseFeeInr,
        taxesFeesInr,
        finalPayableInr: baseFeeInr + taxesFeesInr,
        currency: 'INR',
    };
}
