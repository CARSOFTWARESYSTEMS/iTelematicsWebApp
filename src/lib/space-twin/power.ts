/**
 * Power-system helpers shared by the Satellite, Spacecraft and Space Station scenes. Every scene
 * steps the same energy balance as the reference case (energyStep in energy-model.ts) at a fixed
 * time step, so traces are deterministic and independent of the display frame rate.
 */
import { eclipseFraction, type EnergyParams } from '@/lib/energy-model';
import { periodMin } from './orbit';

export interface OrbitCase {
    altitudeKm: number;
    betaDeg: number;
}

export interface OrbitTiming {
    periodMin: number;
    eclipseFraction: number;
    eclipseMin: number;
    sunlightMin: number;
    /** Orbit phase (0–1) of shadow entry and exit; phase 0 is the sub-solar point. */
    eclipseStart: number;
    eclipseEnd: number;
}

export function orbitTiming(o: OrbitCase): OrbitTiming {
    const period = periodMin(o.altitudeKm);
    const f = eclipseFraction(o.betaDeg, o.altitudeKm);
    return {
        periodMin: period,
        eclipseFraction: f,
        eclipseMin: period * f,
        sunlightMin: period * (1 - f),
        eclipseStart: 0.5 - f / 2,
        eclipseEnd: 0.5 + f / 2,
    };
}

export function inEclipse(timing: OrbitTiming, phase: number): boolean {
    const p = ((phase % 1) + 1) % 1;
    return p >= timing.eclipseStart && p <= timing.eclipseEnd;
}

/** Shadow intervals [entry, exit] in simulated minutes for a run starting at `startPhase`. */
export function eclipseWindows(timing: OrbitTiming, startPhase: number, durationMin: number): [number, number][] {
    const windows: [number, number][] = [];
    const first = Math.floor(startPhase) - 1;
    for (let k = first; k <= first + Math.ceil(durationMin / timing.periodMin) + 2; k++) {
        const entry = (k + timing.eclipseStart - startPhase) * timing.periodMin;
        const exit = (k + timing.eclipseEnd - startPhase) * timing.periodMin;
        if (exit >= -timing.periodMin && entry <= durationMin + timing.periodMin) windows.push([entry, exit]);
    }
    return windows;
}

/**
 * Orbit energy margin with the published equations: generated energy over the sunlit arc
 * against the energy required, with eclipse loads carried through the battery's round-trip
 * efficiency (η_EPS · η_charge) and everything through the EPS converter.
 */
export function orbitMarginPct({
    arrayW,
    loadSunW,
    loadEclipseW,
    params,
    timing,
}: {
    arrayW: number;
    loadSunW: number;
    loadEclipseW: number;
    params: EnergyParams;
    timing: OrbitTiming;
}): number {
    const sunH = timing.sunlightMin / 60;
    const eclH = timing.eclipseMin / 60;
    const generated = arrayW * sunH;
    const required = (loadSunW * sunH + (loadEclipseW * eclH) / (params.etaEps * params.etaCharge)) / params.etaEps;
    return ((generated - required) / required) * 100;
}

export interface PowerSample {
    tMin: number;
    eclipse: boolean;
    arrayW: number;
    loadW: number;
    marginW: number;
    batteryW: number;
    soc: number;
}

/** Linear interpolation between fixed steps for the numbers; the earlier step for everything else. */
export function sampleTrace<S extends PowerSample>(trace: readonly S[], stepMin: number, tMin: number): S {
    const x = Math.max(0, Math.min(trace.length - 1, tMin / stepMin));
    const i = Math.min(trace.length - 2, Math.floor(x));
    const a = trace[i];
    const b = trace[i + 1];
    const k = x - i;
    const lerp = (p: number, q: number) => p + (q - p) * k;
    return {
        ...a,
        tMin,
        arrayW: lerp(a.arrayW, b.arrayW),
        loadW: lerp(a.loadW, b.loadW),
        marginW: lerp(a.marginW, b.marginW),
        batteryW: lerp(a.batteryW, b.batteryW),
        soc: lerp(a.soc, b.soc),
    };
}

/** Story time (seconds) at which a simulated minute is shown. */
export const storySeconds = (simMin: number, simMinPerSecond: number) => simMin / simMinPerSecond;

/** Smoothed 0–1 eclipse factor for lighting, from the shadow windows (± `soft` story seconds). */
export function shadowFactor(windows: readonly [number, number][], simMin: number, simMinPerSecond: number, soft = 0.35): number {
    const k = soft * simMinPerSecond;
    let f = 0;
    for (const [entry, exit] of windows) {
        const into = Math.min(1, Math.max(0, (simMin - entry + k) / (2 * k)));
        const out = Math.min(1, Math.max(0, (simMin - exit + k) / (2 * k)));
        f = Math.max(f, into - out);
    }
    return f * f * (3 - 2 * f);
}
