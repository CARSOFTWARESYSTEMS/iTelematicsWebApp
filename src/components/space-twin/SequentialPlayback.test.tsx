import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { StrictMode } from 'react';
import SpaceTwinViewer from './SpaceTwinViewer';
import SolarSystemExperience from '../solar-system/SolarSystemExperience';
import EpsExperience from '../station-eps/EpsExperience';
import { EXPERIENCES } from '@/lib/space-twin/experiences';
import { GUIDED } from '@/lib/station-eps/scenes';
import { journey } from '@/lib/solar-system/phaseB';
import type { MissionClock } from '@/lib/solar-system/clock';
import type { StoryClock } from '@/lib/space-twin/story';
import type { LaunchSettings } from '@/lib/space-twin/launch';

// Shareable links play every stage in order. These tests drive the real experiences, registries and clocks;
// only the 3D canvas (a stand-in that advances the clock it is given while playing) and audio are replaced.
const scene = vi.hoisted(() => ({ current: null as null | { clock: MissionClock | StoryClock; playing: boolean; onReady: () => void } }));
const voice = vi.hoisted(() => ({ speaking: false, listeners: new Set<() => void>(), unlock: vi.fn(), setEnabled: vi.fn() }));
vi.mock('next/dynamic', async () => {
    const { useEffect } = await import('react');
    return {
        default: () =>
            function Canvas(props: NonNullable<typeof scene.current>) {
                scene.current = props;
                useEffect(() => props.onReady(), [props.onReady]);
                return null;
            },
    };
});
vi.mock('./device', () => ({
    useMedia: () => false,
    useNoWebGL: () => false,
    usePageVisible: () => true,
    usePresence: () => ({ near: true, onScreen: true }),
    useReducedMotion: () => false,
    useStageQuality: () => 'low',
}));
vi.mock('../solar-system/narrator', async (original) => ({
    ...(await original<typeof import('../solar-system/narrator')>()),
    narrator: {
        get speaking() {
            return voice.speaking;
        },
        position: null,
        on: true,
        unlock: voice.unlock,
        update: () => {},
        setVolume: () => {},
        setEnabled: voice.setEnabled,
        dispose: () => {},
        onChange: (fn: () => void) => {
            voice.listeners.add(fn);
            return () => voice.listeners.delete(fn);
        },
    },
}));
vi.mock('../solar-system/sound', () => ({ missionSound: { on: false, enable: vi.fn(), disable: vi.fn(), setVolume: vi.fn(), setActive: vi.fn(), duck: vi.fn(), onChange: () => () => {} } }));

// Frame-by-frame playback through whole missions: allow more than the default 5 s per test on a busy machine.
vi.setConfig({ testTimeout: 20_000 });

const LINK: LaunchSettings = { fullscreen: false, sound: true, voice: true, captions: true, volume: 100, autoplay: true, autonext: true };
const { chapters } = journey();

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'] });
    Element.prototype.scrollIntoView = () => {};
    window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
    voice.speaking = false;
    voice.unlock.mockClear();
    voice.setEnabled.mockClear();
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    scene.current = null;
});

/** Plays `seconds` of story time, frame by frame as the scene would (only while it is playing; React renders between frames). */
const play = (seconds: number, frame = 0.25) => {
    for (let t = 0; t < seconds; t += frame)
        act(() => {
            if (scene.current?.playing) scene.current.clock.advance(frame);
        });
};

