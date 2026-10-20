/**
 * Telemetry snapshots for the illustrative reference case, derived from the energy model so the
 * table, the orbit instrument and the charts always agree.
 * Simulated values for learning and research — not flight data.
 */
import { ECLIPSE_MIN, PERIOD_MIN, POWER, SUNLIGHT_MIN, orbitBudget, packVoltage, sampleAtPhase } from './energy-model';

export type StateTone = 'nominal' | 'fault' | 'orbit' | 'solar' | 'telemetry';
export type Reading = { value: string; tone?: StateTone };

export type TelemetryParameter = {
    label: string;
    sunlight: Reading;
    eclipse: Reading;
    source: string;
};

export const REFERENCE_CASE = {
    spacecraft: '6U Earth-observation CubeSat',
    orbit: '550 km sun-synchronous orbit, β ≈ 20°',
    period: `${PERIOD_MIN.toFixed(1)} min`,
    sunlight: `${SUNLIGHT_MIN.toFixed(0)} min`,
    eclipse: `${ECLIPSE_MIN.toFixed(1)} min`,
    battery: `2S4P Li-ion, 7.2 V nominal, ${POWER.batteryWh} Wh`,
    note: 'Illustrative reference case · simulated values, not flight data.',
} as const;

const sun = sampleAtPhase(0.76); // recharging, a few minutes after eclipse exit
const ecl = sampleAtPhase(0.68); // end of eclipse: lowest SOC of the orbit
const budget = orbitBudget('nominal');
const amps = (w: number, soc: number) => w / packVoltage(soc, w);
const sign = (v: number) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1);

export const TELEMETRY: TelemetryParameter[] = [
    { label: 'Eclipse state', sunlight: { value: 'SUNLIGHT', tone: 'solar' }, eclipse: { value: 'ECLIPSE', tone: 'orbit' }, source: 'Orbit propagation, sun sensors' },
    { label: 'Solar generation', sunlight: { value: `${sun.arrayW.toFixed(1)} W` }, eclipse: { value: `${ecl.arrayW.toFixed(1)} W` }, source: 'Array voltage and current sensors' },
    { label: 'Battery SOC', sunlight: { value: `${(sun.soc * 100).toFixed(0)} % · rising` }, eclipse: { value: `${(ecl.soc * 100).toFixed(0)} % · end of eclipse` }, source: 'Coulomb counting with voltage correction' },
    { label: 'Battery voltage', sunlight: { value: `${packVoltage(sun.soc, sun.batteryW).toFixed(2)} V` }, eclipse: { value: `${packVoltage(ecl.soc, ecl.batteryW).toFixed(2)} V` }, source: 'Pack voltage sense' },
    { label: 'Battery current', sunlight: { value: `${sign(amps(sun.batteryW, sun.soc))} A · charging` }, eclipse: { value: `${sign(amps(ecl.batteryW, ecl.soc))} A · discharging` }, source: 'Shunt current sensor' },
    { label: 'Battery temperature', sunlight: { value: '17 °C', tone: 'nominal' }, eclipse: { value: '6 °C · near 5 °C heater threshold', tone: 'fault' }, source: 'Thermistors on the pack' },
    { label: 'Bus voltage (5 V rail)', sunlight: { value: '5.01 V' }, eclipse: { value: '4.99 V' }, source: 'EPS rail monitors' },
    { label: 'Subsystem load', sunlight: { value: `${sun.loadW.toFixed(1)} W` }, eclipse: { value: `${ecl.loadW.toFixed(1)} W · payload off` }, source: 'Per-channel EPS current sensing' },
    { label: 'Telemetry availability', sunlight: { value: '100 % frames logged' }, eclipse: { value: '100 % frames logged' }, source: 'Onboard housekeeping log' },
    { label: 'Sensor health', sunlight: { value: 'NOMINAL · all channels', tone: 'nominal' }, eclipse: { value: 'NOMINAL · sun sensors masked', tone: 'nominal' }, source: 'Sensor self-test, cross-checks' },
    { label: 'Orbit energy margin', sunlight: { value: `${sign(budget.marginPct)} %`, tone: 'nominal' }, eclipse: { value: `${sign(budget.marginPct)} %`, tone: 'nominal' }, source: 'Derived: energy-balance model' },
];
