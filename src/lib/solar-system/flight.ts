/**
 * Flight simulation of reference mission SOL-1, from engine ignition on the pad to escape from Earth.
 *
 * Planar, Earth-centred inertial frame (x east, y up at the launch site at t = 0), RK4 integration.
 * Forces: thrust (sea-level to vacuum with ambient pressure, at constant mass flow), aerodynamic drag
 * (US Standard Atmosphere 1976, Mach-dependent drag coefficient, air co-rotating with the Earth) and
 * inverse-square gravity. The launch site is at 10° N launching due east, so the plane carries the
 * site's eastward speed ω·R·cos φ and the orbit has a 10° inclination.
 *
 * Guidance: vertical rise, a short pitch-over, then a zero-angle-of-attack gravity turn on the first
 * stage (throttled to stay below 4.5 g); the upper stage flies closed-loop to a 185 km circular
 * parking orbit. After a coast the upper stage restarts for the departure burn, the solid kick stage
 * adds the rest, and the spacecraft separates on an escape hyperbola. Every event is triggered by a
 * physical condition (propellant depletion, heating rate, perigee), not by a fixed clock.
 */
import { atmosphere } from './atmosphere';
import { G0, MU_EARTH, OMEGA_EARTH, R_EARTH } from './constants';
import { elements } from './orbit';
import { ADAPTER_MASS, FAIRING, FIRST_STAGE, KICK_STAGE, LIFTOFF_MASS, SPACECRAFT, UPPER_STAGE, VEHICLE, massFlow } from './vehicle';

export type FlightPhase = 'pad' | 'ignition' | 'stage1' | 'staging' | 'stage2' | 'parking' | 'departure' | 'kickCoast' | 'kick' | 'escape';

export type EventId =
    | 'ignition'
    | 'liftoff'
    | 'towerClear'
    | 'pitchOver'
    | 'maxQ'
    | 'throttleDown'
    | 'meco'
    | 'stageSep'
    | 'usIgnition'
    | 'fairingSep'
    | 'seco1'
    | 'usRestart'
    | 'seco2'
    | 'kickSep'
    | 'kickIgnition'
    | 'escape'
    | 'kickBurnout'
    | 'scSep';

export interface FlightEvent {
    id: EventId;
    t: number;
    label: string;
}

export interface FlightSample {
    t: number;
    phase: FlightPhase;
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Geometric altitude above the reference sphere, m. */
    altitude: number;
    /** Ground distance from the launch site along the trajectory plane, m. */
    downrange: number;
    /** Inertial speed and speed relative to the air, m/s. */
    speed: number;
    airspeed: number;
    verticalSpeed: number;
    /** Inertial flight-path angle above the local horizontal, degrees. */
    flightPathDeg: number;
    /** Thrust direction above the local horizontal, degrees. */
    pitchDeg: number;
    /** Sensed (non-gravitational) acceleration, m/s². */
    acceleration: number;
    thrust: number;
    throttle: number;
    drag: number;
    mass: number;
    prop1: number;
    prop2: number;
    propKick: number;
    /** Dynamic pressure q = ½ρv², Pa. */
    q: number;
    mach: number;
    /** Free-molecular heating rate ½ρv³, W/m². */
    heating: number;
    fairing: boolean;
}

export interface FlightResult {
    samples: FlightSample[];
    events: FlightEvent[];
    /** Peak dynamic pressure, Pa, and when. */
    maxQ: { q: number; t: number; altitude: number; speed: number };
    /** Gravity and drag losses during the ascent to orbit, m/s. */
    losses: { gravity: number; drag: number };
    /** Parking orbit at first cutoff. */
    parking: { perigeeKm: number; apogeeKm: number; periodMin: number; speed: number; inclinationDeg: number };
    /** Mass at each key moment, kg. */
    masses: { liftoff: number; beforeStaging: number; afterStaging: number; orbit: number; spacecraft: number };
    /** Departure energy reached after kick-stage burnout, m²/s². */
    c3: number;
    /** Upper-stage propellant left at parking orbit and at the end of the departure burn, kg. */
    upperStagePropAtOrbit: number;
    upperStageReserve: number;
}

