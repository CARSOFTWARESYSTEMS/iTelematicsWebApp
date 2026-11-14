/**
 * Experience 04 · Space Station. A generic modular orbital station representing future Space
 * Station Digital Twin research: not an operated station and not modelled on one. A conceptual
 * reference case at station-level energy only: eight sun-tracking array wings, station batteries,
 * grouped electrical loads and a scheduled eclipse load plan, stepped with the same energy balance
 * as the 6U reference case. No thermal, attitude, life-support or crew modelling.
 */
import { energyStep, type EnergyParams } from '@/lib/energy-model';
import { eclipseWindows, inEclipse, orbitMarginPct, orbitTiming, sampleTrace, shadowFactor, type PowerSample } from './power';
import { cameraPath, fmt, missionClock, wrap, type CameraKey, type Chip, type Hud, type Part, type Phase, type Stage, type View } from './story';

/** β = 0° is the worst case: the longest eclipse of the year. */
export const ST_ORBIT = { altitudeKm: 400, betaDeg: 0 } as const;
export const ST_TIMING = orbitTiming(ST_ORBIT);

export const ST_WINGS = 8;
export const ST_WING_KW = 20;

export const ST_POWER: EnergyParams = {
    etaEps: 0.9,
    etaCharge: 0.95,
    batteryWh: 192_000, // 8 battery units × 24 kWh
    taperFrom: 0.95,
};

/** Two-axis tracking keeps the arrays square to the Sun while sunlit. */
export const ST_ARRAY_KW = ST_WINGS * ST_WING_KW;

/** Grouped station loads in kW, sunlight / eclipse. Research loads follow a scheduled 50 % plan in eclipse. */
export const ST_LOADS = {
    habitat: { name: 'Habitat systems', sun: 30, eclipse: 30 },
    research: { name: 'Research payloads', sun: 20, eclipse: 10 },
    thermal: { name: 'Thermal control', sun: 12, eclipse: 14 },
    gnc: { name: 'Guidance & control', sun: 5, eclipse: 5 },
    comms: { name: 'Comms & data', sun: 3, eclipse: 3 },
} as const;

const sumLoads = (eclipse: boolean) => Object.values(ST_LOADS).reduce((a, l) => a + (eclipse ? l.eclipse : l.sun), 0);
export const ST_LOAD_SUN_KW = sumLoads(false);
export const ST_LOAD_ECLIPSE_KW = sumLoads(true);

export const ST_LOOP = 29;
/** One story second shows 3.5 simulated minutes. */
export const ST_SIM_MIN_PER_S = 3.5;
export const ST_STEP_MIN = 0.25;
/** The loop opens in sunlight, just after an eclipse exit. */
export const ST_START_PHASE = 0.7;

export interface StSample extends PowerSample {
    researchKw: number;
}

function run() {
    const steps = Math.round((ST_LOOP * ST_SIM_MIN_PER_S) / ST_STEP_MIN);
    const dtH = ST_STEP_MIN / 60;
    const perOrbit = Math.round(ST_TIMING.periodMin / ST_STEP_MIN);
    const at = (tMin: number) => {
        const eclipse = inEclipse(ST_TIMING, ST_START_PHASE + tMin / ST_TIMING.periodMin);
        return { eclipse, arrayW: eclipse ? 0 : ST_ARRAY_KW * 1000, loadW: (eclipse ? ST_LOAD_ECLIPSE_KW : ST_LOAD_SUN_KW) * 1000 };
    };
    let soc = 0.95;
    for (let i = 0; i < perOrbit * 8; i++) {
        const x = at((i % perOrbit) * ST_STEP_MIN);
        soc = energyStep(ST_POWER, x.arrayW, x.loadW, soc, dtH).soc;
    }
    const trace: StSample[] = [];
    for (let i = 0; i <= steps; i++) {
        const tMin = i * ST_STEP_MIN;
        const x = at(tMin);
        const e = energyStep(ST_POWER, x.arrayW, x.loadW, soc, dtH);
        trace.push({ tMin, ...x, marginW: e.marginW, batteryW: e.batteryW, soc, researchKw: x.eclipse ? ST_LOADS.research.eclipse : ST_LOADS.research.sun });
        soc = e.soc;
    }
    return trace;
}

export const ST_TRACE = run();
export const ST_WINDOWS = eclipseWindows(ST_TIMING, ST_START_PHASE, ST_LOOP * ST_SIM_MIN_PER_S);

export const ST_MARGIN_PCT = orbitMarginPct({
    arrayW: ST_ARRAY_KW * 1000,
    loadSunW: ST_LOAD_SUN_KW * 1000,
    loadEclipseW: ST_LOAD_ECLIPSE_KW * 1000,
    params: ST_POWER,
    timing: ST_TIMING,
});

