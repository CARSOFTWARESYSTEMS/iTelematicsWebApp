import { describe, expect, it } from 'vitest';
import {
    CHANNELS,
    CHANNEL_SUNLIT_KW,
    ECLIPSES,
    EPS,
    EPS_LOADS,
    arrayPowerKw,
    batteryElectrical,
    channelCapacityKw,
    illuminationAt,
    loadKw,
    planRecovery,
    sampleAt,
    simulate,
    traceOf,
    type ChannelId,
    type EpsTrace,
} from './model';

const all = (v: boolean) => Object.fromEntries(CHANNELS.map((c) => [c, v])) as Record<ChannelId, boolean>;
const caps = (h: Partial<Record<ChannelId, number>> = {}) => Object.fromEntries(CHANNELS.map((c) => [c, channelCapacityKw(h[c] ?? 1)])) as Record<ChannelId, number>;
const sunlitAt = (trace: EpsTrace) => trace.samples.find((s) => s.tMin >= 30)!;
const eclipseMid = (trace: EpsTrace) => sampleAt(trace, (ECLIPSES[0][0] + ECLIPSES[0][1]) / 2);

describe('EPS-1 reference parameters', () => {
    it('has the SRC-1 station loads and a 40 kW sunlit channel', () => {
        expect(loadKw()).toBe(74);
        expect(loadKw('critical')).toBe(40);
        expect(loadKw('essential')).toBe(16);
        expect(loadKw('deferrable')).toBe(18);
        for (const c of CHANNELS) expect(EPS_LOADS.filter((l) => l.channel === c).reduce((a, l) => a + l.kw, 0)).toBe(18.5);
        expect(CHANNEL_SUNLIT_KW).toBeCloseTo(40, 0);
        for (const l of EPS_LOADS) if (l.group === 'critical') expect(l.alternate).toBeDefined();
    });

    it('applies the photovoltaic factors: illumination, orientation, temperature, degradation, health', () => {
        expect(arrayPowerKw(0, 60)).toBe(0);
        expect(arrayPowerKw(1, 28, 1, 0)).toBeCloseTo(EPS.array.ratedKw * Math.pow(1 - EPS.array.degradationPerYear, EPS.array.ageYears), 6);
        expect(arrayPowerKw(1, -40)).toBeGreaterThan(arrayPowerKw(1, 60)); // cold arrays produce more
        expect(arrayPowerKw(1, 60, 0.6)).toBeCloseTo(0.6 * arrayPowerKw(1, 60), 9);
        expect(arrayPowerKw(1, 60, 1, 60)).toBeCloseTo(arrayPowerKw(1, 60, 1, 0) * 0.5, 6);
    });

    it('solves the battery terminal equations (P = V·I, V = V_oc ± I·R)', () => {
        for (const p of [15000, -20000]) {
            const e = batteryElectrical(0.7, p);
            expect(e.voltage * e.current).toBeCloseTo(p, 3);
            expect(Math.sign(e.current)).toBe(Math.sign(p));
            expect(e.heatW).toBeCloseTo(e.current * e.current * EPS.battery.resistanceOhm, 6);
        }
    });

    it('computes eclipse geometry for 400 km at β = 0°', () => {
        const [entry, exit] = ECLIPSES[0];
        expect(exit - entry).toBeCloseTo(36.1, 0);
        expect(illuminationAt(entry + 5)).toBe(0);
        expect(illuminationAt(entry - 5)).toBe(1);
    });
});