// ── Guidance and sequence parameters ──────────────────────────────────────

export const SEQUENCE = {
    ignitionLead: 3, // s before liftoff the engines start
    thrustRamp: 2.5, // s to full thrust
    towerHeight: 75, // m
    verticalRise: 14, // s after liftoff (about 30 m/s: slow enough that the pitch-over sets the whole gravity turn)
    pitchOverSeconds: 10,
    pitchOverDeg: 3.4, // from vertical; tuned so the first stage cuts off near 110 km with a 10° flight-path angle
    separationDelay: 3, // s after MECO
    usIgnitionDelay: 10, // s after MECO
    fairingHeating: 1135, // W/m², free-molecular heating limit for fairing jettison
    fairingMinAltitude: 100e3, // m
    guidanceTau: 30, // s, upper-stage altitude-hold time constant
    parkingCoast: 25 * 60, // s from orbit insertion to the departure burn
    upperStageReserve: 120, // kg kept for the post-separation manoeuvre
    kickSepDelay: 40, // s after the second cutoff
    kickIgnitionDelay: 70, // s after the second cutoff
    scSepDelay: 240, // s after kick burnout (spin-down, separation)
    escapeCoast: 2 * 86400, // s of escape trajectory to propagate
} as const;

const LAT = (VEHICLE.siteLatitudeDeg * Math.PI) / 180;
/** In-plane rotation rate of the Earth for a due-east launch from the reference site. */
export const OMEGA_PLANE = OMEGA_EARTH * Math.cos(LAT);
const TARGET_R = R_EARTH + VEHICLE.parkingOrbitKm * 1000;
const AREA_FAIRING = Math.PI * (FAIRING.diameter / 2) ** 2;
const AREA_UPPER = Math.PI * (UPPER_STAGE.diameter / 2) ** 2;

/** Drag coefficient against Mach number: subsonic, the transonic rise, then the supersonic fall. */
export function dragCoefficient(mach: number) {
    const pts: [number, number][] = [
        [0, 0.3],
        [0.6, 0.3],
        [0.9, 0.42],
        [1.05, 0.55],
        [1.5, 0.45],
        [3, 0.3],
        [6, 0.25],
    ];
    if (mach >= 6) return 0.25;
    let i = 0;
    while (mach > pts[i + 1][0]) i++;
    const [m0, c0] = pts[i];
    const [m1, c1] = pts[i + 1];
    return c0 + ((c1 - c0) * (mach - m0)) / (m1 - m0);
}

interface Controls {
    thrust: number; // N available at this ambient pressure, after throttle
    mdot: number; // kg/s
    dir: [number, number];
    throttle: number;
    area: number;
}

type State = [number, number, number, number, number]; // x, y, vx, vy, m

const airVelocity = (x: number, y: number): [number, number] => [OMEGA_PLANE * y, -OMEGA_PLANE * x];

function derivative(s: State, c: Controls): State {
    const [x, y, vx, vy, m] = s;
    const r = Math.hypot(x, y);
    const g = -MU_EARTH / (r * r * r);
    const air = atmosphere(r - R_EARTH);
    const [ax0, ay0] = airVelocity(x, y);
    const rvx = vx - ax0;
    const rvy = vy - ay0;
    const vrel = Math.hypot(rvx, rvy);
    const mach = air.soundSpeed > 0 ? vrel / air.soundSpeed : 0;
    const drag = 0.5 * air.density * vrel * vrel * dragCoefficient(mach) * c.area;
    const dx = vrel > 0 ? (-rvx / vrel) * drag : 0;
    const dy = vrel > 0 ? (-rvy / vrel) * drag : 0;
    return [vx, vy, g * x + (c.thrust * c.dir[0] + dx) / m, g * y + (c.thrust * c.dir[1] + dy) / m, -c.mdot];
}

