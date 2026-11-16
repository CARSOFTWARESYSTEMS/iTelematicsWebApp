/**
 * Spacecraft RSC-1 after separation: deployment sequence, attitude, communication and electrical
 * power. RSC-1 is radioisotope-powered: at Jupiter sunlight is 1/5.2² ≈ 3.7 % of its strength at
 * Earth, so an outer-planet flyby carries radioisotope thermoelectric generators (RTGs) instead of
 * solar arrays, and the deployments are the booms its design has (RTG, magnetometer, science).
 *
 * Power: two RTGs feed a 30 V bus through a shunt regulator that dissipates whatever the loads do not
 * use; a small lithium-ion battery stands by for peaks above the generators' output. The balance
 * closes at every instant: RTG output = loads + battery charging + shunt dissipation (tested).
 */
import { YEAR } from './constants';
import { SPACECRAFT } from './vehicle';

export type Health = 'Nominal' | 'Warning' | 'Degraded' | 'Safe Mode' | 'Unavailable';

/** Times after spacecraft separation, s. */
export const DEPLOYMENT = {
    separation: 0,
    rateDamping: 30, // attitude thrusters start damping the separation tip-off rates
    attitudeStable: 150, // rates below 0.1°/s, Sun and star sensors locked
    rtgBoom: 210, // RTG boom unlatches and swings out (60 s)
    magnetometerBoom: 330, // 90 s
    scienceBoom: 480, // 60 s
    firstContact: 600, // ground station acquires the low-gain antenna downlink
    healthCheck: 720, // initial checkout begins
    end: 1200,
} as const;

export const BOOM_SECONDS = { rtgBoom: 60, magnetometerBoom: 90, scienceBoom: 60 } as const;

/** Electrical loads by subsystem, W. */
const LOADS = {
    computer: 32,
    heaters: 85,
    attitudeElectronics: 28,
    thrusterValves: 18, // while rates are being damped
    receiver: 14,
    transmitter: 64, // X-band at low-gain power
    instruments: 58, // switched on for the initial checkout
    boomMotor: 140, // while a boom is moving
} as const;

export interface PowerState {
    /** RTG electrical output, W. */
    rtg: number;
    loads: number;
    /** Battery power, W: positive when charging, negative when discharging. */
    battery: number;
    shunt: number;
    soc: number; // 0..1
    busVolts: number;
    margin: number; // (rtg − loads) / loads
    breakdown: { name: string; watts: number }[];
}

/** RTG electrical output after `years` of operation: Pu-238 decay and thermocouple degradation. */
export function rtgPower(years: number) {
    const decay = Math.pow(0.5, years / SPACECRAFT.halfLifeYears);
    const couples = Math.pow(1 - SPACECRAFT.thermocoupleLossPerYear, years);
    return SPACECRAFT.rtgCount * SPACECRAFT.rtgPowerBOL * decay * couples;
}

const moving = (t: number, start: number, seconds: number) => t >= start && t < start + seconds;

/** Loads at time t after separation. */
function loadsAt(t: number) {
    const list: { name: string; watts: number }[] = [
        { name: 'Flight computer', watts: LOADS.computer },
        { name: 'Heaters', watts: LOADS.heaters },
        { name: 'Attitude control electronics', watts: LOADS.attitudeElectronics },
        { name: 'Receiver', watts: LOADS.receiver },
    ];
    if (t >= DEPLOYMENT.rateDamping && t < DEPLOYMENT.attitudeStable) list.push({ name: 'Thruster valves', watts: LOADS.thrusterValves });
    if (t >= DEPLOYMENT.firstContact - 60) list.push({ name: 'Transmitter', watts: LOADS.transmitter });
    if (t >= DEPLOYMENT.healthCheck) list.push({ name: 'Science instruments', watts: LOADS.instruments });
    const boom = moving(t, DEPLOYMENT.rtgBoom, BOOM_SECONDS.rtgBoom) || moving(t, DEPLOYMENT.magnetometerBoom, BOOM_SECONDS.magnetometerBoom) || moving(t, DEPLOYMENT.scienceBoom, BOOM_SECONDS.scienceBoom);
    if (boom) list.push({ name: 'Boom deployment motor', watts: LOADS.boomMotor });
    return list;
}

const CHARGE_LIMIT = 40; // W

/**
 * Power state at time t (s) after separation. The deployment window is integrated once with 1 s steps
 * (battery state of charge carries the history of earlier peaks) and cached.
 */
let table: PowerState[] | null = null;

function buildTable(): PowerState[] {
    const capacity = SPACECRAFT.batteryWh * 3600; // J
    let energy = capacity * 0.96; // launched slightly below full; the RTGs top it up after separation
    const out: PowerState[] = [];
    for (let k = 0; k <= DEPLOYMENT.end; k++) {
        const rtg = rtgPower(k / YEAR);
        const breakdown = loadsAt(k);
        const loads = breakdown.reduce((a, b) => a + b.watts, 0);
        const surplus = rtg - loads;
        const battery = surplus >= 0 ? Math.min(surplus, CHARGE_LIMIT, capacity - energy) : Math.max(surplus, -energy);
        const shunt = Math.max(0, surplus - Math.max(0, battery));
        out.push({ rtg, loads, battery, shunt, soc: energy / capacity, busVolts: SPACECRAFT.busVolts, margin: surplus / loads, breakdown });
        energy = Math.min(capacity, Math.max(0, energy + battery));
    }
    return out;
}

