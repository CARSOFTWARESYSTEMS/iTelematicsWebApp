import { beforeAll, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import Explorer from './Explorer';
import StationHero from './StationHero';
import StationTwinViewer from './StationTwinViewer';

// jsdom has no WebGL: both station views must fall back to their still image and keep every control usable.
vi.mock('next/dynamic', () => ({ default: () => () => null }));

beforeAll(() => {
    Element.prototype.scrollIntoView = () => {};
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
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

describe('StationTwinViewer', () => {
    it('describes the station in words, with its maturity, time scale and assumptions', () => {
        render(<StationTwinViewer />);
        const scene = screen.getByRole('img', { name: /^Station Reference Case SRC-1: A conceptual modular research station/ });
        expect(scene.getAttribute('aria-label')).toMatch(/Stage 1 of 4: The station in orbit/);
        expect(screen.getByText('Concept')).toBeInTheDocument();
        expect(screen.getByText('Simulation')).toBeInTheDocument();
        expect(screen.getByText(/Not an operational digital twin/)).toBeInTheDocument();
        expect(screen.getByText(/Simulated values, not flight data/)).toBeInTheDocument();
        expect(screen.getByText('Model assumptions and limits')).toBeInTheDocument();
        expect(screen.getByText(/not trained AI/)).toBeInTheDocument();
        expect(screen.getByText(/3D isn’t available on this device/)).toBeInTheDocument();
    });

    it('offers the four stages and selectable subsystems that link to the architecture', () => {
        render(<StationTwinViewer />);
        const stages = within(screen.getByRole('group', { name: 'Station model stages' })).getAllByRole('button');
        expect(stages.map((b) => b.textContent)).toEqual(['1Reveal', '2Explore', '3Health', '4Recovery']);

        act(() => fireEvent.click(stages[3]));
        expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/Stage 4 of 4: Simulated fault, protected response/);

        const arrays = screen.getByRole('button', { name: 'Solar arrays' });
        act(() => fireEvent.click(arrays));
        expect(arrays).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('Solar power channels:')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Subsystem details' })).toHaveAttribute('href', '#system-solar-power');
    });

    it('has play, reset and replay controls', () => {
        render(<StationTwinViewer />);
        const play = screen.getByRole('button', { name: 'Pause the animation' });
        act(() => fireEvent.click(play));
        expect(screen.getByRole('button', { name: 'Play the animation' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Reset the camera view' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Replay from the start' })).toBeInTheDocument();
    });
});

describe('Explorer', () => {
    const items = [
        { id: 'a', number: '01', title: 'Alpha', fields: [{ label: 'Purpose', value: 'First' }] },
        { id: 'b', number: '02', title: 'Beta', fields: [{ label: 'Purpose', value: 'Second' }] },
        { id: 'c', number: '03', title: 'Gamma', fields: [{ label: 'Purpose', value: 'Third' }] },
    ];

    it('renders every panel in the HTML and shows one at a time', () => {
        const { container } = render(<Explorer items={items} label="Systems" prefix="sys-" />);
        expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(3);
        expect(screen.getByText('First')).toBeVisible();
        expect(container.querySelector('#sys-b')).toHaveAttribute('hidden');
    });

    it('moves between items with the keyboard', () => {
        render(<Explorer items={items} label="Systems" prefix="sys-" />);
        const tabs = screen.getAllByRole('tab');
        fireEvent.keyDown(tabs[0], { key: 'ArrowDown' });
        expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
        fireEvent.keyDown(tabs[1], { key: 'End' });
        expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
        fireEvent.keyDown(tabs[2], { key: 'ArrowDown' });
        expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('opens the item named in the URL hash', () => {
        window.location.hash = '#sys-c';
        render(<Explorer items={items} label="Systems" prefix="sys-" />);
        expect(screen.getByRole('tab', { name: /Gamma/ })).toHaveAttribute('aria-selected', 'true');
        window.location.hash = '';
    });
});

describe('StationHero', () => {
    it('shows the still station, a text alternative and the energy state, without a pause control when nothing animates', () => {
        render(<StationHero label="Illustrative conceptual space station" />);
        expect(screen.getByRole('img', { name: 'Illustrative conceptual space station' })).toBeInTheDocument();
        expect(screen.getByText('Sunlight · arrays generating')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /animation/ })).toBeNull();
    });
});
