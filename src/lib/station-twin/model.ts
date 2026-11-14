/**
 * Station Reference Case SRC-1, behind the interactive station model on /space-station.
 *
 * A conceptual modular research station for developing station-level energy and health
 * intelligence. Every parameter is illustrative: chosen to be physically plausible, taken from no
 * real station, and not validated. This is a simulation with stated assumptions, not flight data
 * and not an operational digital twin. It is separate from the 6U CubeSat reference case
 * (energy-model.ts) and from the Space Digital Twin experiences; it reuses only their published
 * energy-balance step and orbit-geometry functions, with its own parameters.
 *
 * Model: circular 400 km orbit at β = 0° (the longest eclipse), four independent solar power
 * channels on sun-tracking wings, one battery capacity for the four battery groups, loads grouped
 * by a fixed priority table, and a residual rule for channel health: measured channel power
 * against the model's expected power, flagged after a run of consecutive samples. Heat to reject is
 * estimated as the electrical load plus converter losses. Fixed time step, no randomness: every
 * visit and every replay shows the same values.
 */
import { energyStep, type EnergyParams } from '@/lib/energy-model';
import { eclipseWindows, inEclipse, orbitMarginPct, orbitTiming, sampleTrace, shadowFactor, type PowerSample } from '@/lib/space-twin/power';
import { cameraPath, fmt, missionClock, signed, wrap, type CameraKey, type Chip, type HealthState, type Hud, type Part, type Phase, type Stage, type View } from '@/lib/space-twin/story';

// ── Reference case ──────────────────────────────────────────────────────────

export const SRC_NAME = 'Station Reference Case SRC-1';

/** β = 0°: the Sun lies in the orbit plane, so each orbit has its longest eclipse. */
export const SRC_ORBIT = { altitudeKm: 400, betaDeg: 0 } as const;
export const SRC_TIMING = orbitTiming(SRC_ORBIT);

export const SRC_CHANNELS = 4;
/** Output of one power channel (two sun-tracking wings) while sunlit. */
export const SRC_CHANNEL_KW = 40;
export const SRC_ARRAY_KW = SRC_CHANNELS * SRC_CHANNEL_KW;

export const SRC_BATTERY_GROUPS = 4;
export const SRC_POWER: EnergyParams = {
    etaEps: 0.9, // regulation and distribution efficiency
    etaCharge: 0.95, // energy stored per unit of charging power
    batteryWh: 180_000, // 4 battery groups × 45 kWh usable
    taperFrom: 0.95, // charge power tapers linearly to zero between 95 % and 100 % SOC
};

export type Priority = 'critical' | 'essential' | 'deferrable';

/** Grouped electrical loads (kW) and the priority table that protects them. */
export const SRC_LOADS = [
    { id: 'eclss', name: 'Life support (ECLSS)', priority: 'critical', kw: 18 },
    { id: 'thermal', name: 'Thermal control', priority: 'critical', kw: 12 },
    { id: 'avionics', name: 'Avionics & guidance', priority: 'critical', kw: 6 },
    { id: 'comms', name: 'Communications', priority: 'critical', kw: 4 },
    { id: 'habitat', name: 'Habitat & crew systems', priority: 'essential', kw: 16 },
    { id: 'research', name: 'Research payloads', priority: 'deferrable', kw: 18 },
] as const satisfies readonly { id: string; name: string; priority: Priority; kw: number }[];

const loadSum = (priority: Priority) => SRC_LOADS.filter((l) => l.priority === priority).reduce((a, l) => a + l.kw, 0);
export const SRC_CRITICAL_KW = loadSum('critical');
export const SRC_ESSENTIAL_KW = loadSum('essential');
export const SRC_DEFERRABLE_KW = loadSum('deferrable');
/** Research payloads kept running in the protected configuration (experiment safing and data). */
export const SRC_DEFERRED_KW = 4;
export const SRC_LOAD_KW = SRC_CRITICAL_KW + SRC_ESSENTIAL_KW + SRC_DEFERRABLE_KW;
export const SRC_PROTECTED_LOAD_KW = SRC_CRITICAL_KW + SRC_ESSENTIAL_KW + SRC_DEFERRED_KW;

