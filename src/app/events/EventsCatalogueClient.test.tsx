import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EventsCatalogueClient from './EventsCatalogueClient';
import { EVENTS } from '@/lib/events/data';
import { isPubliclyVisible } from '@/lib/events/cta';

describe('EventsCatalogueClient filters', () => {
    const events = EVENTS.filter(isPubliclyVisible);

    it('renders a card for every publicly visible event by default', () => {
        render(<EventsCatalogueClient events={events} />);
        for (const event of events) {
            expect(screen.getByText(event.title)).toBeInTheDocument();
        }
    });

    it('filters by domain', () => {
        render(<EventsCatalogueClient events={events} />);
        fireEvent.change(screen.getByLabelText('Domain'), { target: { value: 'Aerospace' } });

        const aerospaceEvents = events.filter((e) => e.domain === 'Aerospace');
        const nonAerospaceEvents = events.filter((e) => e.domain !== 'Aerospace');

        for (const event of aerospaceEvents) {
            expect(screen.getByText(event.title)).toBeInTheDocument();
        }
        for (const event of nonAerospaceEvents) {
            expect(screen.queryByText(event.title)).not.toBeInTheDocument();
        }
    });

    it('filters by type=Paid down to just the pilot event', () => {
        render(<EventsCatalogueClient events={events} />);
        fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'Paid' } });
        expect(screen.getByText('Event Registration & Payment Pilot')).toBeInTheDocument();
        expect(screen.queryByText('AI for Space Situational Awareness')).not.toBeInTheDocument();
    });

    it('shows an empty state when no events match combined filters', () => {
        render(<EventsCatalogueClient events={events} />);
        fireEvent.change(screen.getByLabelText('Domain'), { target: { value: 'Aerospace' } });
        fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'Paid' } });
        expect(screen.getByText('No events match the selected filters.')).toBeInTheDocument();
    });
});
