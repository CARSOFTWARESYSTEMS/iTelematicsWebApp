import { EventRecord } from './types';
import { computePricing } from './data';

export interface EventCta {
    label: string;
    href?: string;
    disabled: boolean;
}

/** Draft events are never publicly listed or reachable by slug. */
export function isPubliclyVisible(event: EventRecord): boolean {
    return event.status !== 'draft';
}

/** Single source of truth for the primary registration CTA, per the CTA matrix. */
export function getPrimaryCta(event: EventRecord): EventCta {
    if (event.status === 'cancelled') {
        return { label: 'Event Cancelled', disabled: true };
    }
    if (event.status === 'completed') {
        return { label: 'Event Completed', disabled: true };
    }
    if (event.status === 'registration_closed') {
        return { label: 'Registration Closed', disabled: true };
    }
    if (event.status === 'draft') {
        return { label: 'Not Yet Published', disabled: true };
    }

    // registration_open
    if (event.type === 'Paid') {
        const { finalPayableInr } = computePricing(event);
        return {
            label: `Register & Pay ₹${finalPayableInr}`,
            href: `/events/${event.slug}/register`,
            disabled: false,
        };
    }

    return {
        label: 'Free Registration',
        href: `/events/${event.slug}/register`,
        disabled: false,
    };
}

export function formatEventDateRange(event: EventRecord): string {
    const start = new Date(event.startDateTime);
    const dateFmt = new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: event.timezone,
    });
    const timeFmt = new Intl.DateTimeFormat('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: event.timezone,
    });

    if (!event.endDateTime) {
        return `${dateFmt.format(start)}, ${timeFmt.format(start)} (${event.timezone})`;
    }

    const end = new Date(event.endDateTime);
    return `${dateFmt.format(start)}, ${timeFmt.format(start)} – ${timeFmt.format(end)} (${event.timezone})`;
}
