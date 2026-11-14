/**
 * Experience 03 · Spacecraft. A generic unmanned Earth-observation spacecraft, larger than the 6U
 * CubeSat: a 1.6 × 1.6 × 2.4 m bus, two sun-tracking array wings, a high-gain antenna, a payload
 * instrument and a propulsion module. A conceptual reference case (not a real mission) stepped with
 * the same energy balance as the 6U reference: subsystem loads set the battery's state of charge
 * and the power margin; an array-string fault forces a power-limited operating mode.
 */
import { energyStep, type EnergyParams } from '@/lib/energy-model';
import { eclipseWindows, inEclipse, orbitMarginPct, orbitTiming, sampleTrace, shadowFactor, type PowerSample } from './power';
import { cameraPath, fmt, missionClock, signed, smooth, wrap, type CameraKey, type Chip, type Hud, type Part, type Phase, type Stage, type Tone, type View } from './story';

export const SC_ORBIT = { altitudeKm: 700, betaDeg: 25 } as const;
export const SC_TIMING = orbitTiming(SC_ORBIT);

export const SC_POWER: EnergyParams & { arrayPeakW: number } = {
    arrayPeakW: 2400, // two wings at normal incidence, beginning of life
    etaEps: 0.9,
    etaCharge: 0.95,
    batteryWh: 3600,
    taperFrom: 0.95,
};

/** One-axis sun tracking about the wing axis leaves the β angle uncorrected: P = P_peak · cos β. */
export const SC_INCIDENCE = Math.cos((SC_ORBIT.betaDeg * Math.PI) / 180);
export const SC_ARRAY_W = SC_POWER.arrayPeakW * SC_INCIDENCE;

export type ScPartId = 'arrays' | 'power' | 'avionics' | 'comms' | 'payload' | 'propulsion' | 'thermal';

/** Subsystem loads in watts, sunlight / eclipse. The payload images in sunlight and idles in eclipse. */
export const SC_LOADS: Record<Exclude<ScPartId, 'arrays' | 'power'>, { name: string; sun: number; eclipse: number }> = {
    avionics: { name: 'Avionics', sun: 120, eclipse: 120 },
    comms: { name: 'Comms', sun: 90, eclipse: 90 },
    payload: { name: 'Payload', sun: 650, eclipse: 120 },
    propulsion: { name: 'Propulsion', sun: 30, eclipse: 30 },
    thermal: { name: 'Thermal', sun: 180, eclipse: 260 },
};
/** Attitude control is part of the avionics module in the model view, listed for completeness. */
export const SC_ADCS_W = 160;

/** The fault: two of four strings on wing B open-circuit, so wing B delivers half its power. */
export const SC_FAULT_ARRAY_FACTOR = 0.75;
/** Response: payload duty limited to 40 % in sunlight. */
export const SC_LIMITED_PAYLOAD_DUTY = 0.4;
/** Detection: array output more than 10 % below prediction for two simulated minutes in sunlight. */
export const SC_DETECT_RATIO = 0.9;
export const SC_DETECT_MIN = 2;

export const SC_LOOP = 27;
export const SC_SIM_MIN_PER_S = 5;
export const SC_STEP_MIN = 0.25;
/** The loop opens in sunlight, just after an eclipse exit (orbit phase 0.671). */
export const SC_START_PHASE = 0.675;
export const SC_FAULT_AT_S = 17;

export type ScMode = 'nominal' | 'alert' | 'limited';

export interface ScSample extends PowerSample {
    mode: ScMode;
    faultActive: boolean;
    predictedArrayW: number;
    loads: Record<keyof typeof SC_LOADS | 'adcs', number>;
}

