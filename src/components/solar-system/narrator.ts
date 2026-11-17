'use client';
/**
 * Voice narration player for the Solar System experience.
 *
 * The narration is driven by the mission clock, never by its own timer: each line (lib/solar-system/
 * narration.ts) is anchored to a story time in its programme, and on every clock tick the player works out
 * which line should be speaking and where in it, then starts, pauses, seeks or stops one audio element to
 * match. So pause, resume, replay, seeking, previous/next, topics and returning to the mission all stay in
 * step, and two lines can never overlap. At the end of a programme a line still speaking is allowed to
 * finish (the experience waits for it before moving on).
 *
 * Audio is static (generated once by tools/narration), loaded one line at a time with the next one
 * preloaded. Browsers allow sound only after a click: unlock() runs on the visitor's first click. Errors
 * (offline, decoding) are swallowed: the subtitles and the 3D mission carry on.
 */
import manifest from '@/lib/solar-system/narration-manifest.json';
import { narrationScript } from '@/lib/solar-system/narration';
import { missionSound } from './sound';

export interface Cue {
    id: string;
    at: number;
    duration: number;
    src: string;
    /** [start, end, text] in seconds from the start of the line. */
    phrases: [number, number, string][];
}

type ManifestCue = { src: string; duration: number; phrases: [number, number, string][] };
const CUES = (manifest as unknown as { cues: Record<string, ManifestCue> }).cues;

const byProgram = new Map<string, Cue[]>();
/** The lines of a programme ('chapter:<id>', 'topic:<label id>' or 'finale'), in order. */
export function cuesFor(program: string | null): Cue[] {
    if (!program) return [];
    let list = byProgram.get(program);
    if (!list) {
        list = narrationScript()
            .filter((l) => l.program === program && CUES[l.id])
            .map((l) => ({ id: l.id, at: l.at, ...CUES[l.id] }))
            .sort((a, b) => a.at - b.at);
        byProgram.set(program, list);
    }
    return list;
}

/** Duration (s) of a topic's narration, for sizing its programme. */
export const topicNarrationSeconds = (labelId: string) => cuesFor(`topic:${labelId}`).reduce((a, c) => Math.max(a, c.at + c.duration), 0);

/** The line that should be speaking at story time t, and the position in it. */
export function activeCue(cues: readonly Cue[], t: number): { cue: Cue; offset: number } | null {
    for (let i = cues.length - 1; i >= 0; i--) {
        const c = cues[i];
        if (t >= c.at) return t < c.at + c.duration ? { cue: c, offset: t - c.at } : null;
    }
    return null;
}

/** The subtitle at a position in a line (held briefly after it is spoken, until the next phrase). */
export function phraseAt(cue: Cue, offset: number): string | null {
    for (let i = cue.phrases.length - 1; i >= 0; i--) {
        const [t0, t1, text] = cue.phrases[i];
        if (offset >= t0 - 0.05) return offset <= t1 + 1.2 ? text : null;
    }
    return null;
}

/** play() without trusting the browser: older ones return nothing, and any failure must stay silent. */
function play(a: HTMLAudioElement, then?: () => void) {
    try {
        const p = a.play() as Promise<void> | undefined;
        if (p && typeof p.then === 'function') p.then(() => then?.()).catch(() => {});
        else then?.();
    } catch {
        /* playback unavailable: subtitles carry on */
    }
}

function pause(a: HTMLAudioElement) {
    try {
        a.pause();
    } catch {
        /* nothing to pause */
    }
}

const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

class Narrator {
    private audio: HTMLAudioElement | null = null;
    private preload: HTMLAudioElement | null = null;
    private enabled = true;
    private volume = 1;
    private cueId: string | null = null;
    private endedId: string | null = null;
    private failed = new Set<string>();
    private lastTime = 0;
    private lastSeeks = -1;
    private listeners = new Set<() => void>();

    /** Voice on (the visitor's choice; remembered by the experience). */
    get on() {
        return this.enabled;
    }

    /** True while a line is audibly playing. */
    get speaking() {
        return !!this.audio && !this.audio.paused && !this.audio.ended && this.cueId !== null;
    }

    /** The line playing and the position in it (s), for subtitles while the clock holds at the end. */
    get position(): { id: string; t: number } | null {
        return this.speaking && this.cueId ? { id: this.cueId, t: this.audio!.currentTime } : null;
    }

