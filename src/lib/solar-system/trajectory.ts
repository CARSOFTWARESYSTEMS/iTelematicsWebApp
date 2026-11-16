/**
 * Phase B physics mode: a Jupiter–Saturn trajectory for reference mission SOL-1, designed from the
 * ephemeris (ephemeris.ts) with Lambert arcs (lambert.ts) and patched conics.
 *
 * Design method (searchJupiterSaturn): for launch dates over a grid, Lambert arcs Earth → Jupiter and
 * Jupiter → Saturn are solved; a Jupiter flyby must connect them. For each combination the flyby
 * periapsis that turns the incoming excess velocity onto the outgoing one is solved, and the small
 * velocity change needed at periapsis if their magnitudes differ (a powered flyby) is computed.
 * Constraints:
 * - departure energy C3 within what the simulated SOL-1 launch delivers (113.6 km²/s², flight.ts);
 * - Jupiter periapsis at least 4 Jupiter radii (radiation; Voyager 1 passed at 4.9);
 * - powered-flyby Δv within RSC-1's hydrazine budget (45 kg ≈ 130 m/s; at most 80 m/s is allowed);
 * - flight time to Saturn at most 9 years.
 * The departure asymptote's declination (DLA) is reported against the 10° parking orbit of the
 * simulated launch.
 *
 * The chosen solution (MISSION) is fixed below with its dates; the test file re-runs the search and
 * checks that the stored dates are its result and that the stored trajectory satisfies every
 * constraint. Patched conics and the approximate ephemeris make this a conceptual design: no
 * trajectory-correction manoeuvres, no planetary perturbations during cruise, and no launch-window
 * width analysis.
 */
import { AU, MU_SUN, YEAR } from './constants';
import { add, cross, DAY, dot, isoDate, jd, norm, positionAU, scale, state, sub, toEquatorial, unit, type PlanetId, type Vec } from './ephemeris';
import { lambert, propagate } from './lambert';

export const MU_JUPITER = 1.26686534e17;
export const R_JUPITER = 7.1492e7;
export const MU_SATURN = 3.7931187e16;
export const R_SATURN = 6.0268e7;

export const CONSTRAINTS = {
    /** km²/s²: the escape energy reached by the simulated SOL-1 launch (flight.ts, Phase A). */
    c3Max: 113.6,
    rpMinJupiterRadii: 4,
    poweredDvMax: 80, // m/s
    maxYearsToSaturn: 9,
    /** Parking-orbit inclination of the simulated launch: the reachable |DLA| without a dog-leg. */
    dlaLimitDeg: 10,
} as const;

export interface Flyby {
    /** Excess speeds in and out, m/s, and the turn angle between them, radians. */
    vInfIn: number;
    vInfOut: number;
    turn: number;
    /** Periapsis radius, m, and the Δv applied there to match the magnitudes, m/s. */
    rp: number;
    dv: number;
    /** Change of heliocentric velocity produced by the flyby, m/s. */
    helioDv: number;
}

/**
 * Periapsis radius at which a hyperbola turns v∞in onto v∞out (magnitudes may differ: the turn is
 * split between the two half-hyperbolas, δ = asin(1/e_in) + asin(1/e_out)), and the periapsis Δv.
 */
export function flybyGeometry(vIn: Vec, vOut: Vec, mu: number): Flyby {
    const a = norm(vIn);
    const b = norm(vOut);
    const turn = Math.acos(Math.max(-1, Math.min(1, dot(vIn, vOut) / (a * b))));
    const deflection = (rp: number) => Math.asin(1 / (1 + (rp * a * a) / mu)) + Math.asin(1 / (1 + (rp * b * b) / mu));
    // Deflection falls monotonically with rp; bisection in log space.
    let lo = 1e5;
    let hi = 1e13;
    if (deflection(lo) < turn) hi = lo;
    else
        for (let i = 0; i < 200; i++) {
            const mid = Math.sqrt(lo * hi);
            if (deflection(mid) > turn) lo = mid;
            else hi = mid;
            if (hi / lo < 1 + 1e-12) break;
        }
    const rp = Math.sqrt(lo * hi);
    const dv = Math.abs(Math.sqrt(b * b + (2 * mu) / rp) - Math.sqrt(a * a + (2 * mu) / rp));
    return { vInfIn: a, vInfOut: b, turn, rp, dv, helioDv: norm(sub(vOut, vIn)) };
}

