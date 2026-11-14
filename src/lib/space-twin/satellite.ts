/**
 * Experience 01 · Satellite. The 6U Earth-observation reference case (550 km, β ≈ 20°, 86 Wh
 * battery) told in four stages: reveal, exploration, mission health and a simulated fault with
 * safe recovery. Every number comes from the reference energy model stepped in simulated time;
 * the fault is the published "heater stuck on" scenario. Simulated values, not flight data.
 */
import { ECLIPSE_FRACTION, PERIOD_MIN, POWER, SCENARIOS, energyStep, isEclipse, orbitBudget } from '@/lib/energy-model';
import { orbitTiming, eclipseWindows, orbitMarginPct, sampleTrace, shadowFactor, type PowerSample } from './power';
import { cameraPath, fmt, missionClock, signed, smooth, wrap, type CameraKey, type Chip, type Hud, type Part, type Phase, type Stage, type Tone, type View } from './story';

export const SAT_LOOP = 26;
/** One story second shows five simulated minutes: the whole loop is 130 minutes, about 1.4 orbits. */
export const SAT_SIM_MIN_PER_S = 5;
/** The loop starts in sunlight, just after an eclipse exit (orbit phase 0.682). */
export const SAT_START_PHASE = 0.69;
export const SAT_STEP_MIN = 0.25;
/** Fault injected at the start of the Recovery stage. */
export const SAT_FAULT_AT_S = 15.5;
/** Detection rule: battery SOC more than 0.8 percentage points below the model's prediction. */
export const SAT_DETECT_RESIDUAL = 0.008;
/** Engineering assessment before the protective action is taken. */
export const SAT_ASSESS_MIN = 5;
/** The fault: the reference case's documented heater-stuck scenario. */
export const SAT_FAULT_W = SCENARIOS['heater-stuck'].extraLoadW;
/** Safe mode turns the payload off in every phase: the reference case's payload-off load. */
export const SAT_SAFE_LOAD_W = POWER.loadEclipseW;

export const SAT_TIMING = orbitTiming({ altitudeKm: 550, betaDeg: 20 });

export const SAT_STAGES: readonly Stage[] = [
    { id: 'reveal', label: 'Reveal', title: 'Spacecraft reveal', start: 0, seconds: 4.5 },
    { id: 'explore', label: 'Explore', title: 'Spacecraft exploration', start: 4.5, seconds: 5.5 },
    { id: 'health', label: 'Health', title: 'Mission health', start: 10, seconds: 5.5 },
    { id: 'recovery', label: 'Recovery', title: 'Fault and safe recovery', start: 15.5, seconds: 10.5 },
];

export type SatMode = 'nominal' | 'alert' | 'safe';

export interface SatSample extends PowerSample {
    /** SOC the onboard energy model predicts for the commanded configuration. */
    predictedSoc: number;
    faultActive: boolean;
    mode: SatMode;
}

/** Deterministic run of the story's 130 simulated minutes. */
function run() {
    const steps = Math.round((SAT_LOOP * SAT_SIM_MIN_PER_S) / SAT_STEP_MIN);
    const dtH = SAT_STEP_MIN / 60;
    const faultMin = SAT_FAULT_AT_S * SAT_SIM_MIN_PER_S;
    // Start from the settled nominal cycle (the same state the research platform starts from).
    let soc = settledSocAt(SAT_START_PHASE);
    let predicted = soc;
    let mode: SatMode = 'nominal';
    let detectMin: number | null = null;
    let safeMin: number | null = null;
    const trace: SatSample[] = [];
    for (let i = 0; i <= steps; i++) {
        const tMin = i * SAT_STEP_MIN;
        const phase = SAT_START_PHASE + tMin / PERIOD_MIN;
        const eclipse = isEclipse(phase);
        const faultActive = tMin >= faultMin;
        if (detectMin !== null && safeMin === null && tMin >= detectMin + SAT_ASSESS_MIN) {
            safeMin = tMin;
            mode = 'safe';
        }
        const arrayW = eclipse ? 0 : POWER.arrayW;
        const plannedLoad = mode === 'safe' ? SAT_SAFE_LOAD_W : eclipse ? POWER.loadEclipseW : POWER.loadSunW;
        const loadW = plannedLoad + (faultActive ? SAT_FAULT_W : 0);
        const actual = energyStep(POWER, arrayW, loadW, soc, dtH);
        const model = energyStep(POWER, arrayW, plannedLoad, predicted, dtH);
        trace.push({ tMin, eclipse, arrayW, loadW, marginW: actual.marginW, batteryW: actual.batteryW, soc, predictedSoc: predicted, faultActive, mode });
        soc = actual.soc;
        predicted = model.soc;
        if (detectMin === null && predicted - soc > SAT_DETECT_RESIDUAL) {
            detectMin = tMin + SAT_STEP_MIN;
            mode = 'alert';
        }
    }
    let recoverMin: number | null = null;
    for (const s of trace) {
        if (safeMin !== null && s.tMin >= safeMin && s.batteryW > 0.5) {
            recoverMin = s.tMin;
            break;
        }
    }
    if (detectMin === null || safeMin === null || recoverMin === null) throw new Error('satellite story: the fault must be detected, contained and recovered within the loop');
    return { trace, faultMin, detectMin, safeMin, recoverMin };
}

