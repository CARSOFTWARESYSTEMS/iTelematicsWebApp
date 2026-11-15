import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import SolarSystemExperience from './SolarSystemExperience';
import { journey } from '@/lib/solar-system/phaseB';

// jsdom has no WebGL: the experience shows its still image and keeps every control usable.
vi.mock('next/dynamic', () => ({ default: () => () => null }));

beforeAll(() => {
    window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
    window.IntersectionObserver = class {
        constructor(private cb: IntersectionObserverCallback) {}
        observe() {
            this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
        }
        disconnect() {}
        unobserve() {}
        takeRecords() {
            return [];
        }
        root = null;
        rootMargin = '';
        thresholds = [];
    } as unknown as typeof IntersectionObserver;
});

const { chapters } = journey();

describe('Solar System experience', () => {
    it('opens on the launch pad with Start Mission and Explore Mission Stages, labelled as simulated', () => {
        render(<SolarSystemExperience />);
        const img = screen.getByRole('img');
        expect(img.getAttribute('aria-label')).toMatch(/Solar System: From Earth Launch to Deep Space Exploration/);
        expect(img.getAttribute('aria-label')).toMatch(/SIMULATED — Conceptual reference mission SOL-1/);
        expect(screen.getByRole('button', { name: 'Start Mission' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Explore Mission Stages' })).toBeInTheDocument();
        // No dashboard on the opening: no topic buttons or readings yet.
        expect(screen.queryByRole('group', { name: /topics/ })).toBeNull();
    });

    it('lists every stage, and each stage shows three to six topics, at most four readings and the rest under More topics', () => {
        render(<SolarSystemExperience />);
        fireEvent.click(screen.getByRole('button', { name: 'Explore Mission Stages' }));
        const nav = screen.getByRole('navigation', { name: 'Mission stages' });
        expect(
            within(nav)
                .getAllByRole('button')
                .map((b) => b.textContent?.replace(/^\d\d/, '')),
        ).toEqual(chapters.map((c) => c.title));
        fireEvent.click(within(nav).getAllByRole('button')[0]);
        for (const [i, c] of chapters.entries()) {
            fireEvent.click(screen.getByRole('button', { name: `Stage ${c.number}: ${c.title}` }));
            expect(screen.getByRole('heading', { name: c.title })).toBeInTheDocument();
            const main = within(screen.getByRole('group', { name: `${c.title}: topics` })).getAllByRole('button');
            const topics = main.filter((b) => !/^More topics/.test(b.textContent ?? ''));
            expect(topics.length).toBeGreaterThanOrEqual(3);
            expect(topics.length).toBeLessThanOrEqual(6);
            const n = screen.getByLabelText('Engineering measurements, simulated').querySelectorAll('dt').length;
            expect(n).toBeGreaterThanOrEqual(2);
            expect(n).toBeLessThanOrEqual(4);
            // Every topic of the stage is reachable: the main ones plus More topics.
            const more = main.find((b) => /^More topics/.test(b.textContent ?? ''));
            if (more) {
                fireEvent.click(more);
                const extra = within(screen.getByRole('group', { name: `${c.title}: more topics` })).getAllByRole('button');
                expect(topics.length + extra.length).toBe(c.labels.length);
            } else expect(topics.length).toBe(c.labels.length);
            expect(i).toBeGreaterThanOrEqual(0);
        }
    }, 30000);

    it('a topic explains what happens and why it matters, with readings, Learn more and a way back', () => {
        render(<SolarSystemExperience />);
        fireEvent.click(screen.getByRole('button', { name: 'Stage 03: Atmospheric Ascent' }));
        fireEvent.click(within(screen.getByRole('group', { name: 'Atmospheric Ascent: topics' })).getByRole('button', { name: 'Maximum Dynamic Pressure' }));
        expect(screen.getByRole('heading', { name: 'Maximum Dynamic Pressure' })).toBeInTheDocument();
        for (const q of ['What happens', 'Why it matters']) expect(screen.getByText(q)).toBeInTheDocument();
        expect(screen.getByText('Learn more')).toBeInTheDocument();
        expect(screen.getByText('Dynamic pressure')).toBeInTheDocument();
        expect(within(screen.getByRole('group', { name: 'Atmospheric Ascent: topics' })).getByRole('button', { name: 'Maximum Dynamic Pressure' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: '← Return to mission' }));
        expect(screen.getByRole('heading', { name: 'Atmospheric Ascent' })).toBeInTheDocument();
    });

    it('starts the guided mission at the first stage and navigates with Next, Previous and Back', () => {
        render(<SolarSystemExperience />);
        fireEvent.click(screen.getByRole('button', { name: 'Start Mission' }));
        expect(screen.getByRole('heading', { name: chapters[0].title })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(screen.getByRole('heading', { name: chapters[1].title })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
        expect(screen.getByRole('heading', { name: chapters[0].title })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(screen.getByRole('button', { name: 'Start Mission' })).toBeInTheDocument();
    });

    it('offers Explore Spacecraft Payload on the pad, and labels the Discovery tour as cinematic', () => {
        render(<SolarSystemExperience />);
        fireEvent.click(screen.getByRole('button', { name: 'Start Mission' }));
        fireEvent.click(screen.getByRole('button', { name: 'Explore Spacecraft Payload' }));
        expect(screen.getByRole('heading', { name: 'Explore Spacecraft Payload' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Stage 12: Solar System Discovery' }));
        expect(screen.getByText(/Cinematic Scale — Not to Scale/)).toBeInTheDocument();
    });
});
