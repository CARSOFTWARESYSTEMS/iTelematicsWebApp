import { describe, expect, it } from 'vitest';
import { MU_SUN } from './constants';
import { dot, isoDate, jd, norm, state, sub, unit } from './ephemeris';
import { flight } from './flight';
import { propagate } from './lambert';
import { CONSTRAINTS, flybyGeometry, flybyPosition, flybySpeed, LAUNCH_WINDOW, MISSION_DATES, missionTrajectory, MU_JUPITER, R_JUPITER, REFINED_SEARCH, searchJupiterSaturn, spacecraftAt } from './trajectory';

describe('SOL-1 Jupiter–Saturn trajectory (Phase B physics mode)', () => {
    it('the stored dates are the result of the refined search under the stated rule', () => {
        const best = searchJupiterSaturn(REFINED_SEARCH)[0];
        expect(isoDate(best.launch)).toBe(MISSION_DATES.launch);
        expect(isoDate(best.jupiter)).toBe(MISSION_DATES.jupiter);
        expect(isoDate(best.saturn)).toBe(MISSION_DATES.saturn);
    }, 60000);

    it('the launch window is bounded where the search says', () => {
        const at = (iso: string) => {
            const [y, m, d] = iso.split('-').map(Number);
            const t = jd(y, m, d);
            return searchJupiterSaturn({ from: t, to: t, stepLaunch: 1, stepJupiter: 2, stepSaturn: 4 }).length;
        };
        expect(at(LAUNCH_WINDOW.opens)).toBeGreaterThan(0);
        expect(at(LAUNCH_WINDOW.closes)).toBeGreaterThan(0);
        expect(at('2034-05-22')).toBe(0);
        expect(at('2034-07-23')).toBe(0);
    }, 60000);

    it('satisfies every constraint and is compatible with the simulated SOL-1 launch', () => {
        const m = missionTrajectory();
        expect(m.c3).toBeLessThan(CONSTRAINTS.c3Max);
        // The Phase A launch shuts the upper stage down early so that it delivers exactly this energy.
        expect(Math.abs(flight().c3 / 1e6 - m.c3)).toBeLessThan(0.1);
        expect(Math.abs(m.dlaDeg)).toBeLessThan(CONSTRAINTS.dlaLimitDeg);
        expect(m.flyby.rp / R_JUPITER).toBeGreaterThanOrEqual(CONSTRAINTS.rpMinJupiterRadii);
        expect(m.flyby.dv).toBeLessThan(5); // a trim of a few m/s: effectively unpowered
        expect((m.saturn - m.launch) / 365.25).toBeLessThan(CONSTRAINTS.maxYearsToSaturn);
    });

    it('each leg starts at the departure planet and ends at the arrival planet', () => {
        const m = missionTrajectory();
        const j = state('jupiter', m.jupiter);
        const s = state('saturn', m.saturn);
        expect(norm(sub(propagate(m.leg1.r1, m.leg1.v1, (m.jupiter - m.launch) * 86400, MU_SUN).r, j.r))).toBeLessThan(1e3);
        expect(norm(sub(propagate(m.leg2.r1, m.leg2.v1, (m.saturn - m.jupiter) * 86400, MU_SUN).r, s.r))).toBeLessThan(1e3);
        expect(norm(sub(spacecraftAt(m.jupiter).r, j.r))).toBeLessThan(1e3);
    });

    it('the Jupiter flyby hyperbola has the solved periapsis and the right asymptotes', () => {
        const m = missionTrajectory();
        expect(norm(flybyPosition(0)) / m.flyby.rp).toBeCloseTo(1, 9);
        // Far from Jupiter the motion runs along the incoming and outgoing excess velocities.
        const day = 86400;
        const inDir = unit(sub(flybyPosition(-40 * day + 3600), flybyPosition(-40 * day)));
        const outDir = unit(sub(flybyPosition(40 * day), flybyPosition(40 * day - 3600)));
        expect(dot(inDir, unit(m.vInfIn))).toBeGreaterThan(0.999);
        expect(dot(outDir, unit(m.vInfOut))).toBeGreaterThan(0.999);
        // Vis-viva at periapsis.
        expect(flybySpeed(0)).toBeCloseTo(Math.sqrt(m.flyby.vInfOut ** 2 + (2 * MU_JUPITER) / m.flyby.rp), 3);
    });

    it('a flyby turns the excess velocity without changing its size (unpowered case)', () => {
        const a = flybyGeometry([6000, 0, 0], [6000 * Math.cos(0.9), 6000 * Math.sin(0.9), 0], MU_JUPITER);
        expect(a.dv).toBeLessThan(1e-6);
        // δ = 2·asin(1/e), e = 1 + rp·v²/μ.
        const e = 1 + (a.rp * 6000 ** 2) / MU_JUPITER;
        expect(2 * Math.asin(1 / e)).toBeCloseTo(0.9, 9);
        expect(a.helioDv).toBeCloseTo(2 * 6000 * Math.sin(0.45), 6);
    });
});
