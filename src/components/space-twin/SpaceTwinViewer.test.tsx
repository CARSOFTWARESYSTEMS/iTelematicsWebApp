import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
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
    it('offers the four experiences, Station Power & Energy and Solar System as keyboard-operable tabs', () => {
        render(<SpaceTwinViewer />);
        const tabs = screen.getAllByRole('tab');
        expect(tabs.map((t) => t.textContent)).toEqual(['01Satellite', '02Orbital Constellation', '03Spacecraft', '04Space Station', '05Station Power & Energy', '06Solar System']);
        expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
        expect(tabs[1]).toHaveAttribute('tabindex', '-1');

        // jsdom reports no WebGL, so switching is immediate (no fade).
        fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
        expect(screen.getByRole('tab', { name: /Orbital Constellation/ })).toHaveAttribute('aria-selected', 'true');
        fireEvent.keyDown(screen.getByRole('tab', { name: /Orbital Constellation/ }), { key: 'End' });
        expect(screen.getByRole('tab', { name: /Solar System/ })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'twin-tab-solar');
        fireEvent.keyDown(screen.getByRole('tab', { name: /Solar System/ }), { key: 'ArrowLeft' });
        expect(screen.getByRole('tab', { name: /Station Power & Energy/ })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'twin-tab-eps');
        fireEvent.keyDown(screen.getByRole('tab', { name: /Station Power & Energy/ }), { key: 'ArrowLeft' });
        expect(screen.getByRole('tab', { name: /Space Station/ })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'twin-tab-station');
    });

    it('opens the fifth option without disturbing the four experiences', () => {
        render(<SpaceTwinViewer />);
        expect(screen.getByRole('group', { name: 'Satellite stages' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('tab', { name: /Station Power & Energy/ }));
        expect(screen.queryByRole('group', { name: 'Satellite stages' })).not.toBeInTheDocument();
        expect(screen.queryByText('Model assumptions and limits')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('tab', { name: /Satellite/ }));
        expect(screen.getByRole('tab', { name: /Satellite/ })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('group', { name: 'Satellite stages' })).toBeInTheDocument();
        expect(screen.getByText('Model assumptions and limits')).toBeInTheDocument();
    });

    it('opens the sixth option, Solar System, and returns to the standard frame', () => {
        render(<SpaceTwinViewer />);
        fireEvent.click(screen.getByRole('tab', { name: /Solar System/ }));
        expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'twin-tab-solar');
        expect(screen.queryByRole('group', { name: 'Satellite stages' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('tab', { name: /Station Power & Energy/ }));
        expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'twin-tab-eps');
        fireEvent.click(screen.getByRole('tab', { name: /Spacecraft/ }));
        expect(screen.getByRole('group', { name: 'Spacecraft stages' })).toBeInTheDocument();
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

    it('goes full screen for presenting and leaves with Exit or Esc, keeping the predefined controls', () => {
        render(<SpaceTwinViewer />);
        const viewer = screen.getByRole('figure');
        expect(viewer).not.toHaveAttribute('data-present');
        // jsdom has no Fullscreen API: the viewer still covers the window.
        fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));
        expect(viewer).toHaveAttribute('data-present');
        expect(document.documentElement.style.overflow).toBe('hidden');
        expect(screen.getByRole('group', { name: 'Satellite stages' })).toBeInTheDocument();
        expect(screen.getAllByRole('tab')).toHaveLength(6);
        fireEvent.click(screen.getByRole('button', { name: 'Exit full screen' }));
        expect(viewer).not.toHaveAttribute('data-present');
        expect(document.documentElement.style.overflow).toBe('');

        fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));
        fireEvent.click(screen.getByRole('tab', { name: /Station Power & Energy/ }));
        expect(viewer).toHaveAttribute('data-present');
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(viewer).not.toHaveAttribute('data-present');
    });

    it('shows a still image and says so where WebGL is missing', async () => {
        render(<SpaceTwinViewer />);
        await act(async () => {});
        expect(screen.getByText(/3D isn.t available on this device/)).toBeInTheDocument();
        const poster = document.querySelector('img[src*="poster-satellite"]');
        expect(poster).not.toBeNull();
    });
});

