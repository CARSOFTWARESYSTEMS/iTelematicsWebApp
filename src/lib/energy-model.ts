/**
 * Orbit energy model for the illustrative reference case: a 6U Earth-observation CubeSat in a
 * 550 km sun-synchronous orbit at β ≈ 20°. One model drives every number on the site (homepage
 * orbit, research instrument, fault scenarios, telemetry table), so they always agree.
 *
 * Simplifications are deliberate and published on /research-platform: circular orbit, fixed β,
 * orbit-average array power while sunlit, constant loads per phase, linear charge taper above 95 %.
 * Simulated values for learning and research — not flight data.
 */

export const ORBIT = {
    altitudeKm: 550,
    earthRadiusKm: 6378,
    muKm3s2: 398600,
    betaDeg: 20,
} as const;

export const POWER = {
    arrayW: 41.8, // orbit-average array output while sunlit
    loadSunW: 22.0,
    loadEclipseW: 14.0, // payload off in eclipse
    etaEps: 0.9, // EPS conversion efficiency
    etaCharge: 0.95, // energy stored per unit of charging power
    batteryWh: 86, // 2S4P Li-ion, 7.2 V nominal
    taperFrom: 0.95, // charge current tapers linearly to zero between 95 % and 100 % SOC
} as const;

export type Scenario = 'nominal' | 'solar-degradation' | 'heater-stuck' | 'sun-sensor-fault';

export type ScenarioSpec = {
    label: string;
    summary: string;
    arrayFactor: number;
    extraLoadW: number;
    sunSensorFault: boolean;
};

export const SCENARIOS: Record<Scenario, ScenarioSpec> = {
    nominal: {
        label: 'Nominal',
        summary: 'Arrays carry the loads in sunlight and recharge the battery before the next eclipse.',
        arrayFactor: 1,
        extraLoadW: 0,
        sunSensorFault: false,
    },
    'solar-degradation': {
        label: 'Array degradation −25 %',
        summary: 'Less generation every orbit. The battery no longer recovers fully, so SOC trends down orbit after orbit.',
        arrayFactor: 0.75,
        extraLoadW: 0,
        sunSensorFault: false,
    },
    'heater-stuck': {
        label: 'Heater stuck on (+6 W)',
        summary: 'A constant extra load in both phases. Demand exceeds generation over the orbit and the energy balance turns negative.',
        arrayFactor: 1,
        extraLoadW: 6,
        sunSensorFault: false,
    },
    'sun-sensor-fault': {
        label: 'Sun-sensor fault',
        summary: 'Energy is unaffected, but a sun sensor reads zero in sunlight. This is a sensor fault, not an energy fault, and health logic must say so.',
        arrayFactor: 1,
        extraLoadW: 0,
        sunSensorFault: true,
    },
};

const deg = Math.PI / 180;

export function orbitPeriodMin(): number {
    const a = ORBIT.earthRadiusKm + ORBIT.altitudeKm;
    return (2 * Math.PI * Math.sqrt(a ** 3 / ORBIT.muKm3s2)) / 60;
}

/** Fraction of a circular orbit spent in Earth's shadow (cylindrical shadow model). */
export function eclipseFraction(betaDeg: number = ORBIT.betaDeg): number {
    const h = ORBIT.altitudeKm;
    const r = ORBIT.earthRadiusKm;
    const betaStar = Math.asin(r / (r + h));
    if (Math.abs(betaDeg * deg) >= betaStar) return 0;
    const x = Math.sqrt(h * h + 2 * r * h) / ((r + h) * Math.cos(betaDeg * deg));
    return Math.acos(x) / Math.PI;
}

export const PERIOD_MIN = orbitPeriodMin();
export const ECLIPSE_FRACTION = eclipseFraction();
export const ECLIPSE_MIN = PERIOD_MIN * ECLIPSE_FRACTION;
export const SUNLIGHT_MIN = PERIOD_MIN - ECLIPSE_MIN;

/** Phase 0 is the sub-solar point; the eclipse is centred on the anti-sun point (phase 0.5). */
const ECLIPSE_START = 0.5 - ECLIPSE_FRACTION / 2;
const ECLIPSE_END = 0.5 + ECLIPSE_FRACTION / 2;
/** Illustrative ground-station pass, in sunlight. */
const CONTACT_START = 0.06;
const CONTACT_END = 0.16;

export const isEclipse = (phase: number) => {
    const p = ((phase % 1) + 1) % 1;
    return p >= ECLIPSE_START && p <= ECLIPSE_END;
};

export const inContact = (phase: number) => {
    const p = ((phase % 1) + 1) % 1;
    return p >= CONTACT_START && p <= CONTACT_END;
};

export type Sample = {
    tMin: number;
    phase: number;
    eclipse: boolean;
    contact: boolean;
    arrayW: number;
    loadW: number;
    /** Bus power surplus (+) or deficit (−): array × η_EPS − load. */
    marginW: number;
    /** Battery power, + charging / − discharging, at the battery terminals. */
    batteryW: number;
    soc: number;
};

