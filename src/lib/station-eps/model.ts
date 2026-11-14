/**
 * EPS-1: the electrical power system of Station Reference Case SRC-1, as a deterministic engineering
 * model. A conceptual modular station, modelled on no real station; every parameter is illustrative and
 * unvalidated, and every value it produces is SIMULATED. It is not an operational digital twin and is
 * connected to no real system.
 *
 * Architecture (per power channel, four channels):
 *   solar array → shunt regulator → primary bus ⇄ battery charge/discharge unit ⇄ battery group
 *   primary bus → main bus switching (cross-ties 1↔2, 3↔4) → DC-DC converter → remote power controllers → loads
 * Critical loads are dual-fed (a primary and an alternate channel); other loads are single-fed.
 *
 * One fixed time step integrates everything, so the 3D view, telemetry, health states and outcomes all
 * read the same trace. At every step the power balance closes exactly:
 *   P_array_drawn = P_loads + P_stored + P_losses     (P_stored < 0 when the battery discharges)
 */
import { inEclipse, orbitTiming, type OrbitTiming } from '@/lib/space-twin/power';

// ── Parameters ──────────────────────────────────────────────────────────────

export type ChannelId = 1 | 2 | 3 | 4;
export const CHANNELS: readonly ChannelId[] = [1, 2, 3, 4];

export const EPS = {
    orbit: { altitudeKm: 400, betaDeg: 0 },
    /** Orbit phase at t = 0: in sunlight, shortly after sunrise (as in SRC-1). */
    startPhase: 0.71,
    stepMin: 0.25,
    array: {
        /** Beginning-of-life output of one channel (two wings) at 28 °C, square to the Sun. */
        ratedKw: 46.8,
        refTempC: 28,
        /** Power temperature coefficient of the cells, per °C. */
        tempCoeff: -0.0035,
        sunlitTempC: 60,
        eclipseTempC: -70,
        thermalTauMin: 12,
        degradationPerYear: 0.0075,
        ageYears: 5,
        trackingErrorDeg: 2,
        operatingV: 160,
        /** Partial-shadow transition at eclipse entry and exit. */
        penumbraMin: 0.5,
    },
    bus: { primaryV: 160, eclipseV: 151, secondaryV: 120 },
    eff: {
        /** Array → primary bus (shunt regulator). */
        regulator: 0.97,
        /** Primary bus → secondary loads (DC-DC converter). */
        converter: 0.928,
        /** Bus → stored energy, and stored energy → bus (battery charge/discharge unit and cells). */
        charge: 0.95,
        discharge: 0.97,
    },
    battery: {
        usableKwh: 45,
        cellsInSeries: 30,
        cellVEmpty: 3.4,
        cellVFull: 4.15,
        resistanceOhm: 0.015,
        maxChargeKw: 20,
        maxDischargeKw: 30,
        taperFrom: 0.95,
        socWarning: 0.4,
        socCritical: 0.25,
        socFloor: 0.05,
        thermalMassJPerK: 6e4,
        coolingWPerK: 60,
        coldPlateC: 15,
        tempWarningC: 28,
        tempLimitC: 35,
        /** Charge-power limit applied by protection when the warning temperature is reached. */
        thermalChargeLimit: 0.25,
    },
    /** Power a cross-tie can carry between paired channels. */
    crossTieKw: 12,
    detection: { residual: 0.15, samples: 5, sampleMin: 1 },
    /** Minutes between detection and the recovery decision (margin re-evaluation). */
    evaluationMin: 2,
} as const;

export const CROSS_TIES: readonly (readonly [ChannelId, ChannelId])[] = [
    [1, 2],
    [3, 4],
];
const pairOf = (c: ChannelId): ChannelId => (CROSS_TIES.find((p) => p.includes(c))!.find((x) => x !== c) as ChannelId);

export type LoadGroup = 'critical' | 'essential' | 'deferrable';
export interface LoadDef {
    id: string;
    name: string;
    group: LoadGroup;
    kw: number;
    channel: ChannelId;
    /** Alternate feed for dual-fed (critical) loads. */
    alternate?: ChannelId;
}

/** 74 kW in total, 18.5 kW per channel: 40 kW critical, 16 kW essential, 18 kW deferrable research. */
export const EPS_LOADS: readonly LoadDef[] = [
    { id: 'ls-a', name: 'Life support A', group: 'critical', kw: 9, channel: 1, alternate: 3 },
    { id: 'hab-a', name: 'Habitat systems A', group: 'essential', kw: 8, channel: 1 },
    { id: 'res-a', name: 'Research payloads A', group: 'deferrable', kw: 1.5, channel: 1 },
    { id: 'ls-b', name: 'Life support B', group: 'critical', kw: 9, channel: 2, alternate: 4 },
    { id: 'tc-a', name: 'Thermal control A', group: 'critical', kw: 6, channel: 2, alternate: 1 },
    { id: 'res-b', name: 'Research payloads B', group: 'deferrable', kw: 3.5, channel: 2 },
    { id: 'tc-b', name: 'Thermal control B', group: 'critical', kw: 6, channel: 3, alternate: 2 },
    { id: 'av', name: 'Avionics & computing', group: 'critical', kw: 6, channel: 3, alternate: 1 },
    { id: 'res-c', name: 'Research payloads C', group: 'deferrable', kw: 6.5, channel: 3 },
    { id: 'com', name: 'Communications', group: 'critical', kw: 4, channel: 4, alternate: 2 },
    { id: 'hab-b', name: 'Habitat systems B', group: 'essential', kw: 8, channel: 4 },
    { id: 'res-d', name: 'Research payloads D', group: 'deferrable', kw: 6.5, channel: 4 },
];