function loadsFor(eclipse: boolean, mode: ScMode) {
    const loads = { adcs: SC_ADCS_W } as ScSample['loads'];
    for (const [id, l] of Object.entries(SC_LOADS) as [keyof typeof SC_LOADS, (typeof SC_LOADS)[keyof typeof SC_LOADS]][]) {
        loads[id] = eclipse ? l.eclipse : l.sun;
    }
    if (mode === 'limited' && !eclipse) loads.payload = SC_LOADS.payload.sun * SC_LIMITED_PAYLOAD_DUTY;
    return loads;
}

const total = (loads: ScSample['loads']) => Object.values(loads).reduce((a, b) => a + b, 0);

function run() {
    const steps = Math.round((SC_LOOP * SC_SIM_MIN_PER_S) / SC_STEP_MIN);
    const dtH = SC_STEP_MIN / 60;
    const faultMin = SC_FAULT_AT_S * SC_SIM_MIN_PER_S;
    // Settle the nominal cycle first, so the loop starts from a repeatable orbit-to-orbit state.
    let soc = 0.95;
    const perOrbit = Math.round(SC_TIMING.periodMin / SC_STEP_MIN);
    for (let i = 0; i < perOrbit * 8; i++) {
        const eclipse = inEclipse(SC_TIMING, SC_START_PHASE + i / perOrbit);
        soc = energyStep(SC_POWER, eclipse ? 0 : SC_ARRAY_W, total(loadsFor(eclipse, 'nominal')), soc, dtH).soc;
    }
    let mode: ScMode = 'nominal';
    let lowFor = 0;
    let detectMin: number | null = null;
    let limitMin: number | null = null;
    const trace: ScSample[] = [];
    for (let i = 0; i <= steps; i++) {
        const tMin = i * SC_STEP_MIN;
        const eclipse = inEclipse(SC_TIMING, SC_START_PHASE + tMin / SC_TIMING.periodMin);
        const faultActive = tMin >= faultMin;
        if (detectMin !== null && limitMin === null && tMin >= detectMin + 3) {
            limitMin = tMin;
            mode = 'limited';
        }
        const predictedArrayW = eclipse ? 0 : SC_ARRAY_W;
        const arrayW = predictedArrayW * (faultActive ? SC_FAULT_ARRAY_FACTOR : 1);
        const loads = loadsFor(eclipse, mode);
        const loadW = total(loads);
        const e = energyStep(SC_POWER, arrayW, loadW, soc, dtH);
        trace.push({ tMin, eclipse, arrayW, loadW, marginW: e.marginW, batteryW: e.batteryW, soc, mode, faultActive, predictedArrayW, loads });
        soc = e.soc;
        if (detectMin === null && !eclipse && arrayW < predictedArrayW * SC_DETECT_RATIO) {
            lowFor += SC_STEP_MIN;
            if (lowFor >= SC_DETECT_MIN) {
                detectMin = tMin + SC_STEP_MIN;
                mode = 'alert';
            }
        }
    }
    if (detectMin === null || limitMin === null) throw new Error('spacecraft story: the fault must be detected and contained within the loop');
    return { trace, faultMin, detectMin, limitMin };
}

export const SC_RUN = run();
export const SC_WINDOWS = eclipseWindows(SC_TIMING, SC_START_PHASE, SC_LOOP * SC_SIM_MIN_PER_S);

const nominalSun = total(loadsFor(false, 'nominal'));
const nominalEclipse = total(loadsFor(true, 'nominal'));
const limitedSun = total(loadsFor(false, 'limited'));

export const SC_MARGIN = {
    nominal: orbitMarginPct({ arrayW: SC_ARRAY_W, loadSunW: nominalSun, loadEclipseW: nominalEclipse, params: SC_POWER, timing: SC_TIMING }),
    fault: orbitMarginPct({ arrayW: SC_ARRAY_W * SC_FAULT_ARRAY_FACTOR, loadSunW: nominalSun, loadEclipseW: nominalEclipse, params: SC_POWER, timing: SC_TIMING }),
    limited: orbitMarginPct({ arrayW: SC_ARRAY_W * SC_FAULT_ARRAY_FACTOR, loadSunW: limitedSun, loadEclipseW: nominalEclipse, params: SC_POWER, timing: SC_TIMING }),
};

