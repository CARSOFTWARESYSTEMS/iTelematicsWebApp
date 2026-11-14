/**
 * The guided investigation of EPS-1: ten subsystem labels, three fault investigations, the opening
 * overview and the guided walkthrough. Each scene names a scenario and a window of simulated time;
 * the 3D view, telemetry, health and insight all read that one trace (model.ts).
 */
import type { View } from '@/lib/space-twin/story';
import { CHANNELS, ECLIPSES, EPS, EPS_LOADS, channelCapacityKw, loadKw, sampleAt, traceOf, type ChannelSample, type EpsSample, type Health, type ScenarioId } from './model';

export const DATA_LABEL = 'SIMULATED — Conceptual Space Station EPS';
export const EPS_TITLE = 'Space Station Electrical Power & Energy Management';
export const EPS_MESSAGE = 'The energy that keeps a space station alive';
export const EPS_SUPPORT = 'Explore how electrical energy is generated, stored, distributed and protected to sustain critical orbital operations.';
export const EPS_SECONDARY = 'From Sunlight to Mission Survival.';
export const EPS_STORY = ['Solar Generation', 'Power Conditioning', 'Battery Storage', 'Power Distribution', 'Critical Loads', 'Fault Detection', 'Recovery'];

export type Highlight = 'arrays' | 'ch2' | 'batteries' | 'distribution' | 'modules' | 'radiators';
export type Tone = 'info' | 'alert';

export interface Overlays {
    sun?: boolean;
    flows?: boolean;
    channels?: boolean;
    cutaway?: boolean;
    marker?: 'array' | 'battery' | 'bus';
}

export interface TelemetryRow {
    label: string;
    value: string;
    tone?: 'solar' | 'orbit' | 'nominal' | 'fault' | 'telemetry';
}

export interface Scene {
    id: string;
    title: string;
    scenario: ScenarioId;
    /** Window of simulated minutes shown, played over `seconds` of story time. */
    from: number;
    to: number;
    seconds: number;
    view: View;
    tones: (s: EpsSample) => Partial<Record<Highlight, Tone>>;
    overlays: Overlays;
    what: string;
    why: string;
    question: string;
    telemetry: (s: EpsSample) => TelemetryRow[];
    health: (s: EpsSample) => Health;
    insight: (s: EpsSample) => string;
    learnMore: { formulas: string[]; notes: string[] };
    /** Where the chips point in 3D (label anchor ids) and what they say. */
    chips: (s: EpsSample, compact: boolean) => { id: string; text: string; alert?: boolean }[];
}

// ── Formatting ──────────────────────────────────────────────────────────────

const kw = (v: number, d = 1) => `${v.toFixed(d)} kW`;
const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)} %`;
const signedPct = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} %`;
const ch = (s: EpsSample, id = 2): ChannelSample => s.channels[id - 1];
const sum = (s: EpsSample, f: (c: ChannelSample) => number) => s.channels.reduce((a, c) => a + f(c), 0);
const totalLoad = (s: EpsSample) => s.servedKw.critical + s.servedKw.essential + s.servedKw.deferrable;
const totalSocPct = (s: EpsSample) => sum(s, (c) => (c.available ? c.energyKwh : 0)) / (EPS.battery.usableKwh * CHANNELS.length);
const loadName = (id: string) => EPS_LOADS.find((l) => l.id === id)?.name ?? id;
const channelHealth = (c: ChannelSample): Health => (!c.available ? 'Not Available' : c.arrayHealth < 1 ? 'Degraded' : c.batteryTempC >= EPS.battery.tempWarningC || c.soc < EPS.battery.socWarning ? 'Warning' : 'Normal');
const worst = (hs: Health[]): Health => (['Critical', 'Not Available', 'Degraded', 'Warning', 'Normal'] as Health[]).find((h) => hs.includes(h)) ?? 'Normal';

// ── Camera views (1 unit = 1 m; distances are multiples of the fitted distance) ─

const V = (az: number, el: number, dist: number, target: [number, number, number]): View => ({ az, el, dist, target });
export const VIEWS = {
    home: V(36, 20, 1.0, [0, -2.5, 0]),
    arrays: V(30, 12, 0.62, [-38, 0, 0]),
    battery: V(38, -4, 0.15, [-21, -7, 5.6]),
    control: V(22, -10, 0.24, [-12, -2.4, 0]),
    distribution: V(28, 18, 0.5, [-6, -3, 4]),
    channels: V(8, 34, 0.72, [-14, -1.5, 0]),
    modules: V(46, 14, 0.42, [0, -6.5, 4]),
    eclipse: V(26, 26, 1.2, [0, -2.5, 0]),
    fault: V(30, 10, 0.52, [-30, 0, 0]),
    twin: V(52, 24, 1.12, [0, -2.5, 0]),
} as const;

// ── The ten investigation labels ────────────────────────────────────────────

