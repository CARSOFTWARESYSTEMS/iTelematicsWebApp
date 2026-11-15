// Sound for the Solar System experience: synthesised in the browser with the Web Audio API (no audio
// files), and driven every frame by the same simulation state as the picture.
//
// What is heard follows the physics of the shot:
//  • Engines: a deep roar (filtered noise) with the crackle of a large rocket, scaled by thrust. Heard
//    from a ground camera, the sound arrives late (distance / 343 m/s), weaker with distance and duller,
//    because air absorbs high frequencies; it fades out as the air thins.
//  • Wind: on the cameras flying with the vehicle, a roar that follows the simulated dynamic pressure
//    (loudest at Max Q) and disappears above the atmosphere.
//  • The pad before launch: a breeze and the hiss of liquid-oxygen venting.
//  • Space: no air, so no engine sound; a very quiet low ambience (a film's room tone, not a sound
//    source) and, for the separations and deployments, the low thump a camera on the structure would
//    record through it.
// Browsers only start audio after a click: enable() is called from Start Mission (or the sound toggle).

export interface SoundFrame {
    scene: string;
    met: number;
    /** First-stage, upper-stage and kick-stage firing (0…1). */
    firing1: number;
    firing2: boolean;
    firingKick: boolean;
    /** Ambient pressure at the vehicle, relative to sea level. */
    pressure: number;
    /** Dynamic pressure on the vehicle, Pa. */
    q: number;
    /** Distance from the camera to the vehicle, m. */
    camDist: number;
    /** Camera height above the ground in the pad/ascent scene (m); large elsewhere. */
    camAlt: number;
    /** True right after a jump (seek or chapter change): events are not replayed. */
    jumped: boolean;
    /** Mission events (MET, s) that make a sound when crossed. */
    events: { met: number; kind: 'ignition' | 'thump' | 'pyro' | 'spring' }[];
    /** Boom motors running (0…1). */
    booms: number;
}

const SPEED_OF_SOUND = 343;

function noiseBuffer(ctx: AudioContext, seconds: number, kind: 'white' | 'brown' | 'crackle') {
    const n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    let seed = 1234567;
    const rnd = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    };
    if (kind === 'crackle') {
        // Sparse sharp impulses with short decays: the "popping" of a large rocket's shock-laden exhaust.
        let env = 0;
        for (let i = 0; i < n; i++) {
            if (rnd() < 45 / ctx.sampleRate) env = 0.4 + rnd() * 0.6;
            env *= 0.9965;
            d[i] = (rnd() * 2 - 1) * env;
        }
        return buf;
    }
    for (let i = 0; i < n; i++) {
        const w = rnd() * 2 - 1;
        if (kind === 'brown') {
            last = (last + 0.02 * w) / 1.02;
            d[i] = last * 3.5;
        } else d[i] = w;
    }
    return buf;
}

class MissionSound {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private nodes: Record<string, AudioNode & { gain?: AudioParam }> = {};
    private params: Record<string, AudioParam> = {};
    private enabled = false;
    private active = false;
    private lastMet = NaN;
    private listeners = new Set<() => void>();

    get on() {
        return this.enabled;
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

    /** Creates (on a user gesture) and starts the audio graph. */
    enable() {
        if (typeof window === 'undefined') return;
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        if (!this.ctx) this.build(new AC());
        void this.ctx!.resume();
        this.enabled = true;
        this.apply();
        this.notify();
    }

    disable() {
        this.enabled = false;
        this.apply();
        this.notify();
    }

    /** Playing and visible: sound runs; paused, hidden or away from the scene: it fades out. */
    setActive(active: boolean) {
        this.active = active;
        this.apply();
    }

    private apply() {
        if (!this.ctx || !this.master) return;
        const on = this.enabled && this.active;
        this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, on ? 0.25 : 0.12);
    }