const s = (min: number) => min / SC_SIM_MIN_PER_S;

export const SC_EVENTS = {
    eclipseEntry: s(SC_WINDOWS.find(([entry]) => entry > 0)![0]),
    eclipseExit: s(SC_WINDOWS.find(([, exit]) => exit > 0)![1]),
    fault: s(SC_RUN.faultMin),
    detect: s(SC_RUN.detectMin),
    limit: s(SC_RUN.limitMin),
} as const;

export const SC_STAGES: readonly Stage[] = [
    { id: 'reveal', label: 'Reveal', title: 'Spacecraft reveal', start: 0, seconds: 4.5 },
    { id: 'systems', label: 'Systems', title: 'Integrated systems', start: 4.5, seconds: 6.5 },
    { id: 'power', label: 'Power', title: 'Power generation and storage', start: 11, seconds: 6 },
    { id: 'health', label: 'Health', title: 'Power-system health', start: 17, seconds: 10 },
];

export const SC_PHASES: readonly Phase[] = [
    { id: 'reveal', stage: 0, start: 0 },
    { id: 'systems-arrays', stage: 1, start: 4.5 },
    { id: 'systems-power', stage: 1, start: 5.8 },
    { id: 'systems-payload', stage: 1, start: 7.1 },
    { id: 'systems-comms', stage: 1, start: 8.4 },
    { id: 'systems-propulsion', stage: 1, start: 9.7 },
    { id: 'power', stage: 2, start: 11 },
    { id: 'power-eclipse', stage: 2, start: SC_EVENTS.eclipseEntry },
    { id: 'fault', stage: 3, start: SC_EVENTS.fault },
    { id: 'detected', stage: 3, start: SC_EVENTS.detect },
    { id: 'limited', stage: 3, start: SC_EVENTS.limit },
];

export const SC_STORY = { stages: SC_STAGES, phases: SC_PHASES, loopSeconds: SC_LOOP } as const;

export const scSimMinutes = (t: number) => wrap(t, SC_LOOP) * SC_SIM_MIN_PER_S;
export const scSampleAt = (t: number): ScSample => sampleTrace(SC_RUN.trace, SC_STEP_MIN, scSimMinutes(t));
export const scShadowAt = (t: number) => shadowFactor(SC_WINDOWS, scSimMinutes(t), SC_SIM_MIN_PER_S);

export const SC_PARTS: readonly (Part & { id: ScPartId; internal: boolean })[] = [
    { id: 'arrays', name: 'Solar array wings', short: 'Solar arrays', line: `Two deployable wings on solar-array drives track the Sun about one axis: ${fmt(SC_POWER.arrayPeakW / 1000)} kW at normal incidence, ${Math.round(SC_ARRAY_W)} W at β = ${SC_ORBIT.betaDeg}°.`, internal: false },
    { id: 'power', name: 'Battery & power distribution', short: 'Battery & EPS', line: `A ${fmt(SC_POWER.batteryWh / 1000)} kWh lithium-ion battery and the power conditioning and distribution unit feed every subsystem through switched, fused outputs.`, internal: true },
    { id: 'avionics', name: 'Avionics & attitude control', short: 'Avionics', line: `Onboard computer, star trackers, gyros and reaction wheels: ${SC_LOADS.avionics.sun + SC_ADCS_W} W in every phase.`, internal: true },
    { id: 'comms', name: 'Communications', short: 'Comms', line: `A steerable high-gain antenna for payload data and omnidirectional antennas for commands: ${SC_LOADS.comms.sun} W.`, internal: false },
    { id: 'payload', name: 'Payload instrument', short: 'Payload', line: `The Earth-observation instrument draws ${SC_LOADS.payload.sun} W while imaging in sunlight and ${SC_LOADS.payload.eclipse} W on standby in eclipse.`, internal: false },
    { id: 'propulsion', name: 'Propulsion', short: 'Propulsion', line: `Propellant tanks, a main thruster and attitude thrusters for orbit keeping; valve and line heaters draw ${SC_LOADS.propulsion.sun} W on standby.`, internal: true },
    { id: 'thermal', name: 'Thermal control', short: 'Thermal', line: `Radiators reject avionics heat; heaters keep the battery and propellant warm: ${SC_LOADS.thermal.sun} W in sunlight, ${SC_LOADS.thermal.eclipse} W in eclipse.`, internal: false },
];