const s = (min: number) => min / ST_SIM_MIN_PER_S;

export const ST_EVENTS = {
    eclipseEntry: s(ST_WINDOWS.find(([entry]) => entry > 0)![0]),
    eclipseExit: s(ST_WINDOWS.find(([entry]) => entry > 0)![1]),
} as const;

export const ST_STAGES: readonly Stage[] = [
    { id: 'reveal', label: 'Reveal', title: 'Station reveal', start: 0, seconds: 5 },
    { id: 'explore', label: 'Explore', title: 'Modules and structure', start: 5, seconds: 5 },
    { id: 'energy', label: 'Energy', title: 'Station energy flow', start: 10, seconds: 5 },
    { id: 'operations', label: 'Operations', title: 'Eclipse operations', start: 15, seconds: 14 },
];

export const ST_PHASES: readonly Phase[] = [
    { id: 'reveal', stage: 0, start: 0 },
    { id: 'explore-modules', stage: 1, start: 5 },
    { id: 'explore-truss', stage: 1, start: 6.7 },
    { id: 'explore-docking', stage: 1, start: 8.4 },
    { id: 'energy', stage: 2, start: 10 },
    { id: 'operations', stage: 3, start: 15 },
    { id: 'eclipse', stage: 3, start: ST_EVENTS.eclipseEntry },
    { id: 'sunrise', stage: 3, start: ST_EVENTS.eclipseExit },
];

export const ST_STORY = { stages: ST_STAGES, phases: ST_PHASES, loopSeconds: ST_LOOP } as const;

export const stSimMinutes = (t: number) => wrap(t, ST_LOOP) * ST_SIM_MIN_PER_S;
export const stSampleAt = (t: number): StSample => sampleTrace(ST_TRACE, ST_STEP_MIN, stSimMinutes(t));
export const stShadowAt = (t: number) => shadowFactor(ST_WINDOWS, stSimMinutes(t), ST_SIM_MIN_PER_S);

export type StPartId = 'modules' | 'research' | 'truss' | 'arrays' | 'power' | 'radiators' | 'docking' | 'comms';

export const ST_PARTS: readonly (Part & { id: StPartId })[] = [
    { id: 'modules', name: 'Habitat modules', short: 'Modules', line: 'Pressurised modules joined by nodes form the station’s core; their systems are the largest steady electrical load.' },
    { id: 'research', name: 'Research modules', short: 'Research', line: `Laboratory module and external payload platform. Research loads (${ST_LOADS.research.sun} kW) follow a schedule and drop to ${ST_LOADS.research.eclipse} kW in eclipse.` },
    { id: 'truss', name: 'Integrated truss', short: 'Truss', line: 'The backbone carries the arrays, radiators, power electronics and battery units, away from the pressurised modules.' },
    { id: 'arrays', name: 'Solar array wings', short: 'Solar arrays', line: `${ST_WINGS} two-axis tracking wings of ${ST_WING_KW} kW each: ${ST_ARRAY_KW} kW while sunlit (conceptual).` },
    { id: 'power', name: 'Batteries & power distribution', short: 'Batteries & EPS', line: `Battery units on the truss store ${fmt(ST_POWER.batteryWh / 1000, 0)} kWh; power electronics regulate and distribute array and battery power to every module.` },
    { id: 'radiators', name: 'Thermal radiators', short: 'Radiators', line: 'Deployable radiator panels reject heat from the modules and power electronics; they sit edge-on to the Sun.' },
    { id: 'docking', name: 'Docking interfaces', short: 'Docking', line: 'Ports at each end of the module stack receive visiting cargo and crew vehicles. One generic vehicle is shown docked.' },
    { id: 'comms', name: 'Communications', short: 'Comms', line: 'A steerable high-gain antenna on the truss relays data and voice; low-gain antennas carry commands.' },
];

export type Glow = 'info' | 'alert';

export function stTones(phase: string): Partial<Record<StPartId, Glow>> {
    switch (phase) {
        case 'explore-modules':
            return { modules: 'info', research: 'info' };
        case 'explore-truss':
            return { truss: 'info', radiators: 'info' };
        case 'explore-docking':
            return { docking: 'info', comms: 'info' };
        case 'energy':
            return { arrays: 'info', power: 'info' };
        case 'eclipse':
            return { power: 'info' };
        case 'sunrise':
            return { arrays: 'info' };
        default:
            return {};
    }
}