describe('shareable links: the four story experiences', () => {
    const stageNow = () => Number(screen.getByText(/, stage \d of 4:/).textContent!.match(/stage (\d) of 4/)![1]);

    it.each(EXPERIENCES.map((e) => [e.number, e.label, e] as const))('%s %s plays each stage once, in order, then holds the end', (number, _label, exp) => {
        window.history.replaceState(null, '', `/?space_digital_twin=${Number(number)}&fullscreen=0`);
        render(<SpaceTwinViewer />);
        // Silent and not full screen: no click needed, it starts at stage 1.
        expect(screen.queryByRole('button', { name: /Start Mission/ })).toBeNull();
        expect(stageNow()).toBe(1);
        const seen = [1];
        for (let i = 0; i < 400 && !(scene.current!.clock as StoryClock).ended; i++) {
            play(1);
            if (seen[seen.length - 1] !== stageNow()) seen.push(stageNow());
        }
        expect(seen).toEqual(exp.story.stages.map((_, i) => i + 1));
        expect(screen.getByRole('button', { name: 'Play the animation' })).toBeInTheDocument();
        const held = scene.current!.clock.time;
        play(30);
        expect(scene.current!.clock.time).toBe(held);
        expect(stageNow()).toBe(4);
        // Play at the end starts the mission over.
        fireEvent.click(screen.getByRole('button', { name: 'Play the animation' }));
        expect(stageNow()).toBe(1);
        expect(screen.getByRole('button', { name: 'Pause the animation' })).toBeInTheDocument();
    });

    it('carries on in order from a stage the visitor picks, and pause stops it', () => {
        window.history.replaceState(null, '', '/?space_digital_twin=2&fullscreen=0');
        render(<SpaceTwinViewer />);
        play(2);
        fireEvent.click(within(screen.getByRole('group', { name: 'Orbital Constellation stages' })).getAllByRole('button')[2]);
        expect(stageNow()).toBe(3);
        fireEvent.click(screen.getByRole('button', { name: 'Pause the animation' }));
        const t = scene.current!.clock.time;
        play(60);
        expect(scene.current!.clock.time).toBe(t);
        fireEvent.click(screen.getByRole('button', { name: 'Play the animation' }));
        play(400);
        expect(stageNow()).toBe(4);
        expect((scene.current!.clock as StoryClock).ended).toBe(true);
    });

    it('autonext=0 plays one stage: the first, then the one the visitor picks', () => {
        window.history.replaceState(null, '', '/?space_digital_twin=1&fullscreen=0&autonext=0');
        render(<SpaceTwinViewer />);
        play(400);
        expect(stageNow()).toBe(1);
        expect(screen.getByRole('button', { name: 'Play the animation' })).toBeInTheDocument();
        fireEvent.click(within(screen.getByRole('group', { name: 'Satellite stages' })).getAllByRole('button')[2]);
        play(400);
        expect(stageNow()).toBe(3);
    });

    it('picking another experience ends the link: that one loops as normal', () => {
        window.history.replaceState(null, '', '/?space_digital_twin=1&fullscreen=0');
        render(<SpaceTwinViewer />);
        fireEvent.click(screen.getByRole('tab', { name: /Spacecraft/ }));
        act(() => vi.advanceTimersByTime(1000));
        const loop = EXPERIENCES.find((e) => e.id === 'spacecraft')!.story.loopSeconds;
        play(loop + 5);
        expect((scene.current!.clock as StoryClock).ended).toBe(false);
        expect(scene.current!.clock.time).toBeCloseTo(5, 5);
    });
});