export type Glow = 'info' | 'alert';

export function scTones(phase: string): Partial<Record<ScPartId, Glow>> {
    if (phase.startsWith('systems-')) return { [phase.slice(8) as ScPartId]: 'info' };
    switch (phase) {
        case 'power':
        case 'power-eclipse':
            return { power: 'info', arrays: 'info' };
        case 'fault':
            return {};
        // Only wing B failed: the scene marks its dead strings itself, so the healthy wing stays unlit.
        case 'detected':
            return { power: 'alert' };
        case 'limited':
            return { payload: 'info' };
        default:
            return {};
    }
}

export function scChips(phase: string, t: number): Chip[] {
    const x = scSampleAt(t);
    if (phase.startsWith('systems-')) {
        const part = SC_PARTS.find((p) => p.id === phase.slice(8))!;
        return [{ id: part.id, text: part.name }];
    }
    switch (phase) {
        case 'power':
            return [
                { id: 'arrays', text: `Arrays ${Math.round(x.arrayW)} W` },
                { id: 'power', text: `Battery ${fmt(x.soc * 100, 0)} %` },
            ];
        case 'power-eclipse':
            return [{ id: 'power', text: 'Eclipse · battery supplying' }];
        case 'fault':
            return x.eclipse ? [{ id: 'wingB', text: 'String fault (simulated) · unseen in eclipse', alert: true }] : [{ id: 'wingB', text: 'String fault (simulated)', alert: true }];
        case 'detected':
            return [{ id: 'wingB', text: 'Wing B below prediction', alert: true }];
        case 'limited':
            return [{ id: 'payload', text: `Payload duty ${SC_LIMITED_PAYLOAD_DUTY * 100} %` }];
        default:
            return [];
    }
}

export function scFlow(t: number): 'charge' | 'discharge' | null {
    const x = scSampleAt(t);
    if (x.batteryW > 5 && x.arrayW > 0) return 'charge';
    if (x.batteryW < -5) return 'discharge';
    return null;
}

const MODE: Record<ScMode, { label: string; tone: Tone }> = {
    nominal: { label: 'Nominal', tone: 'nominal' },
    alert: { label: 'Power alert', tone: 'fault' },
    limited: { label: 'Power-limited', tone: 'solar' },
};

