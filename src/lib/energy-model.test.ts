import { describe, it, expect } from 'vitest';
import {
    ECLIPSE_MIN,
    PERIOD_MIN,
    healthOf,
    orbitBudget,
    packVoltage,
    sampleAtPhase,
    simulate,
} from './energy-model';

describe('energy model (reference case)', () => {
    it('reproduces the published orbit geometry', () => {
        expect(PERIOD_MIN).toBeCloseTo(95.6, 1);
        expect(ECLIPSE_MIN).toBeCloseTo(34.8, 1);
    });

    it('has the published power margins in each phase', () => {
        expect(sampleAtPhase(0.1).marginW).toBeCloseTo(15.6, 1);
        expect(sampleAtPhase(0.5).marginW).toBeCloseTo(-14.0, 1);
        expect(sampleAtPhase(0.5).batteryW).toBeCloseTo(-15.6, 1);
    });

    it('settles into a repeating nominal cycle', () => {
        const samples = simulate('nominal');
        expect(Math.abs(samples[samples.length - 1].soc - samples[0].soc)).toBeLessThan(0.005);
        const budget = orbitBudget('nominal');
        expect(budget.marginPct).toBeCloseTo(20, 0);
        expect(budget.minSoc).toBeGreaterThan(0.85);
        expect(budget.minSoc).toBeLessThan(0.92);
    });

    it('shows faults diverging from the same starting state', () => {
        const nominal = simulate('nominal');
        const degraded = simulate('solar-degradation');
        expect(degraded[0].soc).toBe(nominal[0].soc);
        expect(orbitBudget('solar-degradation').socChangePerOrbit).toBeLessThan(-0.01);
        expect(orbitBudget('heater-stuck').marginPct).toBeLessThan(0);
        expect(healthOf('solar-degradation').energy).toBe('WARNING');
    });

    it('separates a sensor fault from an energy fault', () => {
        expect(healthOf('sun-sensor-fault')).toEqual({ energy: 'NOMINAL', sensors: 'FAULT' });
        expect(orbitBudget('sun-sensor-fault').marginPct).toBeCloseTo(orbitBudget('nominal').marginPct, 5);
    });

    it('gives plausible 2S pack voltages', () => {
        expect(packVoltage(0.9, 15)).toBeGreaterThan(8.0);
        expect(packVoltage(0.9, 15)).toBeLessThan(8.4);
        expect(packVoltage(0.9, -15)).toBeLessThan(packVoltage(0.9, 15));
    });
});