const GROUP_RANK: Record<LoadGroup, number> = { deferrable: 0, essential: 1, critical: 2 };
export const loadKw = (group?: LoadGroup) => EPS_LOADS.filter((l) => !group || l.group === group).reduce((a, l) => a + l.kw, 0);

export const EPS_TIMING: OrbitTiming = orbitTiming(EPS.orbit);

// ── Component physics ───────────────────────────────────────────────────────

const DEG = Math.PI / 180;

/** Fraction of full sunlight on the arrays (0 in umbra), with a short linear penumbra. */
export function illuminationAt(min: number): number {
    const P = EPS_TIMING.periodMin;
    const phase = EPS.startPhase + min / P;
    const p = ((phase % 1) + 1) % 1;
    const pen = EPS.array.penumbraMin / P;
    const { eclipseStart: a, eclipseEnd: b } = EPS_TIMING;
    if (p < a - pen || p > b + pen) return 1;
    if (p >= a && p <= b) return 0;
    if (p < a) return (a - p) / pen;
    return (p - b) / pen;
}

/** P_array = P_rated · illumination · cos θ · (1 + γ(T − T_ref)) · (1 − d)^years · health. */
export function arrayPowerKw(illumination: number, arrayTempC: number, health = 1, incidenceDeg: number = EPS.array.trackingErrorDeg): number {
    const a = EPS.array;
    const orientation = Math.max(0, Math.cos(incidenceDeg * DEG));
    const temperature = 1 + a.tempCoeff * (arrayTempC - a.refTempC);
    const degradation = Math.pow(1 - a.degradationPerYear, a.ageYears);
    return a.ratedKw * illumination * orientation * temperature * degradation * health;
}

/** Open-circuit voltage of a battery group from its state of charge (linear over the usable window). */
export const openCircuitV = (soc: number) => EPS.battery.cellsInSeries * (EPS.battery.cellVEmpty + (EPS.battery.cellVFull - EPS.battery.cellVEmpty) * soc);

/**
 * Battery current and terminal voltage for a terminal power P (W; + charging, − discharging),
 * from P = V_t · I with V_t = V_oc ± I·R.
 */
export function batteryElectrical(soc: number, terminalW: number) {
    const v = openCircuitV(soc);
    const R = EPS.battery.resistanceOhm;
    if (Math.abs(terminalW) < 1) return { voltage: v, current: 0, heatW: 0 };
    if (terminalW > 0) {
        const i = (-v + Math.sqrt(v * v + 4 * R * terminalW)) / (2 * R);
        return { voltage: v + i * R, current: i, heatW: i * i * R };
    }
    const p = -terminalW;
    const i = (v - Math.sqrt(Math.max(0, v * v - 4 * R * p))) / (2 * R);
    return { voltage: v - i * R, current: -i, heatW: i * i * R };
}

// ── Scenarios and faults ────────────────────────────────────────────────────

export type Fault =
    | { kind: 'array-degradation'; channel: ChannelId; atMin: number; health: number }
    | { kind: 'battery-cooling-loss'; channel: ChannelId; atMin: number; coolingWPerK: number }
    | { kind: 'bus-fault'; channel: ChannelId; atMin: number }
    | { kind: 'channel-loss'; channels: ChannelId[]; atMin: number };

export interface ScenarioConfig {
    id: string;
    durationMin: number;
    faults: Fault[];
    initialSoc?: number;
    /** Extra loads (kW) added to every group, for stress tests. */
    loadScale?: number;
}

export type SystemState =
    | 'INITIALIZING'
    | 'NOMINAL_SUNLIGHT'
    | 'NOMINAL_ECLIPSE'
    | 'DEGRADED_GENERATION'
    | 'BATTERY_WARNING'
    | 'DISTRIBUTION_FAULT'
    | 'PROTECTION_ACTIVE'
    | 'RECOVERY_EVALUATION'
    | 'PARTIAL_RECOVERY'
    | 'RECOVERED'
    | 'UNRECOVERED';

export type RecoveryStatus = 'Recovered' | 'Partially Recovered' | 'Degraded Operation' | 'Unrecovered' | 'Protection Active';
export type Health = 'Normal' | 'Warning' | 'Critical' | 'Degraded' | 'Not Available';