export function stChips(phase: string, t: number, compact: boolean): Chip[] {
    const x = stSampleAt(t);
    switch (phase) {
        case 'explore-modules':
            return compact ? [{ id: 'modules', text: 'Habitat modules' }] : [{ id: 'modules', text: 'Habitat modules' }, { id: 'research', text: 'Research modules' }];
        case 'explore-truss':
            return compact ? [{ id: 'truss', text: 'Truss' }] : [{ id: 'truss', text: 'Integrated truss' }, { id: 'radiators', text: 'Radiators' }];
        case 'explore-docking':
            return compact ? [{ id: 'docking', text: 'Docking port' }] : [{ id: 'docking', text: 'Docking port' }, { id: 'comms', text: 'High-gain antenna' }];
        case 'energy':
            return [
                { id: 'arrays', text: `Arrays ${fmt(x.arrayW / 1000, 0)} kW` },
                { id: 'power', text: `Batteries ${fmt(x.soc * 100, 0)} %` },
            ];
        case 'eclipse':
            return [{ id: 'power', text: `Batteries supplying ${fmt(x.loadW / 1000, 0)} kW` }];
        case 'sunrise':
            return [{ id: 'arrays', text: 'Sunrise · arrays recharging' }];
        default:
            return [];
    }
}

export function stFlow(t: number): 'charge' | 'discharge' | null {
    const x = stSampleAt(t);
    if (x.batteryW > 500 && x.arrayW > 0) return 'charge';
    if (x.batteryW < -500) return 'discharge';
    return null;
}

export function stHud(t: number, phase: string, selected: StPartId | null): Hud | null {
    if (!selected && !['energy', 'operations', 'eclipse', 'sunrise'].includes(phase)) return null;
    const x = stSampleAt(t);
    const status = x.eclipse
        ? `Batteries supplying ${fmt(x.loadW / 1000)} kW`
        : x.batteryW > 500
          ? `Arrays carrying loads · charging ${fmt(x.batteryW / 1000)} kW`
          : 'Arrays carrying loads · batteries full';
    return {
        rows: [
            { label: 'Illumination', value: x.eclipse ? 'Eclipse' : 'Sunlight', tone: x.eclipse ? 'orbit' : 'solar' },
            { label: 'Solar generation', value: `${fmt(x.arrayW / 1000)} kW` },
            { label: 'Station load', value: `${fmt(x.loadW / 1000)} kW`, note: `research ${fmt(x.researchKw, 0)} kW` },
            { label: 'Battery SOC', value: `${fmt(x.soc * 100)} %`, note: x.batteryW > 500 ? 'charging' : x.batteryW < -500 ? 'discharging' : 'full' },
            { label: 'Energy status', value: status },
            { label: 'Mission time', value: missionClock(x.tMin) },
        ],
        mode: x.eclipse ? { label: 'Eclipse plan', tone: 'orbit' } : { label: 'Sunlit plan', tone: 'solar' },
        note: phase === 'eclipse' ? `Scheduled eclipse plan: research loads reduced to ${ST_LOADS.research.eclipse} kW until sunrise.` : undefined,
    };
}

const C = [0, -2, 0] as const;
const KEYS: CameraKey[] = [
    { t: 0, v: { az: 58, el: 30, dist: 1.55, target: C } },
    { t: 5, v: { az: 32, el: 18, dist: 0.92, target: C } },
    { t: 10, v: { az: -22, el: 26, dist: 1.0, target: C } },
    { t: 15, v: { az: -40, el: 14, dist: 1.04, target: C } },
    { t: 22, v: { az: -6, el: 20, dist: 1.08, target: C } },
];

export const stCameraAt = cameraPath(KEYS, ST_LOOP);
export const ST_HOME: View = KEYS[1].v;
/** 1 unit = 1 m; the array span is about 110 m. */
export const ST_SPAN = 110;

export const ST_FOCUS: Record<StPartId, View> = {
    modules: { az: 40, el: 16, dist: 0.36, target: [0, -6.5, 8] },
    research: { az: -38, el: 18, dist: 0.36, target: [2, -6.5, -6] },
    truss: { az: 12, el: 26, dist: 0.62, target: [-10, 0, 0] },
    arrays: { az: 28, el: 14, dist: 0.62, target: [40, 0, 0] },
    power: { az: 18, el: -10, dist: 0.3, target: [31, -2, 1] },
    radiators: { az: 62, el: 22, dist: 0.42, target: [19, 0, -9] },
    docking: { az: 30, el: 8, dist: 0.36, target: [0, -6.5, 24] },
    comms: { az: 34, el: 18, dist: 0.26, target: [6, 5, -1.6] },
};
