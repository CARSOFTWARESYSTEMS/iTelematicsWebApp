/**
 * Orbital geometry for the Space Digital Twin scenes: circular two-body (Keplerian)
 * orbits around a spherical Earth, Walker-delta constellations, ground-station elevation and
 * line of sight, coverage footprints from a minimum elevation angle, and Earth's cylindrical
 * shadow. No perturbations (J2, drag), no ellipsoid, no refraction: a simplified engineering
 * model for learning and research, stated wherever its numbers are shown.
 *
 * Frame: Earth-centred inertial (ECI), z towards the north pole, kilometres and minutes.
 * The constants are the reference case's (energy-model.ts), so every scene agrees.
 */
import { ORBIT } from '@/lib/energy-model';

export type Vec3 = [number, number, number];

export const RE_KM = ORBIT.earthRadiusKm;
export const MU_KM3_S2 = ORBIT.muKm3s2;
/** One rotation of the Earth relative to the stars. */
export const SIDEREAL_DAY_MIN = 1436.0682;

const DEG = Math.PI / 180;

export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a: Vec3) => Math.sqrt(dot(a, a));
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const unit = (a: Vec3): Vec3 => scale(a, 1 / len(a));

/** Circular-orbit period, T = 2π √(a³/μ). */
export function periodMin(altKm: number): number {
    const a = RE_KM + altKm;
    return (2 * Math.PI * Math.sqrt(a ** 3 / MU_KM3_S2)) / 60;
}

/** Circular-orbit speed, v = √(μ/a). */
export function speedKmS(altKm: number): number {
    return Math.sqrt(MU_KM3_S2 / (RE_KM + altKm));
}

export interface OrbitSlot {
    id: string;
    plane: number;
    slot: number;
    altKm: number;
    incDeg: number;
    raanDeg: number;
    /** Argument of latitude at t = 0. */
    phaseDeg: number;
}

/**
 * Walker-delta pattern i: T/P/F. P planes with equally spaced ascending nodes, T/P satellites
 * equally spaced in each plane, and a phase offset of F·360°/T between adjacent planes.
 */
export function walkerDelta({ total, planes, phasing, incDeg, altKm }: { total: number; planes: number; phasing: number; incDeg: number; altKm: number }): OrbitSlot[] {
    const perPlane = total / planes;
    const slots: OrbitSlot[] = [];
    for (let p = 0; p < planes; p++) {
        for (let s = 0; s < perPlane; s++) {
            slots.push({
                id: `P${p + 1}-${String(s + 1).padStart(2, '0')}`,
                plane: p,
                slot: s,
                altKm,
                incDeg,
                raanDeg: (360 * p) / planes,
                phaseDeg: (360 * s) / perPlane + (360 * phasing * p) / total,
            });
        }
    }
    return slots;
}

/** ECI position (km) of a satellite on its circular orbit at t minutes. */
export function positionEci(slot: OrbitSlot, tMin: number, out: Vec3 = [0, 0, 0]): Vec3 {
    const a = RE_KM + slot.altKm;
    const u = (slot.phaseDeg + (360 * tMin) / periodMin(slot.altKm)) * DEG;
    const i = slot.incDeg * DEG;
    const raan = slot.raanDeg * DEG;
    const xp = a * Math.cos(u);
    const yp = a * Math.sin(u);
    const y1 = yp * Math.cos(i);
    const z1 = yp * Math.sin(i);
    out[0] = xp * Math.cos(raan) - y1 * Math.sin(raan);
    out[1] = xp * Math.sin(raan) + y1 * Math.cos(raan);
    out[2] = z1;
    return out;
}

/** Earth rotation angle (degrees) at t minutes, from an initial angle. */
export function earthRotationDeg(tMin: number, initialDeg = 0): number {
    return initialDeg + (360 * tMin) / SIDEREAL_DAY_MIN;
}

/** Earth-fixed position of a point at latitude/longitude on a spherical Earth (plus height). */
export function geoToEcef(latDeg: number, lonDeg: number, heightKm = 0): Vec3 {
    const r = RE_KM + heightKm;
    const lat = latDeg * DEG;
    const lon = lonDeg * DEG;
    return [r * Math.cos(lat) * Math.cos(lon), r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat)];
}