    private build(ctx: AudioContext) {
        this.ctx = ctx;
        const master = ctx.createGain();
        master.gain.value = 0;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.ratio.value = 4;
        master.connect(comp).connect(ctx.destination);
        this.master = master;

        const loop = (buf: AudioBuffer) => {
            const s = ctx.createBufferSource();
            s.buffer = buf;
            s.loop = true;
            s.start();
            return s;
        };
        const white = noiseBuffer(ctx, 4, 'white');
        const brown = noiseBuffer(ctx, 6, 'brown');
        const crackle = noiseBuffer(ctx, 5, 'crackle');

        // Engine: rumble + roar + crackle → distance filter → propagation delay → gain.
        const engineIn = ctx.createGain();
        const rumble = ctx.createBiquadFilter();
        rumble.type = 'lowpass';
        rumble.frequency.value = 120;
        rumble.Q.value = 0.8;
        loop(brown).connect(rumble).connect(engineIn);
        const roar = ctx.createBiquadFilter();
        roar.type = 'bandpass';
        roar.frequency.value = 520;
        roar.Q.value = 0.5;
        const roarGain = ctx.createGain();
        roarGain.gain.value = 0.5;
        loop(white).connect(roar).connect(roarGain).connect(engineIn);
        const crack = ctx.createBiquadFilter();
        crack.type = 'bandpass';
        crack.frequency.value = 1400;
        crack.Q.value = 0.7;
        const crackGain = ctx.createGain();
        crackGain.gain.value = 0;
        loop(crackle).connect(crack).connect(crackGain).connect(engineIn);
        const air = ctx.createBiquadFilter();
        air.type = 'lowpass';
        air.frequency.value = 4000;
        const delay = ctx.createDelay(12);
        const engineGain = ctx.createGain();
        engineGain.gain.value = 0;
        engineIn.connect(air).connect(delay).connect(engineGain).connect(master);

        // Wind on the flying cameras, following dynamic pressure.
        const wind = ctx.createBiquadFilter();
        wind.type = 'bandpass';
        wind.frequency.value = 700;
        wind.Q.value = 0.6;
        const windGain = ctx.createGain();
        windGain.gain.value = 0;
        loop(white).connect(wind).connect(windGain).connect(master);

        // The pad before launch: breeze and oxygen venting.
        const breeze = ctx.createBiquadFilter();
        breeze.type = 'lowpass';
        breeze.frequency.value = 380;
        const breezeGain = ctx.createGain();
        breezeGain.gain.value = 0;
        loop(brown).connect(breeze).connect(breezeGain).connect(master);
        const vent = ctx.createBiquadFilter();
        vent.type = 'highpass';
        vent.frequency.value = 3500;
        const ventGain = ctx.createGain();
        ventGain.gain.value = 0;
        loop(white).connect(vent).connect(ventGain).connect(master);

        // Space: a quiet, slowly breathing low ambience.
        const ambGain = ctx.createGain();
        ambGain.gain.value = 0;
        for (const [f, g] of [
            [55, 0.5],
            [82.4, 0.32],
            [110.3, 0.12],
        ] as const) {
            const o = ctx.createOscillator();
            o.frequency.value = f;
            const og = ctx.createGain();
            og.gain.value = g;
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 0.05 + f / 4000;
            const lg = ctx.createGain();
            lg.gain.value = g * 0.4;
            lfo.connect(lg).connect(og.gain);
            o.connect(og).connect(ambGain);
            o.start();
            lfo.start();
        }
        const hiss = ctx.createBiquadFilter();
        hiss.type = 'lowpass';
        hiss.frequency.value = 220;
        const hissGain = ctx.createGain();
        hissGain.gain.value = 0.25;
        loop(brown).connect(hiss).connect(hissGain).connect(ambGain);
        ambGain.connect(master);

        // Boom motors: a soft mechanical whir.
        const motor = ctx.createOscillator();
        motor.type = 'sawtooth';
        motor.frequency.value = 96;
        const motorLp = ctx.createBiquadFilter();
        motorLp.type = 'lowpass';
        motorLp.frequency.value = 500;
        const motorGain = ctx.createGain();
        motorGain.gain.value = 0;
        motor.connect(motorLp).connect(motorGain).connect(master);
        motor.start();

        this.nodes = { engineGain, windGain, breezeGain, ventGain, ambGain, motorGain, crackGain };
        this.params = { air: air.frequency, delay: delay.delayTime, roar: roar.frequency, wind: wind.frequency, motor: motor.frequency };
    }