describe('energy conservation', () => {
    for (const id of ['nominal', 'solar', 'thermal', 'distribution'] as const) {
        it(`closes the power balance at every step (${id})`, () => {
            const trace = traceOf(id);
            for (const s of trace.samples) {
                const loads = s.servedKw.critical + s.servedKw.essential + s.servedKw.deferrable;
                expect(s.generatedKw).toBeCloseTo(loads + s.storedKw + s.lossesKw, 6);
                for (const c of s.channels) {
                    expect(c.soc).toBeGreaterThanOrEqual(0);
                    expect(c.soc).toBeLessThanOrEqual(1);
                    expect(c.arrayDrawnKw).toBeLessThanOrEqual(c.arrayAvailableKw + 1e-9);
                }
                // Cross-tie flows cancel across the station.
                expect(s.channels.reduce((a, c) => a + c.crossTieKw, 0)).toBeCloseTo(0, 9);
            }
        });
    }

    it('integrates stored energy with the charge and discharge efficiencies', () => {
        const trace = traceOf('nominal');
        for (let i = 1; i < trace.samples.length; i++) {
            const a = trace.samples[i - 1].channels[0];
            const b = trace.samples[i].channels[0];
            if (b.energyKwh >= EPS.battery.usableKwh - 1e-9 || b.energyKwh <= 1e-9) continue;
            expect(b.energyKwh - a.energyKwh).toBeCloseTo(a.batteryKw * (EPS.stepMin / 60), 9);
        }
    });
});

describe('the ten deterministic validation scenarios', () => {
    it('1 · normal sunlight: arrays carry every load and charge the batteries', () => {
        const s = sunlitAt(traceOf('nominal'));
        expect(s.state).toBe('NOMINAL_SUNLIGHT');
        expect(s.unservedKw).toBe(0);
        expect(s.channels.every((c) => c.batteryKw >= 0)).toBe(true);
        expect(s.marginPct).toBeGreaterThan(5);
    });

    it('2 · normal eclipse: batteries carry every load and discharge within limits', () => {
        const trace = traceOf('nominal');
        const s = eclipseMid(trace);
        expect(s.state).toBe('NOMINAL_ECLIPSE');
        expect(s.generatedKw).toBe(0);
        expect(s.unservedKw).toBe(0);
        expect(s.channels.every((c) => c.batteryKw < 0 && -c.batteryKw <= EPS.battery.maxDischargeKw)).toBe(true);
        const endSoc = sampleAt(trace, ECLIPSES[0][1]).channels[0].soc;
        expect(endSoc).toBeGreaterThan(0.6);
        expect(endSoc).toBeLessThan(0.8);
    });

    it('3 · low solar generation: a degraded channel is detected and the margin is recalculated', () => {
        const trace = traceOf('solar');
        expect(trace.marks.detectMin! - trace.marks.faultMin!).toBeGreaterThanOrEqual(EPS.detection.samples - 1);
        expect(sampleAt(trace, trace.marks.faultMin! + 1).state).toBe('DEGRADED_GENERATION');
        expect(sampleAt(trace, trace.marks.faultMin! + 1).marginPct).toBeLessThan(sampleAt(trace, trace.marks.faultMin! - 1).marginPct);
    });

    it('4 · battery low-energy condition raises a warning', () => {
        const trace = simulate({ id: 'low', durationMin: 30, faults: [], initialSoc: 0.3 });
        expect(trace.samples.some((s) => s.state === 'BATTERY_WARNING')).toBe(true);
        expect(trace.samples.some((s) => s.warnings.some((w) => /SOC/.test(w)))).toBe(true);
    });

    it('5 · battery thermal warning: threshold crossed, charge limited, temperature held below the limit', () => {
        const trace = traceOf('thermal');
        const warning = trace.events.find((e) => e.kind === 'warning')!;
        expect(warning.tMin).toBeGreaterThan(trace.marks.faultMin!);
        const after = sampleAt(trace, warning.tMin + 1).channels[1];
        expect(after.chargeLimited).toBe(true);
        expect(Math.max(...trace.samples.map((s) => s.channels[1].batteryTempC))).toBeLessThan(EPS.battery.tempLimitC);
        expect(trace.plan?.status).toBe('Protection Active');
    });

    it('6 · power-channel failure: protection isolates the channel at once', () => {
        const trace = traceOf('distribution');
        const s = sampleAt(trace, trace.marks.faultMin!);
        expect(s.channels[1].available).toBe(false);
        expect(s.channels[1].busV).toBe(0);
        expect(['DISTRIBUTION_FAULT']).toContain(sampleAt(trace, trace.marks.faultMin! + 0.5).state);
    });

    it('7 · load shedding sheds research before essential loads and never sheds critical loads by choice', () => {
        const plan = planRecovery({ 1: true, 2: false, 3: true, 4: true }, caps());
        for (const id of plan.shed) expect(EPS_LOADS.find((l) => l.id === id)!.group).not.toBe('critical');
        expect(plan.unservedCritical).toEqual([]);
    });

    it('8 · recovery success: a moderate generation loss is absorbed by reducing research', () => {
        const trace = traceOf('solar');
        expect(trace.plan?.status).toBe('Recovered');
        expect(trace.plan?.shed.every((id) => EPS_LOADS.find((l) => l.id === id)!.group === 'deferrable')).toBe(true);
        expect(trace.plan!.marginPct).toBeGreaterThan(0);
        expect(sampleAt(trace, trace.marks.decisionMin! + 1).state).toBe('RECOVERED');
    });

    it('9 · partial recovery: with channels 1 and 4 lost, critical loads survive on their other feeds but essential loads are shed', () => {
        const plan = planRecovery({ 1: false, 2: true, 3: true, 4: false }, caps());
        expect(plan.unservedCritical).toEqual([]);
        expect(['Partially Recovered', 'Degraded Operation']).toContain(plan.status);
        expect(plan.shed.some((id) => EPS_LOADS.find((l) => l.id === id)!.group === 'essential')).toBe(true);
    });

    it('respects the topology: losing both feeds of a dual-fed load leaves it unserved', () => {
        const plan = planRecovery({ 1: true, 2: false, 3: true, 4: false }, caps());
        expect(plan.unservedCritical.sort()).toEqual(['com', 'ls-b']);
        expect(plan.status).toBe('Unrecovered');
    });

    it('10 · insufficient power: with three channels lost, critical demand cannot be supported', () => {
        const plan = planRecovery({ 1: true, 2: false, 3: false, 4: false }, caps());
        expect(plan.status).toBe('Unrecovered');
        expect(plan.unservedCritical.length).toBeGreaterThan(0);
        const trace = simulate({ id: 'three-lost', durationMin: 200, faults: [{ kind: 'channel-loss', channels: [2, 3, 4], atMin: 30 }] });
        expect(trace.samples.some((s) => s.state === 'UNRECOVERED')).toBe(true);
    });
});