const [E1_IN, E1_OUT] = ECLIPSES[0];

export const LABELS: readonly Scene[] = [
    {
        id: 'solar',
        title: 'Solar Power Generation',
        scenario: 'nominal',
        from: E1_OUT - 4,
        to: E1_OUT + 18,
        seconds: 22,
        view: VIEWS.arrays,
        tones: () => ({ arrays: 'info', ch2: 'info' }),
        overlays: { sun: true, flows: true },
        what: 'Solar arrays convert incident sunlight into electrical power for the station.',
        why: 'They are the primary energy source during the illuminated part of every orbit.',
        question: 'How does reduced solar illumination influence the station’s available electrical power?',
        telemetry: (s) => [
            { label: 'Array voltage', value: s.illumination > 0 ? `${EPS.array.operatingV} V` : '— (no sunlight)' },
            { label: 'Array current', value: `${Math.round(sum(s, (c) => c.arrayCurrentA))} A` },
            { label: 'Generated power', value: kw(s.generatedKw), tone: 'solar' },
            { label: 'Incidence angle', value: `${EPS.array.trackingErrorDeg}°` },
            { label: 'Array temperature', value: `${ch(s, 1).arrayTempC.toFixed(0)} °C` },
        ],
        health: (s) => worst(s.channels.map(channelHealth)),
        insight: (s) =>
            s.illumination === 0
                ? 'In Earth’s shadow the arrays produce nothing; the batteries carry the station.'
                : ch(s, 1).arrayTempC < EPS.array.sunlitTempC - 5
                  ? `Just after sunrise the arrays are cold (${ch(s, 1).arrayTempC.toFixed(0)} °C) and can deliver ${kw(sum(s, (c) => c.arrayAvailableKw), 0)} — more than when warm, because cell output rises as temperature falls.`
                  : `Arrays can deliver ${kw(sum(s, (c) => c.arrayAvailableKw), 0)}; ${kw(s.generatedKw, 0)} is drawn and the regulators shunt the rest.`,
        learnMore: {
            formulas: ['P = V × I', 'P_solar = P_rated × illumination × cos θ × (1 + γ(T − 28 °C)) × (1 − d)^years'],
            notes: [
                `P_rated = ${EPS.array.ratedKw} kW per channel (beginning of life, 28 °C); γ = ${EPS.array.tempCoeff * 100} %/°C; d = ${EPS.array.degradationPerYear * 100} %/year over ${EPS.array.ageYears} years.`,
                `Illumination is 1 in sunlight, 0 in umbra, with a ${EPS.array.penumbraMin * 60} s linear penumbra; sun tracking leaves θ = ${EPS.array.trackingErrorDeg}°.`,
                `Array temperature follows a first-order lag (τ = ${EPS.array.thermalTauMin} min) between ${EPS.array.eclipseTempC} °C and ${EPS.array.sunlitTempC} °C.`,
            ],
        },
        chips: (s, compact) => (compact ? [{ id: 'arrays', text: `Solar ${kw(s.generatedKw, 0)}` }] : [{ id: 'arrays', text: `Solar ${kw(s.generatedKw, 0)} drawn` }, { id: 'ch2', text: `Available ${kw(sum(s, (c) => c.arrayAvailableKw), 0)}` }]),
    },
    {
        id: 'battery',
        title: 'Battery Energy Storage',
        scenario: 'nominal',
        from: E1_IN - 6,
        to: E1_OUT + 14,
        seconds: 26,
        view: VIEWS.battery,
        tones: () => ({ batteries: 'info' }),
        overlays: { cutaway: true, flows: true },
        what: 'Four battery groups store energy in sunlight and release it when generation is not enough.',
        why: 'Through every eclipse the batteries are the station’s only source of power.',
        question: 'Can the station safely sustain its required electrical loads through the expected eclipse duration?',
        telemetry: (s) => {
            const b = ch(s, 2);
            return [
                { label: 'Voltage (group 2)', value: `${b.batteryV.toFixed(1)} V` },
                { label: 'Current (group 2)', value: `${b.batteryA >= 0 ? '+' : '−'}${Math.abs(b.batteryA).toFixed(0)} A`, tone: b.batteryA < 0 ? 'orbit' : 'solar' },
                { label: 'State of charge', value: pct(b.soc, 1) },
                { label: 'Temperature', value: `${b.batteryTempC.toFixed(1)} °C` },
                { label: 'Usable energy (all groups)', value: `${sum(s, (c) => c.energyKwh).toFixed(0)} kWh` },
            ];
        },
        health: (s) => worst(s.channels.map((c) => (c.soc < EPS.battery.socCritical || c.batteryTempC >= EPS.battery.tempLimitC ? 'Critical' : c.soc < EPS.battery.socWarning || c.batteryTempC >= EPS.battery.tempWarningC || c.chargeLimited ? 'Warning' : 'Normal'))),
        insight: (s) => {
            const exit = sampleAt(traceOf('nominal'), E1_OUT);
            return s.eclipse
                ? `Discharging ${kw(-sum(s, (c) => c.batteryKw), 0)} to carry ${kw(totalLoad(s), 0)} of loads. At this rate the batteries end the ${(E1_OUT - E1_IN).toFixed(0)}-minute eclipse at ${pct(exit.channels[0].soc)} — a ${pct(1 - exit.channels[0].soc)} depth of discharge.`
                : sum(s, (c) => c.batteryKw) > 0.5
                  ? `Charging ${kw(sum(s, (c) => c.batteryKw), 0)} from surplus solar power${ch(s).soc > EPS.battery.taperFrom ? '; charge power tapers above 95 % to protect the cells' : ''}.`
                  : 'Batteries full: surplus solar power is shunted.';
        },
        learnMore: {
            formulas: ['P_battery = V_battery × I_battery', 'E [Wh] = E [J] / 3600', 'SOC_next = SOC + (P_charge·η_c − P_discharge/η_d)·Δt / E_usable', 'V_terminal = V_oc(SOC) ± I·R'],
            notes: [
                `Usable capacity ${EPS.battery.usableKwh} kWh per group (${EPS.battery.usableKwh * 4} kWh in total), not nominal capacity; SOC is clamped to 0–100 % of usable energy.`,
                `η_charge = ${EPS.eff.charge}, η_discharge = ${EPS.eff.discharge}; charging tapers linearly above ${EPS.battery.taperFrom * 100} % SOC; limits ${EPS.battery.maxChargeKw} kW charge, ${EPS.battery.maxDischargeKw} kW discharge.`,
                `V_oc = ${EPS.battery.cellsInSeries} cells × (${EPS.battery.cellVEmpty}–${EPS.battery.cellVFull} V), R = ${EPS.battery.resistanceOhm} Ω; heat = I²R into a ${EPS.battery.thermalMassJPerK / 1000} kJ/K thermal mass cooled at ${EPS.battery.coolingWPerK} W/K.`,
                `Time step ${EPS.stepMin * 60} s; current sign: + charging, − discharging. No state-of-health model: shown as not available.`,
            ],
        },
        chips: (s) => [{ id: 'cutaway', text: `Group 2 · SOC ${pct(ch(s).soc)} · ${ch(s).batteryTempC.toFixed(0)} °C` }],
    },
    {
        id: 'control',
        title: 'Power Management & Control',
        scenario: 'nominal',
        from: E1_IN - 4,
        to: E1_IN + 6,
        seconds: 16,
        view: VIEWS.control,
        tones: () => ({ distribution: 'info', batteries: 'info' }),
        overlays: { flows: true },
        what: 'Regulators, charge/discharge units and converters condition power and keep the bus voltage within limits.',
        why: 'They balance generation, storage and demand, and switch between charging and discharging without interrupting loads.',
        question: 'What changes in the power system when the station enters Earth’s shadow?',
        telemetry: (s) => [
            { label: 'Primary bus voltage', value: `${ch(s).busV} V` },
            { label: 'Secondary (load) voltage', value: `${EPS.bus.secondaryV} V` },
            { label: 'Converter efficiency', value: pct(EPS.eff.converter, 1) },
            { label: 'Controller state', value: s.eclipse ? 'Discharge regulation' : sum(s, (c) => c.batteryKw) > 0.5 ? 'Charge regulation' : 'Shunt regulation', tone: s.eclipse ? 'orbit' : 'solar' },
            { label: 'Conversion losses', value: kw(s.lossesKw) },
        ],
        health: () => 'Normal',
        insight: (s) => (s.eclipse ? `The charge/discharge units now hold the bus at ${EPS.bus.eclipseV} V from the batteries; loads see no interruption.` : `The shunt regulators hold the bus at ${EPS.bus.primaryV} V and divert surplus array power; ${kw(s.lossesKw)} is lost as heat in conversion.`),
        learnMore: {
            formulas: ['P_out = η × P_in', 'P_available = P_solar + P_battery,discharge − P_battery,charge − P_losses'],
            notes: [`Regulator η = ${EPS.eff.regulator}, converter η = ${EPS.eff.converter} (${EPS.bus.primaryV} V primary → ${EPS.bus.secondaryV} V secondary).`, 'Conceptual control: no software here commands any real spacecraft.'],
        },
        chips: (s) => [{ id: 'distribution', text: s.eclipse ? 'Discharge regulation' : 'Charge / shunt regulation' }],
    },
    {
        id: 'distribution',
        title: 'Electrical Power Distribution',
        scenario: 'distribution',
        from: 96,
        to: 106,
        seconds: 18,
        view: VIEWS.distribution,
        tones: (s) => ({ distribution: ch(s).available ? 'info' : 'alert', modules: 'info' }),
        overlays: { flows: true, channels: true, marker: 'bus' },
        what: 'Main buses, switching units, converters and remote power controllers deliver power to every module.',
        why: 'Distribution decides which loads receive power, and protection isolates faults before they spread.',
        question: 'What happens to the loads when one primary bus is lost?',
        telemetry: (s) => [
            { label: 'Bus voltage (ch 2)', value: ch(s).available ? `${ch(s).busV} V` : '0 V · isolated', tone: ch(s).available ? undefined : 'fault' },
            { label: 'Distributed power', value: kw(totalLoad(s)) },
            { label: 'Active demand', value: kw(s.demandKw) },
            { label: 'Protection (ch 2)', value: ch(s).available ? 'Closed' : 'Tripped', tone: ch(s).available ? 'nominal' : 'fault' },
            { label: 'Conversion losses', value: kw(s.lossesKw) },
        ],
        health: (s) => (ch(s).available ? 'Normal' : 'Degraded'),
        insight: (s) => (ch(s).available ? `${kw(totalLoad(s), 0)} reaches the modules through four independent channels.` : `Channel 2 is isolated. Dual-fed critical loads switched to their other feed; single-fed loads on channel 2 lost power.`),
        learnMore: { formulas: ['Σ P_loads + Σ P_losses = Σ P_sources', 'I = P / V'], notes: ['Protection trips a faulted bus at once; dual-fed critical loads are switched by remote power controllers to their alternate feed.'] },
        chips: (s) => [{ id: 'dist2', text: ch(s).available ? 'Channel 2 bus · closed' : 'Channel 2 bus · tripped', alert: !ch(s).available }],
    },
    {
        id: 'channels',
        title: 'Power Channels & Redundancy',
        scenario: 'distribution',
        from: 99,
        to: 112,
        seconds: 20,
        view: VIEWS.channels,
        tones: (s) => ({ ch2: ch(s).available ? 'info' : 'alert', arrays: 'info' }),
        overlays: { channels: true, flows: true, marker: 'bus' },
        what: 'Four independent channels, each with its own arrays, battery group and bus; channels 1–2 and 3–4 are cross-tied.',
        why: 'Independence limits a fault to one channel; cross-ties and dual feeds let others carry critical loads — within their capacity.',
        question: 'Can the remaining channels carry the loads of a lost channel?',
        telemetry: (s) => [
            { label: 'Channels available', value: `${s.channels.filter((c) => c.available).length} of 4`, tone: s.channels.every((c) => c.available) ? 'nominal' : 'fault' },
            { label: 'Capacity margin', value: signedPct(s.marginPct), tone: s.marginPct < 0 ? 'fault' : 'nominal' },
            { label: 'Cross-tie 1–2', value: kw(Math.abs(ch(s, 1).crossTieKw)) },
            { label: 'Redundancy (critical loads)', value: EPS_LOADS.filter((l) => l.group === 'critical').every((l) => s.channels[l.channel - 1].available) ? 'Both feeds ready' : 'Single feed', tone: 'telemetry' },
            { label: 'Switching', value: s.recovery ? 'Reconfigured' : ch(s).available ? 'Nominal' : 'Evaluating' },
        ],
        health: (s) => worst(s.channels.map(channelHealth)),
        insight: (s) => {
            const plan = traceOf('distribution').plan!;
            return !ch(s).available && s.recovery
                ? `Reconfigured: ${plan.transferred.map((x) => `${loadName(x.load)} → ch ${x.to}`).join(', ')}. Each channel can carry about ${channelCapacityKw(1).toFixed(1)} kW over an orbit, so research loads were shed to stay within capacity.`
                : !ch(s).available
                  ? 'Evaluating which alternate feeds and cross-ties are permitted, and how much capacity each channel has left.'
                  : 'Each critical load has a primary and an alternate feed on different channels.';
        },
        learnMore: { formulas: ['L_max = E_bus,sunlit / (t_sun/η_conv + t_eclipse/(η_conv·η_d·η_c))'], notes: [`Cross-tie rating ${EPS.crossTieKw} kW; only channel pairs 1–2 and 3–4 are tied. A load whose two feeds are both lost cannot be served: the model reports that, it does not assume recovery.`] },
        chips: (s) => [{ id: 'ch2', text: ch(s).available ? 'Channel 2' : 'Channel 2 isolated', alert: !ch(s).available }],
    },
    {
        id: 'loads',
        title: 'Station Modules & Critical Loads',
        scenario: 'solar',
        from: 102,
        to: 112,
        seconds: 18,
        view: VIEWS.modules,
        tones: () => ({ modules: 'info' }),
        overlays: { flows: true },
        what: 'Modules host the electrical loads: life support, thermal control, avionics, communications, habitat systems and research.',
        why: 'Not every load is equal: a priority table protects critical services when power is short.',
        question: 'Which loads give way first when generation falls?',
        telemetry: (s) => [
            { label: 'Total demand', value: kw(s.demandKw) },
            { label: 'Delivered', value: kw(totalLoad(s)) },
            { label: 'Critical loads', value: `${kw(s.servedKw.critical, 0)} of ${kw(loadKw('critical'), 0)}`, tone: s.servedKw.critical >= loadKw('critical') ? 'nominal' : 'fault' },
            { label: 'Research loads', value: `${kw(s.servedKw.deferrable, 1)} of ${kw(loadKw('deferrable'), 0)}` },
            { label: 'Power margin', value: signedPct(s.marginPct), tone: s.marginPct < 0 ? 'fault' : 'nominal' },
        ],
        health: (s) => (s.servedKw.critical < loadKw('critical') ? 'Critical' : s.shed.length ? 'Degraded' : 'Normal'),
        insight: (s) => (s.shed.length ? `Load priority applied: ${s.shed.map(loadName).join(', ')} shed; all ${kw(loadKw('critical'), 0)} of critical loads stay powered.` : 'All loads powered. Priorities: critical (life support, thermal, avionics, comms) → essential (habitat) → deferrable (research).'),
        learnMore: { formulas: ['P_delivered = Σ served loads ≤ P_available'], notes: ['Life support is represented only as an electrical load, not as a life-support model.', 'Critical loads are protected while capacity allows; they are not guaranteed under every fault.'] },
        chips: (s) => [{ id: 'modules', text: `Critical ${kw(s.servedKw.critical, 0)}` }, ...(s.shed.length ? [{ id: 'research', text: 'Research reduced' }] : [])],
    },
    {
        id: 'eclipse',
        title: 'Sunlight & Eclipse Energy Cycle',
        scenario: 'nominal',
        from: E1_IN - 8,
        to: E1_OUT + 10,
        seconds: 30,
        view: VIEWS.eclipse,
        tones: (s) => (s.eclipse ? { batteries: 'info' } : { arrays: 'info', ch2: 'info' }),
        overlays: { flows: true, sun: true },
        what: 'Every orbit the station passes through Earth’s shadow: generation stops and the batteries take over.',
        why: 'The eclipse sets how much energy must be stored, and sunlight must be enough to carry the loads and recharge it.',
        question: 'When sunlight disappears, the station depends on the energy it has stored. Is it enough?',
        telemetry: (s) => [
            { label: 'Illumination', value: s.eclipse ? 'Eclipse' : s.illumination < 1 ? 'Penumbra' : 'Sunlight', tone: s.eclipse ? 'orbit' : 'solar' },
            { label: 'Solar generation', value: kw(s.generatedKw), tone: 'solar' },
            { label: 'Battery power', value: `${sum(s, (c) => c.batteryKw) >= 0 ? '+' : '−'}${kw(Math.abs(sum(s, (c) => c.batteryKw)))}`, tone: sum(s, (c) => c.batteryKw) < 0 ? 'orbit' : 'solar' },
            { label: 'Stored energy', value: `${sum(s, (c) => c.energyKwh).toFixed(0)} kWh · ${pct(totalSocPct(s))}` },
            { label: 'Orbit margin', value: signedPct(s.marginPct), tone: 'nominal' },
        ],
        health: () => 'Normal',
        insight: (s) => {
            const elapsed = s.eclipse ? s.tMin - E1_IN : 0;
            return s.eclipse
                ? `${elapsed.toFixed(0)} of ${(E1_OUT - E1_IN).toFixed(0)} eclipse minutes: ${sum(s, (c) => c.energyKwh).toFixed(0)} kWh remain, enough for the rest of the shadow with margin.`
                : s.tMin > E1_OUT
                  ? 'Sunrise: arrays carry the loads again and recharge the batteries before the next eclipse.'
                  : `In sunlight the arrays carry ${kw(totalLoad(s), 0)} of loads and charge the batteries for the coming eclipse.`;
        },
        learnMore: {
            formulas: ['T = 2π √(a³/μ)', 'f_eclipse = arccos(√(h² + 2Rh) / ((R + h) cos β)) / π'],
            notes: [`Orbit ${EPS.orbit.altitudeKm} km circular at β = ${EPS.orbit.betaDeg}° (the longest eclipse): ${(E1_OUT - E1_IN).toFixed(1)} min of shadow per orbit. Eclipse duration varies with β-angle season; it is not fixed for every orbit.`],
        },
        chips: (s) => [{ id: s.eclipse ? 'batteries' : 'arrays', text: s.eclipse ? `Batteries supplying ${kw(-sum(s, (c) => c.batteryKw), 0)}` : `Solar ${kw(s.generatedKw, 0)}` }],
    },
    {
        id: 'detection',
        title: 'Fault Detection & Diagnostics',
        scenario: 'solar',
        from: 97,
        to: 108,
        seconds: 20,
        view: VIEWS.fault,
        tones: (s) => (s.tMin >= 100 ? { ch2: 'alert' } : { arrays: 'info', ch2: 'info' }),
        overlays: { marker: 'array', flows: true },
        what: 'Diagnostics compare what the model expects with what is observed, and flag sustained differences.',
        why: 'Early, explained detection gives operators time to protect the mission before margins are lost.',
        question: 'Is channel 2 producing what the model expects?',
        telemetry: (s) => [
            { label: 'Expected (ch 2)', value: kw(ch(s).arrayExpectedKw) },
            { label: 'Observed (ch 2)', value: kw(ch(s).arrayAvailableKw), tone: ch(s).arrayHealth < 1 ? 'fault' : undefined },
            { label: 'Residual', value: ch(s).arrayExpectedKw > 0 ? pct(1 - ch(s).arrayAvailableKw / ch(s).arrayExpectedKw) : '—' },
            { label: 'Detection rule', value: `> ${EPS.detection.residual * 100} % × ${EPS.detection.samples} samples` },
            { label: 'System state', value: s.state.replace(/_/g, ' ').toLowerCase() },
        ],
        health: (s) => (ch(s).arrayHealth < 1 ? 'Degraded' : 'Normal'),
        insight: (s) => {
            const t = traceOf('solar');
            return s.tMin < t.marks.faultMin! ? 'Observed generation matches the model.' : s.tMin < t.marks.detectMin! ? `Residual ${pct(1 - ch(s).arrayAvailableKw / ch(s).arrayExpectedKw)} — waiting for ${EPS.detection.samples} consecutive samples before declaring a fault.` : 'Fault confirmed: channel 2 generation degraded. Rule-based detection; no trained AI is used.';
        },
        learnMore: { formulas: ['r = 1 − P_observed / P_expected', 'fault ⇔ r > 0.15 for 5 consecutive 1-minute samples'], notes: ['Rule-based detection. Predictive AI is a planned research direction, not implemented.'] },
        chips: (s) => [{ id: 'ch2', text: ch(s).arrayHealth < 1 ? `Channel 2 · ${pct(ch(s).arrayHealth)} of expected` : 'Channel 2 · as expected', alert: ch(s).arrayHealth < 1 }],
    },
    {
        id: 'recovery',
        title: 'Recovery & Load Protection',
        scenario: 'distribution',
        from: 99,
        to: 112,
        seconds: 22,
        view: VIEWS.distribution,
        tones: (s) => ({ distribution: ch(s).available ? 'info' : 'alert', modules: 'info' }),
        overlays: { channels: true, flows: true, marker: 'bus' },
        what: 'Fault management evaluates the protective actions available, applies them, and recalculates the system.',
        why: 'A digital twin should help engineers understand the consequences of a failure before making mission decisions.',
        question: 'Which actions restore a safe margin, and what is lost?',
        telemetry: (s) => [
            { label: 'Initial state', value: '4 channels · 74 kW' },
            { label: 'Event', value: ch(s).available ? '—' : 'Channel 2 bus fault', tone: ch(s).available ? undefined : 'fault' },
            { label: 'Critical loads', value: `${kw(s.servedKw.critical, 0)} of ${kw(loadKw('critical'), 0)}`, tone: s.servedKw.critical >= loadKw('critical') ? 'nominal' : 'fault' },
            { label: 'Resulting margin', value: signedPct(s.marginPct), tone: s.marginPct < 0 ? 'fault' : 'nominal' },
            { label: 'Recovery status', value: s.recovery ?? (ch(s).available ? '—' : 'Evaluating'), tone: s.recovery === 'Recovered' ? 'nominal' : s.recovery ? 'solar' : undefined },
        ],
        health: (s) => (s.recovery === 'Recovered' ? 'Normal' : s.recovery ? 'Degraded' : ch(s).available ? 'Normal' : 'Warning'),
        insight: (s) => (s.recovery ? traceOf('distribution').plan!.reason : ch(s).available ? 'Nominal operation.' : 'Protection has isolated channel 2; the recovery evaluation is under way.'),
        learnMore: { formulas: ['Order: shed research → move dual-fed critical loads → shed essential loads'], notes: ['Outcomes: Recovered, Partially Recovered, Degraded Operation, Unrecovered or Protection Active — the model reports failures as well as successes.'] },
        chips: (s) => [{ id: 'dist2', text: s.recovery ?? (ch(s).available ? 'Nominal' : 'Evaluating'), alert: !s.recovery && !ch(s).available }],
    },
    {
        id: 'twin',
        title: 'Digital Twin Intelligence',
        scenario: 'solar',
        from: 104,
        to: 150,
        seconds: 24,
        view: VIEWS.twin,
        tones: (s) => (s.recovery ? { ch2: 'alert', modules: 'info' } : { ch2: 'alert' }),
        overlays: { flows: true, channels: true },
        what: 'The conceptual station, its engineering model, simulated telemetry, diagnostics and forecasts in one view.',
        why: 'Engineers can compare expected and observed behaviour and see predicted consequences before acting.',
        question: 'Investigate. Understand. Predict. Protect.',
        telemetry: (s) => {
            const next = sampleAt(traceOf('solar'), ECLIPSES[1][1]);
            return [
                { label: 'Generation', value: kw(s.generatedKw), tone: 'solar' },
                { label: 'Stored energy', value: `${sum(s, (c) => c.energyKwh).toFixed(0)} kWh` },
                { label: 'Load demand', value: kw(s.demandKw) },
                { label: 'Power margin', value: signedPct(s.marginPct), tone: s.marginPct < 0 ? 'fault' : 'nominal' },
                { label: 'Forecast: end of next eclipse', value: `${sum(next, (c) => c.energyKwh).toFixed(0)} kWh · ${pct(totalSocPct(next))}`, tone: 'telemetry' },
            ];
        },
        health: (s) => worst(s.channels.map(channelHealth)),
        insight: (s) => `State: ${s.state.replace(/_/g, ' ').toLowerCase()}. Physical system: conceptual station. Model: equations and parameters on this panel. Telemetry: simulated. Recovery: simulated actions, not spacecraft commands.`,
        learnMore: { formulas: ['Forecast = the same deterministic model run forward'], notes: ['Physical system — conceptual SRC-1 power architecture.', 'Engineering model — equations, parameters, constraints, state transitions.', 'Telemetry — simulated; no live or replayed data is connected.', 'Diagnostics — rule-based; Prediction — deterministic forecast; Recovery — simulated actions.'] },
        chips: (s) => [{ id: 'ch2', text: 'Channel 2 degraded', alert: true }, { id: 'modules', text: `Critical ${kw(s.servedKw.critical, 0)}` }],
    },
];