/** The simulated fault: one solar power section (channel 2) falls to 30 % of its expected output. */
export const SRC_FAULT = { channel: 2, factor: 0.3 } as const;
/** Health rule: residual above 20 % on 5 consecutive 1-minute telemetry samples. */
export const SRC_DETECT = { residual: 0.2, samples: 5, sampleMin: 1 } as const;
/** Minutes from detection until the load-priority table is applied (projected margin assessed first). */
export const SRC_ACTION_DELAY_MIN = 2;

/** Orbit energy margin for a sunlit array output and a constant load, with the published equations. */
export const srcMarginPct = (arrayKw: number, loadKw: number) =>
    orbitMarginPct({ arrayW: arrayKw * 1000, loadSunW: loadKw * 1000, loadEclipseW: loadKw * 1000, params: SRC_POWER, timing: SRC_TIMING });

export const SRC_DEGRADED_ARRAY_KW = SRC_ARRAY_KW - SRC_CHANNEL_KW * (1 - SRC_FAULT.factor);
export const SRC_MARGIN = {
    nominal: srcMarginPct(SRC_ARRAY_KW, SRC_LOAD_KW),
    degraded: srcMarginPct(SRC_DEGRADED_ARRAY_KW, SRC_LOAD_KW),
    protected: srcMarginPct(SRC_DEGRADED_ARRAY_KW, SRC_PROTECTED_LOAD_KW),
} as const;

/** Heat to reject: the electrical load ends as heat, plus converter losses. */
export const srcHeatKw = (loadKw: number) => loadKw / SRC_POWER.etaEps;

// ── Story time and simulated time ───────────────────────────────────────────

export const SRC_LOOP = 48;
export const SRC_STEP_MIN = 0.25;
/** The loop opens in sunlight, shortly after an eclipse exit. */
export const SRC_START_PHASE = 0.71;
/**
 * Story seconds → simulated minutes, piecewise linear: 3.5 minutes per second through the reveal,
 * exploration and health stages (so a whole eclipse fits), then 1 minute per second through the
 * recovery, so the fault, its detection and the protective response can be followed.
 */
const TIME_KEYS: readonly (readonly [number, number])[] = [
    [0, 0],
    [28, 98],
    [SRC_LOOP, 118],
];
export const SRC_SIM_MINUTES = TIME_KEYS[TIME_KEYS.length - 1][1];
export const SRC_RATES = { overview: 3.5, recovery: 1 } as const;

export function srcSimMinutes(t: number): number {
    const x = wrap(t, SRC_LOOP);
    for (let i = 1; i < TIME_KEYS.length; i++) {
        const [t0, m0] = TIME_KEYS[i - 1];
        const [t1, m1] = TIME_KEYS[i];
        if (x <= t1) return m0 + ((x - t0) * (m1 - m0)) / (t1 - t0);
    }
    return SRC_SIM_MINUTES;
}

/** Simulated minutes → story seconds (inverse of srcSimMinutes within one loop). */
export function srcStorySeconds(m: number): number {
    for (let i = 1; i < TIME_KEYS.length; i++) {
        const [t0, m0] = TIME_KEYS[i - 1];
        const [t1, m1] = TIME_KEYS[i];
        if (m <= m1) return t0 + ((m - m0) * (t1 - t0)) / (m1 - m0);
    }
    return SRC_LOOP;
}

const rateAt = (m: number) => {
    for (let i = 1; i < TIME_KEYS.length; i++) {
        const [t0, m0] = TIME_KEYS[i - 1];
        const [t1, m1] = TIME_KEYS[i];
        if (m <= m1) return (m1 - m0) / (t1 - t0);
    }
    return SRC_RATES.recovery;
};

/** Simulated minute of the fault: two story seconds into the recovery stage. */
export const SRC_FAULT_MIN = 100;

// ── Simulation ──────────────────────────────────────────────────────────────