/** Rotates about the polar axis: Earth-fixed → inertial for a positive angle. */
export function rotateZ(v: Vec3, deg: number, out: Vec3 = [0, 0, 0]): Vec3 {
    const c = Math.cos(deg * DEG);
    const s = Math.sin(deg * DEG);
    const x = v[0] * c - v[1] * s;
    const y = v[0] * s + v[1] * c;
    out[0] = x;
    out[1] = y;
    out[2] = v[2];
    return out;
}

/** Sub-satellite point (latitude, longitude in degrees, east positive). */
export function subPoint(eci: Vec3, earthDeg: number): { lat: number; lon: number } {
    const ecef = rotateZ(eci, -earthDeg);
    const lat = Math.asin(ecef[2] / len(ecef)) / DEG;
    let lon = Math.atan2(ecef[1], ecef[0]) / DEG;
    lon = ((lon + 540) % 360) - 180;
    return { lat, lon };
}

/** Elevation of a satellite above a ground station's local horizon (degrees; negative = below). */
export function elevationDeg(station: Vec3, sat: Vec3): number {
    const rho = sub(sat, station);
    return Math.asin(dot(rho, station) / (len(rho) * len(station))) / DEG;
}

/**
 * Coverage footprint half-angle at the Earth's centre for a minimum elevation ε:
 * λ = arccos(R cos ε / (R + h)) − ε. The footprint is the spherical cap of that half-angle.
 */
export function coverageHalfAngleDeg(altKm: number, minElevDeg: number): number {
    const e = minElevDeg * DEG;
    return (Math.acos((RE_KM * Math.cos(e)) / (RE_KM + altKm)) - e) / DEG;
}

/** Footprint radius measured along the Earth's surface. */
export function footprintRadiusKm(altKm: number, minElevDeg: number): number {
    return RE_KM * coverageHalfAngleDeg(altKm, minElevDeg) * DEG;
}

/** Longest slant range to a station at the minimum elevation. */
export function maxSlantRangeKm(altKm: number, minElevDeg: number): number {
    const e = minElevDeg * DEG;
    const r = RE_KM + altKm;
    return Math.sqrt(r * r - RE_KM * RE_KM * Math.cos(e) ** 2) - RE_KM * Math.sin(e);
}

/** True when the straight line between two points stays at least `clearanceKm` above the surface. */
export function lineOfSight(a: Vec3, b: Vec3, clearanceKm = 0): boolean {
    const d = sub(b, a);
    const t = Math.max(0, Math.min(1, -dot(a, d) / dot(d, d)));
    const closest: Vec3 = [a[0] + d[0] * t, a[1] + d[1] * t, a[2] + d[2] * t];
    return len(closest) >= RE_KM + clearanceKm;
}

/** Cylindrical shadow: behind the Earth relative to the Sun and within one Earth radius of the axis. */
export function inEarthShadow(eci: Vec3, sunUnit: Vec3): boolean {
    const along = dot(eci, sunUnit);
    if (along >= 0) return false;
    const perp = sub(eci, scale(sunUnit, along));
    return len(perp) < RE_KM;
}

/** Nearly uniform points on the unit sphere (Fibonacci lattice), for area estimates. */
export function fibonacciSphere(n: number): Vec3[] {
    const pts: Vec3[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
        const z = 1 - (2 * (i + 0.5)) / n;
        const r = Math.sqrt(1 - z * z);
        const a = golden * i;
        pts.push([r * Math.cos(a), r * Math.sin(a), z]);
    }
    return pts;
}

/** Share of the Earth's surface inside at least one footprint, estimated on a sample lattice. */
export function coverageFraction(satUnits: Vec3[], halfAngleDeg: number, lattice: Vec3[]): number {
    const cosLambda = Math.cos(halfAngleDeg * DEG);
    let covered = 0;
    for (const p of lattice) {
        for (const s of satUnits) {
            if (dot(p, s) >= cosLambda) {
                covered++;
                break;
            }
        }
    }
    return covered / lattice.length;
}
