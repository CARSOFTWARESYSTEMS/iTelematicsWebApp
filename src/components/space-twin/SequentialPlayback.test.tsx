import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { StrictMode } from 'react';
import SpaceTwinViewer from './SpaceTwinViewer';
import SolarSystemExperience from '../solar-system/SolarSystemExperience';
import EpsExperience from '../station-eps/EpsExperience';
import { EXPERIENCES } from '@/lib/space-twin/experiences';
import { GUIDED, LABELS } from '@/lib/station-eps/scenes';
import { journey } from '@/lib/solar-system/phaseB';
import type { MissionClock } from '@/lib/solar-system/clock';
import type { StoryClock } from '@/lib/space-twin/story';
import type { LaunchSettings } from '@/lib/space-twin/launch';

// Exercise real controllers, registries and clocks. Only rendering/audio hardware is replaced.
const driver = vi.hoisted(() => ({ current: null as null | { clock: MissionClock | StoryClock; playing: boolean; onReady: () => void } }));
const voice = vi.hoisted(() => ({ speaking: false, listeners: new Set<() => void>(), unlock: vi.fn(), update: vi.fn() }));
vi.mock('next/dynamic', async () => {
    const { useEffect } = await import('react');
    return { default: () => function Canvas(props: NonNullable<typeof driver.current>) {
        driver.current = props;
        useEffect(() => { props.onReady(); }, [props.onReady]);
        return null;
    } };
});
vi.mock('./device', () => ({
    useMedia: () => false, useNoWebGL: () => false, usePageVisible: () => true,
    usePresence: () => ({ near: true, onScreen: true }), useReducedMotion: () => false, useStageQuality: () => 'low',
}));
vi.mock('../solar-system/narrator', async (original) => ({
    ...await original<typeof import('../solar-system/narrator')>(),
    narrator: {
        get speaking() { return voice.speaking; }, position: null, on: true,
        unlock: voice.unlock, update: voice.update, setVolume: vi.fn(), setEnabled: vi.fn(), dispose: vi.fn(),
        onChange: (fn: () => void) => { voice.listeners.add(fn); return () => { voice.listeners.delete(fn); }; },
    },
}));
vi.mock('../solar-system/sound', () => ({ missionSound: { on: true, enable: vi.fn(), disable: vi.fn(), setVolume: vi.fn(), setActive: vi.fn(), onChange: () => () => {} } }));
const launch: LaunchSettings = { fullscreen: false, sound: true, voice: true, captions: true, volume: 100, autoplay: true, autonext: true };
const { chapters } = journey();

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'] });
    Element.prototype.scrollIntoView = () => {};
    voice.speaking = false;
    voice.unlock.mockClear();
    voice.update.mockClear();
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    driver.current = null;
});
const advance = (seconds: number) => act(() => {
    if (driver.current?.playing) driver.current.clock.advance(seconds);
});
const finish = () => advance((driver.current!.clock as MissionClock).duration);
const speaking = (value: boolean) => act(() => { voice.speaking = value; voice.listeners.forEach(fn => fn()); });
const recap = () => {
    const seconds = Number(screen.getByText(/continues in \d+ s/).textContent!.match(/\d+/)![0]);
    act(() => vi.advanceTimersByTime(seconds * 1000));
};
function solar(settings = launch) {
    const launchRef = { current: null as (() => void) | null };
    render(<StrictMode><SolarSystemExperience launch={settings} launchRef={launchRef} /></StrictMode>);
    act(() => launchRef.current!());
}
function eps(settings = launch) {
    const launchRef = { current: null as (() => void) | null };
    render(<EpsExperience launch={settings} launchRef={launchRef} />);
    act(() => launchRef.current!());
}

