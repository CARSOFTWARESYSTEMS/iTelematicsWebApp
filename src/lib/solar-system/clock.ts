/**
 * The Solar System experience's own clock (isolated from the other Space Digital Twin experiences):
 * plays a programme of segments once, mapping story time onto mission elapsed time. The canvas
 * advances it every frame; the panel listens to a few throttled ticks per second.
 */
import { locate, storySeconds, type Segment } from './mission';

export class MissionClock {
    private t = 0;
    private sinceTick = 0;
    private program: readonly Segment[];
    private total: number;
    private ticks = new Set<() => void>();
    private requestFrame: () => void = () => {};
    /** Incremented by seek(): the scene cuts (no camera blend) after a jump. */
    seeks = 0;

    constructor(program: readonly Segment[], private readonly tickSeconds = 0.2) {
        this.program = program;
        this.total = storySeconds(program);
    }

    get time() {
        return this.t;
    }

    get duration() {
        return this.total;
    }

    get done() {
        return this.t >= this.total - 1e-6;
    }

    get progress() {
        return this.total > 0 ? this.t / this.total : 1;
    }

    get location() {
        return locate(this.program, this.t);
    }

    get met() {
        return this.location.met;
    }

    get segments() {
        return this.program;
    }

    onTick(fn: () => void) {
        this.ticks.add(fn);
        return () => {
            this.ticks.delete(fn);
        };
    }

    setFrameRequester(fn: () => void) {
        this.requestFrame = fn;
    }

    private emit() {
        this.sinceTick = 0;
        this.ticks.forEach((fn) => fn());
    }

    /** Moves the programme on by `seconds` of story time; stops at the end. */
    advance(seconds: number) {
        if (seconds <= 0 || this.done) return;
        const before = this.location.index;
        this.t = Math.min(this.total, this.t + seconds);
        this.sinceTick += seconds;
        if (this.location.index !== before || this.done || this.sinceTick >= this.tickSeconds) this.emit();
    }

    replay() {
        this.t = 0;
        this.emit();
        this.requestFrame();
    }

    /** Jumps to story time `t` (seconds from the start of the programme). */
    seek(t: number) {
        this.t = Math.max(0, Math.min(this.total, t));
        this.seeks++;
        this.emit();
        this.requestFrame();
    }

    /** Jumps to the end state (reduced motion: show the result without animating). */
    finish() {
        this.t = this.total;
        this.emit();
        this.requestFrame();
    }
}