export interface SrcSample extends PowerSample {
    /** Measured output of each channel, kW. */
    channelsKw: readonly number[];
    /** Channel 2: 1 − measured / expected (0 when not illuminated). */
    residual: number;
    faultActive: boolean;
    /** Residual above the threshold, not yet confirmed. */
    suspect: boolean;
    detected: boolean;
    protectedMode: boolean;
    criticalKw: number;
    essentialKw: number;
    deferrableKw: number;
    /** Projected orbit energy margin for the present array output and load configuration. */
    marginPct: number;
    heatKw: number;
}

const sunlit = (m: number) => !inEclipse(SRC_TIMING, SRC_START_PHASE + m / SRC_TIMING.periodMin);

/** Expected and measured channel output at simulated minute `m`. */
function channels(m: number, faultActive: boolean) {
    const lit = sunlit(m);
    const expected = lit ? SRC_CHANNEL_KW : 0;
    const measured = Array.from({ length: SRC_CHANNELS }, (_, i) => (faultActive && i + 1 === SRC_FAULT.channel ? expected * SRC_FAULT.factor : expected));
    return { lit, expected, measured };
}

/** Telemetry samples after the fault, until the rule confirms it. */
function detectionMinute(): number {
    let run = 0;
    for (let m = Math.ceil(SRC_FAULT_MIN / SRC_DETECT.sampleMin) * SRC_DETECT.sampleMin; m <= SRC_SIM_MINUTES; m += SRC_DETECT.sampleMin) {
        const { expected, measured } = channels(m, m >= SRC_FAULT_MIN);
        const residual = expected > 0 ? 1 - measured[SRC_FAULT.channel - 1] / expected : 0;
        run = residual > SRC_DETECT.residual ? run + 1 : 0;
        if (run >= SRC_DETECT.samples) return m;
    }
    return Infinity;
}

export const SRC_DETECT_MIN = detectionMinute();
export const SRC_ACTION_MIN = SRC_DETECT_MIN + SRC_ACTION_DELAY_MIN;

function stateAt(m: number) {
    const faultActive = m >= SRC_FAULT_MIN;
    const { lit, expected, measured } = channels(m, faultActive);
    const residual = expected > 0 ? 1 - measured[SRC_FAULT.channel - 1] / expected : 0;
    const protectedMode = m >= SRC_ACTION_MIN;
    const deferrableKw = protectedMode ? SRC_DEFERRED_KW : SRC_DEFERRABLE_KW;
    const loadKw = SRC_CRITICAL_KW + SRC_ESSENTIAL_KW + deferrableKw;
    const arrayKw = measured.reduce((a, b) => a + b, 0);
    // Projected margin uses the array's sunlit capability as measured (or as known, in eclipse).
    const sunlitArrayKw = faultActive ? SRC_DEGRADED_ARRAY_KW : SRC_ARRAY_KW;
    return {
        eclipse: !lit,
        arrayW: arrayKw * 1000,
        loadW: loadKw * 1000,
        channelsKw: measured,
        residual,
        faultActive,
        suspect: faultActive && lit && residual > SRC_DETECT.residual && m < SRC_DETECT_MIN,
        detected: m >= SRC_DETECT_MIN,
        protectedMode,
        criticalKw: SRC_CRITICAL_KW,
        essentialKw: SRC_ESSENTIAL_KW,
        deferrableKw,
        marginPct: srcMarginPct(sunlitArrayKw, loadKw),
        heatKw: srcHeatKw(loadKw),
    };
}

