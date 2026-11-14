import { describe, expect, it } from 'vitest';
import { eventTime, flight } from './flight';
import { compression, formatMet, locate, mission, reading, storySeconds, type TKey } from './mission';
import { DEPLOYMENT, powerAt, rtgPower } from './spacecraft';

const { chapters, intro } = mission();
const end = flight().samples[flight().samples.length - 1].t;

describe('Solar System mission script (Phase A)', () => {
    it('has the eight Phase A chapters in physical order, each with 4–8 labels', () => {
        expect(chapters.map((c) => c.number)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08']);
        expect(chapters.map((c) => c.id)).toEqual(['prep', 'liftoff', 'ascent', 'staging', 'fairing', 'orbit', 'departure', 'deploy']);
        for (const c of chapters) {
            expect(c.labels.length).toBeGreaterThanOrEqual(4);
            expect(c.labels.length).toBeLessThanOrEqual(8);
            expect(c.telemetry.length).toBeGreaterThanOrEqual(3);
            expect(c.telemetry.length).toBeLessThanOrEqual(6);
        }
        expect(new Set(chapters.flatMap((c) => c.labels.map((l) => l.id))).size).toBe(chapters.flatMap((c) => c.labels).length);
    });

    it('answers what, does, why and happening for every label, with a Learn more', () => {
        for (const l of chapters.flatMap((c) => c.labels)) {
            for (const text of [l.what, l.does, l.why, l.happening, l.learn]) {
                expect(text.length).toBeGreaterThan(20);
                expect(text).not.toMatch(/NaN|undefined|Infinity/);
            }
        }
    });

    it('maps every segment onto mission time the flight actually covers', () => {
        const all = [...intro, ...chapters.flatMap((c) => [...c.segments, ...c.labels.flatMap((l) => l.segments)])];
        for (const s of all) {
            expect(s.seconds).toBeGreaterThan(0);
            expect(s.met[1]).toBeGreaterThanOrEqual(s.met[0]);
            expect(s.met[0]).toBeGreaterThanOrEqual(-90);
            expect(s.met[1]).toBeLessThanOrEqual(end);
            expect(compression(s)).toBeGreaterThanOrEqual(0);
        }
        // The orbit view only shows the parking coast (before the departure restart).
        for (const s of all.filter((x) => x.scene === 'orbit')) expect(s.met[1]).toBeLessThan(eventTime('usRestart'));
        // The deployment view starts around spacecraft separation.
        for (const s of all.filter((x) => x.scene === 'deploy')) expect(s.met[0]).toBeGreaterThanOrEqual(eventTime('scSep') - 30);
    });

    it('keeps the guided mission concise', () => {
        const total = chapters.reduce((a, c) => a + storySeconds(c.segments), 0);
        expect(total).toBeGreaterThan(120);
        expect(total).toBeLessThan(240);
    });

    it('locates story time within segments', () => {
        const segs = chapters[1].segments;
        expect(locate(segs, 0).met).toBe(segs[0].met[0]);
        const l = locate(segs, segs[0].seconds + segs[1].seconds / 2);
        expect(l.index).toBe(1);
        expect(l.met).toBeCloseTo((segs[1].met[0] + segs[1].met[1]) / 2, 6);
        expect(locate(segs, 1e9).met).toBe(segs[segs.length - 1].met[1]);
    });

    it('formats every reading at every chapter moment without gaps', () => {
        const keys = new Set<TKey>(chapters.flatMap((c) => [...c.telemetry, ...c.labels.flatMap((l) => l.telemetry)]));
        for (const c of chapters) {
            for (const frac of [0, 0.5, 1]) {
                const met = locate(c.segments, storySeconds(c.segments) * frac).met;
                for (const k of keys) {
                    const r = reading(k, met);
                    expect(r.label.length).toBeGreaterThan(1);
                    expect(r.value).not.toMatch(/NaN|undefined|Infinity/);
                }
            }
        }
        expect(formatMet(-10)).toBe('T−00:10');
        expect(formatMet(3725)).toBe('T+01:02:05');
    });
});

describe('Spacecraft RSC-1 power', () => {
    it('closes the power balance every second of the deployment', () => {
        for (let t = 0; t <= DEPLOYMENT.end; t++) {
            const p = powerAt(t);
            expect(Math.abs(p.rtg - p.loads - p.battery - p.shunt)).toBeLessThan(1e-9);
            expect(p.soc).toBeGreaterThanOrEqual(0);
            expect(p.soc).toBeLessThanOrEqual(1);
            expect(p.busVolts).toBe(30);
        }
    });

    it('decays the radioisotope power with half-life and thermocouple ageing', () => {
        expect(rtgPower(0)).toBeCloseTo(490, 6);
        expect(rtgPower(10)).toBeCloseTo(490 * Math.pow(0.5, 10 / 87.7) * Math.pow(0.992, 10), 6);
        expect(rtgPower(10)).toBeLessThan(rtgPower(0));
    });

    it('runs the deployment sequence: booms move one at a time with the motor load', () => {
        const base = powerAt(100).loads;
        expect(powerAt(DEPLOYMENT.rtgBoom + 10).loads).toBeGreaterThan(base);
        expect(powerAt(DEPLOYMENT.firstContact + 10).breakdown.some((b) => b.name === 'Transmitter')).toBe(true);
        expect(Math.max(...Array.from({ length: DEPLOYMENT.end }, (_, t) => powerAt(t).loads))).toBeLessThan(rtgPower(0));
    });
});
