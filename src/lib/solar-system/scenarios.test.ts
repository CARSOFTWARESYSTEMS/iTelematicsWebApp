import { describe, expect, it } from 'vitest';
import { flight, simulateFlight } from './flight';
import { GLOSSARY, lessons, seriesValue } from './learning';
import { journey, metOf } from './phaseB';
import { ENGINE_OUT, engineOutFlight } from './scenarios';
import { rtgFaultScenario, rtgPower } from './spacecraft';
import { conjunctions, CONJUNCTION_LIMIT_DEG, missionTrajectory, sunEarthProbeAngle } from './trajectory';
import { storySeconds } from './mission';

const fallsBack = (at: number) => simulateFlight({ engineOutAt: at, departureReserve: 120 });

describe('Fault scenarios (computed, not scripted)', () => {
    it('engine failure: the stored outcomes are what the flight simulation gives', () => {
        for (const c of ENGINE_OUT.cases) {
            const r = fallsBack(c.at);
            const impact = r.events.find((e) => e.id === 'impact');
            expect(impact, `failure at T+${c.at}`).toBeDefined();
            expect(Math.abs(impact!.t - c.impact)).toBeLessThan(2);
            expect(Math.abs(r.samples[r.samples.length - 1].downrange / 1000 - c.downrangeKm)).toBeLessThan(2);
        }
        // Thresholds: a failure just before them is lost, just after it reaches orbit / Jupiter's energy.
        expect(fallsBack(ENGINE_OUT.orbitAfter - 2).events.some((e) => e.id === 'impact')).toBe(true);
        const orbit = fallsBack(ENGINE_OUT.orbitAfter + 1);
        expect(orbit.events.some((e) => e.id === 'impact')).toBe(false);
        expect(orbit.parking.perigeeKm).toBeGreaterThan(150);
        expect(fallsBack(ENGINE_OUT.jupiterAfter - 2).c3 / 1e6).toBeLessThan(missionTrajectory().c3);
        expect(fallsBack(ENGINE_OUT.jupiterAfter + 1).c3 / 1e6).toBeGreaterThanOrEqual(missionTrajectory().c3);
        // The scenario shown: one engine out at T+60 s; the nominal flight is untouched.
        expect(engineOutFlight().events.find((e) => e.id === 'engineOut')!.t).toBe(ENGINE_OUT.at);
        expect(flight().events.some((e) => e.id === 'engineOut' || e.id === 'impact')).toBe(false);
    }, 60000);

    it('RTG failure: one generator, battery drain, Safe Mode and recovery by load shedding', () => {
        const f = rtgFaultScenario();
        expect(f.rtg).toBeCloseTo(rtgPower(0) / 2, 6);
        expect(f.loadsFull).toBeGreaterThan(f.rtg);
        expect(f.loadsShed).toBeLessThan(f.rtg);
        expect(f.safeModeAt).toBeGreaterThan(f.deficitAt);
        for (const p of f.table) {
            expect(Math.abs(p.rtg - p.loads - p.battery - p.shunt)).toBeLessThan(1e-9);
            expect(p.soc).toBeGreaterThanOrEqual(0);
        }
        // After shedding, the battery charges again.
        expect(f.table[f.table.length - 1].battery).toBeGreaterThan(0);
    });

    it('communication: solar conjunctions are where the Sun–Earth–probe angle is below the limit; one ends at the Jupiter flyby', () => {
        const m = missionTrajectory();
        const list = conjunctions();
        expect(list.length).toBeGreaterThanOrEqual(5);
        for (const c of list) {
            expect(sunEarthProbeAngle(c.minAt)).toBeLessThan(CONJUNCTION_LIMIT_DEG);
            expect(c.end).toBeGreaterThan(c.start);
        }
        expect(list.some((c) => c.start <= m.jupiter && c.end >= m.jupiter - 2)).toBe(true);
    });
});

describe('Learning layer', () => {
    const { chapters } = journey();
    const L = lessons();

    it('every chapter has narration beats within its programme, two hero readings, a recap and a valid check', () => {
        for (const c of chapters) {
            const l = L[c.id];
            expect(l, c.id).toBeDefined();
            const total = storySeconds(c.segments);
            expect(l.beats.length).toBeGreaterThanOrEqual(3);
            for (const b of l.beats) {
                expect(b.t).toBeGreaterThanOrEqual(0);
                expect(b.t).toBeLessThanOrEqual(total);
                expect(b.text).not.toMatch(/NaN|undefined|Infinity/);
            }
            expect(l.hero).toHaveLength(2);
            expect(l.recap).toHaveLength(3);
            expect(l.check.answer).toBeLessThan(l.check.options.length);
            for (const t of [...l.recap, l.check.explain]) expect(t).not.toMatch(/NaN|undefined|Infinity/);
        }
    });

    it('charts plot finite values over their ranges', () => {
        for (const c of chapters) {
            const chart = L[c.id].chart;
            if (!chart) continue;
            for (const s of chart.series) for (const k of [0, 0.5, 1]) expect(Number.isFinite(seriesValue(s.key, chart.range[0] + (chart.range[1] - chart.range[0]) * k))).toBe(true);
        }
    });

    it('narrates the Jupiter flyby at the flyby', () => {
        const j = chapters.find((c) => c.id === 'jupiter')!;
        const close = j.segments[1];
        expect(close.met[0]).toBeLessThan(metOf(missionTrajectory().jupiter));
        expect(L.jupiter.beats.some((b) => /Closest approach/.test(b.text))).toBe(true);
    });

    it('defines every glossary term once', () => {
        expect(new Set(GLOSSARY.map((g) => g.id)).size).toBe(GLOSSARY.length);
        for (const g of GLOSSARY) expect(g.text.length).toBeGreaterThan(20);
    });
});