function run(): SrcSample[] {
    const dtH = SRC_STEP_MIN / 60;
    // Settle the state of charge over eight nominal orbits ending at the loop's starting phase.
    const perOrbit = Math.round(SRC_TIMING.periodMin / SRC_STEP_MIN);
    let soc = 0.95;
    for (let i = 0; i < perOrbit * 8; i++) {
        const m = (i - perOrbit * 8) * SRC_STEP_MIN;
        const lit = sunlit(m);
        soc = energyStep(SRC_POWER, lit ? SRC_ARRAY_KW * 1000 : 0, SRC_LOAD_KW * 1000, soc, dtH).soc;
    }
    const trace: SrcSample[] = [];
    const steps = Math.round(SRC_SIM_MINUTES / SRC_STEP_MIN);
    for (let i = 0; i <= steps; i++) {
        const tMin = i * SRC_STEP_MIN;
        const x = stateAt(tMin);
        const e = energyStep(SRC_POWER, x.arrayW, x.loadW, soc, dtH);
        trace.push({ tMin, ...x, marginW: e.marginW, batteryW: e.batteryW, soc });
        soc = e.soc;
    }
    return trace;
}

export const SRC_TRACE = run();
export const SRC_WINDOWS = eclipseWindows(SRC_TIMING, SRC_START_PHASE, SRC_SIM_MINUTES);

const firstEclipse = SRC_WINDOWS.find(([entry]) => entry > 0)!;
export const SRC_EVENTS = {
    eclipseEntry: srcStorySeconds(firstEclipse[0]),
    eclipseExit: srcStorySeconds(firstEclipse[1]),
    fault: srcStorySeconds(SRC_FAULT_MIN),
    detect: srcStorySeconds(SRC_DETECT_MIN),
    action: srcStorySeconds(SRC_ACTION_MIN),
} as const;

/** Lowest state of charge reached in the nominal eclipse, and the depth of discharge it implies. */
export const SRC_ECLIPSE_MIN_SOC = Math.min(...SRC_TRACE.filter((s) => s.tMin <= firstEclipse[1] + 1).map((s) => s.soc));

export const srcSampleAt = (t: number): SrcSample => sampleTrace(SRC_TRACE, SRC_STEP_MIN, srcSimMinutes(t));
export const srcShadowAt = (t: number) => {
    const m = srcSimMinutes(t);
    return shadowFactor(SRC_WINDOWS, m, rateAt(m));
};

// ── Story ───────────────────────────────────────────────────────────────────

export const SRC_STAGES: readonly Stage[] = [
    { id: 'reveal', label: 'Reveal', title: 'The station in orbit', start: 0, seconds: 6 },
    { id: 'explore', label: 'Explore', title: 'Major subsystems', start: 6, seconds: 8 },
    { id: 'health', label: 'Health', title: 'Energy and system health', start: 14, seconds: 14 },
    { id: 'recovery', label: 'Recovery', title: 'Simulated fault, protected response', start: 28, seconds: 20 },
];

export const SRC_PHASES: readonly Phase[] = [
    { id: 'reveal', stage: 0, start: 0 },
    { id: 'explore-structure', stage: 1, start: 6 },
    { id: 'explore-power', stage: 1, start: 8 },
    { id: 'explore-thermal', stage: 1, start: 10 },
    { id: 'explore-operations', stage: 1, start: 12 },
    { id: 'health', stage: 2, start: 14 },
    { id: 'health-eclipse', stage: 2, start: SRC_EVENTS.eclipseEntry },
    { id: 'health-sunrise', stage: 2, start: SRC_EVENTS.eclipseExit },
    { id: 'recovery', stage: 3, start: 28 },
    { id: 'fault', stage: 3, start: SRC_EVENTS.fault },
    { id: 'detected', stage: 3, start: SRC_EVENTS.detect },
    { id: 'protected', stage: 3, start: SRC_EVENTS.action },
];

export const SRC_STORY = { stages: SRC_STAGES, phases: SRC_PHASES, loopSeconds: SRC_LOOP } as const;

// ── Parts, highlights, labels and telemetry ─────────────────────────────────

export type SrcPartId = 'arrays' | 'distribution' | 'batteries' | 'radiators' | 'modules' | 'comms' | 'robotics' | 'docking' | 'truss';
/** Label anchors that are not selectable parts. */
export type SrcAnchorId = 'ch2' | 'research';