export interface ChannelSample {
    id: ChannelId;
    available: boolean;
    arrayHealth: number;
    arrayTempC: number;
    /** What the arrays could produce now (kW). */
    arrayAvailableKw: number;
    /** What the model expected them to produce (healthy arrays), for diagnostics. */
    arrayExpectedKw: number;
    /** Drawn from the arrays (the rest is shunted), kW. */
    arrayDrawnKw: number;
    arrayCurrentA: number;
    busV: number;
    /** Load power delivered at the secondary side, kW. */
    loadKw: number;
    /** Battery terminal power, kW: + charging, − discharging. */
    batteryKw: number;
    batteryV: number;
    batteryA: number;
    batteryTempC: number;
    soc: number;
    energyKwh: number;
    lossesKw: number;
    /** Power received (+) or sent (−) over the cross-tie, kW at the bus. */
    crossTieKw: number;
    chargeLimited: boolean;
    batteryIsolated: boolean;
}

export interface EpsSample {
    tMin: number;
    illumination: number;
    eclipse: boolean;
    channels: ChannelSample[];
    /** Load served (kW) by group, and demand (kW) the plan keeps on. */
    servedKw: Record<LoadGroup, number>;
    demandKw: number;
    unservedKw: number;
    shed: string[];
    generatedKw: number;
    storedKw: number;
    lossesKw: number;
    /** Orbit-average energy margin for the current configuration (%). */
    marginPct: number;
    state: SystemState;
    recovery: RecoveryStatus | null;
    warnings: string[];
}

export interface EpsEvent {
    tMin: number;
    kind: 'fault' | 'detected' | 'warning' | 'protection' | 'evaluation' | 'decision' | 'eclipse-entry' | 'eclipse-exit';
    text: string;
}

export interface RecoveryPlan {
    status: RecoveryStatus;
    shed: string[];
    transferred: { load: string; to: ChannelId }[];
    unservedCritical: string[];
    marginPct: number;
    reason: string;
    /** Channel serving each load after the decision (null: not served). */
    assignment: Record<string, ChannelId | null>;
}

export interface EpsTrace {
    config: ScenarioConfig;
    samples: EpsSample[];
    events: EpsEvent[];
    plan: RecoveryPlan | null;
    /** Simulated minutes of key moments. */
    marks: { faultMin?: number; detectMin?: number; decisionMin?: number };
}

// ── Orbit-average capacity (used by the recovery engine and the margin) ─────

const T_SUN_H = EPS_TIMING.sunlightMin / 60;
const T_ECL_H = EPS_TIMING.eclipseMin / 60;
/** kWh of array energy at the bus needed per kW of orbit-average load. */
const K_LOAD = T_SUN_H / EPS.eff.converter + T_ECL_H / (EPS.eff.converter * EPS.eff.discharge * EPS.eff.charge);
/** Sunlit array output of a healthy channel at its sunlit operating temperature (≈ 40 kW). */
export const CHANNEL_SUNLIT_KW = arrayPowerKw(1, EPS.array.sunlitTempC);

/** Largest constant load (kW) a channel can sustain over an orbit, from its arrays and battery. */
export function channelCapacityKw(arrayHealth: number, chargeLimit = 1): number {
    const gen = CHANNEL_SUNLIT_KW * arrayHealth * EPS.eff.regulator * T_SUN_H;
    const byEnergy = gen / K_LOAD;
    // The battery must also be able to recharge the eclipse energy within the sunlit time.
    const chargeKw = EPS.battery.maxChargeKw * chargeLimit;
    const byCharge = (chargeKw * EPS.eff.charge * T_SUN_H * EPS.eff.converter * EPS.eff.discharge) / T_ECL_H;
    return Math.min(byEnergy, byCharge);
}

/** Orbit energy margin (%) for loads per channel against each channel's capacity, cross-ties included. */
function marginFor(loadsByChannel: Record<ChannelId, number>, capacity: Record<ChannelId, number>): number {
    let load = 0;
    let cap = 0;
    for (const c of CHANNELS) {
        load += loadsByChannel[c];
        cap += capacity[c];
    }
    if (load <= 0) return 100;
    return ((cap - load) / load) * 100;
}

// ── Recovery engine ─────────────────────────────────────────────────────────

/**
 * Decides which loads to transfer and shed, given each channel's availability and capacity, the
 * permitted alternate feeds and the cross-ties. Critical loads are never shed by choice; if they
 * cannot be served the outcome is Unrecovered.
 */
