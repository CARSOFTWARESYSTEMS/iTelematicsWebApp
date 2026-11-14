/**
 * Two-body orbital mechanics for the Solar System experience: orbital elements from a planar state,
 * circular and escape speeds, and the conceptual Earth-to-Jupiter transfer (Hohmann, coplanar
 * circular orbits) that sets the departure energy the reference mission needs.
 */
import { AU, MU_EARTH, MU_SUN, ORBIT_AU, R_EARTH, YEAR } from './constants';

export interface Elements {
    /** Semi-major axis, m (negative for a hyperbola). */
    a: number;
    e: number;
    /** Periapsis and apoapsis radii, m (apoapsis is Infinity for escape orbits). */
    rp: number;
    ra: number;
    /** Specific orbital energy, J/kg. */
    energy: number;
    /** Period, s (Infinity for escape orbits). */
    period: number;
    /** C3 = v∞², m²/s² (negative while bound). */
    c3: number;
}

/** Elements of the orbit through position (x, y) with velocity (vx, vy). */
export function elements(x: number, y: number, vx: number, vy: number, mu = MU_EARTH): Elements {
    const r = Math.hypot(x, y);
    const v2 = vx * vx + vy * vy;
    const energy = v2 / 2 - mu / r;
    const h = x * vy - y * vx;
    const e = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / (mu * mu)));
    const a = -mu / (2 * energy);
    const p = (h * h) / mu;
    const rp = p / (1 + e);
    const bound = energy < 0;
    return {
        a,
        e,
        rp,
        ra: bound ? p / (1 - e) : Infinity,
        energy,
        period: bound ? 2 * Math.PI * Math.sqrt((a * a * a) / mu) : Infinity,
        c3: 2 * energy,
    };
}

export const circularSpeed = (r: number, mu = MU_EARTH) => Math.sqrt(mu / r);
export const escapeSpeed = (r: number, mu = MU_EARTH) => Math.sqrt((2 * mu) / r);

/** Inclination of an orbit launched from latitude φ on azimuth Az: cos i = cos φ · sin Az. */
export const inclinationDeg = (latDeg: number, azDeg: number) => (Math.acos(Math.cos((latDeg * Math.PI) / 180) * Math.sin((azDeg * Math.PI) / 180)) * 180) / Math.PI;

/**
 * Hohmann transfer between circular coplanar orbits about the Sun: the departure excess speed v∞
 * (and C3 = v∞²) at the inner planet, the arrival excess at the outer one and the transfer time.
 */
export function hohmann(r1: number, r2: number, mu = MU_SUN) {
    const at = (r1 + r2) / 2;
    const v1 = Math.sqrt(mu / r1);
    const v2 = Math.sqrt(mu / r2);
    const vp = Math.sqrt(mu * (2 / r1 - 1 / at));
    const va = Math.sqrt(mu * (2 / r2 - 1 / at));
    return { vInfDeparture: vp - v1, vInfArrival: v2 - va, c3: (vp - v1) ** 2, tof: Math.PI * Math.sqrt((at * at * at) / mu), semiMajor: at };
}

/** The conceptual Earth → Jupiter transfer of reference mission SOL-1. */
export const EARTH_JUPITER = (() => {
    const t = hohmann(ORBIT_AU.earth * AU, ORBIT_AU.jupiter * AU);
    return { ...t, tofYears: t.tof / YEAR };
})();

/** Speed at periapsis of a departure hyperbola from radius r with excess C3 (m²/s²). */
export const departureSpeed = (r: number, c3: number) => Math.sqrt(c3 + (2 * MU_EARTH) / r);

/** Impulsive Δv from a circular parking orbit at altitude h (m) to a hyperbola with C3. */
export const departureDeltaV = (h: number, c3: number) => departureSpeed(R_EARTH + h, c3) - circularSpeed(R_EARTH + h);