export interface Candidate {
    launch: number;
    jupiter: number;
    saturn: number;
    c3: number; // km²/s²
    dlaDeg: number;
    flyby: Flyby;
}

/** Declination of the departure asymptote (equatorial J2000), degrees. */
export const dlaDeg = (vInf: Vec) => {
    const q = toEquatorial(vInf);
    return (Math.asin(q[2] / norm(q)) * 180) / Math.PI;
};

/**
 * Grid search for Earth → Jupiter → Saturn trajectories. Steps are in days. Returns every feasible
 * candidate, best (lowest C3) first.
 */
export function searchJupiterSaturn({ from = jd(2030, 1, 1), to = jd(2046, 1, 1), stepLaunch = 8, stepJupiter = 12, stepSaturn = 16 } = {}): Candidate[] {
    const c3Max = CONSTRAINTS.c3Max * 1e6;
    const rpMin = CONSTRAINTS.rpMinJupiterRadii * R_JUPITER;
    // Jupiter → Saturn legs, cached per Jupiter date.
    const legs2 = new Map<number, { saturn: number; vOut: Vec }[]>();
    const leg2 = (J: number) => {
        let list = legs2.get(J);
        if (list) return list;
        list = [];
        const j = state('jupiter', J);
        for (let S = J + 1.5 * 365.25; S <= J + 6 * 365.25; S += stepSaturn) {
            const s = state('saturn', S);
            const sol = lambert(j.r, s.r, (S - J) * DAY, MU_SUN);
            if (sol) list.push({ saturn: S, vOut: sub(sol.v1, j.v) });
        }
        legs2.set(J, list);
        return list;
    };
    const out: Candidate[] = [];
    const j0 = from + 1.2 * 365.25;
    for (let L = from; L <= to; L += stepLaunch) {
        const e = state('earth', L);
        // Jupiter dates on a fixed grid so the second legs are shared between launch dates.
        const first = j0 + Math.ceil((L + 1.2 * 365.25 - j0) / stepJupiter) * stepJupiter;
        for (let J = first; J <= L + 3.2 * 365.25; J += stepJupiter) {
            const jj = state('jupiter', J);
            const sol = lambert(e.r, jj.r, (J - L) * DAY, MU_SUN);
            if (!sol) continue;
            const vInfDep = sub(sol.v1, e.v);
            const c3 = dot(vInfDep, vInfDep);
            if (c3 > c3Max) continue;
            const vIn = sub(sol.v2, jj.v);
            for (const { saturn, vOut } of leg2(J)) {
                if ((saturn - L) / 365.25 > CONSTRAINTS.maxYearsToSaturn) continue;
                // Quick reject: magnitudes too different for a small periapsis burn.
                if (Math.abs(norm(vIn) - norm(vOut)) > 600) continue;
                const fb = flybyGeometry(vIn, vOut, MU_JUPITER);
                if (fb.rp < rpMin || fb.dv > CONSTRAINTS.poweredDvMax) continue;
                out.push({ launch: L, jupiter: J, saturn, c3: c3 / 1e6, dlaDeg: dlaDeg(vInfDep), flyby: fb });
            }
        }
    }
    return out.sort(rank);
}

/** Selection rule: lowest departure energy (to 0.01 km²/s²), then the smallest periapsis burn. */
export const rank = (a: Candidate, b: Candidate) => Math.round(a.c3 * 100) - Math.round(b.c3 * 100) || a.flyby.dv - b.flyby.dv;

/** The refined search that selected MISSION_DATES (coarse search: best window opens in 2034). */
export const REFINED_SEARCH = { from: jd(2034, 6, 5), to: jd(2034, 7, 15), stepLaunch: 1, stepJupiter: 2, stepSaturn: 4 } as const;

