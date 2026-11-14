import { beforeAll, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import SpaceTwinViewer from './SpaceTwinViewer';

// jsdom has no WebGL: the viewer must fall back to its still poster and keep every control usable.
vi.mock('next/dynamic', () => ({ default: () => () => null }));

let reduced = false;

beforeAll(() => {
    // jsdom does no layout.
    Element.prototype.scrollIntoView = () => {};
    window.matchMedia =((query: string) => ({
        matches: query.includes('prefers-reduced-motion') ? reduced : false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    // Report the section as on screen, so the no-WebGL message can appear.
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

describe('SpaceTwinViewer', () => {
    it('offers the four experiences as keyboard-operable tabs', () => {
        render(<SpaceTwinViewer />);
        const tabs = screen.getAllByRole('tab');
        expect(tabs.map((t) => t.textContent)).toEqual(['01Satellite', '02Orbital Constellation', '03Spacecraft', '04Space Station']);
        expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
        expect(tabs[1]).toHaveAttribute('tabindex', '-1');

        // jsdom reports no WebGL, so switching is immediate (no fade).
        fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
        expect(screen.getByRole('tab', { name: /Orbital Constellation/ })).toHaveAttribute('aria-selected', 'true');
        fireEvent.keyDown(screen.getByRole('tab', { name: /Orbital Constellation/ }), { key: 'End' });
        expect(screen.getByRole('tab', { name: /Space Station/ })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'twin-tab-station');
    });

    it('describes the scene in words and states its maturity and assumptions', () => {
        render(<SpaceTwinViewer />);
        const scene = screen.getByRole('img', { name: /^Satellite: A 6U CubeSat-class/ });
        expect(scene.getAttribute('aria-label')).toMatch(/Stage 1 of 4: Spacecraft reveal/);
        expect(screen.getByText('Simulation')).toBeInTheDocument();
        expect(screen.getByText(/Simulated values, not flight data/)).toBeInTheDocument();
        expect(screen.getByText('Model assumptions and limits')).toBeInTheDocument();
        expect(screen.getByText(/not trained AI/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: /Space Station/ }));
        expect(screen.getByText('Concept')).toBeInTheDocument();
        expect(screen.getByText(/does not operate a space station/)).toBeInTheDocument();
    });

    it('moves between stages and explains a picked part', () => {
        render(<SpaceTwinViewer />);
        const stages = within(screen.getByRole('group', { name: 'Satellite stages' })).getAllByRole('button');
        expect(stages.map((b) => b.textContent)).toEqual(['1Reveal', '2Explore', '3Health', '4Recovery']);
        fireEvent.click(stages[2]);
        expect(stages[2]).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/Stage 3 of 4: Mission health/);

        const parts = within(screen.getByRole('group', { name: 'Satellite parts' }));
        fireEvent.click(parts.getByRole('button', { name: 'Battery & EPS' }));
        expect(parts.getByRole('button', { name: 'Battery & EPS' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText(/86 Wh lithium-ion battery/)).toBeInTheDocument();
        // Picking a part pauses the story so it can be inspected.
        expect(screen.getByRole('button', { name: 'Play the animation' })).toBeInTheDocument();
    });

    it('has pause, reset-view and replay controls', () => {
        render(<SpaceTwinViewer />);
        const pause = screen.getByRole('button', { name: 'Pause the animation' });
        fireEvent.click(pause);
        expect(screen.getByRole('button', { name: 'Play the animation' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Reset the camera view' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Replay from the start' }));
        expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/Stage 1 of 4/);
    });

    it('waits for Play when the visitor prefers reduced motion', () => {
        reduced = true;
        try {
            render(<SpaceTwinViewer />);
            expect(screen.getByRole('button', { name: 'Play the animation' })).toBeInTheDocument();
        } finally {
            reduced = false;
        }
    });

    it('shows a still image and says so where WebGL is missing', async () => {
        render(<SpaceTwinViewer />);
        await act(async () => {});
        expect(screen.getByText(/3D isn.t available on this device/)).toBeInTheDocument();
        const poster = document.querySelector('img[src*="poster-satellite"]');
        expect(poster).not.toBeNull();
    });
});