export function planRecovery(available: Record<ChannelId, boolean>, capacity: Record<ChannelId, number>, protection = false): RecoveryPlan {
    const assignment = new Map<string, ChannelId | null>();
    const transferred: { load: string; to: ChannelId }[] = [];
    const moved = new Set<string>();
    for (const l of EPS_LOADS) {
        if (available[l.channel]) assignment.set(l.id, l.channel);
        else if (l.alternate && available[l.alternate]) {
            assignment.set(l.id, l.alternate);
            transferred.push({ load: l.id, to: l.alternate });
            moved.add(l.id);
        } else assignment.set(l.id, null);
    }
    const loadOn = (c: ChannelId) => EPS_LOADS.filter((l) => assignment.get(l.id) === c).reduce((a, l) => a + l.kw, 0);
    // Effective capacity: own capacity plus spare from the paired channel over the cross-tie.
    const effective = (c: ChannelId) => {
        if (!available[c]) return 0;
        const pair = pairOf(c);
        const spare = available[pair] ? Math.max(0, capacity[pair] - loadOn(pair)) : 0;
        return capacity[c] + Math.min(spare, EPS.crossTieKw);
    };
    const over = (c: ChannelId) => loadOn(c) > effective(c) + 1e-9;
    const shed: string[] = [];
    const onChannel = (c: ChannelId, group: LoadGroup) => EPS_LOADS.filter((l) => assignment.get(l.id) === c && l.group === group).sort((x, y) => y.kw - x.kw);
    // Repeat until no channel is over capacity: shed research first, then move dual-fed critical
    // loads to their alternate feed, and shed essential loads only as a last resort.
    for (let pass = 0; pass < 8; pass++) {
        let changed = false;
        for (const c of CHANNELS) {
            if (!available[c]) continue;
            while (over(c)) {
                const deferrable = onChannel(c, 'deferrable')[0];
                if (deferrable) {
                    assignment.set(deferrable.id, null);
                    shed.push(deferrable.id);
                    changed = true;
                    continue;
                }
                // A dual-fed critical load may move if its alternate channel can carry it alongside that
                // channel's own critical loads (the alternate sheds its other loads on the next pass).
                const criticalOn = (a: ChannelId) => onChannel(a, 'critical').reduce((s, x) => s + x.kw, 0);
                const movable = onChannel(c, 'critical').find((l) => !moved.has(l.id) && l.alternate && l.alternate !== c && available[l.alternate] && capacity[l.alternate] - criticalOn(l.alternate) >= l.kw - 1e-9);
                if (movable) {
                    assignment.set(movable.id, movable.alternate!);
                    transferred.push({ load: movable.id, to: movable.alternate! });
                    moved.add(movable.id);
                    changed = true;
                    continue;
                }
                const essential = onChannel(c, 'essential')[0];
                if (essential) {
                    assignment.set(essential.id, null);
                    shed.push(essential.id);
                    changed = true;
                    continue;
                }
                break;
            }
        }
        if (!changed) break;
    }
    const unservedCritical = EPS_LOADS.filter((l) => l.group === 'critical' && (assignment.get(l.id) == null || over(assignment.get(l.id)!))).map((l) => l.id);
    for (const l of EPS_LOADS) if (assignment.get(l.id) === null && !shed.includes(l.id) && l.group !== 'critical') shed.push(l.id);
    const loads = Object.fromEntries(CHANNELS.map((c) => [c, loadOn(c)])) as Record<ChannelId, number>;
    const caps = Object.fromEntries(CHANNELS.map((c) => [c, available[c] ? capacity[c] : 0])) as Record<ChannelId, number>;
    const marginPct = marginFor(loads, caps);
    const essentialShed = shed.some((id) => EPS_LOADS.find((l) => l.id === id)!.group === 'essential');
    let status: RecoveryStatus;
    let reason: string;
    if (unservedCritical.length) {
        status = 'Unrecovered';
        reason = 'Critical demand exceeds what the remaining channels can supply through permitted connections.';
    } else if (protection) {
        status = 'Protection Active';
        reason = 'Protection limits remain in force; loads are served within the reduced capability.';
    } else if (marginPct < 0) {
        status = 'Degraded Operation';
        reason = 'Critical loads are served, but the orbit energy margin is negative: stored energy will decline orbit by orbit.';
    } else if (essentialShed) {
        status = 'Partially Recovered';
        reason = 'Critical loads are served; essential loads that cannot be carried by the remaining capacity are shed.';
    } else {
        status = 'Recovered';
        reason = shed.length ? 'Critical and essential loads are served; deferrable research loads are reduced to restore a positive margin.' : 'All loads are served with a positive margin.';
    }
    return { status, shed, transferred, unservedCritical, marginPct, reason, assignment: Object.fromEntries(assignment) };
}

// ── Simulation ──────────────────────────────────────────────────────────────

interface ChannelState {
    energyKwh: number;
    arrayTempC: number;
    batteryTempC: number;
    coolingWPerK: number;
    arrayHealth: number;
    available: boolean;
    chargeLimit: number;
    batteryIsolated: boolean;
    residualRun: number;
}

const loadName = (id: string) => EPS_LOADS.find((l) => l.id === id)?.name ?? id;

