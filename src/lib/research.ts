import type { Maturity } from '@/components/site/blocks';
import { RESOURCES } from './site';

export type EvidenceItem = { item: string; contents: string; status: Maturity; link?: { label: string; href: string } };

/** Engineering evidence with conservative maturity labels. Nothing here is flight-qualified. */
export const EVIDENCE: EvidenceItem[] = [
    { item: 'System architecture', contents: 'Energy and information paths, subsystem interfaces and the decision loop.', status: 'Research' },
    { item: 'Reference case & equations', contents: 'Orbit geometry, eclipse fraction, energy balance, depth of discharge and SOC, published here.', status: 'Research' },
    { item: 'Orbit energy model', contents: 'The simulation behind this page: sunlight and eclipse, loads, battery SOC and fault scenarios.', status: 'Simulation' },
    {
        item: 'CubeTwin energy simulator (v0.01)',
        contents: 'Educational prototype: solar generation, loads, battery SOC, voltage and temperature, CSV telemetry export.',
        status: 'Simulation',
        link: { label: 'Open CubeTwin', href: RESOURCES.cubeTwin.href },
    },
    { item: 'Fault experiments', contents: 'Array degradation, stuck-on heater and sensor-fault scenarios.', status: 'Experimental' },
    { item: 'Requirements', contents: 'Verifiable energy, telemetry and health requirements traced to the architecture.', status: 'Concept' },
    { item: 'Battery SOH / RUL estimation', contents: 'Degradation and remaining useful life from telemetry.', status: 'Planned' },
    { item: 'Health classification', contents: 'Context-aware nominal / warning / fault logic and anomaly detection.', status: 'Planned' },
    { item: 'Hardware telemetry', contents: 'Measured telemetry from an educational flatsat engineering model.', status: 'Planned' },
    { item: 'Validation', contents: 'Comparison of models and simulations against independent reference data.', status: 'Planned' },
];

export const LIMITATIONS = [
    'One reference case: no seasonal variation of β angle or eclipse duration.',
    'Array power is an orbit average; attitude and self-shadowing are not modelled.',
    'Loads are constant within each phase; ground-pass radio loads are not modelled.',
    'Battery capacity is fixed: no temperature dependence, ageing, SOH or RUL model yet.',
    'Nothing is yet calibrated against a physical test article or measured mission data.',
];

export const OPEN_QUESTIONS = [
    'How does eclipse duration affect satellite battery SOC?',
    'How should loads be prioritised during low-energy conditions?',
    'How can telemetry identify early battery degradation?',
    'How should solar-generation uncertainty be represented?',
    'How can sensor anomalies be distinguished from true subsystem faults?',
    'How should mission energy margins be calculated?',
    'How can telemetry support safe-mode decisions?',
];
