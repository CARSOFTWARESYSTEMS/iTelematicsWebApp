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

    it('the default stage view is a compact caption with a guided action; Investigate opens three to six topics, two to four readings and More topics', () => {
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
            // Cinematic default: no topic list until the visitor investigates.
            expect(screen.queryByRole('group', { name: `${c.title}: topics` })).toBeNull();
            if (c.primary) expect(screen.getByRole('button', { name: c.primary.text })).toBeInTheDocument();
            fireEvent.click(screen.getByRole('button', { name: `Investigate (${c.labels.length})` }));
            const main = within(screen.getByRole('group', { name: `${c.title}: topics` })).getAllByRole('button');
            const topics = main.filter((b) => !/^More topics/.test(b.textContent ?? ''));
            expect(topics.length).toBeGreaterThanOrEqual(3);
            expect(topics.length).toBeLessThanOrEqual(6);
            // Readings (none over the Discovery overview, where there is no destination yet).
            const box = screen.queryByLabelText('Engineering measurements, simulated');
            const n = box ? box.querySelectorAll('dt').length : 0;
            if (c.id !== 'discovery') expect(n).toBeGreaterThanOrEqual(2);
            expect(n).toBeLessThanOrEqual(4);
            // Every topic of the stage is reachable: the main ones, More topics and the fault scenarios.
            const whatIf = screen.queryByRole('group', { name: `${c.title}: what if` });
            const nWhatIf = whatIf ? within(whatIf).getAllByRole('button').length : 0;
            expect(nWhatIf).toBe(c.labels.filter((l) => l.whatIf).length);
            const more = main.find((b) => /^More topics/.test(b.textContent ?? ''));
            if (more) {
                fireEvent.click(more);
                const extra = within(screen.getByRole('group', { name: `${c.title}: more topics` })).getAllByRole('button');
                expect(topics.length + extra.length + nWhatIf).toBe(c.labels.length);
            } else expect(topics.length + nWhatIf).toBe(c.labels.length);
            expect(i).toBeGreaterThanOrEqual(0);
        }
    }, 30000);

    it('a topic explains what happens and why it matters, with readings, Learn more and a way back', () => {
        render(<SolarSystemExperience />);
        fireEvent.click(screen.getByRole('button', { name: 'Stage 03: Atmospheric Ascent' }));
        fireEvent.click(screen.getByRole('button', { name: /^Investigate/ }));
        fireEvent.click(within(screen.getByRole('group', { name: 'Atmospheric Ascent: topics' })).getByRole('button', { name: 'Maximum Dynamic Pressure' }));
        expect(screen.getByRole('heading', { name: 'Maximum Dynamic Pressure' })).toBeInTheDocument();
        for (const q of ['What it is', 'What happens', 'Why it matters']) expect(screen.getByText(q)).toBeInTheDocument();
        expect(screen.getByText('Learn more')).toBeInTheDocument();
        expect(screen.getAllByText('Dynamic pressure').length).toBeGreaterThan(0);
        // Technical terms explain themselves on tap.
        const term = screen.getAllByRole('button', { name: /^Max Q$|^dynamic pressure$/i })[0];
        fireEvent.click(term);
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(within(screen.getByRole('group', { name: 'Atmospheric Ascent: topics' })).getByRole('button', { name: 'Maximum Dynamic Pressure' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: '← Return to mission view' }));
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

    it('keeps the guided mission guided after a topic, and Back returns to where the visitor came from', () => {
        render(<SolarSystemExperience />);
        fireEvent.click(screen.getByRole('button', { name: 'Start Mission' }));
        fireEvent.click(screen.getByRole('button', { name: 'Explore Spacecraft Payload' }));
        fireEvent.click(screen.getByRole('button', { name: '← Return to mission view' }));
        expect(screen.getByRole('heading', { name: chapters[0].title })).toBeInTheDocument();
        // A jump from the timeline is remembered: Back returns to the stage it came from.
        fireEvent.click(screen.getByRole('button', { name: 'Stage 09: Interplanetary Cruise' }));
        expect(screen.getByRole('heading', { name: 'Interplanetary Cruise' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(screen.getByRole('heading', { name: chapters[0].title })).toBeInTheDocument();
    });

    it('offers a scientific view, keyboard control, the Discovery tour and a searchable topic index', () => {
        render(<SolarSystemExperience />);
        fireEvent.click(screen.getByRole('button', { name: 'Stage 10: Jupiter Encounter and Gravity Assist' }));
        const sci = screen.getByRole('button', { name: 'Scientific' });
        fireEvent.click(sci);
        expect(sci).toHaveAttribute('aria-pressed', 'true');
        fireEvent.keyDown(sci, { key: 'ArrowRight' });
        expect(screen.getByRole('heading', { name: 'Saturn and Deep Space' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        fireEvent.click(screen.getByRole('button', { name: 'Explore Mission Stages' }));
        fireEvent.change(screen.getByRole('searchbox', { name: 'Search topics' }), { target: { value: 'radiation' } });
        fireEvent.click(screen.getByRole('button', { name: /Jupiter’s Radiation/ }));
        expect(screen.getByRole('heading', { name: 'Jupiter’s Radiation' })).toBeInTheDocument();
    });
});
