import { describe, expect, it } from 'vitest';
import { atmosphere } from './atmosphere';
import { MU_EARTH, R_EARTH } from './constants';
import { eventTime, flight, sampleAt, simulateFlight, type EventId } from './flight';
import { EARTH_JUPITER, departureDeltaV, elements, inclinationDeg } from './orbit';
import { ADAPTER_MASS, FAIRING, FIRST_STAGE, KICK_STAGE, LIFTOFF_MASS, SPACECRAFT, UPPER_STAGE, VEHICLE, massFlow } from './vehicle';

const f = flight();
const ev = (id: EventId) => eventTime(id, f);

describe('US Standard Atmosphere 1976', () => {
    it('matches the published table', () => {
        expect(atmosphere(0).density).toBeCloseTo(1.225, 3);
        expect(atmosphere(0).soundSpeed).toBeCloseTo(340.3, 0);
        expect(atmosphere(11000).temperature).toBeCloseTo(216.7, 0);
        expect(atmosphere(11000).pressure / 22700).toBeCloseTo(1, 1);
        expect(atmosphere(20000).density / 0.08891).toBeCloseTo(1, 2);
        expect(atmosphere(50000).density / 1.027e-3).toBeCloseTo(1, 1);
        expect(atmosphere(100000).density / 5.604e-7).toBeCloseTo(1, 2);
        expect(atmosphere(300000).density / 1.916e-11).toBeCloseTo(1, 2);
    });
});

