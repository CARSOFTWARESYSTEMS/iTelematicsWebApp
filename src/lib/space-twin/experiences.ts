/**
 * The four Space Digital Twin experiences behind one selector: story, selectable parts,
 * heads-up values, pinned labels and highlights, plus the text alternative, the model's maturity
 * and its published assumptions. The viewer renders whichever one is active.
 */
import { ECLIPSE_MIN, PERIOD_MIN, POWER } from '@/lib/energy-model';
import type { Maturity } from '@/components/site/blocks';
import {
    CON,
    CON_FOOTPRINT_KM,
    CON_HALF_ANGLE_DEG,
    CON_LINK_CLEARANCE_KM,
    CON_MIN_ELEV_DEG,
    CON_PERIOD_MIN,
    CON_SIM_MIN_PER_S,
    CON_SLOTS,
    CON_STATIONS,
    CON_STORY,
    conHud,
} from './constellation';
import { SAT_DETECT_RESIDUAL, SAT_FAULT_W, SAT_MARGIN, SAT_PARTS, SAT_RECOVERY_STEPS, SAT_SIM_MIN_PER_S, SAT_STORY, satChips, satHud, satTones } from './satellite';
import { SC_ARRAY_W, SC_LIMITED_PAYLOAD_DUTY, SC_MARGIN, SC_ORBIT, SC_PARTS, SC_POWER, SC_SIM_MIN_PER_S, SC_STORY, SC_TIMING, scChips, scHud, scTones, type ScPartId } from './spacecraft';
import { ST_ARRAY_KW, ST_LOAD_ECLIPSE_KW, ST_LOAD_SUN_KW, ST_MARGIN_PCT, ST_ORBIT, ST_PARTS, ST_POWER, ST_SIM_MIN_PER_S, ST_STORY, ST_TIMING, stChips, stHud, stTones, type StPartId } from './station';
import { fmt, signed, type Chip, type Hud, type Part, type StoryShape } from './story';

/**
 * What the experiences are built on, shown as labels under the section heading. AI and
 * cybersecurity are research directions, not features yet: today's fault detection is a
 * deterministic threshold rule and there is no cybersecurity demonstration, so both say Planned.
 */
export const TWIN_BASIS = [
    { label: 'Physics-based', planned: false },
    { label: 'Mathematical models', planned: false },
    { label: 'Data-driven', planned: false },
    { label: 'AI health monitoring', planned: true },
    { label: 'Cybersecurity', planned: true },
] as const;

export type ExperienceId = 'satellite' | 'constellation' | 'spacecraft' | 'station';
export type Glow = 'info' | 'alert';

export interface Experience {
    id: ExperienceId;
    number: string;
    label: string;
    story: StoryShape;
    parts: readonly Part[];
    /** How to pick things in this scene, for the hint under the buttons. */
    pickHint: string;
    hud: (t: number, elapsed: number, phase: string, selected: string | null) => Hud | null;
    chips: (t: number, phase: string, selected: string | null, compact: boolean) => Chip[];
    tones: (phase: string, selected: string | null) => Partial<Record<string, Glow>>;
    /** Text alternative: what the scene shows. */
    summary: string;
    maturity: Maturity;
    model: string;
    timeScale: string;
    assumptions: string[];
    /** Static summary of the story's outcome, for reduced motion. */
    steps?: string[];
}

const partName = (parts: readonly Part[], id: string | null) => parts.find((p) => p.id === id)?.name ?? '';