// ── Fault investigations ────────────────────────────────────────────────────

export interface FaultInvestigation {
    id: ScenarioId;
    title: string;
    scene: Scene;
    diagnostic: { name: string; component: string; expected: string; observed: string; detection: string; severity: string; effect: string; response: string };
}

const base = (id: string) => LABELS.find((l) => l.id === id)!;

/** Average heating rate of battery group 2 between the cooling fault and the warning (°C per minute). */
function thermalRate() {
    const t = traceOf('thermal');
    const warn = t.events.find((e) => e.kind === 'warning')!.tMin;
    const start = sampleAt(t, t.marks.faultMin!).channels[1].batteryTempC;
    return (EPS.battery.tempWarningC - start) / (warn - t.marks.faultMin!);
}

export const FAULTS: readonly FaultInvestigation[] = [
    {
        id: 'solar',
        title: 'A · Solar Generation Degradation',
        scene: { ...base('detection'), id: 'fault-solar', title: 'Fault A · Solar Generation Degradation', from: 97, to: 114, seconds: 24 },
        diagnostic: {
            name: 'Solar generation degradation',
            component: 'Channel 2 solar array strings',
            expected: `${CHANNELS.length} × ≈ 40 kW in sunlight`,
            observed: 'Channel 2 at 60 % of expected output',
            detection: `Residual > ${EPS.detection.residual * 100} % on ${EPS.detection.samples} consecutive 1-min samples`,
            severity: 'Moderate',
            effect: `Channel 2 can carry ≈ ${channelCapacityKw(0.6).toFixed(1)} kW over an orbit instead of ≈ ${channelCapacityKw(1).toFixed(1)} kW`,
            response: 'Research load B deferred; cross-tie 1–2 shares spare capacity',
        },
    },
    {
        id: 'thermal',
        title: 'B · Battery Thermal Warning',
        scene: {
            ...base('battery'),
            id: 'fault-thermal',
            title: 'Fault B · Battery Thermal Warning',
            scenario: 'thermal',
            from: 92,
            to: 126,
            seconds: 26,
            tones: (s) => (s.channels[1].batteryTempC >= EPS.battery.tempWarningC - 2 ? { batteries: 'alert' } : { batteries: 'info' }),
            overlays: { cutaway: true, flows: true, marker: 'battery' },
            telemetry: (s) => [
                { label: 'Group 2 temperature', value: `${s.channels[1].batteryTempC.toFixed(1)} °C`, tone: s.channels[1].batteryTempC >= EPS.battery.tempWarningC ? 'fault' : undefined },
                { label: 'Warning / limit', value: `${EPS.battery.tempWarningC} / ${EPS.battery.tempLimitC} °C` },
                { label: 'Charge power (group 2)', value: kw(Math.max(0, s.channels[1].batteryKw)) },
                { label: 'Protection', value: s.channels[1].chargeLimited ? `Charge limited to ${EPS.battery.thermalChargeLimit * 100} %` : 'Inactive', tone: s.channels[1].chargeLimited ? 'solar' : undefined },
                { label: 'Recovery status', value: s.recovery ?? '—' },
            ],
            insight: (s) => (s.channels[1].chargeLimited ? `Charge limiting cut battery heating; the temperature levels off near ${s.channels[1].batteryTempC.toFixed(0)} °C. ${s.recovery ? traceOf('thermal').plan!.reason : ''}` : `Cooling lost: each charge current adds I²R heat that the cold plate no longer removes (${s.channels[1].batteryTempC.toFixed(1)} °C).`),
        },
        diagnostic: {
            name: 'Battery thermal warning',
            component: 'Battery group 2 cold-plate cooling',
            expected: `Group 2 at or below ${Math.ceil(Math.max(...traceOf('nominal').samples.map((x) => x.channels[1].batteryTempC)))} °C while charging`,
            observed: `Temperature rising ≈ ${thermalRate().toFixed(1)} °C per minute while charging`,
            detection: `Temperature ≥ ${EPS.battery.tempWarningC} °C (warning); ≥ ${EPS.battery.tempLimitC} °C isolates the group`,
            severity: 'High',
            effect: 'Group 2 can store far less energy each orbit',
            response: 'Charge limited to 25 %; Life support B moved to channel 4; research B and D deferred',
        },
    },
    {
        id: 'distribution',
        title: 'C · Distribution Channel Fault',
        scene: { ...base('recovery'), id: 'fault-distribution', title: 'Fault C · Distribution Channel Fault', from: 97, to: 112, seconds: 22 },
        diagnostic: {
            name: 'Distribution channel fault',
            component: 'Channel 2 primary bus',
            expected: 'Channel 2 bus at 160 V',
            observed: 'Short circuit; bus tripped to 0 V',
            detection: 'Overcurrent protection trips at once',
            severity: 'High',
            effect: 'Channel 2 arrays, battery group and bus unavailable',
            response: 'Dual-fed critical loads re-fed; all research deferred; essential loads kept',
        },
    },
];

