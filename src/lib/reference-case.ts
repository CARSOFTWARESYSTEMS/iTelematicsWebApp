/**
 * Illustrative reference case for Satellite Energy & Telemetry Intelligence.
 *
 * Values are internally consistent (see the worked example on /research-platform):
 *   T = 95.6 min (a = 6 928 km); eclipse 34.8 min at β = 20°; sunlight ≈ 61 min
 *   Sunlight: 41.8 W × η_EPS 0.90 = 37.6 W available − 22.0 W load = 15.6 W → +1.9 A at 8.18 V
 *   Eclipse:  14.0 W / η_EPS 0.90 = 15.6 W from battery → −1.9 A at ~8.0 V; 9.1 Wh = 10.6 % DoD of 86 Wh
 *   Margin:   E_gen 42.5 Wh vs E_req 35.5 Wh → +20 % per orbit
 * Simulated values for learning and research — not flight data.
 */

export type MissionState = 'sunlight' | 'eclipse';
export type StateTone = 'nominal' | 'warning' | 'critical' | 'eclipse' | 'charging' | 'discharging';

export type Reading = { value: string; tone?: StateTone };

export type TelemetryParameter = {
    label: string;
    sunlight: Reading;
    eclipse: Reading;
    why: string;
    source: string;
};

export const REFERENCE_CASE = {
    spacecraft: '6U Earth-observation CubeSat',
    orbit: '550 km sun-synchronous orbit, β ≈ 20°',
    period: '95.6 min',
    sunlight: '≈ 61 min',
    eclipse: '≈ 35 min',
    battery: '2S4P Li-ion, 7.2 V nominal, ≈ 86 Wh',
    note: 'Illustrative reference case · simulated values for learning and research, not flight data.',
} as const;

export const TELEMETRY: TelemetryParameter[] = [
    {
        label: 'Eclipse state',
        sunlight: { value: 'SUNLIGHT', tone: 'nominal' },
        eclipse: { value: 'ECLIPSE', tone: 'eclipse' },
        why: 'Sets whether the arrays can generate at all, and which loads the mission can afford.',
        source: 'Orbit propagation, sun sensors',
    },
    {
        label: 'Solar generation',
        sunlight: { value: '41.8 W' },
        eclipse: { value: '0.0 W' },
        why: 'Primary energy input; varies with sun angle, temperature and array degradation.',
        source: 'Array voltage and current sensors',
    },
    {
        label: 'Battery SOC',
        sunlight: { value: '91 % · rising' },
        eclipse: { value: '86 % · end of eclipse' },
        why: 'Energy in reserve. The lowest SOC each orbit bounds what the mission can do safely.',
        source: 'Coulomb counting with voltage correction',
    },
    {
        label: 'Battery voltage',
        sunlight: { value: '8.18 V' },
        eclipse: { value: '7.98 V' },
        why: 'Cross-checks SOC and protects cells from over-charge and over-discharge.',
        source: 'Pack voltage sense',
    },
    {
        label: 'Battery current',
        sunlight: { value: '+1.9 A · charging', tone: 'charging' },
        eclipse: { value: '−1.9 A · discharging', tone: 'discharging' },
        why: 'Direction and magnitude of energy flow; integrated over time it gives SOC.',
        source: 'Shunt current sensor',
    },
    {
        label: 'Battery temperature',
        sunlight: { value: '17 °C', tone: 'nominal' },
        eclipse: { value: '6 °C · near 5 °C heater threshold', tone: 'warning' },
        why: 'Li-ion cells must stay in a narrow band; heaters cost energy exactly when energy is scarce.',
        source: 'Thermistors on the pack',
    },
    {
        label: 'Bus voltage (5 V rail)',
        sunlight: { value: '5.01 V' },
        eclipse: { value: '4.99 V' },
        why: 'A regulated bus should hold steady in both states; drift is an early EPS warning.',
        source: 'EPS rail monitors',
    },
    {
        label: 'Subsystem load',
        sunlight: { value: '22.0 W' },
        eclipse: { value: '14.0 W · payload off' },
        why: 'Consumption by subsystem; load scheduling is the main lever on energy margin.',
        source: 'Per-channel EPS current sensing',
    },
    {
        label: 'Telemetry availability',
        sunlight: { value: '100 % frames logged' },
        eclipse: { value: '100 % frames logged' },
        why: 'Gaps in telemetry hide faults; health logic must know when data is missing.',
        source: 'OBC housekeeping log',
    },
    {
        label: 'Sensor health',
        sunlight: { value: 'NOMINAL · all channels', tone: 'nominal' },
        eclipse: { value: 'NOMINAL · sun sensors masked', tone: 'nominal' },
        why: 'Sun sensors read zero in eclipse. Health logic must treat that as expected, not as a fault.',
        source: 'Sensor self-test, cross-checks',
    },
    {
        label: 'Mission energy margin',
        sunlight: { value: '+20 % per orbit', tone: 'nominal' },
        eclipse: { value: '+20 % per orbit', tone: 'nominal' },
        why: 'Generated energy minus required energy, per orbit. The direct answer to the core question.',
        source: 'Derived: energy-balance model',
    },
];

export const STATE_SUMMARY: Record<MissionState, string> = {
    sunlight:
        'In sunlight the arrays carry every load and recharge the battery. The battery current is positive and SOC rises toward full before the next eclipse.',
    eclipse:
        'In eclipse solar generation falls to zero. The battery carries the regulated bus, the payload is switched off to save energy, and sun-sensor dropouts are expected rather than faults.',
};

export type FlowNode = { name: string; sunlight: Reading; eclipse: Reading };

/** Sun → Solar → EPS → Battery → Loads, as shown in the explorer diagram. */
export const POWER_FLOW: FlowNode[] = [
    { name: 'Sun', sunlight: { value: '1361 W/m²' }, eclipse: { value: 'Earth shadow', tone: 'eclipse' } },
    { name: 'Solar array', sunlight: { value: '41.8 W' }, eclipse: { value: '0.0 W' } },
    { name: 'EPS', sunlight: { value: 'Bus 5.01 V', tone: 'nominal' }, eclipse: { value: 'Bus 4.99 V', tone: 'nominal' } },
    { name: 'Battery', sunlight: { value: 'Charging', tone: 'charging' }, eclipse: { value: 'Discharging', tone: 'discharging' } },
    { name: 'Loads', sunlight: { value: '22.0 W' }, eclipse: { value: '14.0 W' } },
];

/** Index of the first node that carries energy in each state (eclipse flow starts at the battery). */
export const FLOW_START: Record<MissionState, number> = { sunlight: 0, eclipse: 3 };