function step(phase: number, soc: number, spec: ScenarioSpec, dtH: number) {
    const eclipse = isEclipse(phase);
    const arrayW = eclipse ? 0 : POWER.arrayW * spec.arrayFactor;
    const loadW = (eclipse ? POWER.loadEclipseW : POWER.loadSunW) + spec.extraLoadW;
    const busW = arrayW * POWER.etaEps;
    const marginW = busW - loadW;

    let batteryW: number;
    if (marginW >= 0) {
        const taper = soc > POWER.taperFrom ? Math.max(0, (1 - soc) / (1 - POWER.taperFrom)) : 1;
        batteryW = marginW * taper;
        soc += (batteryW * POWER.etaCharge * dtH) / POWER.batteryWh;
    } else {
        batteryW = marginW / POWER.etaEps; // the battery path also passes through the EPS converter
        soc += (batteryW * dtH) / POWER.batteryWh;
    }
    return { eclipse, arrayW, loadW, marginW, batteryW, soc: Math.min(1, Math.max(0, soc)) };
}

/** Nominal SOC at phase 0 once the orbit-to-orbit cycle has settled. */
function settledSoc(stepMin: number): number {
    let soc = 0.9;
    const steps = Math.round(PERIOD_MIN / stepMin);
    for (let orbit = 0; orbit < 8; orbit++) {
        for (let i = 0; i < steps; i++) soc = step(i / steps, soc, SCENARIOS.nominal, stepMin / 60).soc;
    }
    return soc;
}

const cache = new Map<string, Sample[]>();

/**
 * Simulates `orbits` orbits of a scenario, starting from the settled nominal state so that
 * every scenario begins from the same point and diverges only because of its fault.
 */
export function simulate(scenario: Scenario = 'nominal', orbits = 3, stepMin = 0.5): Sample[] {
    const key = `${scenario}:${orbits}:${stepMin}`;
    const hit = cache.get(key);
    if (hit) return hit;

    const spec = SCENARIOS[scenario];
    const stepsPerOrbit = Math.round(PERIOD_MIN / stepMin);
    let soc = settledSoc(stepMin);
    const samples: Sample[] = [];
    for (let i = 0; i <= stepsPerOrbit * orbits; i++) {
        const phase = (i / stepsPerOrbit) % 1;
        const s = step(phase, soc, spec, stepMin / 60);
        samples.push({
            tMin: (i * PERIOD_MIN) / stepsPerOrbit,
            phase,
            eclipse: s.eclipse,
            contact: inContact(phase),
            arrayW: s.arrayW,
            loadW: s.loadW,
            marginW: s.marginW,
            batteryW: s.batteryW,
            soc,
        });
        soc = s.soc;
    }
    cache.set(key, samples);
    return samples;
}

/** Nominal sample nearest to an orbit phase (0–1), taken from the settled third orbit. */
export function sampleAtPhase(phase: number, scenario: Scenario = 'nominal'): Sample {
    const samples = simulate(scenario);
    const perOrbit = Math.round(PERIOD_MIN / 0.5);
    const p = ((phase % 1) + 1) % 1;
    return samples[2 * perOrbit + Math.round(p * perOrbit) % perOrbit];
}

export type OrbitBudget = {
    generatedWh: number;
    requiredWh: number;
    marginPct: number;
    minSoc: number;
    socChangePerOrbit: number;
};

/** Orbit energy budget using the published equations (round-trip battery efficiency η_EPS·η_charge). */
export function orbitBudget(scenario: Scenario = 'nominal'): OrbitBudget {
    const spec = SCENARIOS[scenario];
    const sunH = SUNLIGHT_MIN / 60;
    const eclH = ECLIPSE_MIN / 60;
    const generatedWh = POWER.arrayW * spec.arrayFactor * sunH;
    const etaBatt = POWER.etaEps * POWER.etaCharge;
    const requiredWh =
        ((POWER.loadSunW + spec.extraLoadW) * sunH + ((POWER.loadEclipseW + spec.extraLoadW) * eclH) / etaBatt) / POWER.etaEps;

    const samples = simulate(scenario);
    const perOrbit = Math.round(PERIOD_MIN / 0.5);
    const first = samples[0].soc;
    const last = samples[samples.length - 1].soc;
    return {
        generatedWh,
        requiredWh,
        marginPct: ((generatedWh - requiredWh) / requiredWh) * 100,
        minSoc: Math.min(...samples.slice(2 * perOrbit).map((s) => s.soc)),
        socChangePerOrbit: (last - first) / 3,
    };
}

export type HealthState = 'NOMINAL' | 'WARNING' | 'FAULT';

export function healthOf(scenario: Scenario): { energy: HealthState; sensors: HealthState } {
    const budget = orbitBudget(scenario);
    return {
        // Below a 5 % orbit margin the battery is no longer guaranteed to recover each orbit.
        energy: budget.marginPct >= 5 ? 'NOMINAL' : 'WARNING',
        sensors: SCENARIOS[scenario].sunSensorFault ? 'FAULT' : 'NOMINAL',
    };
}

/** Pack voltage from SOC and current (2S Li-ion, simple OCV curve plus internal resistance). */
export function packVoltage(soc: number, batteryW: number): number {
    const curve: [number, number][] = [[0, 3.0], [0.1, 3.45], [0.2, 3.6], [0.5, 3.75], [0.8, 3.95], [0.9, 4.05], [1, 4.2]];
    let ocv = curve[curve.length - 1][1];
    for (let i = 1; i < curve.length; i++) {
        if (soc <= curve[i][0]) {
            const [s0, v0] = curve[i - 1];
            const [s1, v1] = curve[i];
            ocv = v0 + ((soc - s0) / (s1 - s0)) * (v1 - v0);
            break;
        }
    }
    const pack = 2 * ocv;
    const current = batteryW / pack;
    return pack + (current / 4) * 0.05 * 2; // 4 parallel cells, 50 mΩ each, 2 in series
}