export const EXPERIENCES: readonly Experience[] = [
    {
        id: 'satellite',
        number: '01',
        label: 'Satellite',
        story: SAT_STORY,
        parts: SAT_PARTS,
        pickHint: 'Pick a subsystem, or click it on the model.',
        hud: (t, _e, phase) => satHud(t, phase),
        chips: (t, phase, selected, compact) => (selected ? [{ id: selected, text: partName(SAT_PARTS, selected) }] : satChips(phase, t, compact)),
        tones: (phase, selected) => (selected ? { [selected]: 'info' } : satTones(phase)),
        summary:
            'A 6U CubeSat-class Earth-observation satellite with two deployed solar-array wings, gold multi-layer insulation, antennas and a star tracker, above Earth. The story moves from the reveal to the subsystems inside, then mission health through sunlight and eclipse, then a simulated battery-heater fault, its detection and safe mode.',
        maturity: 'Simulation',
        model: 'Simplified engineering model: the published 6U reference case of Satellite Energy & Telemetry Intelligence.',
        timeScale: `1 s on screen = ${SAT_SIM_MIN_PER_S} simulated minutes`,
        assumptions: [
            `550 km circular orbit, β ≈ 20°: ${fmt(PERIOD_MIN)}-minute orbit with ${fmt(ECLIPSE_MIN)} minutes of eclipse (cylindrical shadow).`,
            `Orbit-average array power ${fmt(POWER.arrayW)} W in sunlight; loads ${POWER.loadSunW} W in sunlight and ${POWER.loadEclipseW} W in eclipse (payload off); η_EPS ${POWER.etaEps}, charge efficiency ${POWER.etaCharge}, ${POWER.batteryWh} Wh battery.`,
            `Fault: the published heater-stuck scenario (+${SAT_FAULT_W} W). Detection is a rule: SOC more than ${fmt(SAT_DETECT_RESIDUAL * 100)} percentage points below the model's prediction.`,
            `Safe mode turns the payload off in every phase (${POWER.loadEclipseW} W). Orbit margin: nominal ${signed(SAT_MARGIN.nominal)} %, with the fault ${signed(SAT_MARGIN.fault)} %, in safe mode ${signed(SAT_MARGIN.safe)} %. No credit is taken for the sun-pointing attitude.`,
            'The loop restarts from the settled nominal state; the spacecraft model is generic, not flight hardware.',
        ],
        steps: SAT_RECOVERY_STEPS,
    },
    {
        id: 'constellation',
        number: '02',
        label: 'Orbital Constellation',
        story: CON_STORY,
        parts: [],
        pickHint: 'Click a satellite to see its simulated state.',
        hud: (t, elapsed, _phase, selected) => conHud(elapsed, t, selected === null ? null : Number(selected.slice(4))),
        chips: (_t, phase, selected) => {
            const chips: Chip[] = [];
            if (phase === 'coverage' || phase === 'comms') for (const g of CON_STATIONS) chips.push({ id: g.id, text: g.name });
            if (selected !== null) chips.push({ id: selected, text: CON_SLOTS[Number(selected.slice(4))].id });
            return chips;
        },
        tones: () => ({}),
        summary: `A constellation of ${CON.total} satellites in ${CON.planes} orbital planes circling a rotating Earth, with three ground stations. Orbit rings appear first, then coverage footprints, then ground links that are drawn only when a satellite is above a station's horizon mask.`,
        maturity: 'Simulation',
        model: 'Simplified engineering model: circular two-body orbits around a spherical Earth.',
        timeScale: `1 s on screen = ${CON_SIM_MIN_PER_S} simulated minutes`,
        assumptions: [
            `Walker-delta ${CON.incDeg}°: ${CON.total}/${CON.planes}/${CON.phasing} at ${CON.altKm} km; period ${fmt(CON_PERIOD_MIN)} min from T = 2π√(a³/μ). No J2, drag or ellipsoid.`,
            `Coverage footprint for a ${CON_MIN_ELEV_DEG}° minimum elevation: λ = arccos(R cos ε / (R + h)) − ε = ${fmt(CON_HALF_ANGLE_DEG)}°, a ${Math.round(CON_FOOTPRINT_KM).toLocaleString('en')} km radius. Coverage share is sampled on 1,500 points.`,
            `A ground link is drawn only when the satellite's elevation is at least ${CON_MIN_ELEV_DEG}°; in-plane links only when the line of sight clears the surface by ${CON_LINK_CLEARANCE_KM} km. Links are overlays of geometric visibility, not visible beams.`,
            'Ground stations are illustrative locations. The Sun is fixed at a mid-November declination; shadow uses a cylindrical model. Satellites are drawn far larger than scale.',
        ],
    },
    {
        id: 'spacecraft',
        number: '03',
        label: 'Spacecraft',
        story: SC_STORY,
        parts: SC_PARTS,
        pickHint: 'Pick a subsystem to see its power draw.',
        hud: (t, _e, phase, selected) => scHud(t, phase, selected as ScPartId | null),
        chips: (t, phase, selected) => (selected ? [{ id: selected, text: partName(SC_PARTS, selected) }] : scChips(phase, t)),
        tones: (phase, selected) => (selected ? { [selected]: 'info' } : scTones(phase)),
        summary:
            'A generic unmanned Earth-observation spacecraft with a box-shaped bus, two sun-tracking solar-array wings, a high-gain antenna, a payload instrument and a propulsion module. Panels turn see-through to show the battery, power distribution, avionics and propellant tanks; the story follows energy through sunlight and eclipse, then a simulated array-string fault and a power-limited mode.',
        maturity: 'Simulation',
        model: 'Conceptual reference case, stepped with the same energy-balance equations as the 6U reference. Not a real mission.',
        timeScale: `1 s on screen = ${SC_SIM_MIN_PER_S} simulated minutes`,
        assumptions: [
            `${SC_ORBIT.altitudeKm} km circular orbit, β = ${SC_ORBIT.betaDeg}°: ${fmt(SC_TIMING.periodMin)}-minute orbit with ${fmt(SC_TIMING.eclipseMin)} minutes of eclipse.`,
            `Arrays ${fmt(SC_POWER.arrayPeakW / 1000)} kW at normal incidence; one-axis tracking leaves cos β, so ${Math.round(SC_ARRAY_W)} W in sunlight. ${fmt(SC_POWER.batteryWh / 1000)} kWh battery; η_EPS ${SC_POWER.etaEps}, charge efficiency ${SC_POWER.etaCharge}.`,
            `Loads by subsystem change with sunlight and eclipse (payload imaging only in sunlight, more heater power in eclipse). Orbit margin ${signed(SC_MARGIN.nominal)} %.`,
            `Fault: two of four strings on one wing open (−25 % array power): margin ${signed(SC_MARGIN.fault)} %. Rule-based response: payload duty ${SC_LIMITED_PAYLOAD_DUTY * 100} % in sunlight, margin ${signed(SC_MARGIN.limited)} %.`,
        ],
    },
    {
        id: 'station',
        number: '04',
        label: 'Space Station',
        story: ST_STORY,
        parts: ST_PARTS,
        pickHint: 'Pick a part of the station to explore it.',
        hud: (t, _e, phase, selected) => stHud(t, phase, selected as StPartId | null),
        chips: (t, phase, selected, compact) => (selected ? [{ id: selected, text: partName(ST_PARTS, selected) }] : stChips(phase, t, compact)),
        tones: (phase, selected) => (selected ? { [selected]: 'info' } : stTones(phase)),
        summary:
            'A generic modular space station above Earth: pressurised habitat and research modules, a long truss carrying eight large solar-array wings, radiators, battery units, antennas and docking ports with one visiting vehicle. The story follows energy from the arrays through the batteries to the station loads, then an eclipse in which stored energy carries the station until sunrise.',
        maturity: 'Concept',
        model: 'Conceptual station-level energy model for future research. iTelematics® does not operate a space station.',
        timeScale: `1 s on screen = ${ST_SIM_MIN_PER_S} simulated minutes`,
        assumptions: [
            `${ST_ORBIT.altitudeKm} km circular orbit at β = ${ST_ORBIT.betaDeg}° (longest eclipse): ${fmt(ST_TIMING.periodMin)}-minute orbit, ${fmt(ST_TIMING.eclipseMin)} minutes of eclipse.`,
            `${ST_ARRAY_KW} kW of two-axis tracking arrays; ${fmt(ST_POWER.batteryWh / 1000, 0)} kWh of batteries; η_EPS ${ST_POWER.etaEps}, charge efficiency ${ST_POWER.etaCharge}.`,
            `Grouped loads ${ST_LOAD_SUN_KW} kW in sunlight and ${ST_LOAD_ECLIPSE_KW} kW in eclipse, where a scheduled plan halves research loads. Orbit margin ${signed(ST_MARGIN_PCT)} %.`,
            'Energy only: no thermal, attitude, life-support or crew modelling. The station design is generic and not modelled on any real station.',
        ],
    },
];

export const experience = (id: ExperienceId) => EXPERIENCES.find((e) => e.id === id)!;