export function simulate(config: ScenarioConfig): EpsTrace {
    const dtMin = EPS.stepMin;
    const dtH = dtMin / 60;
    const b = EPS.battery;
    const st: Record<ChannelId, ChannelState> = Object.fromEntries(
        CHANNELS.map((c) => [
            c,
            {
                energyKwh: b.usableKwh * (config.initialSoc ?? 0.9),
                arrayTempC: EPS.array.sunlitTempC,
                batteryTempC: 18,
                coolingWPerK: b.coolingWPerK,
                arrayHealth: 1,
                available: true,
                chargeLimit: 1,
                batteryIsolated: false,
                residualRun: 0,
            },
        ]),
    ) as Record<ChannelId, ChannelState>;
    const scale = 1 + (config.loadScale ?? 0);
    const samples: EpsSample[] = [];
    const events: EpsEvent[] = [];
    const marks: EpsTrace['marks'] = {};
    let plan: RecoveryPlan | null = null;
    let shed = new Set<string>();
    let detected = false;
    let protection = false;
    let decisionAt: number | null = null;
    let wasEclipse = illuminationAt(0) === 0;

    const steps = Math.round(config.durationMin / dtMin);
    for (let i = 0; i <= steps; i++) {
        const t = i * dtMin;
        const illum = illuminationAt(t);
        const eclipse = illum === 0;
        if (i > 0 && eclipse !== wasEclipse) events.push({ tMin: t, kind: eclipse ? 'eclipse-entry' : 'eclipse-exit', text: eclipse ? 'Eclipse entry: arrays stop generating; batteries carry the loads.' : 'Sunrise: arrays generate again; batteries recharge.' });
        wasEclipse = eclipse;

        // Faults.
        for (const f of config.faults) {
            if (Math.abs(t - f.atMin) > 1e-9) continue;
            marks.faultMin = t;
            if (f.kind === 'array-degradation') {
                st[f.channel].arrayHealth = f.health;
                events.push({ tMin: t, kind: 'fault', text: `Simulated fault: channel ${f.channel} array strings degrade to ${Math.round(f.health * 100)} % output.` });
            } else if (f.kind === 'battery-cooling-loss') {
                st[f.channel].coolingWPerK = f.coolingWPerK;
                events.push({ tMin: t, kind: 'fault', text: `Simulated fault: battery group ${f.channel} loses cold-plate cooling.` });
            } else if (f.kind === 'bus-fault') {
                st[f.channel].available = false;
                detected = true;
                marks.detectMin = t;
                events.push({ tMin: t, kind: 'fault', text: `Simulated fault: short circuit on channel ${f.channel} primary bus.` });
                events.push({ tMin: t, kind: 'protection', text: `Protection trips channel ${f.channel}: its array, battery group and bus are isolated.` });
                decisionAt = t + EPS.evaluationMin;
            } else if (f.kind === 'channel-loss') {
                for (const c of f.channels) st[c].available = false;
                detected = true;
                marks.detectMin = t;
                events.push({ tMin: t, kind: 'fault', text: `Simulated loss of channel${f.channels.length > 1 ? 's' : ''} ${f.channels.join(', ')}.` });
                decisionAt = t + EPS.evaluationMin;
            }
        }

        // Array temperature (first-order towards the sunlit or eclipse equilibrium).
        for (const c of CHANNELS) {
            const s = st[c];
            const target = EPS.array.eclipseTempC + (EPS.array.sunlitTempC - EPS.array.eclipseTempC) * illum;
            s.arrayTempC += (target - s.arrayTempC) * (1 - Math.exp(-dtMin / EPS.array.thermalTauMin));
        }

        // Diagnostics: array residual on whole-minute samples while fully lit.
        if (Math.abs(t / EPS.detection.sampleMin - Math.round(t / EPS.detection.sampleMin)) < 1e-9 && illum >= 0.999) {
            for (const c of CHANNELS) {
                const s = st[c];
                if (!s.available) continue;
                const expected = arrayPowerKw(illum, s.arrayTempC);
                const measured = arrayPowerKw(illum, s.arrayTempC, s.arrayHealth);
                const residual = expected > 0 ? 1 - measured / expected : 0;
                s.residualRun = residual > EPS.detection.residual ? s.residualRun + 1 : 0;
                if (!detected && s.residualRun >= EPS.detection.samples) {
                    detected = true;
                    marks.detectMin = t;
                    decisionAt = t + EPS.evaluationMin;
                    events.push({ tMin: t, kind: 'detected', text: `Residual above ${EPS.detection.residual * 100} % on ${EPS.detection.samples} consecutive samples: channel ${c} generation degraded.` });
                }
            }
        }

        // Battery thermal protection.
        for (const c of CHANNELS) {
            const s = st[c];
            if (!s.available) continue;
            if (s.chargeLimit === 1 && s.batteryTempC >= b.tempWarningC) {
                s.chargeLimit = b.thermalChargeLimit;
                protection = true;
                if (!detected) {
                    detected = true;
                    marks.detectMin = t;
                    decisionAt = t + EPS.evaluationMin;
                }
                events.push({ tMin: t, kind: 'warning', text: `Battery group ${c} temperature reached ${b.tempWarningC} °C (warning).` });
                events.push({ tMin: t, kind: 'protection', text: `Charge power of battery group ${c} limited to ${b.thermalChargeLimit * 100} % to reduce heating.` });
            }
            if (!s.batteryIsolated && s.batteryTempC >= b.tempLimitC) {
                s.batteryIsolated = true;
                events.push({ tMin: t, kind: 'protection', text: `Battery group ${c} reached ${b.tempLimitC} °C: isolated from the bus.` });
            }
        }

        // Recovery decision.
        if (decisionAt !== null && Math.abs(t - decisionAt) < 1e-9) {
            const available = Object.fromEntries(CHANNELS.map((c) => [c, st[c].available])) as Record<ChannelId, boolean>;
            const capacity = Object.fromEntries(CHANNELS.map((c) => [c, st[c].batteryIsolated ? 0 : channelCapacityKw(st[c].arrayHealth, st[c].chargeLimit)])) as Record<ChannelId, number>;
            plan = planRecovery(available, capacity, protection);
            shed = new Set(plan.shed);
            marks.decisionMin = t;
            events.push({ tMin: t, kind: 'evaluation', text: 'Recovery evaluation: capacity of each channel, permitted alternate feeds and cross-ties assessed.' });
            const actions = [
                ...plan.transferred.map((x) => `${loadName(x.load)} → channel ${x.to}`),
                ...plan.shed.map((id) => `${loadName(id)} shed`),
            ];
            events.push({ tMin: t, kind: 'decision', text: `${plan.status}: ${actions.length ? actions.join('; ') : 'no load changes needed'}.` });
        }

        // Load assignment: after a recovery decision, the plan's assignment; before it, the primary feed,
        // else the alternate feed (remote power controllers switch dual-fed loads at once), else unserved.
        const assign = new Map<string, ChannelId | null>();
        for (const l of EPS_LOADS) {
            const planned = plan && t >= (marks.decisionMin ?? Infinity) ? plan.assignment[l.id] : undefined;
            if (shed.has(l.id)) assign.set(l.id, null);
            else if (planned !== undefined && planned !== null && st[planned].available) assign.set(l.id, planned);
            else if (st[l.channel].available) assign.set(l.id, l.channel);
            else if (l.alternate && st[l.alternate].available) assign.set(l.id, l.alternate);
            else assign.set(l.id, null);
        }

        // Per-channel power paths (kW at the primary bus). By construction, on every channel:
        //   array (aLoad + aTie + aCharge) + battery (bLoad + bTie) + tie in (tLoad + tCharge)
        //     = loads / η_conv (aLoad + bLoad + tLoad) + tie out (aTie + bTie) + charging (aCharge + tCharge)
        type Paths = { aLoad: number; aTie: number; aCharge: number; bLoad: number; bTie: number; tLoad: number; tCharge: number };
        const zero = (): Paths => ({ aLoad: 0, aTie: 0, aCharge: 0, bLoad: 0, bTie: 0, tLoad: 0, tCharge: 0 });
        const arrayBus = {} as Record<ChannelId, number>;
        const battMax = {} as Record<ChannelId, number>;
        for (const c of CHANNELS) {
            const s = st[c];
            arrayBus[c] = s.available ? arrayPowerKw(illum, s.arrayTempC, s.arrayHealth) * EPS.eff.regulator : 0;
            battMax[c] = s.available && !s.batteryIsolated && s.energyKwh > b.usableKwh * b.socFloor ? b.maxDischargeKw * EPS.eff.discharge : 0;
        }
        const loadsOn: Record<ChannelId, LoadDef[]> = { 1: [], 2: [], 3: [], 4: [] };
        for (const l of EPS_LOADS) {
            const c = assign.get(l.id);
            if (c) loadsOn[c].push(l);
        }
        const unservedIds: string[] = [];
        let paths = {} as Record<ChannelId, Paths>;
        const tieUsed = new Map<string, number>();
        const tieKey = (x: ChannelId, y: ChannelId) => [x, y].sort().join('-');
        // Allocate supply to loads; if a channel still falls short, protection sheds its lowest-priority load and retries.
        for (let attempt = 0; attempt < EPS_LOADS.length + 1; attempt++) {
            paths = Object.fromEntries(CHANNELS.map((c) => [c, zero()])) as Record<ChannelId, Paths>;
            tieUsed.clear();
            const need = {} as Record<ChannelId, number>;
            for (const c of CHANNELS) {
                const demand = loadsOn[c].filter((l) => !unservedIds.includes(l.id)).reduce((a, l) => a + (l.kw * scale) / EPS.eff.converter, 0);
                const p = paths[c];
                p.aLoad = Math.min(arrayBus[c], demand);
                p.bLoad = Math.min(battMax[c], demand - p.aLoad);
                need[c] = demand - p.aLoad - p.bLoad;
            }
            for (const [x, y] of CROSS_TIES) {
                for (const [n, g] of [[x, y], [y, x]] as [ChannelId, ChannelId][]) {
                    if (need[n] <= 1e-9 || !st[n].available || !st[g].available) continue;
                    const key = tieKey(n, g);
                    let room = EPS.crossTieKw - (tieUsed.get(key) ?? 0);
                    const fromArray = Math.max(0, Math.min(need[n], arrayBus[g] - paths[g].aLoad - paths[g].aTie, room));
                    paths[g].aTie += fromArray;
                    room -= fromArray;
                    const fromBatt = Math.max(0, Math.min(need[n] - fromArray, battMax[g] - paths[g].bLoad - paths[g].bTie, room));
                    paths[g].bTie += fromBatt;
                    paths[n].tLoad += fromArray + fromBatt;
                    need[n] -= fromArray + fromBatt;
                    tieUsed.set(key, (tieUsed.get(key) ?? 0) + fromArray + fromBatt);
                }
            }
            const short = CHANNELS.find((c) => need[c] > 1e-6);
            if (short === undefined) break;
            const victim = [...loadsOn[short]].filter((l) => !unservedIds.includes(l.id)).sort((x, y) => GROUP_RANK[x.group] - GROUP_RANK[y.group] || y.kw - x.kw)[0];
            if (!victim) break;
            unservedIds.push(victim.id);
        }
        // Charging: own array surplus first, then the paired channel's array surplus over the tie.
        const room = {} as Record<ChannelId, number>;
        for (const c of CHANNELS) {
            const s = st[c];
            const p = paths[c];
            const soc = s.energyKwh / b.usableKwh;
            const taper = soc > b.taperFrom ? Math.max(0, (1 - soc) / (1 - b.taperFrom)) : 1;
            room[c] = s.available && !s.batteryIsolated && p.bLoad + p.bTie <= 1e-9 ? b.maxChargeKw * s.chargeLimit * taper : 0;
            p.aCharge = Math.max(0, Math.min(room[c], arrayBus[c] - p.aLoad - p.aTie));
        }
        for (const [x, y] of CROSS_TIES) {
            for (const [n, g] of [[x, y], [y, x]] as [ChannelId, ChannelId][]) {
                const want = room[n] - paths[n].aCharge - paths[n].tCharge;
                if (want <= 1e-9 || !st[g].available) continue;
                const key = tieKey(n, g);
                const surplus = arrayBus[g] - paths[g].aLoad - paths[g].aTie - paths[g].aCharge;
                const flow = Math.max(0, Math.min(want, surplus, EPS.crossTieKw - (tieUsed.get(key) ?? 0)));
                paths[g].aTie += flow;
                paths[n].tCharge += flow;
                tieUsed.set(key, (tieUsed.get(key) ?? 0) + flow);
            }
        }

        const out: ChannelSample[] = [];
        let unservedKw = 0;
        const served: Record<LoadGroup, number> = { critical: 0, essential: 0, deferrable: 0 };
        for (const id of unservedIds) unservedKw += EPS_LOADS.find((l) => l.id === id)!.kw * scale;
        let generated = 0;
        let stored = 0;
        let losses = 0;
        for (const c of CHANNELS) {
            const s = st[c];
            const p = paths[c];
            const soc = s.energyKwh / b.usableKwh;
            const energyBefore = s.energyKwh;
            const servedHere = loadsOn[c].filter((l) => !unservedIds.includes(l.id));
            for (const l of servedHere) served[l.group] += l.kw * scale;
            const loadSecondary = servedHere.reduce((a, l) => a + l.kw * scale, 0);
            const arrayToBus = p.aLoad + p.aTie + p.aCharge;
            const discharge = p.bLoad + p.bTie;
            const charge = p.aCharge + p.tCharge;
            const arrayDrawn = arrayToBus / EPS.eff.regulator;
            const terminalKw = charge > 0 ? charge * EPS.eff.charge : -discharge / EPS.eff.discharge;
            const elec = batteryElectrical(soc, terminalKw * 1000);
            const lossesC = arrayDrawn - arrayToBus + (loadSecondary / EPS.eff.converter - loadSecondary) + (charge > 0 ? charge - terminalKw : -terminalKw - discharge);
            s.energyKwh = Math.min(b.usableKwh, Math.max(0, s.energyKwh + terminalKw * dtH));
            s.batteryTempC += ((elec.heatW - s.coolingWPerK * (s.batteryTempC - b.coldPlateC)) * dtMin * 60) / b.thermalMassJPerK;
            generated += arrayDrawn;
            stored += terminalKw;
            losses += lossesC;
            out.push({
                id: c,
                available: s.available,
                arrayHealth: s.arrayHealth,
                arrayTempC: s.arrayTempC,
                arrayAvailableKw: arrayBus[c] / EPS.eff.regulator,
                arrayExpectedKw: s.available ? arrayPowerKw(illum, s.arrayTempC) : 0,
                arrayDrawnKw: arrayDrawn,
                arrayCurrentA: (arrayDrawn * 1000) / EPS.array.operatingV,
                busV: !s.available ? 0 : illum > 0.5 ? EPS.bus.primaryV : EPS.bus.eclipseV,
                loadKw: loadSecondary,
                batteryKw: terminalKw,
                batteryV: s.available ? elec.voltage : openCircuitV(soc),
                batteryA: elec.current,
                batteryTempC: s.batteryTempC,
                soc,
                energyKwh: energyBefore,
                lossesKw: lossesC,
                crossTieKw: p.tLoad + p.tCharge - p.aTie - p.bTie,
                chargeLimited: s.chargeLimit < 1,
                batteryIsolated: s.batteryIsolated || !s.available,
            });
        }

        // Orbit margin for the current configuration (planned shedding included).
        const loadsByChannel = Object.fromEntries(CHANNELS.map((c) => [c, loadsOn[c].filter((l) => !unservedIds.includes(l.id)).reduce((a, l) => a + l.kw * scale, 0)])) as Record<ChannelId, number>;
        const capacity = Object.fromEntries(CHANNELS.map((c) => [c, st[c].available && !st[c].batteryIsolated ? channelCapacityKw(st[c].arrayHealth, st[c].chargeLimit) : 0])) as Record<ChannelId, number>;
        const marginPct = marginFor(loadsByChannel, capacity);

        const warnings: string[] = [];
        for (const ch of out) {
            if (!ch.available) warnings.push(`Channel ${ch.id} isolated`);
            if (ch.available && ch.arrayHealth < 1 && illum > 0.5) warnings.push(`Channel ${ch.id} generation ${Math.round(ch.arrayHealth * 100)} % of expected`);
            if (ch.batteryTempC >= b.tempWarningC) warnings.push(`Battery group ${ch.id} temperature ${ch.batteryTempC.toFixed(1)} °C`);
            if (ch.available && ch.soc < b.socWarning) warnings.push(`Battery group ${ch.id} SOC ${Math.round(ch.soc * 100)} %`);
        }

        // System state machine: from model conditions, never from animation timing.
        const faultActive = config.faults.some((f) => t >= f.atMin);
        const anyTrip = out.some((c) => !c.available);
        const anyThermal = out.some((c) => c.chargeLimited || c.batteryIsolated && c.available);
        const lowSoc = out.some((c) => c.available && c.soc < b.socWarning);
        const degradedGen = out.some((c) => c.available && c.arrayHealth < 1);
        let state: SystemState;
        let recovery: RecoveryStatus | null = null;
        if (t < 1) state = 'INITIALIZING';
        else if (plan && t >= (marks.decisionMin ?? Infinity)) {
            recovery = plan.status;
            state = plan.status === 'Recovered' ? 'RECOVERED' : plan.status === 'Unrecovered' ? 'UNRECOVERED' : plan.status === 'Protection Active' ? 'PROTECTION_ACTIVE' : 'PARTIAL_RECOVERY';
            if (served.critical + 1e-9 < loadKw('critical') * scale) state = 'UNRECOVERED';
        } else if (decisionAt !== null && t < decisionAt && detected) state = anyTrip ? 'DISTRIBUTION_FAULT' : anyThermal ? 'PROTECTION_ACTIVE' : 'RECOVERY_EVALUATION';
        else if (anyTrip) state = 'DISTRIBUTION_FAULT';
        else if (anyThermal) state = 'PROTECTION_ACTIVE';
        else if (out.some((c) => c.batteryTempC >= b.tempWarningC) || lowSoc) state = 'BATTERY_WARNING';
        else if (faultActive && degradedGen && illum > 0.5) state = 'DEGRADED_GENERATION';
        else state = eclipse ? 'NOMINAL_ECLIPSE' : 'NOMINAL_SUNLIGHT';

        samples.push({
            tMin: t,
            illumination: illum,
            eclipse,
            channels: out,
            servedKw: served,
            demandKw: EPS_LOADS.filter((l) => !shed.has(l.id)).reduce((a, l) => a + l.kw * scale, 0),
            unservedKw,
            shed: [...shed],
            generatedKw: generated,
            storedKw: stored,
            lossesKw: losses,
            marginPct,
            state,
            recovery,
            warnings,
        });
    }
    events.sort((x, y) => x.tMin - y.tMin);
    return { config, samples, events, plan, marks };
}