/** SOC of the settled nominal cycle at an orbit phase (the research platform's starting state). */
function settledSocAt(phase: number): number {
    let soc = 0.9;
    const stepsPerOrbit = Math.round(PERIOD_MIN / SAT_STEP_MIN);
    const target = Math.round((((phase % 1) + 1) % 1) * stepsPerOrbit);
    for (let orbit = 0; orbit < 8; orbit++) {
        for (let i = 0; i < stepsPerOrbit; i++) {
            if (orbit === 7 && i === target) return soc;
            const p = i / stepsPerOrbit;
            const eclipse = isEclipse(p);
            soc = energyStep(POWER, eclipse ? 0 : POWER.arrayW, eclipse ? POWER.loadEclipseW : POWER.loadSunW, soc, SAT_STEP_MIN / 60).soc;
        }
    }
    return soc;
}

export const SAT_RUN = run();
export const SAT_WINDOWS = eclipseWindows(SAT_TIMING, SAT_START_PHASE, SAT_LOOP * SAT_SIM_MIN_PER_S);

/** Margins quoted in the assessment, from the published orbit-budget equations. */
export const SAT_MARGIN = {
    nominal: orbitBudget('nominal').marginPct,
    fault: orbitBudget('heater-stuck').marginPct,
    safe: orbitMarginPct({
        arrayW: POWER.arrayW,
        loadSunW: SAT_SAFE_LOAD_W + SAT_FAULT_W,
        loadEclipseW: SAT_SAFE_LOAD_W + SAT_FAULT_W,
        params: POWER,
        timing: SAT_TIMING,
    }),
};

const s = (min: number) => min / SAT_SIM_MIN_PER_S;
const eclipseEntryS = s(SAT_WINDOWS.find(([entry]) => entry > 0)![0]);

export const SAT_EVENTS = {
    eclipseEntry: eclipseEntryS,
    fault: s(SAT_RUN.faultMin),
    detect: s(SAT_RUN.detectMin),
    safe: s(SAT_RUN.safeMin),
    recover: s(SAT_RUN.recoverMin),
} as const;

export const SAT_PHASES: readonly Phase[] = [
    { id: 'reveal', stage: 0, start: 0 },
    { id: 'explore-arrays', stage: 1, start: 4.5 },
    { id: 'explore-power', stage: 1, start: 6.3 },
    { id: 'explore-comms', stage: 1, start: 8.15 },
    { id: 'health', stage: 2, start: 10 },
    { id: 'health-eclipse', stage: 2, start: SAT_EVENTS.eclipseEntry },
    { id: 'fault', stage: 3, start: SAT_EVENTS.fault },
    { id: 'detected', stage: 3, start: SAT_EVENTS.detect },
    { id: 'safe-mode', stage: 3, start: SAT_EVENTS.safe },
    { id: 'recovering', stage: 3, start: SAT_EVENTS.recover },
];

export const SAT_STORY = { stages: SAT_STAGES, phases: SAT_PHASES, loopSeconds: SAT_LOOP } as const;

export const satSimMinutes = (t: number) => wrap(t, SAT_LOOP) * SAT_SIM_MIN_PER_S;
export const satSampleAt = (t: number) => sampleTrace(SAT_RUN.trace, SAT_STEP_MIN, satSimMinutes(t));
/** 0 in sunlight, 1 in Earth's shadow, softened at the terminator for the lighting. */
export const satShadowAt = (t: number) => shadowFactor(SAT_WINDOWS, satSimMinutes(t), SAT_SIM_MIN_PER_S);

// ── Subsystems ──────────────────────────────────────────────────────────────

export type SatPartId = 'arrays' | 'power' | 'computer' | 'attitude' | 'thermal' | 'comms';

