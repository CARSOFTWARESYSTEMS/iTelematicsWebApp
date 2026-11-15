import { describe, expect, it } from 'vitest';
import { BODIES } from './bodies';
import { locate, mission, storySeconds } from './mission';
import { dateOf, journey, metOf, phaseB, readingAny } from './phaseB';
import { missionTrajectory } from './trajectory';

const B = phaseB();

describe('Solar System Phase B script', () => {
    it('continues the journey with the cruise, Jupiter, Saturn and the Discovery tour', () => {
        expect(B.map((c) => c.number)).toEqual(['09', '10', '11', '12']);
        expect(journey().chapters.map((c) => c.number)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']);
        // Phase A is unchanged: 8 chapters and its 49 topics.
        expect(mission().chapters.flatMap((c) => c.labels)).toHaveLength(49);
        const ids = journey().chapters.flatMap((c) => c.labels.map((l) => l.id));
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('the Discovery tour covers the thirteen destinations of the brief, six as main topics', () => {
        const tour = B.find((c) => c.id === 'discovery')!;
        expect(tour.labels.map((l) => l.title)).toEqual(BODIES.map((b) => b.name));
        expect(['Sun', 'Mercury', 'Venus', 'Earth', 'Moon', 'Mars', 'Asteroid Belt', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Kuiper Belt'].every((n) => tour.labels.some((l) => l.title === n))).toBe(true);
        expect(tour.labels.filter((l) => !l.more)).toHaveLength(6);
        for (const l of tour.labels) expect(l.happening).toMatch(/Cinematic tour/);
    });

    it('places the physics chapters on the designed trajectory’s dates', () => {
        const m = missionTrajectory();
        const jup = B.find((c) => c.id === 'jupiter')!;
        const close = jup.segments.find((s) => s.shot === 'jupiterClose')!;
        expect(close.met[0]).toBeLessThan(metOf(m.jupiter));
        expect(close.met[1]).toBeGreaterThan(metOf(m.jupiter));
        expect(dateOf(metOf(m.saturn))).toBeCloseTo(m.saturn, 9);
        for (const c of B) for (const s of [...c.segments, ...c.labels.flatMap((l) => l.segments)]) expect(s.met[1]).toBeGreaterThanOrEqual(s.met[0]);
    });

    it('formats every Phase B reading at every chapter moment without gaps', () => {
        const check = (k: Parameters<typeof readingAny>[0], met: number, body?: (typeof BODIES)[number]['id'], what = '') => {
            const r = readingAny(k, met, body);
            expect(r.label.length).toBeGreaterThan(1);
            expect(r.value, `${what} ${k}`).not.toMatch(/NaN|undefined|Infinity|^—$/);
        };
        for (const c of B) {
            for (const frac of [0, 0.5, 1]) {
                const loc = locate(c.segments, storySeconds(c.segments) * frac);
                for (const k of c.telemetry) check(k, loc.met, loc.segment.body, c.id);
            }
            // Each topic's readings, at the start and end of its own programme, for its own destination.
            for (const l of c.labels)
                for (const frac of [0, 1]) {
                    const loc = locate(l.segments, storySeconds(l.segments) * frac);
                    for (const k of l.telemetry) check(k, loc.met, loc.segment.body, l.id);
                }
        }
    });

    it('reports physically sensible values at the Jupiter flyby', () => {
        const m = missionTrajectory();
        const at = metOf(m.jupiter);
        expect(readingAny('sunDist', at).value).toMatch(/^5\.\d\d AU$/);
        const light = parseFloat(readingAny('lightTimeB', at).value);
        expect(light).toBeGreaterThan(33);
        expect(light).toBeLessThan(54);
        expect(parseFloat(readingAny('jupDist', at).value)).toBeCloseTo(m.flyby.rp / 7.1492e7, 1);
    });
});
