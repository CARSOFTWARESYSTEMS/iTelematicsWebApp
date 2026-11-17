/**
 * Story infrastructure shared by the four Space Digital Twin experiences, generalised
 * from the "Learn to Protect Missions" showcase: a looping clock split into four stages and finer
 * phases, a smooth periodic camera path through keyframes, and the heads-up model the overlay
 * renders. Pure data and functions, so the scenes (inside the canvas), the overlays (outside it)
 * and the unit tests all read the same values.
 */

export interface Stage {
    id: string;
    label: string;
    title: string;
    start: number;
    seconds: number;
}

export interface Phase {
    id: string;
    stage: number;
    start: number;
}

export interface StoryShape {
    stages: readonly Stage[];
    phases: readonly Phase[];
    loopSeconds: number;
}

export const wrap = (t: number, loop: number) => ((t % loop) + loop) % loop;

export const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export function phaseIndexAt(story: StoryShape, t: number): number {
    const x = wrap(t, story.loopSeconds);
    let i = 0;
    for (let k = 0; k < story.phases.length; k++) if (x >= story.phases[k].start) i = k;
    return i;
}

/**
 * The story's clock. `time` loops through the stages; `elapsed` counts every second played since
 * the last replay and never jumps back at the loop, so continuous physics (orbits, Earth rotation)
 * stays continuous. The scene advances it once per rendered frame; the overlays subscribe.
 */
export class StoryClock {
    private t = 0;
    private total = 0;
    private sinceTick = 0;
    private phaseListeners = new Set<(phase: number) => void>();
    private tickListeners = new Set<() => void>();
    private requestFrame: () => void = () => {};
    private stopAt: number | null = null;

    constructor(readonly story: StoryShape, private readonly tickSeconds = 0.2) {}

    get time() {
        // Hold the completed scene on its last sample, rather than wrapping into the next stage.
        return this.done ? Math.max(0, this.t - Math.max(1, this.t) * Number.EPSILON * 4) : this.t;
    }

    /** Optional launch-only boundary. Normal stories keep their existing continuous loop. */
    setStopAt(seconds: number | null) {
        this.stopAt = seconds;
    }

    get done() {
        return this.stopAt !== null && this.t >= this.stopAt;
    }

    get elapsed() {
        return this.total;
    }

    get phase() {
        return phaseIndexAt(this.story, this.time);
    }

    get stage() {
        return this.story.phases[this.phase].stage;
    }

    onPhase(fn: (phase: number) => void) {
        this.phaseListeners.add(fn);
        return () => {
            this.phaseListeners.delete(fn);
        };
    }

    /** Throttled updates for overlays: a few per second of real time, never once per frame. */
    onTick(fn: () => void) {
        this.tickListeners.add(fn);
        return () => {
            this.tickListeners.delete(fn);
        };
    }

    setFrameRequester(fn: () => void) {
        this.requestFrame = fn;
    }

    private emitPhase() {
        const p = this.phase;
        this.phaseListeners.forEach((fn) => fn(p));
    }

    private emitTick() {
        this.sinceTick = 0;
        this.tickListeners.forEach((fn) => fn());
    }

    /** Moves the story on by `seconds` of story time (callers clamp large frame gaps). */
    advance(seconds: number) {
        if (seconds <= 0 || this.done) return;
        const before = this.phase;
        const step = this.stopAt === null ? seconds : Math.min(seconds, this.stopAt - this.t);
        this.t = this.stopAt === null ? wrap(this.t + step, this.story.loopSeconds) : this.t + step;
        this.total += step;
        this.sinceTick += step;
        if (this.phase !== before || this.done) {
            this.emitPhase();
            this.emitTick();
        } else if (this.sinceTick >= this.tickSeconds) this.emitTick();
    }

    jumpToStage(index: number) {
        const target = this.story.stages[index].start + 0.001;
        // Moving forward keeps `elapsed` continuous; jumping back counts as the time it skips.
        this.total += wrap(target - this.t, this.story.loopSeconds);
        this.t = target;
        this.emitPhase();
        this.emitTick();
        this.requestFrame();
    }

    /** Back to the very start, with the simulation in its initial state: the replay is identical. */
    replay() {
        this.t = 0;
        this.total = 0;
        this.emitPhase();
        this.emitTick();
        this.requestFrame();
    }
}

// ── Camera ──────────────────────────────────────────────────────────────────

/** A camera view: azimuth and elevation in degrees, distance as a multiple of the fitted distance, and the point looked at. */
export interface View {
    az: number;
    el: number;
    dist: number;
    target: readonly [number, number, number];
}

export interface CameraKey {
    t: number;
    v: View;
}

/** Periodic cubic Hermite (Catmull-Rom tangents) through looping keyframes: smooth, and continuous across the loop. */
function hermite(keys: readonly CameraKey[], loop: number, t: number, pick: (v: View) => number) {
    const n = keys.length;
    const x = wrap(t, loop);
    let i = 0;
    for (let k = 0; k < n; k++) if (x >= keys[k].t) i = k;
    const at = (k: number) => {
        const j = ((k % n) + n) % n;
        const loops = Math.floor(k / n);
        return { t: keys[j].t + loops * loop, v: pick(keys[j].v) };
    };
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const h = p2.t - p1.t;
    const m1 = ((p2.v - p0.v) / (p2.t - p0.t)) * h;
    const m2 = ((p3.v - p1.v) / (p3.t - p1.t)) * h;
    const s = (x - p1.t) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * p1.v + (s3 - 2 * s2 + s) * m1 + (-2 * s3 + 3 * s2) * p2.v + (s3 - s2) * m2;
}

export function cameraPath(keys: readonly CameraKey[], loop: number) {
    return (t: number): View => ({
        az: hermite(keys, loop, t, (v) => v.az),
        el: hermite(keys, loop, t, (v) => v.el),
        dist: hermite(keys, loop, t, (v) => v.dist),
        target: keys[0].v.target,
    });
}

/** Camera distance that fits a model of this span in a frame of this aspect (34° vertical field of view). */
export function fitDistance(aspect: number, span: number) {
    return span * 1.6 * Math.min(1.9, Math.max(1, 1.3 / aspect));
}

// ── Heads-up display ────────────────────────────────────────────────────────

/** The site's semantic colours: each hue means one thing. */
export type Tone = 'telemetry' | 'solar' | 'orbit' | 'nominal' | 'fault';

export type HealthState = 'NOMINAL' | 'WARNING' | 'FAULT';

export interface HudRow {
    label: string;
    value: string;
    note?: string;
    tone?: Tone;
}

export interface Hud {
    rows: HudRow[];
    mode?: { label: string; tone: Tone };
    health?: { name: string; state: HealthState }[];
    /** What the scenario is doing, said plainly (e.g. the injected fault); not a telemetry value. */
    note?: string;
    alert?: boolean;
}

/** A selectable part of a model: a short name for the button and one line of explanation. */
export interface Part {
    id: string;
    name: string;
    short: string;
    line: string;
}

/** A pinned label on the model, in words (colour is never the only signal). */
export interface Chip {
    id: string;
    text: string;
    alert?: boolean;
}

export const fmt = (v: number, digits = 1) => v.toFixed(digits);
export const signed = (v: number, digits = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}`;

/** T+hh:mm of simulated mission time. */
export function missionClock(minutes: number) {
    const m = Math.max(0, Math.floor(minutes));
    return `T+${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
