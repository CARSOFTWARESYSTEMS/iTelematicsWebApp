import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import SolarSystemExperience from './SolarSystemExperience';
import { mission } from '@/lib/solar-system/mission';

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

const { chapters } = mission();

describe('Solar System experience', () => {
    it('opens on the title with Start Mission and Explore Mission Stages, labelled as simulated', () => {
        render(<SolarSystemExperience />);
        const img = screen.getByRole('img');
        expect(img.getAttribute('aria-label')).toMatch(/Solar System: From Earth Launch to Deep Space Exploration/);
        expect(img.getAttribute('aria-label')).toMatch(/SIMULATED — Conceptual reference mission SOL-1/);
        expect(screen.getByRole('button', { name: 'Start Mission' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Explore Mission Stages' })).toBeInTheDocument();
        expect(screen.getByText(/Explore the Solar System. Understand the science. Experience the mission./)).toBeInTheDocument();
    });

    it('lists the mission stages and opens each with its labels and simulated readings', () => {
        render(<SolarSystemExperience />);
        fireEvent.click(screen.getByRole('button', { name: 'Explore Mission Stages' }));
        const list = screen.getByRole('list', { name: 'Mission stages' });
        expect(within(list).getAllByRole('button').map((b) => b.textContent?.replace(/^\d\d/, ''))).toEqual(chapters.map((c) => c.title));
        for (const [i, c] of chapters.entries()) {
            fireEvent.click(within(screen.getByRole('list', { name: 'Mission stages' })).getAllByRole('button')[i]);
            expect(screen.getByRole('heading', { name: c.title })).toBeInTheDocument();
            const labels = screen.getByRole('group', { name: `${c.title}: engineering actions` });
            expect(within(labels).getAllByRole('button')).toHaveLength(c.labels.length);
            expect(screen.getByText(/Engineering readings · simulated/)).toBeInTheDocument();
        }
    }, 15000);

    it('answers what, does, why and happening for a label, with Learn more and the next action', () => {
        render(<SolarSystemExperience />);
        fireEvent.click(screen.getByRole('button', { name: 'Explore Mission Stages' }));
        fireEvent.click(within(screen.getByRole('list', { name: 'Mission stages' })).getByRole('button', { name: /Atmospheric Ascent/ }));
        fireEvent.click(within(screen.getByRole('group', { name: 'Atmospheric Ascent: engineering actions' })).getByRole('button', { name: 'Maximum Dynamic Pressure' }));
        expect(screen.getByRole('heading', { name: 'Maximum Dynamic Pressure' })).toBeInTheDocument();
        for (const q of ['What is it?', 'What does it do?', 'Why is it important?', 'What is happening?']) expect(screen.getByText(q)).toBeInTheDocument();
        expect(screen.getByText('Learn more')).toBeInTheDocument();
        expect(screen.getByText('Dynamic pressure')).toBeInTheDocument();
        const actions = screen.getByRole('group', { name: 'Atmospheric Ascent: engineering actions' });
        expect(within(actions).getByRole('button', { name: 'Engine Performance' })).toHaveAttribute('aria-pressed', 'false');
        expect(within(actions).getByRole('button', { name: 'Maximum Dynamic Pressure' })).toHaveAttribute('aria-pressed', 'true');
        // The next logical action is offered.
        expect(screen.getByText(/^Next:/)).toBeInTheDocument();
    });

    it('starts the guided mission at the first chapter and navigates with Next, Previous and Back', () => {
        render(<SolarSystemExperience />);
        fireEvent.click(screen.getByRole('button', { name: 'Start Mission' }));
        expect(screen.getByRole('heading', { name: chapters[0].title })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Start Mission' })).toHaveClass('btn-primary');
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(screen.getByRole('heading', { name: chapters[1].title })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
        expect(screen.getByRole('heading', { name: chapters[0].title })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(screen.getByRole('heading', { name: /Solar System: From Earth Launch/ })).toBeInTheDocument();
    });
});