describe('Sequential deep-link playback', () => {
    it('plays all Solar System chapters exactly once, waits for narration, then holds the completed summary', () => {
        solar();
        expect(voice.unlock).toHaveBeenCalledTimes(1);
        const clocks = new Set();
        for (const chapter of chapters) {
            expect(screen.getByRole('heading', { name: chapter.title })).toBeInTheDocument();
            expect(driver.current!.clock.time).toBe(0);
            clocks.add(driver.current!.clock);
            speaking(true);
            finish();
            act(() => vi.advanceTimersByTime(60_000));
            expect(screen.queryByText(/continues in/)).toBeNull();
            expect(screen.getByRole('heading', { name: chapter.title })).toBeInTheDocument();
            speaking(false);
            recap();
        }
        expect(clocks.size).toBe(chapters.length);
        expect(document.querySelector('[data-mode="finale"]')).not.toBeNull();
        speaking(true);
        finish();
        expect(driver.current!.playing).toBe(true); // final narration may outlast the picture
        speaking(false);
        expect(driver.current!.playing).toBe(false);
        const finalClock = driver.current!.clock;
        advance(10_000);
        act(() => vi.advanceTimersByTime(60_000));
        expect(driver.current!.clock).toBe(finalClock);
        expect(document.querySelector('[data-mode="finale"]')).not.toBeNull();
        expect(voice.update).toHaveBeenCalledWith(expect.objectContaining({ done: true }));
    });

    it('continues from a manual Solar stage, honors pause/resume, and cancels the previous recap transition', () => {
        solar();
        finish();
        expect(screen.getByText(/continues in/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: `Stage ${chapters[7].number}: ${chapters[7].title}` }));
        act(() => vi.advanceTimersByTime(60_000));
        expect(screen.getByRole('heading', { name: chapters[7].title })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
        advance(10_000);
        expect(driver.current!.clock.time).toBe(0);
        fireEvent.click(screen.getByRole('button', { name: `Stage ${chapters[8].number}: ${chapters[8].title}` }));
        expect(driver.current!.playing).toBe(false);
        fireEvent.click(screen.getByRole('button', { name: 'Play' }));
        finish();
        fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
        act(() => vi.advanceTimersByTime(60_000));
        expect(screen.getByRole('heading', { name: chapters[8].title })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Play' }));
        recap();
        expect(screen.getByRole('heading', { name: chapters[9].title })).toBeInTheDocument();
    });

    it('holds a completed Solar stage with autonext=0', () => {
        solar({ ...launch, autonext: false });
        finish();
        act(() => vi.advanceTimersByTime(60_000));
        expect(screen.queryByText(/continues in/)).toBeNull();
        expect(screen.getByRole('heading', { name: chapters[0].title })).toBeInTheDocument();
    });

    it('waits for Play when autoplay=0, then continues the existing guided mission', () => {
        solar({ ...launch, autoplay: false });
        finish();
        expect(driver.current!.clock.time).toBe(0);
        expect(screen.queryByText(/continues in/)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Play' }));
        finish();
        recap();
        expect(screen.getByRole('heading', { name: chapters[1].title })).toBeInTheDocument();
    });

    it('keeps normal manually selected Solar chapters non-guided', () => {
        render(<SolarSystemExperience />);
        fireEvent.click(screen.getByRole('button', { name: `Stage ${chapters[0].number}: ${chapters[0].title}` }));
        finish();
        act(() => vi.advanceTimersByTime(60_000));
        expect(screen.queryByText(/continues in/)).toBeNull();
        expect(screen.getByRole('heading', { name: chapters[0].title })).toBeInTheDocument();
    });

    it.each(EXPERIENCES)('plays $id stages once, preserves pause and fullscreen exit, then stops on the last stage', (experience) => {
        window.history.replaceState(null, '', `/?space_digital_twin=${Number(experience.number)}&fullscreen=0`);
        render(<SpaceTwinViewer />);
        const clock = driver.current!.clock as StoryClock;
        expect(driver.current!.playing).toBe(true);
        for (const [i, stage] of experience.story.stages.entries()) {
            expect(clock.stage).toBe(i);
            expect(clock.done).toBe(false);
            advance(stage.seconds / 2);
            fireEvent.click(screen.getByRole('button', { name: 'Pause the animation' }));
            const time = clock.time;
            advance(100);
            expect(clock.time).toBe(time);
            fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));
            fireEvent.keyDown(document, { key: 'Escape' });
            expect(clock.time).toBe(time);
            fireEvent.click(screen.getByRole('button', { name: 'Play the animation' }));
            advance(stage.seconds / 2 + 1e-9);
        }
        expect(clock.done).toBe(true);
        expect(clock.stage).toBe(experience.story.stages.length - 1);
        expect(driver.current!.playing).toBe(false);
        const end = clock.time;
        advance(100);
        expect(clock.time).toBe(end);
        expect(screen.getByRole('tab', { name: experience.label })).toHaveAttribute('aria-selected', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'Replay from the start' }));
        expect(clock.time).toBe(0);
        expect(driver.current!.playing).toBe(true);
    });

    it.each(EXPERIENCES)('holds $id at stage boundaries with autonext=0, and supports manual selection', (experience) => {
        window.history.replaceState(null, '', `/?space_digital_twin=${Number(experience.number)}&fullscreen=0&autonext=0`);
        render(<SpaceTwinViewer />);
        const clock = driver.current!.clock as StoryClock;
        advance(experience.story.loopSeconds * 2);
        expect(clock.stage).toBe(0);
        expect(driver.current!.playing).toBe(false);
        fireEvent.click(within(screen.getByRole('group', { name: `${experience.label} stages` })).getAllByRole('button')[2]);
        expect(clock.stage).toBe(2);
        expect(driver.current!.playing).toBe(true);
        advance(experience.story.loopSeconds * 2);
        expect(clock.stage).toBe(2);
        expect(clock.done).toBe(true);
    });

    it('keeps the normal homepage story looping and does not apply launch settings to another experience', () => {
        render(<SpaceTwinViewer />);
        const clock = driver.current!.clock as StoryClock;
        advance(EXPERIENCES[0].story.loopSeconds + 1);
        expect(clock.done).toBe(false);
        expect(clock.time).toBeCloseTo(1);
        cleanup();
        window.history.replaceState(null, '', '/?space_digital_twin=1&fullscreen=0');
        render(<SpaceTwinViewer />);
        fireEvent.click(screen.getByRole('tab', { name: EXPERIENCES[1].label }));
        act(() => vi.advanceTimersByTime(1000));
        const nextClock = driver.current!.clock as StoryClock;
        advance(EXPERIENCES[1].story.loopSeconds + 1);
        expect(nextClock.done).toBe(false);
        expect(nextClock.time).toBeCloseTo(1);
    });

    it('plays every EPS guided step once and holds its final summary', () => {
        eps();
        for (const step of GUIDED) {
            expect(screen.getByRole('heading', { name: step.scene.title })).toBeInTheDocument();
            expect(driver.current!.clock.time).toBe(0);
            advance(step.scene.seconds);
        }
        expect(screen.getByRole('heading', { name: GUIDED.at(-1)!.scene.title })).toBeInTheDocument();
        expect(driver.current!.playing).toBe(false);
        const endClock = driver.current!.clock;
        advance(10_000);
        expect(driver.current!.clock).toBe(endClock);
    });

    it('continues EPS from a manually selected subsystem without overriding pause', () => {
        eps();
        fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
        fireEvent.click(screen.getByRole('button', { name: 'Subsystems' }));
        fireEvent.click(screen.getByRole('button', { name: LABELS[3].title }));
        expect(driver.current!.playing).toBe(false);
        fireEvent.click(screen.getByRole('button', { name: 'Play' }));
        advance(LABELS[3].seconds);
        expect(screen.getByRole('heading', { name: LABELS[4].title })).toBeInTheDocument();
    });

    it('holds the selected EPS step when autonext=0', () => {
        eps({ ...launch, autonext: false });
        advance(GUIDED[0].scene.seconds * 2);
        expect(driver.current!.playing).toBe(false);
        expect(screen.getByRole('heading', { name: GUIDED[0].scene.title })).toBeInTheDocument();
    });
});
