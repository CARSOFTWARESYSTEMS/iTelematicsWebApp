import { describe, expect, it } from 'vitest';
import { ECLIPSE_FRACTION, PERIOD_MIN, POWER, isEclipse, orbitBudget } from '@/lib/energy-model';
import {
    RE_KM,
    coverageHalfAngleDeg,
    dot,
    elevationDeg,
    geoToEcef,
    inEarthShadow,
    len,
    lineOfSight,
    periodMin,
    positionEci,
    rotateZ,
    speedKmS,
    unit,
    walkerDelta,
    type Vec3,
} from './orbit';
import { orbitMarginPct, type PowerSample } from './power';
import { StoryClock, missionClock, type StoryShape } from './story';
import {
    SAT_DETECT_RESIDUAL,
    SAT_EVENTS,
    SAT_LOOP,
    SAT_MARGIN,
    SAT_RUN,
    SAT_SIM_MIN_PER_S,
    SAT_START_PHASE,
    SAT_STORY,
    SAT_TIMING,
    SAT_WINDOWS,
    satCameraAt,
    satHud,
    satSampleAt,
    satSimMinutes,
} from './satellite';
import { CON, CON_HALF_ANGLE_DEG, CON_MIN_ELEV_DEG, CON_PERIOD_MIN, CON_SLOTS, CON_STATIONS, CON_STORY, conCameraAt, conHud, conSimMinutes, conStateAt } from './constellation';
import { SC_EVENTS, SC_MARGIN, SC_RUN, SC_STORY, scCameraAt, scHud, scSampleAt } from './spacecraft';
import { ST_EVENTS, ST_MARGIN_PCT, ST_POWER, ST_STORY, ST_TRACE, stCameraAt, stHud } from './station';

const STORIES: [string, StoryShape][] = [
    ['satellite', SAT_STORY],
    ['constellation', CON_STORY],
    ['spacecraft', SC_STORY],
    ['station', ST_STORY],
];

describe('orbital mechanics (circular two-body)', () => {
    it('gives the reference case’s period, and Kepler’s third law between altitudes', () => {
        expect(periodMin(550)).toBeCloseTo(PERIOD_MIN, 10);
        expect(CON_PERIOD_MIN).toBeCloseTo(95.6, 1);
        const a1 = RE_KM + 400;
        const a2 = RE_KM + 700;
        expect(periodMin(700) / periodMin(400)).toBeCloseTo((a2 / a1) ** 1.5, 10);
    });

    it('keeps every satellite on its circular orbit and back at its start after one period', () => {
        for (const slot of CON_SLOTS.slice(0, 6)) {
            for (const t of [0, 13.7, 50, 95]) expect(len(positionEci(slot, t))).toBeCloseTo(RE_KM + slot.altKm, 6);
            const start = positionEci(slot, 0);
            const later = positionEci(slot, periodMin(slot.altKm));
            expect(len([start[0] - later[0], start[1] - later[1], start[2] - later[2]])).toBeLessThan(1e-6);
            // The inclination bounds the latitude reached.
            let maxZ = 0;
            for (let t = 0; t < periodMin(slot.altKm); t += 0.5) maxZ = Math.max(maxZ, positionEci(slot, t)[2]);
            expect(maxZ / (RE_KM + slot.altKm)).toBeCloseTo(Math.sin((slot.incDeg * Math.PI) / 180), 3);
        }
    });

    it('lays out a Walker-delta pattern with equal node and in-plane spacing', () => {
        const w = walkerDelta({ total: 30, planes: 3, phasing: 1, incDeg: 53, altKm: 550 });
        expect(w).toHaveLength(30);
        expect(new Set(w.map((s) => s.raanDeg))).toEqual(new Set([0, 120, 240]));
        expect(w[1].phaseDeg - w[0].phaseDeg).toBeCloseTo(36);
        expect(w[10].phaseDeg - w[0].phaseDeg).toBeCloseTo(12); // F·360/T between adjacent planes
    });

    it('places the footprint edge exactly at the minimum elevation', () => {
        const alt = 550;
        const lambda = (coverageHalfAngleDeg(alt, 10) * Math.PI) / 180;
        const sat: Vec3 = [RE_KM + alt, 0, 0];
        const edge: Vec3 = [RE_KM * Math.cos(lambda), RE_KM * Math.sin(lambda), 0];
        expect(elevationDeg(edge, sat)).toBeCloseTo(10, 6);
        expect(coverageHalfAngleDeg(alt, 0)).toBeCloseTo((Math.acos(RE_KM / (RE_KM + alt)) * 180) / Math.PI, 10);
        expect(CON_HALF_ANGLE_DEG).toBeGreaterThan(14.9);
        expect(CON_HALF_ANGLE_DEG).toBeLessThan(15.1);
    });

    it('measures elevation from the local horizon', () => {
        const station = geoToEcef(0, 0);
        expect(elevationDeg(station, [RE_KM + 550, 0, 0])).toBeCloseTo(90, 6);
        expect(elevationDeg(station, [-(RE_KM + 550), 0, 0])).toBeLessThan(0);
        expect(lineOfSight(station, [-(RE_KM + 550), 0, 0])).toBe(false);
    });

    it('agrees with the reference eclipse fraction through the cylindrical shadow', () => {
        // Sweep a β = 20° orbit and count the time in shadow.
        const beta = (20 * Math.PI) / 180;
        const sun: Vec3 = [Math.cos(beta), 0, Math.sin(beta)];
        const r = RE_KM + 550;
        let dark = 0;
        const n = 20000;
        for (let i = 0; i < n; i++) {
            const u = (2 * Math.PI * i) / n;
            if (inEarthShadow([r * Math.cos(u), r * Math.sin(u), 0], sun)) dark++;
        }
        expect(dark / n).toBeCloseTo(ECLIPSE_FRACTION, 3);
    });
});

