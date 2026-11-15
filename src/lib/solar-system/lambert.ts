/**
 * Lambert's problem: the conic connecting two positions in a given time of flight (single revolution,
 * prograde), solved with universal variables (Bate, Mueller & White; Curtis, Orbital Mechanics for
 * Engineering Students, algorithm 5.2) by bisection on z, which is robust for every transfer angle
 * below 360°. Also a two-body propagator (universal Kepler equation) used to verify the solutions and
 * to draw the arcs.
 */
import { add, cross, dot, norm, scale, sub, type Vec } from './ephemeris';

/** Stumpff functions C(z) and S(z). */
export function stumpff(z: number) {
    if (z > 1e-8) {
        const s = Math.sqrt(z);
        return { C: (1 - Math.cos(s)) / z, S: (s - Math.sin(s)) / (s * s * s) };
    }
    if (z < -1e-8) {
        const s = Math.sqrt(-z);
        return { C: (Math.cosh(s) - 1) / -z, S: (Math.sinh(s) - s) / (s * s * s) };
    }
    return { C: 1 / 2 - z / 24, S: 1 / 6 - z / 120 };
}

export interface LambertResult {
    v1: Vec;
    v2: Vec;
    /** Universal variable at the solution: > 0 ellipse, < 0 hyperbola. */
    z: number;
}

/**
 * Velocities at r1 (departure) and r2 (arrival) for a prograde transfer (angular momentum along +z of
 * the frame) taking `tof` seconds. Returns null if no single-revolution solution exists.
 */
export function lambert(r1: Vec, r2: Vec, tof: number, mu: number): LambertResult | null {
    const R1 = norm(r1);
    const R2 = norm(r2);
    const c = cross(r1, r2);
    let dTheta = Math.acos(Math.max(-1, Math.min(1, dot(r1, r2) / (R1 * R2))));
    if (c[2] < 0) dTheta = 2 * Math.PI - dTheta;
    const A = Math.sin(dTheta) * Math.sqrt((R1 * R2) / (1 - Math.cos(dTheta)));
    if (!Number.isFinite(A) || Math.abs(A) < 1e-9) return null;
    const y = (z: number) => {
        const { C, S } = stumpff(z);
        return R1 + R2 + (A * (z * S - 1)) / Math.sqrt(C);
    };
    const F = (z: number) => {
        const { C, S } = stumpff(z);
        const yz = y(z);
        return Math.pow(yz / C, 1.5) * S + A * Math.sqrt(yz) - Math.sqrt(mu) * tof;
    };
    // Lower bound: y(z) must be positive. Upper bound: just below the single-revolution limit 4π².
    let lo = -4 * Math.PI * Math.PI;
    const hiLimit = 4 * Math.PI * Math.PI - 1e-6;
    while (y(lo) < 0 && lo < hiLimit) lo += 0.05;
    if (lo >= hiLimit) return null;
    let hi = hiLimit;
    if (F(lo) > 0 || F(hi) < 0) return null;
    for (let i = 0; i < 200; i++) {
        const mid = 0.5 * (lo + hi);
        if (F(mid) > 0) hi = mid;
        else lo = mid;
        if (hi - lo < 1e-12) break;
    }
    const z = 0.5 * (lo + hi);
    const yz = y(z);
    const f = 1 - yz / R1;
    const g = A * Math.sqrt(yz / mu);
    const gdot = 1 - yz / R2;
    const v1 = scale(sub(r2, scale(r1, f)), 1 / g);
    const v2 = scale(sub(scale(r2, gdot), r1), 1 / g);
    return { v1, v2, z };
}

/** Two-body propagation of (r, v) by `dt` seconds (universal variable Kepler equation). */
export function propagate(r: Vec, v: Vec, dt: number, mu: number): { r: Vec; v: Vec } {
    const r0 = norm(r);
    const v0 = norm(v);
    const vr0 = dot(r, v) / r0;
    const alpha = 2 / r0 - (v0 * v0) / mu; // 1/a
    const sqmu = Math.sqrt(mu);
    // Newton on the universal anomaly χ.
    let chi = sqmu * Math.abs(alpha) * dt;
    if (!Number.isFinite(chi) || chi === 0) chi = (sqmu * dt) / r0;
    for (let i = 0; i < 60; i++) {
        const z = alpha * chi * chi;
        const { C, S } = stumpff(z);
        const Fv = ((r0 * vr0) / sqmu) * chi * chi * C + (1 - alpha * r0) * chi * chi * chi * S + r0 * chi - sqmu * dt;
        const dF = ((r0 * vr0) / sqmu) * chi * (1 - z * S) + (1 - alpha * r0) * chi * chi * C + r0;
        const d = Fv / dF;
        chi -= d;
        if (Math.abs(d) < 1e-9) break;
    }
    const z = alpha * chi * chi;
    const { C, S } = stumpff(z);
    const f = 1 - ((chi * chi) / r0) * C;
    const g = dt - (1 / sqmu) * chi * chi * chi * S;
    const rv = add(scale(r, f), scale(v, g));
    const rn = norm(rv);
    const fdot = (sqmu / (rn * r0)) * (z * S - 1) * chi;
    const gdot = 1 - ((chi * chi) / rn) * C;
    return { r: rv, v: add(scale(r, fdot), scale(v, gdot)) };
}