export const SRC_PARTS: readonly (Part & { id: SrcPartId; system: string })[] = [
    { id: 'arrays', system: 'solar-power', name: 'Solar power channels', short: 'Solar arrays', line: `Eight sun-tracking wings in ${SRC_CHANNELS} independent channels of ${SRC_CHANNEL_KW} kW: ${SRC_ARRAY_KW} kW while sunlit in this reference case.` },
    { id: 'distribution', system: 'power-distribution', name: 'Power distribution', short: 'Distribution', line: `Regulates array and battery power and switches it to every load by priority: ${SRC_CRITICAL_KW} kW critical, ${SRC_ESSENTIAL_KW} kW essential, ${SRC_DEFERRABLE_KW} kW deferrable research.` },
    { id: 'batteries', system: 'battery-storage', name: 'Battery energy storage', short: 'Batteries', line: `${SRC_BATTERY_GROUPS} battery groups, ${fmt(SRC_POWER.batteryWh / 1000, 0)} kWh usable in total, carry the station through each ${fmt(SRC_TIMING.eclipseMin, 0)}-minute eclipse.` },
    { id: 'radiators', system: 'thermal-control', name: 'Thermal radiators', short: 'Radiators', line: 'Pumped fluid loops carry heat from cabins and electronics to radiator panels, which reject it to space edge-on to the Sun.' },
    { id: 'modules', system: 'structures', name: 'Pressurised modules', short: 'Modules', line: 'Habitat, laboratory and node modules: the pressurised volume, and home of life support, avionics and the research racks.' },
    { id: 'comms', system: 'communications', name: 'Communications', short: 'Comms', line: 'A steerable high-gain antenna carries high-rate data; low-gain antennas keep a command and telemetry link in any attitude.' },
    { id: 'robotics', system: 'robotics-operations', name: 'Robotic arm', short: 'Robotics', line: 'A two-boom manipulator on the truss for inspection, maintenance and berthing of visiting vehicles.' },
    { id: 'docking', system: 'robotics-operations', name: 'Docking ports', short: 'Docking', line: 'Ports at each end of the module stack receive visiting crew and cargo vehicles. One generic vehicle is shown docked.' },
    { id: 'truss', system: 'structures', name: 'Integrated truss', short: 'Truss', line: 'The backbone: carries the arrays, radiators, batteries and power electronics away from the pressurised modules.' },
];

export type Glow = 'info' | 'alert';

const ch2Alert = (phase: string) => phase === 'fault' || phase === 'detected' || phase === 'protected';

export function srcTones(phase: string, selected: string | null): Partial<Record<SrcPartId | SrcAnchorId, Glow>> {
    if (selected) return { [selected]: 'info', ...(ch2Alert(phase) ? { ch2: 'alert' as const } : {}) };
    switch (phase) {
        case 'explore-structure':
            return { truss: 'info', modules: 'info' };
        case 'explore-power':
            return { arrays: 'info', ch2: 'info', batteries: 'info', distribution: 'info' };
        case 'explore-thermal':
            return { radiators: 'info', comms: 'info' };
        case 'explore-operations':
            return { robotics: 'info', docking: 'info' };
        case 'health':
            return { arrays: 'info', ch2: 'info', batteries: 'info' };
        case 'health-eclipse':
            return { batteries: 'info', distribution: 'info' };
        case 'health-sunrise':
            return { arrays: 'info', ch2: 'info' };
        case 'fault':
        case 'detected':
            return { ch2: 'alert' };
        case 'protected':
            return { ch2: 'alert', distribution: 'info', modules: 'info' };
        default:
            return {};
    }
}