describe('ground links and coverage', () => {
    it('shows a link only when the satellite is above the station’s elevation mask', () => {
        for (let t = 0; t < 300; t += 7.3) {
            const x = conStateAt(t, { coverage: false });
            CON_STATIONS.forEach((g, gi) => {
                x.sats.forEach((sat, si) => {
                    const el = elevationDeg(x.stations[gi], sat);
                    const linked = x.links.some((l) => l.station === g.id && l.sat === si);
                    expect(linked).toBe(el >= CON_MIN_ELEV_DEG);
                    // The station sits on the surface itself, so allow for rounding at its end of the line.
                    if (linked) expect(lineOfSight(x.stations[gi], sat, -1e-6)).toBe(true);
                });
            });
        }
    });

    it('turns the stations with the Earth', () => {
        const a = conStateAt(0, { coverage: false }).stations[0];
        const b = conStateAt(60, { coverage: false }).stations[0];
        expect(len(a)).toBeCloseTo(RE_KM, 6);
        expect(Math.acos(dot(unit(a), unit(b))) * (180 / Math.PI)).toBeGreaterThan(0);
        // A point on the equator would turn by 360°·60/1436 ≈ 15°; Bengaluru at 13° N turns the same longitude.
        const eq = rotateZ([RE_KM, 0, 0], 15.04);
        expect(Math.atan2(eq[1], eq[0]) * (180 / Math.PI)).toBeCloseTo(15.04, 6);
    });

    it('estimates coverage between one footprint and the sum of all footprints', () => {
        const x = conStateAt(42);
        const cap = (1 - Math.cos((CON_HALF_ANGLE_DEG * Math.PI) / 180)) / 2;
        expect(x.coverage).toBeGreaterThan(cap);
        expect(x.coverage).toBeLessThanOrEqual(cap * CON.total + 0.01);
    });

    it('keeps in-plane links only where the line of sight clears the atmosphere margin', () => {
        const x = conStateAt(10, { coverage: false });
        for (const [a, b] of x.crossLinks) expect(lineOfSight(x.sats[a], x.sats[b], 100)).toBe(true);
        expect(x.crossLinks.length).toBe(CON.total); // 36° spacing at 550 km clears 100 km
    });
});