    onChange(fn: () => void) {
        this.listeners.add(fn);
        return () => {
            this.listeners.delete(fn);
        };
    }

    private notify() {
        this.listeners.forEach((fn) => fn());
    }

    private element() {
        if (this.audio || typeof window === 'undefined') return this.audio;
        const a = new Audio();
        a.volume = this.volume;
        a.preload = 'auto';
        (a as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
        const changed = () => {
            missionSound.duck(this.speaking);
            this.notify();
        };
        a.addEventListener('play', changed);
        a.addEventListener('pause', changed);
        a.addEventListener('timeupdate', () => this.notify());
        a.addEventListener('ended', () => {
            this.endedId = this.cueId;
            changed();
        });
        a.addEventListener('error', () => {
            if (this.cueId && a.src && !a.src.startsWith('data:')) this.failed.add(this.cueId);
            changed();
        });
        this.audio = a;
        this.preload = new Audio();
        this.preload.preload = 'auto';
        return a;
    }

    /** On a click: lets the browser play narration later without a gesture. */
    unlock() {
        const a = this.element();
        if (!a || this.cueId) return;
        a.src = SILENCE;
        play(a, () => pause(a));
    }

    setEnabled(on: boolean) {
        this.enabled = on;
        if (!on && this.audio) pause(this.audio);
        this.notify();
    }

    /** Launch volume uses the same narration element and synchronization. */
    setVolume(volume: number) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.audio) this.audio.volume = this.volume;
    }

    /**
     * Follows the mission clock: `time` in story seconds of the programme whose lines are `cues`; `done`
     * when the clock has reached the end (a line still speaking then finishes on its own).
     */
    update({ cues, time, playing, rate, done, seeks }: { cues: readonly Cue[]; time: number; playing: boolean; rate: number; done: boolean; seeks: number }) {
        const a = this.audio;
        // A jump (seek, replay) or going back in time may replay a line that had finished.
        if (seeks !== this.lastSeeks || time < this.lastTime - 0.5) this.endedId = null;
        this.lastSeeks = seeks;
        this.lastTime = time;
        const now = activeCue(cues, time);
        // Held at the end of the programme, the last line keeps speaking past the clock.
        const holding = done && !!a && this.speaking && cues.some((c) => c.id === this.cueId);
        if (!this.enabled || !a || (!now && !holding)) {
            if (a && !a.paused && !holding) pause(a);
            if (!now) this.cueId = holding ? this.cueId : null;
            return;
        }
        if (holding && (!now || now.cue.id === this.cueId)) {
            if (!playing) pause(a);
            return;
        }
        const { cue, offset } = now!;
        if (this.failed.has(cue.id) || this.endedId === cue.id) return;
        if (this.cueId !== cue.id) {
            this.cueId = cue.id;
            a.src = cue.src;
            const next = cues[cues.indexOf(cue) + 1];
            if (next && this.preload) this.preload.src = next.src;
        }
        a.playbackRate = rate;
        if (!playing) {
            if (!a.paused) pause(a);
            return;
        }
        if (a.paused) {
            try {
                a.currentTime = offset;
            } catch {
                /* not loaded yet: starts from the beginning of the line */
            }
            play(a);
        } else if (!done && Math.abs(a.currentTime - offset) > 0.45) {
            a.currentTime = offset;
        }
    }

    /** Stops speaking (another programme, the experience closing). */
    stop() {
        if (this.audio) pause(this.audio);
        this.cueId = null;
        this.endedId = null;
        missionSound.duck(false);
        this.notify();
    }

    /** Releases the audio elements (the experience unmounted). */
    dispose() {
        this.stop();
        for (const el of [this.audio, this.preload]) {
            if (!el) continue;
            el.removeAttribute('src');
            try {
                el.load();
            } catch {
                /* released */
            }
        }
        this.audio = null;
        this.preload = null;
    }

    /** Development: state for end-to-end checks. */
    debug() {
        const a = this.audio;
        return { on: this.enabled, cue: this.cueId, paused: a ? a.paused : true, t: a ? +a.currentTime.toFixed(2) : 0, rate: a?.playbackRate ?? 1, src: a?.src?.split('/').pop() ?? null, failed: [...this.failed] };
    }
}

export const narrator = new Narrator();

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') (window as Window & { __solarVoice?: () => unknown }).__solarVoice = () => narrator.debug();