export function srcChips(t: number, phase: string, selected: string | null, compact: boolean): Chip[] {
    if (selected) return [];
    const x = srcSampleAt(t);
    const ch2Pct = x.channelsKw[SRC_FAULT.channel - 1] / SRC_CHANNEL_KW;
    switch (phase) {
        case 'explore-structure':
            return compact ? [{ id: 'modules', text: 'Pressurised modules' }] : [{ id: 'truss', text: 'Integrated truss' }, { id: 'modules', text: 'Pressurised modules' }];
        case 'explore-power':
            return compact
                ? [{ id: 'arrays', text: `Solar · ${SRC_CHANNELS} channels` }]
                : [{ id: 'arrays', text: `Solar · ${SRC_CHANNELS} channels` }, { id: 'batteries', text: 'Battery groups' }, { id: 'distribution', text: 'Power distribution' }];
        case 'explore-thermal':
            return compact ? [{ id: 'radiators', text: 'Radiators' }] : [{ id: 'radiators', text: 'Thermal radiators' }, { id: 'comms', text: 'High-gain antenna' }];
        case 'explore-operations':
            return compact ? [{ id: 'robotics', text: 'Robotic arm' }] : [{ id: 'robotics', text: 'Robotic arm' }, { id: 'docking', text: 'Docking port' }];
        case 'health':
            return [
                { id: 'arrays', text: `Solar ${fmt(x.arrayW / 1000, 0)} kW` },
                { id: 'batteries', text: `SOC ${fmt(x.soc * 100, 0)} %` },
            ];
        case 'health-eclipse':
            return [{ id: 'batteries', text: `Batteries supplying ${fmt(-x.batteryW / 1000, 0)} kW` }];
        case 'health-sunrise':
            return [{ id: 'arrays', text: 'Sunrise · recharging' }];
        case 'recovery':
            return [{ id: 'arrays', text: `${SRC_CHANNELS} channels nominal` }];
        case 'fault':
            return [{ id: 'ch2', text: `Channel ${SRC_FAULT.channel} · ${fmt(ch2Pct * 100, 0)} % of expected`, alert: true }];
        case 'detected':
            return compact
                ? [{ id: 'ch2', text: `Channel ${SRC_FAULT.channel} degraded`, alert: true }]
                : [
                      { id: 'ch2', text: `Channel ${SRC_FAULT.channel} degraded`, alert: true },
                      { id: 'distribution', text: `Orbit margin ${signed(x.marginPct)} %`, alert: true },
                  ];
        case 'protected':
            return compact
                ? [{ id: 'modules', text: 'Critical loads 100 %' }]
                : [
                      { id: 'ch2', text: `Channel ${SRC_FAULT.channel} degraded`, alert: true },
                      { id: 'modules', text: 'Critical loads 100 %' },
                      { id: 'research', text: `Research ${SRC_DEFERRABLE_KW} → ${SRC_DEFERRED_KW} kW` },
                  ];
        default:
            return [];
    }
}

/** Charging along the array routes, discharging to the modules, or neither (full, or no story flow). */
export function srcFlow(t: number): 'charge' | 'discharge' | null {
    const x = srcSampleAt(t);
    if (x.batteryW > 500 && x.arrayW > 0) return 'charge';
    if (x.batteryW < -500) return 'discharge';
    return null;
}

const HUD_PHASES = new Set(['health', 'health-eclipse', 'health-sunrise', 'recovery', 'fault', 'detected', 'protected']);

function channelState(x: SrcSample, channel: number): HealthState {
    if (channel !== SRC_FAULT.channel || !x.faultActive) return 'NOMINAL';
    if (x.detected) return 'FAULT';
    return x.suspect ? 'WARNING' : 'NOMINAL';
}