const traces: [string, readonly PowerSample[]][] = [
    ['satellite', SAT_RUN.trace],
    ['spacecraft', SC_RUN.trace],
    ['station', ST_TRACE],
];

describe('energy simulation', () => {
    it.each(traces)('%s: keeps SOC within physical bounds', (_, trace) => {
        for (const s of trace) {
            expect(s.soc).toBeGreaterThanOrEqual(0);
            expect(s.soc).toBeLessThanOrEqual(1);
        }
    });

    it.each(traces)('%s: moves SOC with the sign of the battery power', (_, trace) => {
        for (let i = 0; i + 1 < trace.length; i++) {
            const d = trace[i + 1].soc - trace[i].soc;
            if (trace[i].batteryW > 1e-6 && trace[i].soc < 1) expect(d).toBeGreaterThan(0);
            if (trace[i].batteryW < -1e-6) expect(d).toBeLessThan(0);
        }
    });

    it.each(traces)('%s: generates nothing in eclipse and something in sunlight', (_, trace) => {
        expect(trace.some((s) => s.eclipse)).toBe(true);
        for (const s of trace) {
            if (s.eclipse) expect(s.arrayW).toBe(0);
            else expect(s.arrayW).toBeGreaterThan(0);
        }
    });

    it('uses the reference eclipse timing for the satellite', () => {
        for (const s of SAT_RUN.trace) expect(s.eclipse).toBe(isEclipse(SAT_START_PHASE + s.tMin / PERIOD_MIN));
        for (const [entry, exit] of SAT_WINDOWS) expect(exit - entry).toBeCloseTo(SAT_TIMING.eclipseMin, 6);
    });

    it('applies the same margin equation as the published reference budget', () => {
        const m = orbitMarginPct({ arrayW: POWER.arrayW, loadSunW: POWER.loadSunW, loadEclipseW: POWER.loadEclipseW, params: POWER, timing: SAT_TIMING });
        expect(m).toBeCloseTo(orbitBudget('nominal').marginPct, 6);
        expect(SAT_MARGIN.nominal).toBeCloseTo(20, 0);
    });

    it('draws the station batteries down in eclipse and recharges them at sunrise', () => {
        const inEcl = ST_TRACE.filter((s) => s.eclipse);
        expect(inEcl[inEcl.length - 1].soc).toBeLessThan(inEcl[0].soc);
        const dod = Math.max(...ST_TRACE.map((s) => s.soc)) - Math.min(...ST_TRACE.map((s) => s.soc));
        expect(dod).toBeGreaterThan(0.1);
        expect(dod).toBeLessThan(0.4);
        expect(ST_MARGIN_PCT).toBeGreaterThan(0);
        expect(ST_POWER.batteryWh).toBe(192000);
        expect(ST_EVENTS.eclipseExit).toBeGreaterThan(ST_EVENTS.eclipseEntry);
    });
});