/**
 * The SOL-1 trajectory chosen with searchJupiterSaturn (see the test): launch, Jupiter flyby and Saturn
 * flyby dates (UTC, day precision). Recomputed from these dates at runtime.
 *
 * Coarse search 2030–2045 (8/12/16-day steps): the lowest-energy window opens in mid-2034 (C3 ≈ 80
 * km²/s², DLA ≈ 4–6°); the next windows need much larger declinations or energies. Refined search
 * (REFINED_SEARCH, 1/2/4-day steps): feasible launches 23 May – 22 July 2034; best 25 June 2034.
 */
export const MISSION_DATES = { launch: '2034-06-25', jupiter: '2037-07-03', saturn: '2040-11-28' } as const;
/** Launch dates (inclusive) for which the 1/2/4-day search found a feasible trajectory. */
export const LAUNCH_WINDOW = { opens: '2034-05-23', closes: '2034-07-22' } as const;

const fromIso = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return jd(y, m, d);
};

export interface MissionTrajectory {
    launch: number;
    jupiter: number;
    saturn: number;
    c3: number;
    dlaDeg: number;
    vInfDeparture: Vec;
    leg1: { r1: Vec; v1: Vec; r2: Vec; v2: Vec };
    leg2: { r1: Vec; v1: Vec; r2: Vec; v2: Vec };
    flyby: Flyby;
    /** Jupiter-centred excess velocities at the flyby. */
    vInfIn: Vec;
    vInfOut: Vec;
    /** Saturn arrival excess velocity, m/s, and heliocentric speed vs solar escape speed there. */
    vInfSaturn: number;
    helioSpeedSaturn: number;
    escapeSpeedSaturn: number;
}

let cached: MissionTrajectory | null = null;

/** The stored mission, computed from its dates. */
export function missionTrajectory(): MissionTrajectory {
    if (cached) return cached;
    const L = fromIso(MISSION_DATES.launch);
    const J = fromIso(MISSION_DATES.jupiter);
    const S = fromIso(MISSION_DATES.saturn);
    const e = state('earth', L);
    const j = state('jupiter', J);
    const s = state('saturn', S);
    const a = lambert(e.r, j.r, (J - L) * DAY, MU_SUN)!;
    const b = lambert(j.r, s.r, (S - J) * DAY, MU_SUN)!;
    const vInfDeparture = sub(a.v1, e.v);
    const vInfIn = sub(a.v2, j.v);
    const vInfOut = sub(b.v1, j.v);
    const flyby = flybyGeometry(vInfIn, vInfOut, MU_JUPITER);
    const rS = norm(s.r);
    cached = {
        launch: L,
        jupiter: J,
        saturn: S,
        c3: dot(vInfDeparture, vInfDeparture) / 1e6,
        dlaDeg: dlaDeg(vInfDeparture),
        vInfDeparture,
        leg1: { r1: e.r, v1: a.v1, r2: j.r, v2: a.v2 },
        leg2: { r1: j.r, v1: b.v1, r2: s.r, v2: b.v2 },
        flyby,
        vInfIn,
        vInfOut,
        vInfSaturn: norm(sub(b.v2, s.v)),
        helioSpeedSaturn: norm(b.v2),
        escapeSpeedSaturn: Math.sqrt((2 * MU_SUN) / rS),
    };
    return cached;
}

/** Spacecraft heliocentric state at Julian date t (patched conic; after Saturn the Jupiter–Saturn arc continues). */
export function spacecraftAt(t: number): { r: Vec; v: Vec; leg: 1 | 2 } {
    const m = missionTrajectory();
    if (t <= m.jupiter) return { ...propagate(m.leg1.r1, m.leg1.v1, (Math.max(t, m.launch) - m.launch) * DAY, MU_SUN), leg: 1 };
    return { ...propagate(m.leg2.r1, m.leg2.v1, (t - m.jupiter) * DAY, MU_SUN), leg: 2 };
}