export const SAT_PARTS: readonly (Part & { id: SatPartId; internal: boolean })[] = [
    { id: 'arrays', name: 'Solar arrays', short: 'Solar arrays', line: `Two deployed wings of solar cells. In the reference case they deliver ${fmt(POWER.arrayW)} W on average while sunlit.`, internal: false },
    { id: 'power', name: 'Battery & EPS', short: 'Battery & EPS', line: `The electrical power system regulates array power for every subsystem and charges an ${POWER.batteryWh} Wh lithium-ion battery for eclipse (η_EPS ${POWER.etaEps}).`, internal: true },
    { id: 'computer', name: 'Onboard computer', short: 'Computer', line: 'Runs the flight software, gathers housekeeping telemetry and applies the fault rules that command safe mode.', internal: true },
    { id: 'attitude', name: 'Attitude control', short: 'Attitude', line: 'A star tracker and sun sensors measure where the spacecraft points; reaction wheels and magnetorquers turn it.', internal: true },
    { id: 'thermal', name: 'Thermal control', short: 'Thermal', line: 'Gold multi-layer insulation keeps heat in, a mirrored radiator sheds it, and heaters protect the battery in eclipse.', internal: false },
    { id: 'comms', name: 'Communications', short: 'Comms', line: 'S-band patch antennas and UHF antennas send telemetry to the ground and receive commands.', internal: true },
];

export type Glow = 'info' | 'alert';

/** Which subsystems glow in each phase: telemetry cyan for "look here", amber for the fault. */
export function satTones(phase: string): Partial<Record<SatPartId, Glow>> {
    switch (phase) {
        case 'explore-arrays':
            return { arrays: 'info' };
        case 'explore-power':
            return { power: 'info' };
        case 'explore-comms':
            return { comms: 'info' };
        case 'health':
        case 'health-eclipse':
            return { power: 'info' };
        case 'fault':
            return { thermal: 'alert' };
        case 'detected':
            return { power: 'alert', thermal: 'alert' };
        case 'safe-mode':
            return { power: 'alert', thermal: 'alert', attitude: 'info' };
        case 'recovering':
            return { power: 'info', thermal: 'alert' };
        default:
            return {};
    }
}

export function satChips(phase: string, t: number, compact: boolean): Chip[] {
    const x = satSampleAt(t);
    switch (phase) {
        case 'explore-arrays':
            return [{ id: 'arrays', text: 'Solar arrays' }];
        case 'explore-power':
            return [{ id: 'power', text: 'Battery & EPS' }];
        case 'explore-comms':
            return [{ id: 'comms', text: 'Communications' }];
        case 'health':
            return compact ? [{ id: 'power', text: `Battery ${fmt(x.soc * 100, 0)} %` }] : [
                { id: 'arrays', text: `Arrays ${fmt(x.arrayW)} W` },
                { id: 'power', text: `Battery ${fmt(x.soc * 100, 0)} %` },
            ];
        case 'health-eclipse':
            return [{ id: 'power', text: 'Eclipse · battery supplying' }];
        case 'fault':
            return [{ id: 'thermal', text: `Heater stuck on (simulated)`, alert: true }];
        case 'detected':
            return [{ id: 'power', text: 'SOC below prediction', alert: true }];
        case 'safe-mode':
            return [{ id: 'power', text: 'Safe mode · payload off', alert: true }];
        case 'recovering':
            return [{ id: 'power', text: 'Charging in safe mode' }];
        default:
            return [];
    }
}

/** Energy moving: arrays → EPS → battery while charging; battery → bus while discharging. */
export function satFlow(t: number): 'charge' | 'discharge' | null {
    const x = satSampleAt(t);
    if (x.batteryW > 0.5 && x.arrayW > 0) return 'charge';
    if (x.batteryW < -0.5) return 'discharge';
    return null;
}

// ── Heads-up display ────────────────────────────────────────────────────────

const MODE: Record<SatMode, { label: string; tone: Tone }> = {
    nominal: { label: 'Nominal', tone: 'nominal' },
    alert: { label: 'Alert', tone: 'fault' },
    safe: { label: 'Safe mode', tone: 'solar' },
};

