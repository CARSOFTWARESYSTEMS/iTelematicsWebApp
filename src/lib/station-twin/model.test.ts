import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { POWER } from '@/lib/energy-model';
import { fmt, phaseIndexAt, signed } from '@/lib/space-twin/story';
import {
    SRC_ACTION_MIN,
    SRC_ARRAY_KW,
    SRC_CRITICAL_KW,
    SRC_DETECT,
    SRC_DETECT_MIN,
    SRC_ECLIPSE_MIN_SOC,
    SRC_EVENTS,
    SRC_FAULT,
    SRC_FAULT_MIN,
    SRC_LOAD_KW,
    SRC_LOOP,
    SRC_MARGIN,
    SRC_PARTS,
    SRC_PHASES,
    SRC_POWER,
    SRC_PROTECTED_LOAD_KW,
    SRC_SIM_MINUTES,
    SRC_STAGES,
    SRC_STEP_MIN,
    SRC_STORY,
    SRC_TIMING,
    SRC_TRACE,
    srcChips,
    srcHud,
    srcSampleAt,
    srcSimMinutes,
    srcStorySeconds,
    srcTones,
} from './model';

describe('Station Reference Case SRC-1', () => {
    it('uses its own station parameters, not the 6U reference values', () => {
        expect(SRC_POWER.batteryWh).not.toBe(POWER.batteryWh);
        expect(SRC_ARRAY_KW * 1000).not.toBe(POWER.arrayW);
        expect(SRC_ARRAY_KW).toBe(160);
        expect(SRC_LOAD_KW).toBe(74);
        expect(SRC_CRITICAL_KW).toBe(40);
        expect(SRC_PROTECTED_LOAD_KW).toBe(60);
    });

    it('has the orbit geometry of a 400 km circular orbit at β = 0°', () => {
        expect(SRC_TIMING.periodMin).toBeCloseTo(92.56, 1);
        expect(SRC_TIMING.eclipseMin).toBeCloseTo(36.1, 0);
    });

    it('closes the energy balance: positive nominal margin, negative when degraded, restored by load priority', () => {
        expect(SRC_MARGIN.nominal).toBeGreaterThan(5);
        expect(SRC_MARGIN.degraded).toBeLessThan(0);
        expect(SRC_MARGIN.protected).toBeGreaterThan(5);
        expect(SRC_MARGIN.protected).toBeGreaterThan(SRC_MARGIN.nominal);
    });

    it('keeps the nominal depth of discharge moderate across the longest eclipse', () => {
        expect(1 - SRC_ECLIPSE_MIN_SOC).toBeGreaterThan(0.2);
        expect(1 - SRC_ECLIPSE_MIN_SOC).toBeLessThan(0.35);
    });

    it('conserves energy step by step: stored energy equals charging input or discharge output', () => {
        for (let i = 1; i < SRC_TRACE.length; i++) {
            const a = SRC_TRACE[i - 1];
            const b = SRC_TRACE[i];
            if (b.soc >= 1 || b.soc <= 0) continue;
            const dtH = SRC_STEP_MIN / 60;
            const expected = a.batteryW >= 0 ? (a.batteryW * SRC_POWER.etaCharge * dtH) / SRC_POWER.batteryWh : (a.batteryW * dtH) / SRC_POWER.batteryWh;
            expect(b.soc - a.soc).toBeCloseTo(expected, 9);
        }
    });

    it('injects the fault in sunlight, detects it after the persistence window and then applies load priority', () => {
        expect(srcSampleAt(SRC_EVENTS.fault - 0.01).faultActive).toBe(false);
        const atFault = srcSampleAt(SRC_EVENTS.fault + 0.01);
        expect(atFault.eclipse).toBe(false);
        expect(atFault.faultActive).toBe(true);
        expect(atFault.channelsKw[SRC_FAULT.channel - 1]).toBeCloseTo(40 * SRC_FAULT.factor, 6);
        expect(SRC_DETECT_MIN - SRC_FAULT_MIN).toBeGreaterThanOrEqual(SRC_DETECT.samples - 1);
        expect(SRC_DETECT_MIN - SRC_FAULT_MIN).toBeLessThanOrEqual(SRC_DETECT.samples);
        expect(SRC_ACTION_MIN).toBeGreaterThan(SRC_DETECT_MIN);
        expect(SRC_ACTION_MIN).toBeLessThan(SRC_SIM_MINUTES);
    });

    it('never sheds a critical load and keeps every value physical', () => {
        for (const s of SRC_TRACE) {
            expect(s.criticalKw).toBe(SRC_CRITICAL_KW);
            expect(s.soc).toBeGreaterThan(0.5);
            expect(s.soc).toBeLessThanOrEqual(1);
            expect(s.arrayW).toBeGreaterThanOrEqual(0);
            expect(s.loadW).toBeGreaterThanOrEqual(SRC_CRITICAL_KW * 1000);
            if (s.eclipse) expect(s.arrayW).toBe(0);
        }
        const protectedSample = SRC_TRACE.find((s) => s.protectedMode)!;
        expect(protectedSample.loadW).toBe(SRC_PROTECTED_LOAD_KW * 1000);
        expect(protectedSample.marginPct).toBeCloseTo(SRC_MARGIN.protected, 6);
    });

    it('maps story time to simulated time monotonically, and back', () => {
        let last = -1;
        for (let t = 0; t < SRC_LOOP; t += 0.25) {
            const m = srcSimMinutes(t);
            expect(m).toBeGreaterThan(last);
            expect(srcStorySeconds(m)).toBeCloseTo(t, 9);
            last = m;
        }
    });

    it('orders its phases inside their stages, with the eclipse inside Health and the fault inside Recovery', () => {
        for (let i = 1; i < SRC_PHASES.length; i++) expect(SRC_PHASES[i].start).toBeGreaterThan(SRC_PHASES[i - 1].start);
        for (const p of SRC_PHASES) {
            const stage = SRC_STAGES[p.stage];
            expect(p.start).toBeGreaterThanOrEqual(stage.start);
            expect(p.start).toBeLessThan(stage.start + stage.seconds);
        }
        expect(SRC_STAGES.reduce((a, s) => a + s.seconds, 0)).toBe(SRC_LOOP);
        expect(SRC_PHASES[phaseIndexAt(SRC_STORY, SRC_EVENTS.eclipseEntry + 0.5)].id).toBe('health-eclipse');
        expect(SRC_PHASES[phaseIndexAt(SRC_STORY, SRC_EVENTS.action + 1)].id).toBe('protected');
    });

    it('shows telemetry that follows the model, and labels the fault in words', () => {
        expect(srcHud(2, 'reveal', null)).toBeNull();
        const nominal = srcHud(15, 'health', null)!;
        expect(nominal.mode?.label).toBe('Nominal');
        expect(nominal.rows.find((r) => r.label === 'Critical loads')?.value).toBe('40.0 kW');

        const detected = srcHud(SRC_EVENTS.detect + 0.5, 'detected', null)!;
        expect(detected.alert).toBe(true);
        expect(detected.rows.find((r) => r.label === 'Orbit margin')?.tone).toBe('fault');
        expect(detected.health?.find((h) => h.name === `Ch ${SRC_FAULT.channel}`)?.state).toBe('FAULT');

        const recovered = srcHud(SRC_EVENTS.action + 2, 'protected', null)!;
        expect(recovered.rows.find((r) => r.label === 'Orbit margin')?.tone).toBe('nominal');
        expect(recovered.rows.find((r) => r.label === 'Critical loads')?.note).toBe('100 % powered');
        expect(srcChips(SRC_EVENTS.fault + 0.5, 'fault', null, false)[0]).toMatchObject({ id: 'ch2', alert: true });
        expect(srcTones('fault', null)).toEqual({ ch2: 'alert' });
    });

    it('describes every selectable part with an architecture subsystem', () => {
        expect(SRC_PARTS.map((p) => p.id)).toEqual(['arrays', 'distribution', 'batteries', 'radiators', 'modules', 'comms', 'robotics', 'docking', 'truss']);
        for (const p of SRC_PARTS) expect(p.line.length).toBeGreaterThan(40);
    });

    it('is deterministic', () => {
        expect(JSON.stringify(srcSampleAt(33.3))).toBe(JSON.stringify(srcSampleAt(33.3)));
        expect(srcSampleAt(SRC_LOOP + 10).tMin).toBeCloseTo(srcSampleAt(10).tMin, 9);
    });

    it('publishes the same reference values in llms-full.txt as the model computes', () => {
        const text = readFileSync(path.resolve(import.meta.dirname, '../../../public/llms-full.txt'), 'utf8');
        for (const m of [SRC_MARGIN.nominal, SRC_MARGIN.degraded, SRC_MARGIN.protected]) expect(text).toContain(`${signed(m)} %`);
        expect(text).toContain(`${fmt(SRC_TIMING.periodMin)} min period`);
        expect(text).toContain(`${fmt(SRC_TIMING.eclipseMin)} min of eclipse`);
        expect(text).toContain(`${SRC_CRITICAL_KW} kW critical`);
        expect(text).toContain(`${SRC_LOAD_KW} kW total`);
    });

    it('prints the reference values for the page', () => {
        // Visible in the test output, so the published numbers can be checked against the model.
        console.info(
            JSON.stringify({
                margins: SRC_MARGIN,
                dod: 1 - SRC_ECLIPSE_MIN_SOC,
                events: SRC_EVENTS,
                faultMin: SRC_FAULT_MIN,
                detectMin: SRC_DETECT_MIN,
                actionMin: SRC_ACTION_MIN,
            }),
        );
    });
});