describe('fault scenarios', () => {
    it('satellite: detects the stuck heater from the SOC residual, then safe mode restores a positive margin', () => {
        expect(SAT_EVENTS.fault).toBeLessThan(SAT_EVENTS.detect);
        expect(SAT_EVENTS.detect).toBeLessThan(SAT_EVENTS.safe);
        expect(SAT_EVENTS.safe).toBeLessThan(SAT_EVENTS.recover);
        const atDetect = satSampleAt(SAT_EVENTS.detect + 0.01);
        expect(atDetect.predictedSoc - atDetect.soc).toBeGreaterThan(SAT_DETECT_RESIDUAL);
        const justBefore = satSampleAt(SAT_EVENTS.detect - 0.3);
        expect(justBefore.mode).toBe('nominal');
        expect(SAT_MARGIN.fault).toBeLessThan(0);
        expect(SAT_MARGIN.safe).toBeGreaterThan(0);
        expect(satSampleAt(SAT_EVENTS.recover + 1).batteryW).toBeGreaterThan(0);
    });

    it('satellite: the displayed state follows the simulation', () => {
        expect(satHud(SAT_EVENTS.fault + 0.2, 'fault')!.mode!.label).toBe('Nominal');
        expect(satHud(SAT_EVENTS.detect + 0.2, 'detected')!.mode!.label).toBe('Alert');
        expect(satHud(SAT_EVENTS.safe + 0.2, 'safe-mode')!.mode!.label).toBe('Safe mode');
        expect(satHud(12.5, 'health-eclipse')!.rows.find((r) => r.label === 'Solar generation')!.value).toBe('0.0 W');
        expect(satHud(11, 'health')!.rows.find((r) => r.label === 'Solar generation')!.value).toBe(`${POWER.arrayW.toFixed(1)} W`);
    });

    it('spacecraft: a string fault in eclipse is only seen at sunrise, and power-limited mode restores the margin', () => {
        expect(SC_EVENTS.fault).toBeLessThan(SC_EVENTS.eclipseExit);
        expect(SC_EVENTS.detect).toBeGreaterThan(SC_EVENTS.eclipseExit);
        expect(SC_MARGIN.nominal).toBeGreaterThan(0);
        expect(SC_MARGIN.fault).toBeLessThan(0);
        expect(SC_MARGIN.limited).toBeGreaterThan(0);
        expect(scHud(SC_EVENTS.limit + 0.5, 'limited', null)!.mode!.label).toBe('Power-limited');
        const sunlitNominal = SC_RUN.trace.find((s) => !s.eclipse && s.mode === 'nominal')!;
        const after = scSampleAt(SC_EVENTS.limit + 0.5);
        expect(after.eclipse).toBe(false);
        expect(after.loadW).toBeLessThan(sunlitNominal.loadW);
        expect(after.arrayW).toBeLessThan(sunlitNominal.arrayW);
    });

    it('spacecraft: a subsystem’s power draw changes the total load and the battery', () => {
        const sun = SC_RUN.trace.find((s) => !s.eclipse && s.mode === 'nominal')!;
        const ecl = SC_RUN.trace.find((s) => s.eclipse)!;
        expect(sun.loads.payload).toBeGreaterThan(ecl.loads.payload);
        expect(sun.loadW - ecl.loadW).toBeCloseTo(sun.loads.payload - ecl.loads.payload + (sun.loads.thermal - ecl.loads.thermal), 6);
        expect(ecl.batteryW).toBeLessThan(0);
    });
});