export function powerAt(t: number): PowerState {
    const tab = powerOverride ?? (table ??= buildTable());
    return tab[Math.max(0, Math.min(tab.length - 1, Math.floor(t)))];
}

export type LinkState = 'Off' | 'Acquiring' | 'Locked (low-gain antenna)';

export function linkAt(t: number): LinkState {
    if (t < DEPLOYMENT.firstContact - 60) return 'Off';
    if (t < DEPLOYMENT.firstContact) return 'Acquiring';
    return 'Locked (low-gain antenna)';
}

/** Attitude state and body rate after separation (tip-off rate damped by thrusters). */
export function attitudeAt(t: number) {
    const tipOff = 1.2; // °/s at separation
    if (t < DEPLOYMENT.rateDamping) return { mode: 'Free drift after separation', rate: tipOff };
    if (t < DEPLOYMENT.attitudeStable) {
        const f = (t - DEPLOYMENT.rateDamping) / (DEPLOYMENT.attitudeStable - DEPLOYMENT.rateDamping);
        return { mode: 'Rate damping (thrusters)', rate: tipOff * Math.exp(-4 * f) };
    }
    return { mode: 'Sun and star sensors locked, three-axis stabilised', rate: 0.02 };
}

/** Deployment progress of each boom, 0 (stowed) … 1 (latched open). */
export function boomsAt(t: number) {
    const p = (start: number, seconds: number) => Math.max(0, Math.min(1, (t - start) / seconds));
    return {
        rtgBoom: p(DEPLOYMENT.rtgBoom, BOOM_SECONDS.rtgBoom),
        magnetometerBoom: p(DEPLOYMENT.magnetometerBoom, BOOM_SECONDS.magnetometerBoom),
        scienceBoom: p(DEPLOYMENT.scienceBoom, BOOM_SECONDS.scienceBoom),
    };
}

export function healthAt(t: number): Health {
    const p = powerAt(t);
    if (t >= safeOverride) return 'Safe Mode';
    if (p.margin < 0 && p.soc < 0.3) return 'Safe Mode';
    if (p.margin < 0) return 'Warning';
    return 'Nominal';
}

// ── Fault scenario: one RTG fails at separation ───────────────────────────

/**
 * The same power model with one generator lost at separation, run for `hours` after separation with
 * the spacecraft's fault protection: when the battery falls to 30 % it enters Safe Mode and switches
 * the science instruments off (the largest load it can shed). 1 s steps; `override` makes powerAt and
 * healthAt (and so the readings) follow this scenario while its topic is shown.
 */
export interface FaultPower {
    table: PowerState[];
    /** Seconds after separation: first deficit, Safe Mode entry. */
    deficitAt: number;
    safeModeAt: number;
    /** Lowest state of charge during the boom deployments, 0…1. */
    minSocDeploy: number;
    /** Loads before and after shedding, W. */
    loadsFull: number;
    loadsShed: number;
    rtg: number;
}

let faultCache: FaultPower | null = null;

export function rtgFaultScenario(hours = 12): FaultPower {
    if (faultCache) return faultCache;
    const capacity = SPACECRAFT.batteryWh * 3600;
    let energy = capacity * 0.96;
    let safe = false;
    let deficitAt = NaN;
    let safeModeAt = NaN;
    let minSocDeploy = 1;
    const table: PowerState[] = [];
    const end = hours * 3600;
    for (let k = 0; k <= end; k++) {
        const rtg = rtgPower(k / YEAR) / SPACECRAFT.rtgCount;
        let breakdown = loadsAt(Math.min(k, DEPLOYMENT.end));
        if (safe) breakdown = breakdown.filter((b) => b.name !== 'Science instruments');
        const loads = breakdown.reduce((a, b) => a + b.watts, 0);
        const surplus = rtg - loads;
        const battery = surplus >= 0 ? Math.min(surplus, CHARGE_LIMIT, capacity - energy) : Math.max(surplus, -energy);
        const shunt = Math.max(0, surplus - Math.max(0, battery));
        const soc = energy / capacity;
        table.push({ rtg, loads, battery, shunt, soc, busVolts: SPACECRAFT.busVolts, margin: surplus / loads, breakdown });
        if (surplus < 0 && k >= DEPLOYMENT.healthCheck && Number.isNaN(deficitAt)) deficitAt = k;
        if (k <= DEPLOYMENT.scienceBoom + BOOM_SECONDS.scienceBoom) minSocDeploy = Math.min(minSocDeploy, soc);
        if (!safe && soc < 0.3) {
            safe = true;
            safeModeAt = k;
        }
        energy = Math.min(capacity, Math.max(0, energy + battery));
    }
    const full = loadsAt(DEPLOYMENT.end).reduce((a, b) => a + b.watts, 0);
    const shed = loadsAt(DEPLOYMENT.end)
        .filter((b) => b.name !== 'Science instruments')
        .reduce((a, b) => a + b.watts, 0);
    return (faultCache = { table, deficitAt, safeModeAt, minSocDeploy, loadsFull: full, loadsShed: shed, rtg: rtgPower(0) / SPACECRAFT.rtgCount });
}

let powerOverride: PowerState[] | null = null;
let safeOverride = NaN;

/** Makes the power readings follow the one-generator scenario (null: the nominal spacecraft). */
export function setPowerScenario(on: boolean) {
    const f = on ? rtgFaultScenario() : null;
    powerOverride = f ? f.table : null;
    safeOverride = f ? f.safeModeAt : NaN;
}

export const powerScenarioActive = () => powerOverride !== null;