export function srcHud(t: number, phase: string, selected: string | null): Hud | null {
    if (!selected && !HUD_PHASES.has(phase)) return null;
    const x = srcSampleAt(t);
    const loadKw = x.loadW / 1000;
    const battery = x.batteryW > 500 ? `charging ${fmt(x.batteryW / 1000, 0)} kW` : x.batteryW < -500 ? `discharging ${fmt(-x.batteryW / 1000, 0)} kW` : 'full';
    const ch2Pct = x.channelsKw[SRC_FAULT.channel - 1] / SRC_CHANNEL_KW;
    const mode = x.protectedMode
        ? { label: 'Protected · critical loads first', tone: 'solar' as const }
        : x.detected
          ? { label: `Channel ${SRC_FAULT.channel} degraded`, tone: 'fault' as const }
          : x.eclipse
            ? { label: 'Eclipse · on batteries', tone: 'orbit' as const }
            : { label: 'Nominal', tone: 'nominal' as const };
    const note =
        phase === 'fault'
            ? `Simulated fault: channel ${SRC_FAULT.channel} output falls to ${fmt(SRC_FAULT.factor * 100, 0)} % of the model's expected power.`
            : phase === 'detected'
              ? `Residual above ${fmt(SRC_DETECT.residual * 100, 0)} % on ${SRC_DETECT.samples} consecutive 1-minute samples: channel ${SRC_FAULT.channel} flagged degraded. Projected orbit margin is negative.`
              : phase === 'protected'
                ? `Load priority applied: research payloads deferred (${SRC_DEFERRABLE_KW} → ${SRC_DEFERRED_KW} kW); critical loads stay at 100 %.`
                : phase === 'health-eclipse'
                  ? 'Eclipse: the batteries carry every load until sunrise.'
                  : undefined;
    return {
        rows: [
            { label: 'Solar generation', value: `${fmt(x.arrayW / 1000)} kW`, note: x.eclipse ? 'eclipse' : x.faultActive ? `ch ${SRC_FAULT.channel} at ${fmt(ch2Pct * 100, 0)} %` : `${SRC_CHANNELS} channels`, tone: x.eclipse ? 'orbit' : 'solar' },
            { label: 'Battery SOC', value: `${fmt(x.soc * 100)} %`, note: battery },
            { label: 'Critical loads', value: `${fmt(x.criticalKw)} kW`, note: '100 % powered', tone: 'nominal' },
            { label: 'Orbit margin', value: `${signed(x.marginPct)} %`, note: 'projected', tone: x.marginPct < 0 ? 'fault' : 'nominal' },
            { label: 'Station load', value: `${fmt(loadKw)} kW`, note: x.protectedMode ? `research deferred to ${SRC_DEFERRED_KW} kW` : `research ${SRC_DEFERRABLE_KW} kW` },
            { label: 'Thermal load', value: `${fmt(x.heatKw)} kW`, note: 'heat to reject' },
            { label: 'Mission time', value: missionClock(x.tMin) },
        ],
        mode,
        health: [
            ...Array.from({ length: SRC_CHANNELS }, (_, i) => ({ name: `Ch ${i + 1}`, state: channelState(x, i + 1) })),
            { name: 'Distribution', state: 'NOMINAL' as const },
            { name: 'Batteries', state: 'NOMINAL' as const },
            { name: 'Thermal', state: 'NOMINAL' as const },
        ],
        note,
        alert: x.detected && !x.protectedMode,
    };
}

/** Reduced motion: the recovery, step by step, from the model's own values. */
export const SRC_RECOVERY_STEPS = [
    `Channel ${SRC_FAULT.channel} output falls to ${fmt(SRC_FAULT.factor * 100, 0)} % of expected (simulated fault).`,
    `Residual above ${fmt(SRC_DETECT.residual * 100, 0)} % for ${SRC_DETECT.samples} consecutive samples: channel flagged degraded.`,
    `Projected orbit margin falls from ${signed(SRC_MARGIN.nominal)} % to ${signed(SRC_MARGIN.degraded)} %.`,
    `Research payloads deferred (${SRC_DEFERRABLE_KW} → ${SRC_DEFERRED_KW} kW); critical loads stay at ${SRC_CRITICAL_KW} kW.`,
    `Margin restored to ${signed(SRC_MARGIN.protected)} %.`,
];

export const SRC_SUMMARY =
    'A conceptual modular research station in low Earth orbit: an integrated truss with eight sun-tracking solar wings in four power channels, battery groups, power electronics and radiators, above a stack of pressurised modules with a robotic arm, antennas and two docking ports.';