describe('stories, clocks and time', () => {
    it.each(STORIES)('%s: orders phases inside their stages', (_, story) => {
        story.stages.forEach((s, i) => {
            const end = i + 1 < story.stages.length ? story.stages[i + 1].start : story.loopSeconds;
            expect(s.start + s.seconds).toBeCloseTo(end);
        });
        story.phases.forEach((p, i) => {
            const stage = story.stages[p.stage];
            expect(p.start).toBeGreaterThanOrEqual(stage.start);
            expect(p.start).toBeLessThan(stage.start + stage.seconds);
            if (i > 0) expect(p.start).toBeGreaterThan(story.phases[i - 1].start);
        });
    });

    it.each([
        ['satellite', satCameraAt, SAT_LOOP],
        ['constellation', conCameraAt, CON_STORY.loopSeconds],
        ['spacecraft', scCameraAt, SC_STORY.loopSeconds],
        ['station', stCameraAt, ST_STORY.loopSeconds],
    ] as const)('%s: moves the camera smoothly, with no jump at the loop', (_, cameraAt, loop) => {
        const a = cameraAt(loop - 0.001);
        const b = cameraAt(0);
        expect(Math.abs(a.az - b.az)).toBeLessThan(0.1);
        expect(Math.abs(a.el - b.el)).toBeLessThan(0.1);
        expect(Math.abs(a.dist - b.dist)).toBeLessThan(0.002);
        let prev = cameraAt(0);
        for (let t = 0.05; t < loop; t += 0.05) {
            const v = cameraAt(t);
            // Never spins: at most ~25° of azimuth per second.
            expect(Math.abs(v.az - prev.az)).toBeLessThan(1.25);
            expect(v.dist).toBeGreaterThan(0.8);
            expect(v.dist).toBeLessThan(1.7);
            prev = v;
        }
    });

    it('keeps simulated time locked to story time', () => {
        for (const t of [0, 3.3, 12.02, 18.4, 25.9]) {
            expect(satSimMinutes(t)).toBeCloseTo(t * SAT_SIM_MIN_PER_S, 10);
            expect(satSampleAt(t).tMin).toBeCloseTo(t * SAT_SIM_MIN_PER_S, 10);
        }
        expect(satSimMinutes(SAT_LOOP + 1)).toBeCloseTo(SAT_SIM_MIN_PER_S, 10);
        expect(conSimMinutes(10)).toBe(30);
        const hud = conHud(10, 10, null);
        expect(hud.rows.find((r) => r.label === 'Mission time')!.value).toBe(missionClock(30));
    });

    it('replays identically after a reset', () => {
        const clock = new StoryClock(SAT_STORY);
        const deltas = [0.016, 0.033, 0.1, 0.07, 0.016];
        const play = () => {
            for (let i = 0; i < 400; i++) clock.advance(deltas[i % deltas.length]);
            return { t: clock.time, e: clock.elapsed, hud: JSON.stringify(satHud(clock.time, SAT_STORY.phases[clock.phase].id)), con: JSON.stringify(conHud(clock.elapsed, clock.time, 4)) };
        };
        const first = play();
        clock.replay();
        expect(clock.time).toBe(0);
        expect(clock.elapsed).toBe(0);
        expect(play()).toEqual(first);
    });

    it('reports phase changes and throttles overlay updates', () => {
        const clock = new StoryClock(SAT_STORY, 0.2);
        const phases: number[] = [];
        let ticks = 0;
        clock.onPhase((p) => phases.push(p));
        clock.onTick(() => ticks++);
        for (let i = 0; i < 60 * SAT_LOOP + 10; i++) clock.advance(1 / 60);
        expect(phases).toEqual([...SAT_STORY.phases.map((_, i) => i).slice(1), 0]);
        expect(ticks).toBeLessThan((SAT_LOOP / 0.2) + SAT_STORY.phases.length + 2);
        // About five a second (each fires on the first frame at or past 0.2 s): far fewer than the 60 frames.
        expect(ticks).toBeGreaterThan(SAT_LOOP / 0.25);
    });

    it('keeps elapsed time continuous across the loop for continuous physics', () => {
        const clock = new StoryClock(CON_STORY);
        for (let i = 0; i < 100; i++) clock.advance(0.5);
        expect(clock.elapsed).toBeCloseTo(50, 10);
        expect(clock.time).toBeCloseTo(50 - CON_STORY.loopSeconds, 10);
        // Across the loop a satellite moves exactly its orbital speed × the time shown: no teleport.
        const dtMin = conSimMinutes(0.02);
        const a = conStateAt(conSimMinutes(CON_STORY.loopSeconds - 0.01), { coverage: false }).sats[0];
        const b = conStateAt(conSimMinutes(CON_STORY.loopSeconds + 0.01), { coverage: false }).sats[0];
        expect(len([a[0] - b[0], a[1] - b[1], a[2] - b[2]])).toBeCloseTo(speedKmS(CON.altKm) * dtMin * 60, 1);
    });

    it('shows heads-up values only where the story calls for them', () => {
        expect(satHud(2, 'reveal')).toBeNull();
        expect(stHud(2, 'reveal', null)).toBeNull();
        expect(stHud(ST_EVENTS.eclipseEntry + 1, 'eclipse', null)!.rows[0].value).toBe('Eclipse');
        expect(scHud(2, 'reveal', 'payload')!.rows[0].label).toBe('Power draw');
    });
});