/** The sample at simulated minute `m` (nearest step at or before it). */
export function sampleAt(trace: EpsTrace, m: number): EpsSample {
    const i = Math.max(0, Math.min(trace.samples.length - 1, Math.floor(m / EPS.stepMin + 1e-9)));
    return trace.samples[i];
}

// ── The four scenarios the experience presents ──────────────────────────────

/** Eclipse windows within the scenario length (simulated minutes). */
export const ECLIPSES = (() => {
    const out: [number, number][] = [];
    let entry: number | null = null;
    for (let m = 0; m <= 280; m += EPS.stepMin) {
        const e = inEclipse(EPS_TIMING, EPS.startPhase + m / EPS_TIMING.periodMin);
        if (e && entry === null) entry = m;
        if (!e && entry !== null) {
            out.push([entry, m]);
            entry = null;
        }
    }
    return out;
})();

export const SCENARIOS = {
    nominal: { id: 'nominal', durationMin: 280, faults: [] },
    solar: { id: 'solar', durationMin: 280, faults: [{ kind: 'array-degradation', channel: 2, atMin: 100, health: 0.6 }] },
    thermal: { id: 'thermal', durationMin: 280, faults: [{ kind: 'battery-cooling-loss', channel: 2, atMin: 92, coolingWPerK: 4 }] },
    distribution: { id: 'distribution', durationMin: 280, faults: [{ kind: 'bus-fault', channel: 2, atMin: 100 }] },
} as const satisfies Record<string, ScenarioConfig>;

export type ScenarioId = keyof typeof SCENARIOS;

const cache = new Map<ScenarioId, EpsTrace>();
/** Traces are computed once, on first use, and shared by the 3D view and every panel. */
export function traceOf(id: ScenarioId): EpsTrace {
    if (!cache.has(id)) cache.set(id, simulate(SCENARIOS[id] as ScenarioConfig));
    return cache.get(id)!;
}