describe('Reference mission SOL-1 flight', () => {
    it('runs every event in the physical order', () => {
        const order: EventId[] = ['ignition', 'liftoff', 'towerClear', 'pitchOver', 'maxQ', 'throttleDown', 'meco', 'stageSep', 'usIgnition', 'fairingSep', 'seco1', 'usRestart', 'escape', 'seco2', 'kickSep', 'kickIgnition', 'kickBurnout', 'scSep'];
        const times = order.map(ev);
        times.forEach((t) => expect(Number.isFinite(t)).toBe(true));
        for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1]);
        expect(ev('ignition')).toBe(-3);
        expect(ev('liftoff')).toBe(0);
    });

    it('lifts off only with thrust above weight, and never exceeds the acceleration limit on the first stage', () => {
        expect(FIRST_STAGE.thrustSL / (LIFTOFF_MASS * 9.80665)).toBeGreaterThan(1.2);
        const stage1 = f.samples.filter((s) => s.phase === 'stage1');
        expect(Math.max(...stage1.map((s) => s.acceleration)) / 9.80665).toBeLessThanOrEqual(VEHICLE.maxAccelerationG + 0.01);
        // Before ignition completes the vehicle is held on the pad.
        expect(sampleAt(-1, f).altitude).toBeCloseTo(0, 3);
    });

    it('keeps the mass books: liftoff mass, propellant flow and every jettison', () => {
        expect(LIFTOFF_MASS).toBe(FIRST_STAGE.dryMass + FIRST_STAGE.propellantMass + UPPER_STAGE.dryMass + UPPER_STAGE.propellantMass + FAIRING.mass + ADAPTER_MASS + KICK_STAGE.inertMass + KICK_STAGE.propellantMass + SPACECRAFT.mass);
        for (const s of f.samples) {
            const attached =
                s.phase === 'ignition' || s.phase === 'stage1' || (s.phase === 'staging' && s.t < ev('stageSep'))
                    ? FIRST_STAGE.dryMass + s.prop1
                    : 0;
            const upper = s.t < ev('kickSep') ? UPPER_STAGE.dryMass + s.prop2 + ADAPTER_MASS : 0;
            const fairing = s.fairing ? FAIRING.mass : 0;
            const kick = s.t < ev('scSep') ? KICK_STAGE.inertMass + s.propKick : 0;
            expect(Math.abs(s.mass - (attached + upper + fairing + kick + SPACECRAFT.mass))).toBeLessThan(1e-3);
        }
        // Upper-stage propellant flow equals thrust / (Isp · g0) while it burns.
        const a = sampleAt(ev('usIgnition') + 50, f);
        const b = sampleAt(ev('usIgnition') + 100, f);
        expect((a.prop2 - b.prop2) / 50 / massFlow(UPPER_STAGE.thrustVac, UPPER_STAGE.ispVac)).toBeCloseTo(1, 3);
        expect(f.masses.afterStaging).toBeCloseTo(f.masses.beforeStaging - FIRST_STAGE.dryMass, 3);
        expect(f.masses.spacecraft).toBeCloseTo(SPACECRAFT.mass, 3);
    });

    it('passes Max Q at a realistic pressure in the lower atmosphere', () => {
        expect(f.maxQ.q).toBeGreaterThan(20e3);
        expect(f.maxQ.q).toBeLessThan(45e3);
        expect(f.maxQ.altitude).toBeGreaterThan(7e3);
        expect(f.maxQ.altitude).toBeLessThan(16e3);
        // It is a true peak: lower just before and just after.
        expect(sampleAt(f.maxQ.t - 15, f).q).toBeLessThan(f.maxQ.q);
        expect(sampleAt(f.maxQ.t + 15, f).q).toBeLessThan(f.maxQ.q);
    });

    it('drops the fairing on the heating condition, not on a clock', () => {
        const at = sampleAt(ev('fairingSep'), f);
        expect(at.altitude).toBeGreaterThan(100e3);
        expect(at.heating).toBeLessThan(1135);
        const before = f.samples.filter((s) => s.t < ev('fairingSep') && s.phase === 'stage2');
        before.forEach((s) => expect(s.altitude < 100e3 || s.heating >= 1135 - 50).toBe(true));
    });

    it('reaches the 185 km parking orbit with realistic losses', () => {
        expect(f.parking.perigeeKm).toBeGreaterThan(180);
        expect(f.parking.apogeeKm).toBeLessThan(200);
        expect(f.parking.periodMin).toBeGreaterThan(87);
        expect(f.parking.periodMin).toBeLessThan(89);
        expect(f.parking.inclinationDeg).toBeCloseTo(inclinationDeg(VEHICLE.siteLatitudeDeg, VEHICLE.launchAzimuthDeg), 6);
        expect(f.losses.gravity).toBeGreaterThan(500);
        expect(f.losses.gravity).toBeLessThan(1500);
        expect(f.losses.drag).toBeGreaterThan(20);
        expect(f.losses.drag).toBeLessThan(300);
    });

    it('conserves orbital energy while coasting in the parking orbit', () => {
        const coast = f.samples.filter((s) => s.phase === 'parking');
        expect(coast.length).toBeGreaterThan(50);
        const energies = coast.map((s) => elements(s.x, s.y, s.vx, s.vy).energy);
        const spread = (Math.max(...energies) - Math.min(...energies)) / Math.abs(energies[0]);
        expect(spread).toBeLessThan(1e-6);
    });

    it('escapes Earth with enough energy for a transfer to Jupiter', () => {
        // The upper stage alone reaches escape; the kick stage adds the rest.
        const seco2 = sampleAt(ev('seco2'), f);
        expect(elements(seco2.x, seco2.y, seco2.vx, seco2.vy).energy).toBeGreaterThan(0);
        expect(f.c3).toBeGreaterThan(EARTH_JUPITER.c3);
        // Minimum-energy transfer: C3 ≈ 77 km²/s², 2.7 years; impulsive departure from 185 km ≈ 6.3 km/s.
        expect(EARTH_JUPITER.c3 / 1e6).toBeCloseTo(77.3, 0);
        expect(EARTH_JUPITER.tofYears).toBeCloseTo(2.73, 2);
        expect(departureDeltaV(185e3, EARTH_JUPITER.c3) / 1000).toBeCloseTo(6.31, 1);
        // After burnout the trajectory is a hyperbola whose energy stays constant.
        const late = f.samples.filter((s) => s.t > ev('scSep') + 600);
        const c3s = late.map((s) => elements(s.x, s.y, s.vx, s.vy, MU_EARTH).c3);
        expect((Math.max(...c3s) - Math.min(...c3s)) / f.c3).toBeLessThan(1e-4);
        expect(Math.hypot(late[late.length - 1].x, late[late.length - 1].y)).toBeGreaterThan(R_EARTH * 50);
    });

    it('is deterministic', () => {
        const again = simulateFlight();
        expect(again.events).toEqual(f.events);
        expect(again.c3).toBe(f.c3);
    });

    it('is sensitive to its guidance the way a real gravity turn is', () => {
        // A much larger pitch-over sends the vehicle into the dense atmosphere: no orbit.
        const steep = simulateFlight({ pitchOverDeg: 4.8 });
        expect(steep.parking.perigeeKm).toBeLessThan(100);
    });
});