export function scHud(t: number, phase: string, selected: ScPartId | null): Hud | null {
    const x = scSampleAt(t);
    if (selected) {
        const load = selected === 'avionics' ? x.loads.avionics + x.loads.adcs : selected in x.loads ? x.loads[selected as keyof ScSample['loads']] : null;
        return {
            rows: [
                selected === 'arrays'
                    ? { label: 'Generation', value: `${Math.round(x.arrayW)} W` }
                    : selected === 'power'
                      ? { label: 'Battery SOC', value: `${fmt(x.soc * 100)} %`, note: x.batteryW >= 0 ? `charging ${Math.round(x.batteryW)} W` : `supplying ${Math.round(-x.batteryW)} W` }
                      : { label: 'Power draw', value: `${Math.round(load ?? 0)} W`, note: `${fmt(((load ?? 0) / x.loadW) * 100, 0)} % of the total load` },
                { label: 'Total load', value: `${Math.round(x.loadW)} W` },
                { label: 'Bus margin', value: `${signed(x.marginW, 0)} W`, tone: x.marginW >= 0 ? 'nominal' : 'orbit' },
                { label: 'Mission time', value: missionClock(x.tMin) },
            ],
            mode: MODE[x.mode],
        };
    }
    if (!phase.startsWith('power') && !['fault', 'detected', 'limited'].includes(phase)) return null;
    const notes: Record<string, string> = {
        fault: x.eclipse
            ? 'Scenario: two strings on wing B fail open (−25 % array power). In eclipse the arrays are dark, so nothing can show it yet.'
            : 'Scenario: two strings on wing B fail open (−25 % array power).',
        detected: `Detection: array output ${fmt((1 - x.arrayW / Math.max(1, x.predictedArrayW)) * 100, 0)} % below prediction. Assessment: orbit margin ${signed(SC_MARGIN.fault)} % with full payload duty.`,
        limited: `Response (rule-based): payload duty cut to ${SC_LIMITED_PAYLOAD_DUTY * 100} % in sunlight; orbit margin back to ${signed(SC_MARGIN.limited)} %.`,
    };
    return {
        rows: [
            { label: 'Illumination', value: x.eclipse ? 'Eclipse' : 'Sunlight', tone: x.eclipse ? 'orbit' : 'solar' },
            { label: 'Solar generation', value: `${Math.round(x.arrayW)} W` },
            { label: 'Load', value: `${Math.round(x.loadW)} W`, note: `payload ${Math.round(x.loads.payload)} W` },
            { label: 'Battery SOC', value: `${fmt(x.soc * 100)} %`, note: x.batteryW > 5 ? 'charging' : x.batteryW < -5 ? 'discharging' : 'full' },
            { label: 'Bus margin', value: `${signed(x.marginW, 0)} W` },
            { label: 'Mission time', value: missionClock(x.tMin) },
        ],
        mode: MODE[x.mode],
        health: [
            { name: 'Arrays', state: x.mode === 'nominal' ? 'NOMINAL' : 'FAULT' },
            { name: 'Battery', state: 'NOMINAL' },
            { name: 'Payload', state: x.mode === 'limited' ? 'WARNING' : 'NOMINAL' },
        ],
        note: notes[phase],
        alert: x.faultActive && x.mode !== 'limited',
    };
}

export function scCutawayAt(t: number) {
    const x = wrap(t, SC_LOOP);
    return smooth((x - 5.4) / 0.8) - smooth((x - 10.6) / 0.8) + smooth((x - 11.2) / 0.8) - smooth((x - 16.6) / 0.8);
}

const C = [0, 0, 0] as const;
const KEYS: CameraKey[] = [
    { t: 0, v: { az: -48, el: 22, dist: 1.5, target: C } },
    { t: 4.5, v: { az: -30, el: 14, dist: 1.0, target: C } },
    { t: 11, v: { az: 24, el: 18, dist: 0.95, target: C } },
    { t: 17, v: { az: 38, el: 9, dist: 1.0, target: C } },
    { t: 22, v: { az: -10, el: 12, dist: 1.04, target: C } },
];

export const scCameraAt = cameraPath(KEYS, SC_LOOP);
export const SC_HOME: View = KEYS[1].v;
/** 1 unit = 10 cm; the deployed span is about 9.6 m. */
export const SC_SPAN = 100;

export const SC_FOCUS: Record<ScPartId, View> = {
    arrays: { az: -24, el: 16, dist: 0.8, target: [-26, 2, 0] },
    power: { az: -14, el: 12, dist: 0.42, target: [0, 1, 4] },
    avionics: { az: -18, el: 22, dist: 0.42, target: [0, 7, 3] },
    comms: { az: 24, el: 18, dist: 0.48, target: [2, 18, 6] },
    payload: { az: -18, el: -14, dist: 0.46, target: [0, -18, 3] },
    propulsion: { az: 150, el: 8, dist: 0.5, target: [0, -5, -4] },
    thermal: { az: 200, el: 14, dist: 0.55, target: [0, 0, -4] },
};