export const SRC_ASSUMPTIONS = [
    `${SRC_NAME} is a conceptual station, not modelled on any real station. All parameters are illustrative and unvalidated.`,
    `Circular ${SRC_ORBIT.altitudeKm} km orbit at β = ${SRC_ORBIT.betaDeg}°, the longest eclipse: ${fmt(SRC_TIMING.periodMin)} min period, ${fmt(SRC_TIMING.eclipseMin)} min in shadow (cylindrical shadow model).`,
    `${SRC_CHANNELS} power channels of ${SRC_CHANNEL_KW} kW while sunlit, sun-tracking, no self-shadowing or seasonal β variation; zero output in eclipse.`,
    `Regulation and distribution efficiency ${fmt(SRC_POWER.etaEps * 100, 0)} %, charge efficiency ${fmt(SRC_POWER.etaCharge * 100, 0)} %, ${fmt(SRC_POWER.batteryWh / 1000, 0)} kWh usable storage, charge taper above ${fmt(SRC_POWER.taperFrom * 100, 0)} % SOC. The same energy-balance step as the published 6U reference case, with these station parameters.`,
    `Constant grouped loads: ${SRC_CRITICAL_KW} kW critical, ${SRC_ESSENTIAL_KW} kW essential, ${SRC_DEFERRABLE_KW} kW deferrable research (${SRC_LOAD_KW} kW in total). Thermal load is estimated as load ÷ efficiency; there is no thermal model.`,
    `Health rule: channel residual (measured against expected power) above ${fmt(SRC_DETECT.residual * 100, 0)} % on ${SRC_DETECT.samples} consecutive 1-minute samples. The protective response applies a fixed load-priority table ${SRC_ACTION_DELAY_MIN} minutes after detection.`,
    `Projected orbit margins: ${signed(SRC_MARGIN.nominal)} % nominal, ${signed(SRC_MARGIN.degraded)} % with channel ${SRC_FAULT.channel} degraded, ${signed(SRC_MARGIN.protected)} % after load priority.`,
    'Visual proportions are approximate; the Earth is drawn large and close, not to scale.',
];

// ── Camera ──────────────────────────────────────────────────────────────────

const C = [0, -2.5, 0] as const;
const KEYS: CameraKey[] = [
    { t: 0, v: { az: 64, el: 34, dist: 1.6, target: C } },
    { t: 5, v: { az: 36, el: 20, dist: 1.0, target: C } },
    { t: 8, v: { az: 20, el: 14, dist: 0.92, target: C } },
    { t: 11, v: { az: 62, el: 26, dist: 0.9, target: C } },
    { t: 14, v: { az: -18, el: 22, dist: 1.0, target: C } },
    { t: 21, v: { az: -34, el: 12, dist: 1.04, target: C } },
    { t: 28, v: { az: -8, el: 20, dist: 1.0, target: C } },
    { t: 32, v: { az: -52, el: 16, dist: 0.82, target: C } },
    { t: 40, v: { az: -40, el: 22, dist: 0.9, target: C } },
];

export const srcCameraAt = cameraPath(KEYS, SRC_LOOP);
export const SRC_HOME: View = KEYS[1].v;
/** 1 unit = 1 m; the truss and its wings span about 112 m. */
export const SRC_SPAN = 112;

export const SRC_FOCUS: Record<SrcPartId, View> = {
    arrays: { az: 24, el: 14, dist: 0.6, target: [-40, 0, 0] },
    distribution: { az: 26, el: -12, dist: 0.26, target: [0, -2.6, 0] },
    batteries: { az: 30, el: -14, dist: 0.3, target: [-26, -2.4, 1] },
    radiators: { az: 64, el: 24, dist: 0.42, target: [16, 0, -9] },
    modules: { az: 42, el: 16, dist: 0.4, target: [0, -6.5, 4] },
    comms: { az: 36, el: 20, dist: 0.24, target: [9, 5, -1.5] },
    robotics: { az: 18, el: 22, dist: 0.32, target: [-12, 4, 3] },
    docking: { az: 30, el: 8, dist: 0.34, target: [0, -6.5, 24] },
    truss: { az: 12, el: 28, dist: 0.66, target: [-8, 0, 0] },
};