/** Points along a leg for drawing (heliocentric, m). */
export function legPoints(leg: 1 | 2, n = 240): Vec[] {
    const m = missionTrajectory();
    const [t0, t1, r, v] = leg === 1 ? [m.launch, m.jupiter, m.leg1.r1, m.leg1.v1] : [m.jupiter, m.saturn, m.leg2.r1, m.leg2.v1];
    return Array.from({ length: n + 1 }, (_, i) => propagate(r, v, ((t1 - t0) * DAY * i) / n, MU_SUN).r);
}

/** Planet position at Julian date t, m. */
export const planetAt = (id: PlanetId, t: number): Vec => scale(positionAU(id, t), AU);

/**
 * Jupiter-centred flyby hyperbola: position (m) relative to Jupiter at `dt` seconds from periapsis,
 * in the ecliptic frame. The plane contains v∞in and v∞out; periapsis lies on the inside of the turn.
 */
export function flybyPosition(dt: number): Vec {
    const m = missionTrajectory();
    const { rp } = m.flyby;
    const vIn = unit(m.vInfIn);
    const vOut = unit(m.vInfOut);
    const p = unit(sub(vIn, vOut)); // periapsis direction
    const q = unit(add(vIn, vOut)); // velocity direction at periapsis
    // Incoming and outgoing halves have their own excess speeds (powered flyby): use each one's conic.
    const vinf = dt < 0 ? m.flyby.vInfIn : m.flyby.vInfOut;
    const a = MU_JUPITER / (vinf * vinf); // |a|
    const e = 1 + rp / a;
    const n = Math.sqrt(MU_JUPITER / (a * a * a));
    const M = n * dt;
    let F = Math.asinh(M / e);
    for (let i = 0; i < 50; i++) {
        const d = (e * Math.sinh(F) - F - M) / (e * Math.cosh(F) - 1);
        F -= d;
        if (Math.abs(d) < 1e-12) break;
    }
    const x = a * (e - Math.cosh(F));
    const y = a * Math.sqrt(e * e - 1) * Math.sinh(F);
    return add(scale(p, x), scale(q, y));
}

/** Spacecraft speed relative to Jupiter at `dt` seconds from periapsis, m/s (vis-viva). */
export function flybySpeed(dt: number) {
    const m = missionTrajectory();
    const r = norm(flybyPosition(dt));
    const vinf = dt < 0 ? m.flyby.vInfIn : m.flyby.vInfOut;
    return Math.sqrt(vinf * vinf + (2 * MU_JUPITER) / r);
}

export const missionYears = (t: number) => (t - missionTrajectory().launch) / (YEAR / DAY);
export const describe = (t: number) => isoDate(t);
export { cross };

// ── Solar conjunctions (communication interruptions) ──────────────────────

/** Sun–Earth–spacecraft angle (degrees) at Julian date t: how close RSC-1 appears to the Sun from Earth. */
export function sunEarthProbeAngle(t: number) {
    const e = planetAt('earth', t);
    const s = spacecraftAt(t).r;
    const toSun = scale(e, -1);
    const toSc = sub(s, e);
    const c = dot(toSun, toSc) / (norm(toSun) * norm(toSc));
    return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

/** Radio links are unreliable when the spacecraft appears this close to the Sun (the corona scrambles them). */
export const CONJUNCTION_LIMIT_DEG = 3;

export interface Conjunction {
    start: number;
    end: number;
    min: number;
    minAt: number;
}

let conjCache: Conjunction[] | null = null;

/** Solar conjunctions between launch and Saturn (Sun–Earth–probe angle below the limit), 6-hour steps. */
export function conjunctions(): Conjunction[] {
    if (conjCache) return conjCache;
    const m = missionTrajectory();
    const out: Conjunction[] = [];
    let cur: Conjunction | null = null;
    for (let t = m.launch + 10; t <= m.saturn; t += 0.25) {
        const a = sunEarthProbeAngle(t);
        if (a < CONJUNCTION_LIMIT_DEG) {
            if (!cur) cur = { start: t, end: t, min: a, minAt: t };
            cur.end = t;
            if (a < cur.min) {
                cur.min = a;
                cur.minAt = t;
            }
        } else if (cur) {
            out.push(cur);
            cur = null;
        }
    }
    if (cur) out.push(cur);
    return (conjCache = out);
}