describe('SpaceTwinViewer shareable links', () => {
    const go = (query: string) => window.history.replaceState(null, '', `/${query}`);
    const launch = () => screen.queryByRole('group', { name: /^(Satellite|Orbital Constellation|Spacecraft|Space Station|Station Power & Energy|Solar System)$/ });
    afterEach(() => {
        go('');
        reduced = false;
        Reflect.deleteProperty(HTMLElement.prototype, 'requestFullscreen');
    });

    it.each([
        [1, 'Satellite'],
        [2, 'Orbital Constellation'],
        [3, 'Spacecraft'],
        [4, 'Space Station'],
        [5, 'Station Power & Energy'],
        [6, 'Solar System'],
    ])('space_digital_twin=%i selects %s and waits for one click, leaving the URL as it is', (n, label) => {
        go(`?utm_source=share&space_digital_twin=${n}`);
        render(<SpaceTwinViewer />);
        expect(screen.getByRole('tab', { name: label })).toHaveAttribute('aria-selected', 'true');
        expect(launch()).toHaveAccessibleName(label);
        // The fifth and sixth options load separately: the button waits for them.
        expect(within(launch()!).getByRole('button')).toHaveTextContent(n > 4 ? 'Preparing the mission…' : 'Enter Full Screen & Start Mission');
        expect(window.location.search).toBe(`?utm_source=share&space_digital_twin=${n}`);
    });

    it('says what the click starts, true to the experience', () => {
        go('?space_digital_twin=6');
        const { unmount } = render(<SpaceTwinViewer />);
        expect(screen.getByText('Every stage plays in order, with sound, voice narration and subtitles.')).toBeInTheDocument();
        unmount();
        go('?space_digital_twin=2&autonext=0');
        render(<SpaceTwinViewer />);
        expect(screen.getByText('Plays the first stage.')).toBeInTheDocument();
    });

    it('one click starts the mission and asks for full screen once; a refusal still starts it, and Esc leaves full screen without stopping it', async () => {
        const request = vi.fn().mockRejectedValue(new Error('Not allowed'));
        Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: request });
        go('?space_digital_twin=1');
        render(<SpaceTwinViewer />);
        expect(request).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Play the animation' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Enter Full Screen & Start Mission' }));
        await act(async () => {});
        expect(request).toHaveBeenCalledTimes(1);
        expect(launch()).toBeNull();
        expect(screen.getByRole('figure')).toHaveAttribute('data-present');
        expect(screen.getByRole('button', { name: 'Pause the animation' })).toBeInTheDocument();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.getByRole('figure')).not.toHaveAttribute('data-present');
        expect(screen.getByRole('button', { name: 'Pause the animation' })).toBeInTheDocument();
        expect(request).toHaveBeenCalledTimes(1);
    });

    it('starts at once, without a click or full screen, when the link asks for neither on a silent experience', () => {
        const request = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: request });
        go('?space_digital_twin=3&fullscreen=0');
        render(<SpaceTwinViewer />);
        expect(launch()).toBeNull();
        expect(screen.getByRole('figure')).not.toHaveAttribute('data-present');
        expect(screen.getByRole('button', { name: 'Pause the animation' })).toBeInTheDocument();
        expect(request).not.toHaveBeenCalled();
    });

    it('autoplay=0 enters full screen on the click and leaves the first stage paused', () => {
        go('?space_digital_twin=4&autoplay=0');
        render(<SpaceTwinViewer />);
        fireEvent.click(screen.getByRole('button', { name: 'Enter Full Screen' }));
        expect(screen.getByRole('button', { name: 'Play the animation' })).toBeInTheDocument();
    });

    it('with reduced motion it waits for the click even without full screen', () => {
        reduced = true;
        go('?space_digital_twin=2&fullscreen=0');
        render(<SpaceTwinViewer />);
        fireEvent.click(screen.getByRole('button', { name: 'Start Mission' }));
        expect(screen.getByRole('button', { name: 'Pause the animation' })).toBeInTheDocument();
    });

    it('picking another experience dismisses the waiting launch and behaves as normal', () => {
        go('?space_digital_twin=6');
        render(<SpaceTwinViewer />);
        fireEvent.click(screen.getByRole('tab', { name: 'Spacecraft' }));
        expect(launch()).toBeNull();
        expect(screen.getByRole('tab', { name: 'Spacecraft' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('button', { name: 'Pause the animation' })).toBeInTheDocument();
    });

    it.each(['?space_digital_twin=0', '?space_digital_twin=7', '?space_digital_twin=abc', '?space_digital_twin=1&space_digital_twin=2', '?fullscreen=1&sound=1'])('%s behaves as a normal visit', (query) => {
        go(query);
        render(<SpaceTwinViewer />);
        expect(launch()).toBeNull();
        expect(screen.getByRole('tab', { name: 'Satellite' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('button', { name: 'Pause the animation' })).toBeInTheDocument();
    });

    it('shows one launch in Strict Mode', () => {
        go('?space_digital_twin=1');
        render(
            <StrictMode>
                <SpaceTwinViewer />
            </StrictMode>,
        );
        expect(screen.getAllByRole('button', { name: 'Enter Full Screen & Start Mission' })).toHaveLength(1);
    });
});

describe('SpaceTwinViewer share', () => {
    it('shares the link of the option on screen, and follows the visitor to another option', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
        render(<SpaceTwinViewer />);
        fireEvent.click(screen.getByRole('button', { name: 'Share Satellite' }));
        const panel = screen.getByRole('dialog', { name: 'Share Satellite' });
        expect(within(panel).getByLabelText('Link to Satellite')).toHaveTextContent('https://itelematics.com/?space_digital_twin=1');
        expect(within(panel).getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', expect.stringContaining(encodeURIComponent('https://itelematics.com/?space_digital_twin=1')));
        await act(async () => {
            fireEvent.click(within(panel).getByRole('button', { name: 'Copy link' }));
        });
        expect(writeText).toHaveBeenCalledWith('https://itelematics.com/?space_digital_twin=1');
        expect(within(panel).getByRole('button', { name: 'Copied ✓' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('tab', { name: 'Solar System' }));
        expect(screen.getByLabelText('Link to Solar System')).toHaveTextContent('https://itelematics.com/?space_digital_twin=6');
        expect(screen.getByText(/with sound and voice narration/)).toBeInTheDocument();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog', { name: /^Share/ })).toBeNull();
        Reflect.deleteProperty(navigator, 'clipboard');
    });

    it.each([1, 2, 3, 4, 5, 6])('gives option %i its own link', (n) => {
        render(<SpaceTwinViewer />);
        fireEvent.click(screen.getAllByRole('tab')[n - 1]);
        fireEvent.click(screen.getByRole('button', { name: /^Share / }));
        expect(screen.getByLabelText(/^Link to /)).toHaveTextContent(`https://itelematics.com/?space_digital_twin=${n}`);
    });
});