describe('scenario outcomes the experience presents', () => {
    it('reports every fault with onset, detection and decision in order', () => {
        for (const id of ['solar', 'thermal', 'distribution'] as const) {
            const t = traceOf(id);
            expect(t.marks.faultMin).toBeDefined();
            expect(t.marks.detectMin!).toBeGreaterThanOrEqual(t.marks.faultMin!);
            expect(t.marks.decisionMin!).toBeGreaterThan(t.marks.detectMin!);
            expect(sampleAt(t, t.marks.faultMin! + 0.5).illumination).toBe(1);
        }
    });

    it('is deterministic', () => {
        expect(JSON.stringify(simulate({ id: 'a', durationMin: 60, faults: [] }).samples.at(-1))).toBe(JSON.stringify(simulate({ id: 'a', durationMin: 60, faults: [] }).samples.at(-1)));
    });

    it('prints the reference outcomes', () => {
        const summary = Object.fromEntries(
            (['nominal', 'solar', 'thermal', 'distribution'] as const).map((id) => {
                const t = traceOf(id);
                const minSoc = Math.min(...t.samples.flatMap((s) => s.channels.filter((c) => c.available).map((c) => c.soc)));
                const maxTemp = Math.max(...t.samples.flatMap((s) => s.channels.map((c) => c.batteryTempC)));
                return [id, { plan: t.plan && { status: t.plan.status, shed: t.plan.shed.join(' '), transferred: t.plan.transferred.map((x) => x.load + '→' + x.to).join(' '), margin: +t.plan.marginPct.toFixed(1) }, marks: t.marks, minSoc: +minSoc.toFixed(3), maxTemp: +maxTemp.toFixed(1), margin0: +t.samples[10].marginPct.toFixed(1), states: [...new Set(t.samples.map((s) => s.state))].join(' ') }];
            }),
        );
        console.info(JSON.stringify(summary));
        console.info('capacity per channel', channelCapacityKw(1).toFixed(2), 'eclipses', JSON.stringify(ECLIPSES));
    });
});