    /** A one-shot: a low structural thump, a sharp pyrotechnic crack, or a spring release. */
    private shot(kind: 'ignition' | 'thump' | 'pyro' | 'spring', level: number, at = 0) {
        const ctx = this.ctx;
        if (!ctx || !this.master || level <= 0.001) return;
        const t = ctx.currentTime + at;
        const g = ctx.createGain();
        g.connect(this.master);
        if (kind === 'thump' || kind === 'spring' || kind === 'pyro') {
            const o = ctx.createOscillator();
            o.type = 'sine';
            o.frequency.setValueAtTime(kind === 'spring' ? 140 : 72, t);
            o.frequency.exponentialRampToValueAtTime(kind === 'spring' ? 60 : 34, t + 0.35);
            const og = ctx.createGain();
            og.gain.setValueAtTime(0, t);
            og.gain.linearRampToValueAtTime(level, t + 0.008);
            og.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'spring' ? 0.5 : 0.9));
            o.connect(og).connect(g);
            o.start(t);
            o.stop(t + 1);
        }
        if (kind === 'pyro' || kind === 'ignition') {
            const src = ctx.createBufferSource();
            src.buffer = noiseBuffer(ctx, 0.6, 'white');
            const bp = ctx.createBiquadFilter();
            bp.type = kind === 'pyro' ? 'highpass' : 'lowpass';
            bp.frequency.value = kind === 'pyro' ? 1800 : 900;
            const ng = ctx.createGain();
            ng.gain.setValueAtTime(0, t);
            ng.gain.linearRampToValueAtTime(level * (kind === 'pyro' ? 0.5 : 0.8), t + 0.01);
            ng.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'pyro' ? 0.18 : 0.55));
            src.connect(bp).connect(ng).connect(g);
            src.start(t);
        }
    }

    /** Development checks: the audio state and the current levels. */
    debug() {
        const g = (n: string) => +((this.nodes[n] as GainNode | undefined)?.gain.value ?? 0).toFixed(3);
        return { state: this.ctx?.state ?? 'none', on: this.enabled, active: this.active, master: +(this.master?.gain.value ?? 0).toFixed(3), engine: g('engineGain'), wind: g('windGain'), breeze: g('breezeGain'), ambience: g('ambGain'), delay: +(this.params.delay?.value ?? 0).toFixed(2), air: Math.round(this.params.air?.value ?? 0) };
    }

    /** Called every frame by the scene. */
    update(f: SoundFrame) {
        const ctx = this.ctx;
        if (!ctx || !this.enabled) return;
        const now = ctx.currentTime;
        const set = (name: string, v: number, tau = 0.12) => (this.nodes[name] as GainNode).gain.setTargetAtTime(v, now, tau);
        const ground = f.scene === 'pad' || f.scene === 'ascent';
        const inAir = ground && f.camAlt < 40000;
        // A ground camera hears the engine late and dull; a camera flying beside the vehicle, at once.
        const onGround = ground && f.camAlt < 200;
        const dist = Math.max(30, f.camDist);
        const delay = onGround ? Math.min(11.5, dist / SPEED_OF_SOUND) : 0;
        this.params.delay.setTargetAtTime(delay, now, 0.25);
        const cutoff = onGround ? 7000 / (1 + dist / 450) : 900;
        this.params.air.setTargetAtTime(Math.max(140, cutoff), now, 0.2);
        const loud = onGround ? 1 / (1 + dist / 650) : 0.55;
        // Sound needs air at the source and at the camera.
        const medium = inAir ? Math.sqrt(Math.max(0, Math.min(1, f.pressure))) : 0;
        set('engineGain', ground ? f.firing1 * loud * medium * 1.6 : 0, 0.15);
        set('crackGain', onGround ? Math.min(1, 1.6 * loud) : 0.15, 0.3);
        // Wind roar on the flying cameras, with dynamic pressure (35 kPa ≈ Max Q).
        const flying = ground && f.camAlt >= 200 && f.camDist < 2000;
        set('windGain', flying ? Math.min(1, f.q / 35000) * 0.35 : 0, 0.3);
        this.params.wind.setTargetAtTime(500 + Math.min(1, f.q / 35000) * 900, now, 0.4);
        // The pad before liftoff.
        const padQuiet = ground && f.met < -2 && f.camAlt < 200;
        set('breezeGain', padQuiet ? 0.12 : 0, 0.6);
        set('ventGain', padQuiet ? 0.035 : 0, 0.6);
        // Space: the quiet ambience, everywhere outside the atmosphere.
        const space = !ground || f.camAlt > 60000;
        set('ambGain', space ? 0.06 : 0, 1.2);
        set('motorGain', f.booms > 0 ? 0.03 * f.booms : 0, 0.3);
        this.params.motor.setTargetAtTime(90 + 20 * f.booms, now, 0.5);
        // One-shots when an event is crossed in normal playback (not after a jump).
        const prev = this.lastMet;
        this.lastMet = f.met;
        if (f.jumped || !Number.isFinite(prev) || f.met <= prev || f.met - prev > 120) return;
        for (const e of f.events) {
            if (prev < e.met && f.met >= e.met) {
                if (e.kind === 'ignition' && ground) this.shot('ignition', 0.6 * loud, delay);
                else if (e.kind !== 'ignition' && f.camDist < 400) this.shot(e.kind, e.kind === 'spring' ? 0.25 : 0.4);
            }
        }
    }
}

/** One sound engine for the page (the experience is mounted once). */
export const missionSound = new MissionSound();

if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as Window & { __solarSound?: () => unknown }).__solarSound = () => missionSound.debug();