describe('shareable links: Solar System', () => {
    const stageText = () => document.querySelector('[class*="whereNum"]')!.textContent;
    // The mission clock stops at its end (it never wraps), so a stage can finish in one step.
    const finish = () =>
        act(() => {
            if (scene.current?.playing) scene.current.clock.advance((scene.current.clock as MissionClock).duration + 1);
        });
    const speaking = (on: boolean) =>
        act(() => {
            voice.speaking = on;
            voice.listeners.forEach((fn) => fn());
        });
    function open(settings: LaunchSettings = LINK) {
        let start: (() => void) | undefined;
        render(
            <StrictMode>
                <SolarSystemExperience link={settings} onLinkReady={(s) => (start = s)} />
            </StrictMode>,
        );
        return () => act(() => start!());
    }

    it('waits at Stage 01 for the click, then plays all twelve stages in order, each after its narration, and ends on the summary', () => {
        const start = open();
        expect(stageText()).toBe('Stage 01 of 12');
        expect(scene.current!.playing).toBe(false);
        play(30);
        expect(scene.current!.clock.time).toBe(0);
        start();
        expect(voice.unlock).toHaveBeenCalled();
        expect(scene.current!.playing).toBe(true);
        const clocks = new Set();
        for (const chapter of chapters) {
            expect(stageText()).toBe(`Stage ${chapter.number} of 12`);
            expect(scene.current!.clock.time).toBe(0);
            clocks.add(scene.current!.clock);
            // The picture ends while the narrator is still speaking: nothing moves on until the line ends.
            speaking(true);
            finish();
            act(() => vi.advanceTimersByTime(60_000));
            expect(stageText()).toBe(`Stage ${chapter.number} of 12`);
            expect(screen.queryByText(/continues in/)).toBeNull();
            speaking(false);
            expect(screen.getByText(/continues in/)).toBeInTheDocument();
            act(() => vi.advanceTimersByTime(13_000));
        }
        expect(clocks.size).toBe(chapters.length);
        expect(document.querySelector('[data-mode="finale"]')).not.toBeNull();
        finish();
        act(() => vi.advanceTimersByTime(60_000));
        // It stops there: no other experience, no loop back to Stage 01.
        expect(document.querySelector('[data-mode="finale"]')).not.toBeNull();
    }, 30_000);

    it('carries on in order from a stage the visitor picks; pause holds it', () => {
        const start = open();
        start();
        finish();
        fireEvent.click(screen.getByRole('button', { name: `Stage ${chapters[7].number}: ${chapters[7].title}` }));
        expect(stageText()).toBe(`Stage ${chapters[7].number} of 12`);
        fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
        play(60);
        expect(scene.current!.clock.time).toBe(0);
        fireEvent.click(screen.getByRole('button', { name: 'Play' }));
        finish();
        act(() => vi.advanceTimersByTime(13_000));
        expect(stageText()).toBe(`Stage ${chapters[8].number} of 12`);
    });

    it('autonext=0 stops after Stage 01 with its recap and no countdown', () => {
        const start = open({ ...LINK, autonext: false });
        start();
        finish();
        act(() => vi.advanceTimersByTime(60_000));
        expect(stageText()).toBe('Stage 01 of 12');
        expect(screen.queryByText(/continues in/)).toBeNull();
    });

    it('autoplay=0 opens Stage 01 paused after the click', () => {
        const start = open({ ...LINK, autoplay: false });
        start();
        expect(scene.current!.playing).toBe(false);
        expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    });

    it('voice and subtitles follow the link for this visit without storing anything', () => {
        localStorage.setItem('solar-voice', 'off');
        localStorage.setItem('solar-captions', 'off');
        open({ ...LINK, voice: true, captions: true });
        expect(voice.setEnabled).toHaveBeenLastCalledWith(true);
        expect(screen.getByRole('button', { name: 'Voice narration on' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Subtitles on' })).toBeInTheDocument();
        expect(localStorage.getItem('solar-voice')).toBe('off');
        cleanup();
        open({ ...LINK, sound: false });
        expect(voice.setEnabled).toHaveBeenLastCalledWith(false);
        expect(screen.getByRole('button', { name: 'Voice narration off' })).toBeInTheDocument();
    });
});

describe('shareable links: Station Power & Energy', () => {
    const caption = () => document.querySelector('[class*="titleNum"]')!.textContent;
    function open(settings: LaunchSettings = LINK) {
        let start: (() => void) | undefined;
        render(<EpsExperience link={settings} onLinkReady={(s) => (start = s)} />);
        return () => act(() => start!());
    }

    it('plays the guided investigation step by step, then ends on the overview, as Start Investigation does', () => {
        const start = open();
        expect(scene.current!.playing).toBe(false);
        start();
        for (let i = 0; i < GUIDED.length; i++) {
            expect(caption()).toBe(`${i + 1} / ${GUIDED.length} · ${GUIDED[i].caption}`);
            play(GUIDED[i].scene.seconds + 0.5);
        }
        expect(caption()).toBe('Overview');
    });

    it('autonext=0 holds the end of the first step', () => {
        const start = open({ ...LINK, autonext: false });
        start();
        play(GUIDED[0].scene.seconds + 30);
        expect(caption()).toBe(`1 / ${GUIDED.length} · ${GUIDED[0].caption}`);
    });
});
