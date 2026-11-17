import { beforeAll, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import EpsExperience from './EpsExperience';
import { FAULTS, LABELS } from '@/lib/station-eps/scenes';

// jsdom has no WebGL: the experience shows its still image and the investigation panel stays usable.
vi.mock('next/dynamic', () => ({ default: () => () => null }));

beforeAll(() => {
    Element.prototype.scrollIntoView = () => {};
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

describe('Station Power & Energy experience', () => {
    it('prepares the guided investigation for a deep link and honors autoplay off', () => {
        const launchRef = { current: null as (() => void) | null };
        render(<EpsExperience launch={{ fullscreen: true, sound: true, voice: true, captions: true, volume: 100, autoplay: false, autonext: true }} launchRef={launchRef} />);
        expect(screen.getByRole('button', { name: 'Start Investigation' })).toHaveAttribute('aria-current', 'true');
        act(() => launchRef.current?.());
        expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Play' }));
        expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    });
    it('opens on the overview with the central message, the story and the simulated-data label', () => {
        render(<EpsExperience />);
        expect(screen.getByRole('img', { name: /Space Station Electrical Power & Energy Management/ })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Space Station Electrical Power & Energy Management' })).toBeInTheDocument();
        expect(screen.getByRole('list', { name: 'The engineering story' }).textContent).toMatch(/Solar Generation.*Recovery/);
        expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/SIMULATED — Conceptual Space Station EPS/);
        for (const name of ['Start Investigation', 'Subsystems', 'Fault Investigation']) expect(screen.getByRole('button', { name })).toBeInTheDocument();
    });

    it('lists the ten subsystem investigations, each with telemetry, health, insight and Learn more', () => {
        render(<EpsExperience />);
        fireEvent.click(screen.getByRole('button', { name: 'Subsystems' }));
        const list = screen.getByRole('list', { name: 'Subsystem investigations' });
        const items = within(list).getAllByRole('button');
        expect(items.map((b) => b.textContent?.replace(/^\d\d/, ''))).toEqual(LABELS.map((l) => l.title));
        for (const [i, label] of LABELS.entries()) {
            fireEvent.click(within(screen.getByRole('list', { name: 'Subsystem investigations' })).getAllByRole('button')[i]);
            expect(screen.getByRole('heading', { name: label.title })).toBeInTheDocument();
            expect(screen.getByText(/Engineering telemetry · simulated/)).toBeInTheDocument();
            expect(screen.getByText(/^Health/)).toBeInTheDocument();
            expect(screen.getByText('Engineering insight.')).toBeInTheDocument();
            expect(screen.getByText('Learn more')).toBeInTheDocument();
        }
        // Ten full panel renders: allow for a loaded machine running the whole suite.
    }, 15000);

    it('investigates the three faults with their diagnostic record', () => {
        render(<EpsExperience />);
        fireEvent.click(screen.getByRole('button', { name: 'Fault Investigation' }));
        const list = screen.getByRole('list', { name: 'Fault investigations' });
        expect(within(list).getAllByRole('button').map((b) => b.textContent)).toEqual(FAULTS.map((f) => f.title));
        fireEvent.click(within(list).getByRole('button', { name: /Battery Thermal/ }));
        for (const field of ['Fault', 'Affected component', 'Expected', 'Observed (simulated)', 'Detection condition', 'Severity', 'Effect on power', 'Protective response', 'Outcome']) {
            expect(screen.getByText(field)).toBeInTheDocument();
        }
    });

    it('navigates with Previous, Next, Back and the guided walkthrough', () => {
        render(<EpsExperience />);
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(screen.getByRole('heading', { name: LABELS[0].title })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(screen.getByRole('heading', { name: LABELS[1].title })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
        expect(screen.getByRole('heading', { name: LABELS[0].title })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(screen.getByRole('heading', { name: 'Space Station Electrical Power & Energy Management' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Start Investigation' }));
        expect(screen.getByText(/^1 \/ 8 · Opening/, { selector: 'p' })).toBeInTheDocument();
    });

    it('highlights only the button the visitor chose', () => {
        render(<EpsExperience />);
        const highlighted = () =>
            ['Start Investigation', 'Subsystems', 'Fault Investigation'].filter((name) => screen.getByRole('button', { name }).classList.contains('btn-primary'));
        expect(highlighted()).toEqual([]);
        fireEvent.click(screen.getByRole('button', { name: 'Subsystems' }));
        expect(highlighted()).toEqual(['Subsystems']);
        expect(screen.getByRole('button', { name: 'Subsystems' })).toHaveAttribute('aria-current', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'Fault Investigation' }));
        expect(highlighted()).toEqual(['Fault Investigation']);
        fireEvent.click(screen.getByRole('button', { name: 'Start Investigation' }));
        expect(highlighted()).toEqual(['Start Investigation']);
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(highlighted()).toEqual([]);
    });
});
