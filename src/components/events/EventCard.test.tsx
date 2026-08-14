import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventCard from './EventCard';
import { EventRecord } from '@/lib/events/types';

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
    return {
        slug: 'demo-event',
        title: 'Demo Event <not-really-markup>',
        domain: 'Aerospace',
        mode: 'In-Person',
        type: 'Free',
        status: 'registration_open',
        organizer: 'iTelematics Software Private Limited',
        description: '<script>alert("xss")</script> Join us for a great session.',
        startDateTime: '2026-09-20T09:30:00+05:30',
        timezone: 'Asia/Kolkata',
        organizerContactEmail: 'info@iTelematics.com',
        currency: 'INR',
        ...overrides,
    };
}

describe('EventCard', () => {
    it('shows Free Registration CTA for an open free event', () => {
        render(<EventCard event={makeEvent()} />);
        const cta = screen.getByRole('link', { name: 'Free Registration' });
        expect(cta).toHaveAttribute('href', '/events/demo-event/register');
    });

    it('shows Register & Pay ₹X CTA for an open paid event, sourced from the event record', () => {
        render(<EventCard event={makeEvent({ type: 'Paid', baseFeeInr: 1, taxesFeesInr: 0 })} />);
        expect(screen.getByRole('link', { name: 'Register & Pay ₹1' })).toBeInTheDocument();
    });

    it('shows no registration CTA and a disabled-state label for a closed event', () => {
        render(<EventCard event={makeEvent({ status: 'registration_closed' })} />);
        expect(screen.getByText('Registration Closed')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Free Registration' })).not.toBeInTheDocument();
    });

    it('always renders a View Details link to the event slug', () => {
        render(<EventCard event={makeEvent()} />);
        expect(screen.getByRole('link', { name: 'View Details' })).toHaveAttribute('href', '/events/demo-event');
    });

    it('never renders untrusted content as live markup (React text escaping)', () => {
        const { container } = render(<EventCard event={makeEvent()} />);
        expect(container.querySelector('script')).toBeNull();
        expect(screen.getByText(/alert\("xss"\)/)).toBeInTheDocument();
    });
});