// ── Opening overview and guided walkthrough ─────────────────────────────────

export const OVERVIEW_STAGES = ['Establishing view', 'Station reveal', 'Electrical system identification', 'Investigation ready'] as const;
export const OVERVIEW: Scene = {
    ...base('solar'),
    id: 'overview',
    title: 'Orbital environment',
    scenario: 'nominal',
    from: 10,
    to: 40,
    seconds: 14,
    view: VIEWS.home,
    tones: () => ({}),
    overlays: {},
    what: 'A conceptual modular research station in low Earth orbit, with four independent power channels.',
    why: 'Its electrical power system keeps every other system alive.',
    question: 'Choose Start Investigation, or pick a subsystem.',
    chips: () => [],
};

/** Overview camera: establishing → reveal → identification sweep → ready. */
export const OVERVIEW_KEYS = [
    { t: 0, v: V(78, 34, 2.6, [0, -2.5, 0]) },
    { t: 4, v: V(52, 24, 1.35, [0, -2.5, 0]) },
    { t: 8, v: V(30, 16, 1.05, [-12, -2, 0]) },
    { t: 11, v: V(40, 20, 1.0, [0, -2.5, 0]) },
] as const;

export interface GuidedStep {
    scene: Scene;
    caption: string;
}

/** About two and a half minutes; every step can be skipped. */
export const GUIDED: readonly GuidedStep[] = [
    { scene: { ...OVERVIEW, seconds: 15 }, caption: 'Opening · the station and its power system' },
    { scene: { ...base('solar'), seconds: 20 }, caption: 'Solar power · electricity generation' },
    { scene: { ...base('battery'), seconds: 20 }, caption: 'Battery storage · charging and stored energy' },
    { scene: { ...base('distribution'), scenario: 'nominal', from: 20, to: 34, seconds: 20, overlays: { flows: true, channels: true }, tones: () => ({ distribution: 'info', modules: 'info' }) }, caption: 'Power distribution · energy to the station’s systems' },
    { scene: { ...base('eclipse'), seconds: 25 }, caption: 'Eclipse · battery-powered operation' },
    { scene: { ...FAULTS[0].scene, from: 97, to: 106, seconds: 25 }, caption: 'Fault · reduced generation on channel 2' },
    { scene: { ...base('loads'), from: 104, to: 116, seconds: 25 }, caption: 'Recovery · protection logic and resulting power' },
    { scene: { ...base('twin'), seconds: 15 }, caption: 'Digital twin summary · telemetry, health and forecast' },
];

/** Simulated minute shown at story second t of a scene (clamped to its window). */
export const sceneMinute = (scene: Scene, t: number) => scene.from + (Math.min(Math.max(t, 0), scene.seconds) / scene.seconds) * (scene.to - scene.from);
