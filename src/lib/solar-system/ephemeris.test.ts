import { describe, expect, it } from 'vitest';
import { eccentricAnomaly, isoDate, jd, positionAU, type PlanetId } from './ephemeris';

/**
 * JPL Horizons heliocentric position vectors (AU, ecliptic and mean equinox of J2000, centre: the
 * Sun), fetched 15 November 2026 from https://ssd.jpl.nasa.gov/api/horizons.api (VECTORS,
 * CENTER='500@10', REF_PLANE='ECLIPTIC'). "earth" is the Earth–Moon barycentre (Horizons body 3).
 */
const HORIZONS: [PlanetId, number, [number, number, number]][] = [
    ['earth', 2462502.5, [-1.7387161588e-1, 9.678366138374e-1, -6.4962119547e-5]],
    ['earth', 2464480.5, [-3.327084117899e-1, -9.579022715334e-1, 8.1194411019e-5]],
    ['earth', 2466154.5, [-1.641321798521e-1, 9.695495018634e-1, -8.603666254e-5]],
    ['mars', 2462502.5, [1.278622087588, -5.212680377263e-1, -4.227172872509e-2]],
    ['mars', 2464480.5, [3.979248485995e-1, -1.36764003370415, -3.841782696251e-2]],
    ['mars', 2466154.5, [-2.903959146531e-1, 1.567160495883, 3.996702366877e-2]],
    ['jupiter', 2462502.5, [-4.017945183759, -3.638840457644, 1.050213432603e-1]],
    ['jupiter', 2464480.5, [4.266845668581, 2.530334376239, -1.059744680457e-1]],
    ['jupiter', 2466154.5, [-5.35441610335467, 8.877632419631e-1, 1.161125560177e-1]],
    ['saturn', 2462502.5, [5.504234549615, 7.267855927583, -3.456190060416e-1]],
    ['saturn', 2464480.5, [-5.37762430123, 7.336843163577, 8.66665693509e-2]],
    ['saturn', 2466154.5, [-9.496701770233, -8.617719803683e-1, 3.930149276045e-1]],
    ['uranus', 2462502.5, [4.528830585636, 18.67887306745, 1.064681868074e-2]],
    ['neptune', 2466154.5, [25.25615691615, 15.81316339154, -9.076349257273e-1]],
];

/** Tolerances (AU): the published accuracy of the 1800–2050 elements is arcminutes (inner) to ~10′ (Saturn). */
const TOL: Partial<Record<PlanetId, number>> = { earth: 2e-4, mars: 2e-3, jupiter: 1.5e-2, saturn: 4e-2, uranus: 6e-2, neptune: 8e-2 };

describe('ephemeris (JPL approximate elements)', () => {
    it('matches JPL Horizons heliocentric positions within the stated accuracy', () => {
        for (const [id, t, h] of HORIZONS) {
            const p = positionAU(id, t);
            const err = Math.hypot(p[0] - h[0], p[1] - h[1], p[2] - h[2]);
            expect(err, `${id} ${isoDate(t)}: ${err.toFixed(5)} AU`).toBeLessThan(TOL[id]!);
        }
    });

    it('converts calendar dates and Julian dates both ways', () => {
        expect(jd(2000, 1, 1)).toBe(2451544.5);
        expect(isoDate(2462502.5)).toBe('2030-01-01');
        expect(isoDate(jd(2034, 6, 25))).toBe('2034-06-25');
    });

    it('solves Kepler’s equation', () => {
        for (const e of [0, 0.05, 0.2, 0.25, 0.6]) {
            for (const M of [-3, -1, 0.1, 1, 2.5]) {
                const E = eccentricAnomaly(M, e);
                expect(E - e * Math.sin(E)).toBeCloseTo(M, 12);
            }
        }
    });
});