function rk4(s: State, c: Controls, dt: number): State {
    const k1 = derivative(s, c);
    const k2 = derivative(s.map((v, i) => v + (k1[i] * dt) / 2) as State, c);
    const k3 = derivative(s.map((v, i) => v + (k2[i] * dt) / 2) as State, c);
    const k4 = derivative(s.map((v, i) => v + k3[i] * dt) as State, c);
    return s.map((v, i) => v + ((k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) * dt) / 6) as State;
}

/** Local unit vectors at a position: radial (up) and along-track (east, the direction of rotation). */
function frame(x: number, y: number) {
    const r = Math.hypot(x, y);
    return { up: [x / r, y / r] as [number, number], east: [y / r, -x / r] as [number, number], r };
}

const EVENT_LABELS: Record<EventId, string> = {
    ignition: 'Engine ignition',
    liftoff: 'Liftoff',
    towerClear: 'Tower clear',
    pitchOver: 'Pitch-over, gravity turn begins',
    maxQ: 'Maximum dynamic pressure (Max Q)',
    throttleDown: 'Throttle down to limit acceleration',
    meco: 'Main engine cutoff (MECO)',
    stageSep: 'First-stage separation',
    usIgnition: 'Upper-stage ignition',
    fairingSep: 'Payload fairing separation',
    seco1: 'Upper-stage cutoff, parking orbit',
    usRestart: 'Upper-stage restart: departure burn',
    seco2: 'Upper-stage cutoff: departure burn complete',
    kickSep: 'Kick stage and spacecraft separate from the upper stage',
    kickIgnition: 'Solid kick stage ignition',
    escape: 'Escape: orbital energy above zero',
    kickBurnout: 'Kick stage burnout',
    scSep: 'Spacecraft separation',
};

export type Sequence = { -readonly [K in keyof typeof SEQUENCE]: number };

