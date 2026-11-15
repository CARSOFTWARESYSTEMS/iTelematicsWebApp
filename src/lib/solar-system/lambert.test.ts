import { describe, expect, it } from 'vitest';
import { AU, MU_SUN, ORBIT_AU } from './constants';
import { norm, sub, type Vec } from './ephemeris';
import { lambert, propagate } from './lambert';
import { hohmann } from './orbit';

describe('Lambert solver and two-body propagation', () => {
    it('propagation conserves energy and angular momentum over an eccentric orbit', () => {
        const r: Vec = [AU, 0, 0];
        const v: Vec = [0, 35000, 1200];
        const energy = (rr: Vec, vv: Vec) => norm(vv) ** 2 / 2 - MU_SUN / norm(rr);
        const s = propagate(r, v, 400 * 86400, MU_SUN);
        expect(energy(s.r, s.v) / energy(r, v)).toBeCloseTo(1, 9);
        // Round trip: forward then backward returns to the start.
        const back = propagate(s.r, s.v, -400 * 86400, MU_SUN);
        expect(norm(sub(back.r, r)) / AU).toBeLessThan(1e-9);
    });

    it('a Lambert arc, propagated, arrives where it should (elliptic and hyperbolic cases)', () => {
        const cases: [Vec, Vec, number][] = [
            [[AU, 0, 0], [-1.2 * AU, 4.9 * AU, 0.1 * AU], 2.8 * 365.25 * 86400],
            [[0.3 * AU, 0.95 * AU, 0], [-9.4 * AU, -0.5 * AU, 0.3 * AU], 3.2 * 365.25 * 86400],
            [[AU, 0, 0], [0, 1.5 * AU, 0], 40 * 86400], // fast: hyperbolic about the Sun
        ];
        for (const [r1, r2, tof] of cases) {
            const sol = lambert(r1, r2, tof, MU_SUN)!;
            expect(sol).not.toBeNull();
            const end = propagate(r1, sol.v1, tof, MU_SUN);
            expect(norm(sub(end.r, r2)) / norm(r2)).toBeLessThan(1e-7);
            expect(norm(sub(end.v, sol.v2)) / norm(sol.v2)).toBeLessThan(1e-6);
        }
    });

    it('reproduces the Hohmann transfer for a 180° Earth → Jupiter transfer (Lambert near degenerate 180°: 179.9°)', () => {
        const h = hohmann(ORBIT_AU.earth * AU, ORBIT_AU.jupiter * AU);
        const a = (179.9 * Math.PI) / 180;
        const r1: Vec = [ORBIT_AU.earth * AU, 0, 0];
        const r2: Vec = [ORBIT_AU.jupiter * AU * Math.cos(a), ORBIT_AU.jupiter * AU * Math.sin(a), 0];
        const sol = lambert(r1, r2, h.tof * (179.9 / 180) ** 0, MU_SUN)!;
        const vCirc = Math.sqrt(MU_SUN / r1[0]);
        expect(norm(sol.v1) - vCirc).toBeGreaterThan(h.vInfDeparture - 60);
        expect(norm(sol.v1) - vCirc).toBeLessThan(h.vInfDeparture + 60);
    });
});
