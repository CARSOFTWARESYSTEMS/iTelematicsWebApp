/**
 * Planetary positions for the Solar System experience (Phase B), from JPL's "Keplerian Elements for
 * Approximate Positions of the Major Planets" (E. M. Standish, JPL Solar System Dynamics), Table 1:
 * mean elements and rates for 1800–2050 AD, referred to the mean ecliptic and equinox of J2000.
 * https://ssd.jpl.nasa.gov/planets/approx_pos.html
 *
 * The stated accuracy over 1800–2050 is of the order of arcminutes for the inner planets and up to
 * about 10 arcminutes for Saturn: enough to place the planets and to design a conceptual trajectory,
 * not for navigation. The test file checks the positions against JPL Horizons vectors (DE441).
 * "earth" is the Earth–Moon barycentre, as in the table.
 */
import { AU } from './constants';

export type PlanetId = 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto';

/** [a (AU), e, I (°), L (°), ϖ (°), Ω (°)] at J2000 and their rates per Julian century. */
const ELEMENTS: Record<PlanetId, { at: [number, number, number, number, number, number]; rate: [number, number, number, number, number, number] }> = {
    mercury: { at: [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593], rate: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081] },
    venus: { at: [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255], rate: [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418] },
    earth: { at: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0], rate: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0] },
    mars: { at: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891], rate: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343] },
    jupiter: { at: [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], rate: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106] },
    saturn: { at: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], rate: [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794] },
    uranus: { at: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503], rate: [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589] },
    neptune: { at: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574], rate: [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664] },
    pluto: { at: [39.48211675, 0.2488273, 17.14001206, 238.92903833, 224.06891629, 110.30393684], rate: [-0.00031596, 0.0000517, 0.00004818, 145.20780515, -0.04062942, -0.01183482] },
};

export const PLANETS = Object.keys(ELEMENTS) as PlanetId[];

const DEG = Math.PI / 180;
export const J2000 = 2451545.0;
export const DAY = 86400;

export type Vec = [number, number, number];

/** Julian date of a calendar date (UTC, proleptic Gregorian), e.g. jd(2036, 3, 14). */
export function jd(year: number, month: number, day: number) {
    return Date.UTC(year, month - 1, day) / 86400000 + 2440587.5;
}

/** ISO calendar date (YYYY-MM-DD) of a Julian date. */
export function isoDate(julian: number) {
    return new Date((julian - 2440587.5) * 86400000).toISOString().slice(0, 10);
}

/** Solves Kepler's equation E − e·sin E = M (radians) by Newton iteration. */
export function eccentricAnomaly(M: number, e: number) {
    let E = e < 0.8 ? M : Math.PI;
    for (let i = 0; i < 30; i++) {
        const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        E -= d;
        if (Math.abs(d) < 1e-13) break;
    }
    return E;
}

/** Heliocentric position (AU, J2000 ecliptic) of a planet at Julian date `julian`. */
export function positionAU(id: PlanetId, julian: number): Vec {
    const T = (julian - J2000) / 36525;
    const { at, rate } = ELEMENTS[id];
    const a = at[0] + rate[0] * T;
    const e = at[1] + rate[1] * T;
    const I = (at[2] + rate[2] * T) * DEG;
    const L = at[3] + rate[3] * T;
    const varpi = at[4] + rate[4] * T;
    const Om = (at[5] + rate[5] * T) * DEG;
    const w = varpi * DEG - Om;
    let M = (L - varpi) % 360;
    if (M > 180) M -= 360;
    if (M < -180) M += 360;
    const E = eccentricAnomaly(M * DEG, e);
    const xp = a * (Math.cos(E) - e);
    const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const cw = Math.cos(w);
    const sw = Math.sin(w);
    const cO = Math.cos(Om);
    const sO = Math.sin(Om);
    const cI = Math.cos(I);
    const sI = Math.sin(I);
    return [(cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp, (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp, sw * sI * xp + cw * sI * yp];
}

/** Heliocentric position (m) and velocity (m/s), J2000 ecliptic. Velocity by central difference (±0.05 day). */
export function state(id: PlanetId, julian: number): { r: Vec; v: Vec } {
    const h = 0.05;
    const p = positionAU(id, julian);
    const a = positionAU(id, julian - h);
    const b = positionAU(id, julian + h);
    return {
        r: [p[0] * AU, p[1] * AU, p[2] * AU],
        v: [((b[0] - a[0]) * AU) / (2 * h * DAY), ((b[1] - a[1]) * AU) / (2 * h * DAY), ((b[2] - a[2]) * AU) / (2 * h * DAY)],
    };
}

// ── Small vector helpers (plain arrays keep the library free of three.js) ──

export const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: Vec) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: Vec): Vec => scale(a, 1 / norm(a));

/** Obliquity of the ecliptic at J2000, radians (IAU 2006: 84381.406″). */
export const OBLIQUITY = (84381.406 / 3600) * DEG;

/** Ecliptic → equatorial (J2000): rotation about +x by the obliquity. */
export const toEquatorial = (v: Vec): Vec => [v[0], v[1] * Math.cos(OBLIQUITY) - v[2] * Math.sin(OBLIQUITY), v[1] * Math.sin(OBLIQUITY) + v[2] * Math.cos(OBLIQUITY)];