/** Simulated telemetry for the health and recovery stages (null earlier: the story shows the hardware first). */
export function satHud(t: number, phase: string): Hud | null {
    if (!['health', 'health-eclipse', 'fault', 'detected', 'safe-mode', 'recovering'].includes(phase)) return null;
    const x = satSampleAt(t);
    const residual = (x.predictedSoc - x.soc) * 100;
    const detected = x.mode !== 'nominal';
    const eps = x.mode === 'safe' ? (x.eclipse ? 'Safe mode · battery supplying' : 'Safe mode · payload off · charging') : x.eclipse ? 'Battery supplying the bus' : 'Bus regulated · battery charging';
    const socNote = x.faultActive && residual > 0.05 ? `${fmt(residual)} pt below prediction` : x.batteryW > 0.5 ? 'charging' : x.batteryW < -0.5 ? 'discharging' : 'full';
    const notes: Record<string, string> = {
        fault: `Scenario: battery heater stuck on (+${SAT_FAULT_W} W). Not yet detected; telemetry still looks normal.`,
        detected: `Detection: SOC ${fmt(residual)} pt below the energy model's prediction. Assessment: with +${SAT_FAULT_W} W the orbit margin is ${signed(SAT_MARGIN.fault)} %, so the battery cannot recover.`,
        'safe-mode': `Protective action (rule-based): safe mode, payload off, arrays to the Sun. Orbit margin returns to ${signed(SAT_MARGIN.safe)} %.`,
        recovering: `Battery recharging in safe mode while the heater stays on. Payload restore awaits ground review.`,
    };
    return {
        rows: [
            { label: 'Illumination', value: x.eclipse ? 'Eclipse' : 'Sunlight', tone: x.eclipse ? 'orbit' : 'solar' },
            { label: 'Solar generation', value: `${fmt(x.arrayW)} W` },
            { label: 'Battery SOC', value: `${fmt(x.soc * 100)} %`, note: socNote },
            { label: 'Load', value: `${fmt(x.loadW)} W` },
            { label: 'EPS', value: eps },
            { label: 'Mission time', value: missionClock(x.tMin) },
        ],
        mode: MODE[x.mode],
        health: [
            { name: 'Power', state: detected ? 'WARNING' : 'NOMINAL' },
            { name: 'Thermal', state: detected ? 'FAULT' : 'NOMINAL' },
            { name: 'Computer', state: 'NOMINAL' },
            { name: 'Attitude', state: 'NOMINAL' },
            { name: 'Comms', state: 'NOMINAL' },
        ],
        note: notes[phase],
        alert: x.faultActive && phase !== 'recovering',
    };
}

/** The four recovery steps as a static list (reduced motion and screen readers). */
export const SAT_RECOVERY_STEPS = [
    `Fault (simulated): battery heater stuck on, +${SAT_FAULT_W} W`,
    `Detection: SOC falls more than ${fmt(SAT_DETECT_RESIDUAL * 100)} pt below the model prediction`,
    `Assessment: orbit margin ${signed(SAT_MARGIN.fault)} %; the battery would not recover`,
    `Protective action: safe mode, payload off; margin ${signed(SAT_MARGIN.safe)} %, battery recharging`,
];

// ── Motion ──────────────────────────────────────────────────────────────────

/** 0 = nominal attitude, 1 = arrays square to the Sun (safe mode); back to nominal before the loop ends. */
export function satSlewAt(t: number) {
    const x = wrap(t, SAT_LOOP);
    return smooth((x - SAT_EVENTS.safe) / 1.5) - smooth((x - 24.3) / 1.5);
}

/** 0 = body closed, 1 = the gold front panel see-through, showing the modules inside. */
export function satCutawayAt(t: number) {
    const x = wrap(t, SAT_LOOP);
    return smooth((x - 4.5) / 0.8) - smooth((x - 24.9) / 0.9);
}

const CENTRE = [0, -8, 0] as const;

const KEYS: CameraKey[] = [
    { t: 0, v: { az: 34, el: 17, dist: 1.42, target: CENTRE } },
    { t: 4.5, v: { az: 16, el: 9, dist: 1.0, target: CENTRE } },
    { t: 10, v: { az: -26, el: 15, dist: 0.97, target: CENTRE } },
    { t: 15.5, v: { az: -8, el: 7, dist: 1.0, target: CENTRE } },
    { t: 20.5, v: { az: 6, el: 10, dist: 1.06, target: CENTRE } },
];

export const satCameraAt = cameraPath(KEYS, SAT_LOOP);
export const SAT_HOME: View = KEYS[1].v;
/** 1 unit = 1 cm; the deployed span is about 105 cm. */
export const SAT_SPAN = 105;

export const SAT_FOCUS: Record<SatPartId, View> = {
    arrays: { az: 26, el: 12, dist: 0.9, target: [14, 0, 4] },
    power: { az: 14, el: 6, dist: 0.5, target: [5.65, 4.5, 0] },
    computer: { az: 16, el: 16, dist: 0.5, target: [5.65, 10, 0] },
    attitude: { az: 22, el: 38, dist: 0.6, target: [3, 14, 0] },
    thermal: { az: 50, el: 12, dist: 0.68, target: [4, 0, 2] },
    comms: { az: 20, el: -32, dist: 0.68, target: [2, -16, 0] },
};

export const SAT_REFERENCE = {
    orbit: `550 km, β ≈ 20°, period ${fmt(PERIOD_MIN)} min, eclipse ${fmt(ECLIPSE_FRACTION * PERIOD_MIN)} min`,
    battery: `${POWER.batteryWh} Wh, 2S4P Li-ion`,
} as const;