/** Runs the flight; `overrides` exist for tuning and sensitivity tests only. */
export function simulateFlight(overrides: Partial<Sequence> = {}): FlightResult {
    const P: Sequence = { ...SEQUENCE, ...overrides };
    const samples: FlightSample[] = [];
    const events: FlightEvent[] = [];
    const mark = (id: EventId, t: number) => {
        if (!events.some((e) => e.id === id)) events.push({ id, t, label: EVENT_LABELS[id] });
    };
    const at = (id: EventId) => events.find((e) => e.id === id)?.t;

    const mdot1 = massFlow(FIRST_STAGE.thrustVac, FIRST_STAGE.ispVac);
    const mdot2 = massFlow(UPPER_STAGE.thrustVac, UPPER_STAGE.ispVac);
    const mdotK = massFlow(KICK_STAGE.thrust, KICK_STAGE.isp);

    let t = -P.ignitionLead;
    let phase: FlightPhase = 'ignition';
    let s: State = [0, R_EARTH, OMEGA_PLANE * R_EARTH, 0, LIFTOFF_MASS];
    let prop1 = FIRST_STAGE.propellantMass;
    let prop2 = UPPER_STAGE.propellantMass;
    let propK = KICK_STAGE.propellantMass;
    let fairing = true;
    let kickDir: [number, number] = [1, 0];
    let maxQ = { q: 0, t: 0, altitude: 0, speed: 0 };
    let gravityLoss = 0;
    let dragLoss = 0;
    const masses = { liftoff: LIFTOFF_MASS, beforeStaging: 0, afterStaging: 0, orbit: 0, spacecraft: 0 };
    let upperStagePropAtOrbit = 0;
    let c3 = 0;
    let lastSample = -Infinity;
    // Unwrapped polar angle of the vehicle, so ground distance keeps growing past half an orbit.
    let thetaPrev = 0;
    let thetaTurns = 0;
    mark('ignition', t);

    const record = (c: Controls) => {
        const [x, y, vx, vy, m] = s;
        const { up, east, r } = frame(x, y);
        const air = atmosphere(r - R_EARTH);
        const [ax0, ay0] = airVelocity(x, y);
        const vrel = Math.hypot(vx - ax0, vy - ay0);
        const vr = vx * up[0] + vy * up[1];
        const vt = vx * east[0] + vy * east[1];
        const speed = Math.hypot(vx, vy);
        const mach = air.soundSpeed > 0 ? vrel / air.soundSpeed : 0;
        const drag = 0.5 * air.density * vrel * vrel * dragCoefficient(mach) * c.area;
        // Sensed acceleration: thrust plus drag (vector sum), what an accelerometer on board reads.
        const fx = c.thrust * c.dir[0] + (vrel > 0 ? (-(vx - ax0) / vrel) * drag : 0);
        const fy = c.thrust * c.dir[1] + (vrel > 0 ? (-(vy - ay0) / vrel) * drag : 0);
        const thrustUp = c.dir[0] * up[0] + c.dir[1] * up[1];
        const thrustEast = c.dir[0] * east[0] + c.dir[1] * east[1];
        // Ground distance: the polar angle from the site, less the Earth's rotation since the start.
        const raw = Math.atan2(x, y);
        if (raw - thetaPrev < -Math.PI) thetaTurns += 2 * Math.PI;
        else if (raw - thetaPrev > Math.PI) thetaTurns -= 2 * Math.PI;
        thetaPrev = raw;
        // The frame was aligned with the site at the start of the simulation (ignition), so the site has
        // turned by ω·(t − t_start) since then.
        const theta = raw + thetaTurns - OMEGA_PLANE * (t + P.ignitionLead);
        samples.push({
            t,
            phase,
            x,
            y,
            vx,
            vy,
            altitude: r - R_EARTH,
            downrange: theta * R_EARTH,
            speed,
            airspeed: vrel,
            verticalSpeed: vr,
            flightPathDeg: (Math.atan2(vr, vt) * 180) / Math.PI,
            pitchDeg: c.thrust > 0 ? (Math.atan2(thrustUp, thrustEast) * 180) / Math.PI : NaN,
            acceleration: Math.hypot(fx, fy) / m,
            thrust: c.thrust,
            throttle: c.throttle,
            drag,
            mass: m,
            prop1,
            prop2,
            propKick: propK,
            q: 0.5 * air.density * vrel * vrel,
            mach,
            heating: 0.5 * air.density * vrel * vrel * vrel,
            fairing,
        });
        lastSample = t;
    };

    const coast = (area: number): Controls => ({ thrust: 0, mdot: 0, dir: [0, 1], throttle: 0, area });

    // Integrate until the escape coast ends.
    let guard = 0;
    while (guard++ < 200000) {
        const [x, y, vx, vy, m] = s;
        const { up, east, r } = frame(x, y);
        const air = atmosphere(r - R_EARTH);
        let c: Controls;
        let dt = 0.2;
        let sampleEvery = 0.5;

        if (phase === 'ignition' || phase === 'stage1') {
            const ramp = phase === 'ignition' ? Math.min(1, (t + P.ignitionLead) / P.thrustRamp) : 1;
            const available = FIRST_STAGE.thrustVac - (FIRST_STAGE.thrustVac - FIRST_STAGE.thrustSL) * (air.pressure / 101325);
            let throttle = ramp;
            if (phase === 'stage1') {
                const limit = (VEHICLE.maxAccelerationG * G0 * m) / available;
                throttle = Math.max(FIRST_STAGE.minThrottle, Math.min(1, limit));
                if (throttle < 0.999) mark('throttleDown', t);
            }
            let dir: [number, number] = up;
            if (phase === 'stage1' && t >= P.verticalRise) {
                const k = Math.min(1, (t - P.verticalRise) / P.pitchOverSeconds);
                const a = (P.pitchOverDeg * Math.PI * k) / 180;
                const kicked: [number, number] = [Math.cos(a) * up[0] + Math.sin(a) * east[0], Math.cos(a) * up[1] + Math.sin(a) * east[1]];
                if (k < 1) dir = kicked;
                else {
                    // Gravity turn: thrust along the air-relative velocity (zero angle of attack).
                    const [ax0, ay0] = airVelocity(x, y);
                    const rvx = vx - ax0;
                    const rvy = vy - ay0;
                    const n = Math.hypot(rvx, rvy);
                    const fromVertical = Math.acos(Math.min(1, (rvx * up[0] + rvy * up[1]) / n));
                    dir = fromVertical >= a ? [rvx / n, rvy / n] : kicked;
                }
                if (k > 0) mark('pitchOver', P.verticalRise);
            }
            const mdot = mdot1 * throttle;
            if (prop1 <= mdot * dt) dt = Math.max(1e-6, prop1 / mdot);
            c = { thrust: available * throttle, mdot, dir, throttle, area: AREA_FAIRING };
        } else if (phase === 'stage2') {
            // Closed-loop altitude hold to the target radius, then cut off on perigee.
            const vr = vx * up[0] + vy * up[1];
            const vt = vx * east[0] + vy * east[1];
            const tau = P.guidanceTau;
            const aCmd = (TARGET_R - r) / (tau * tau) - (2 * vr) / tau;
            const gEff = MU_EARTH / (r * r) - (vt * vt) / r;
            const accel = UPPER_STAGE.thrustVac / m;
            const sinB = Math.max(-0.95, Math.min(0.95, (aCmd + gEff) / accel));
            const cosB = Math.sqrt(1 - sinB * sinB);
            const dir: [number, number] = [cosB * east[0] + sinB * up[0], cosB * east[1] + sinB * up[1]];
            if (prop2 <= mdot2 * dt) dt = Math.max(1e-6, prop2 / mdot2);
            c = { thrust: UPPER_STAGE.thrustVac, mdot: mdot2, dir, throttle: 1, area: fairing ? AREA_FAIRING : AREA_UPPER };
        } else if (phase === 'departure') {
            const v = Math.hypot(vx, vy);
            const usable = prop2 - P.upperStageReserve;
            if (usable <= mdot2 * dt) dt = Math.max(1e-6, usable / mdot2);
            c = { thrust: UPPER_STAGE.thrustVac, mdot: mdot2, dir: [vx / v, vy / v], throttle: 1, area: AREA_UPPER };
        } else if (phase === 'kick') {
            if (propK <= mdotK * dt) dt = Math.max(1e-6, propK / mdotK);
            c = { thrust: KICK_STAGE.thrust, mdot: mdotK, dir: kickDir, throttle: 1, area: AREA_UPPER };
        } else {
            c = coast(phase === 'staging' ? AREA_FAIRING : AREA_UPPER);
            // Coasts: 2 s steps in the parking orbit, 30 s on the escape hyperbola (well above the atmosphere).
            dt = phase === 'parking' ? 2 : phase === 'escape' ? (t - (at('kickBurnout') ?? t) < 600 ? 2 : 30) : phase === 'kickCoast' ? 0.5 : 0.2;
            sampleEvery = phase === 'parking' ? 10 : phase === 'escape' ? (t - (at('kickBurnout') ?? t) < 3600 ? 30 : 600) : 0.5;
        }

        if (t - lastSample >= sampleEvery - 1e-9) record(c);

        // Hold-down clamps keep the vehicle on the pad until liftoff.
        const held = phase === 'ignition';
        const before = s;
        s = rk4(s, c, dt);
        if (held) s = [before[0], before[1], before[2], before[3], s[4]];
        if (phase === 'ignition') {
            // Rotate the pad with the Earth while clamped.
            const ang = OMEGA_PLANE * dt;
            const [px, py] = [before[0], before[1]];
            const [pvx, pvy] = [before[2], before[3]];
            s = [px * Math.cos(ang) + py * Math.sin(ang), -px * Math.sin(ang) + py * Math.cos(ang), pvx * Math.cos(ang) + pvy * Math.sin(ang), -pvx * Math.sin(ang) + pvy * Math.cos(ang), s[4]];
        }
        const burned = c.mdot * dt;
        if (phase === 'ignition' || phase === 'stage1') prop1 = Math.max(0, prop1 - burned);
        else if (phase === 'stage2' || phase === 'departure') prop2 = Math.max(0, prop2 - burned);
        else if (phase === 'kick') propK = Math.max(0, propK - burned);

        // Ascent losses: gravity along the flight path and drag, while powered to orbit.
        if (phase === 'stage1' || phase === 'stage2') {
            const [nx, ny, nvx, nvy] = s;
            const f = frame(nx, ny);
            const v = Math.hypot(nvx, nvy);
            const sinGamma = (nvx * f.up[0] + nvy * f.up[1]) / v;
            gravityLoss += (MU_EARTH / (f.r * f.r)) * sinGamma * dt;
            const airNow = atmosphere(f.r - R_EARTH);
            const [ax0, ay0] = airVelocity(nx, ny);
            const vrel = Math.hypot(nvx - ax0, nvy - ay0);
            const mach = airNow.soundSpeed > 0 ? vrel / airNow.soundSpeed : 0;
            dragLoss += ((0.5 * airNow.density * vrel * vrel * dragCoefficient(mach) * c.area) / s[4]) * dt;
        }
        t += dt;

        // ── Events and phase changes ──
        const [nx, ny, nvx, nvy] = s;
        const f = frame(nx, ny);
        const alt = f.r - R_EARTH;
        const phaseBefore: FlightPhase = phase;
        const eventsBefore = events.length;
        // Escape: specific orbital energy above zero (first reached during the departure burns).
        if ((phase === 'departure' || phase === 'kickCoast' || phase === 'kick') && elements(nx, ny, nvx, nvy).energy > 0) mark('escape', t);
        if (phase === 'ignition' && t >= 0) {
            t = 0;
            phase = 'stage1';
            mark('liftoff', 0);
        } else if (phase === 'stage1') {
            if (alt > P.towerHeight) mark('towerClear', t);
            const airNow = atmosphere(alt);
            const [ax0, ay0] = airVelocity(nx, ny);
            const vrel = Math.hypot(nvx - ax0, nvy - ay0);
            const q = 0.5 * airNow.density * vrel * vrel;
            if (q > maxQ.q) maxQ = { q, t, altitude: alt, speed: vrel };
            if (prop1 <= 1e-6) {
                phase = 'staging';
                mark('maxQ', maxQ.t);
                mark('meco', t);
                masses.beforeStaging = s[4];
            }
        } else if (phase === 'staging') {
            const meco = at('meco')!;
            if (!at('stageSep') && t >= meco + P.separationDelay) {
                mark('stageSep', t);
                s = [s[0], s[1], s[2], s[3], s[4] - FIRST_STAGE.dryMass];
                masses.afterStaging = s[4];
            }
            if (t >= meco + P.usIgnitionDelay) {
                phase = 'stage2';
                mark('usIgnition', t);
            }
        } else if (phase === 'stage2') {
            const airNow = atmosphere(alt);
            const [ax0, ay0] = airVelocity(nx, ny);
            const vrel = Math.hypot(nvx - ax0, nvy - ay0);
            if (fairing && alt > P.fairingMinAltitude && 0.5 * airNow.density * vrel ** 3 < P.fairingHeating) {
                fairing = false;
                s = [s[0], s[1], s[2], s[3], s[4] - FAIRING.mass];
                mark('fairingSep', t);
            }
            const el = elements(nx, ny, nvx, nvy);
            if (el.rp >= TARGET_R - 2000 || prop2 <= 1e-6) {
                phase = 'parking';
                mark('seco1', t);
                masses.orbit = s[4];
                upperStagePropAtOrbit = prop2;
            }
        } else if (phase === 'parking') {
            if (t >= at('seco1')! + P.parkingCoast) {
                phase = 'departure';
                mark('usRestart', t);
            }
        } else if (phase === 'departure') {
            if (prop2 - P.upperStageReserve <= 1e-6) {
                phase = 'kickCoast';
                mark('seco2', t);
            }
        } else if (phase === 'kickCoast') {
            const seco2 = at('seco2')!;
            if (!at('kickSep') && t >= seco2 + P.kickSepDelay) {
                mark('kickSep', t);
                s = [s[0], s[1], s[2], s[3], s[4] - UPPER_STAGE.dryMass - prop2 - ADAPTER_MASS];
            }
            if (t >= seco2 + P.kickIgnitionDelay) {
                phase = 'kick';
                const v = Math.hypot(nvx, nvy);
                // Spin-stabilised: the thrust axis stays fixed in space along the velocity at ignition.
                kickDir = [nvx / v, nvy / v];
                mark('kickIgnition', t);
            }
        } else if (phase === 'kick') {
            if (propK <= 1e-6) {
                phase = 'escape';
                mark('kickBurnout', t);
                c3 = elements(nx, ny, nvx, nvy).c3;
            }
        } else if (phase === 'escape') {
            if (!at('scSep') && t >= at('kickBurnout')! + P.scSepDelay) {
                mark('scSep', t);
                s = [s[0], s[1], s[2], s[3], s[4] - KICK_STAGE.inertMass];
                masses.spacecraft = s[4];
            }
            if (t >= at('kickBurnout')! + P.escapeCoast) break;
        }
        // A record at every phase change and jettison, so interpolation never blends across an event.
        if (phase !== phaseBefore || events.length !== eventsBefore) lastSample = -Infinity;
    }
    record(coast(AREA_UPPER));

    const seco1 = samples.find((x) => x.t >= at('seco1')!)!;
    const el = elements(seco1.x, seco1.y, seco1.vx, seco1.vy);
    events.sort((a, b) => a.t - b.t);
    return {
        samples,
        events,
        maxQ,
        losses: { gravity: gravityLoss, drag: dragLoss },
        parking: {
            perigeeKm: (el.rp - R_EARTH) / 1000,
            apogeeKm: (el.ra - R_EARTH) / 1000,
            periodMin: el.period / 60,
            speed: seco1.speed,
            inclinationDeg: VEHICLE.siteLatitudeDeg,
        },
        masses: { ...masses, spacecraft: masses.spacecraft || SPACECRAFT.mass },
        c3,
        upperStagePropAtOrbit,
        upperStageReserve: P.upperStageReserve,
    };
}

let cached: FlightResult | null = null;
/** The flight is deterministic, so it is computed once and shared. */
export function flight(): FlightResult {
    return (cached ??= simulateFlight());
}

/** The sample at (or just before) mission elapsed time t, interpolated linearly between records. */
export function sampleAt(t: number, result = flight()): FlightSample {
    const s = result.samples;
    if (t <= s[0].t) return s[0];
    if (t >= s[s.length - 1].t) return s[s.length - 1];
    let lo = 0;
    let hi = s.length - 1;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (s[mid].t <= t) lo = mid;
        else hi = mid;
    }
    const a = s[lo];
    const b = s[hi];
    const f = (t - a.t) / (b.t - a.t || 1);
    const out = { ...a };
    for (const key of ['x', 'y', 'vx', 'vy', 'altitude', 'downrange', 'speed', 'airspeed', 'verticalSpeed', 'flightPathDeg', 'acceleration', 'thrust', 'throttle', 'drag', 'mass', 'prop1', 'prop2', 'propKick', 'q', 'mach', 'heating'] as const) {
        out[key] = a[key] + (b[key] - a[key]) * f;
    }
    return out;
}

export const eventTime = (id: EventId, result = flight()) => result.events.find((e) => e.id === id)?.t ?? NaN;
