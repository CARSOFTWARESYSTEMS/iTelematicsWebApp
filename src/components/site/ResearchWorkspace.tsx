"use client";
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import styles from './ResearchWorkspace.module.css';
import ExternalLink from './ExternalLink';
import OrbitInstrument from './OrbitInstrument';
import SocChart from './SocChart';
import { MaturityBadge, type Maturity } from './blocks';
import {
    ECLIPSE_FRACTION,
    ECLIPSE_MIN,
    PERIOD_MIN,
    POWER,
    SCENARIOS,
    SUNLIGHT_MIN,
    healthOf,
    orbitBudget,
    simulate,
    type HealthState,
    type Scenario,
} from '@/lib/energy-model';
import { REFERENCE_CASE, TELEMETRY, type Reading } from '@/lib/reference-case';
import { EVIDENCE, LIMITATIONS, OPEN_QUESTIONS } from '@/lib/research';

const TABS = ['Mission', 'Energy', 'Telemetry', 'Faults', 'Evidence'] as const;
type Tab = (typeof TABS)[number];

const LEVELS: Maturity[] = ['Concept', 'Research', 'Simulation', 'Prototype', 'Experimental', 'Validated', 'Planned'];

// How each fault travels through the system: the source, then what it affects.
const PROPAGATION: Record<Exclude<Scenario, 'nominal'>, { source: string; path: string[]; unaffected?: string }> = {
    'solar-degradation': { source: 'Solar array', path: ['EPS input', 'Battery recharge', 'Energy margin'] },
    'heater-stuck': { source: 'Battery heater', path: ['Load demand', 'Battery discharge', 'Energy margin'] },
    'sun-sensor-fault': { source: 'Sun sensor', path: ['Telemetry', 'Health logic'], unaffected: 'Energy path unaffected' },
};

const signed = (v: number, digits = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}`;

function Metric({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
    return (
        <div className={styles.metric}>
            <dt className="label">{label}</dt>
            <dd className={`${styles.metricValue} tabular`}>{value}</dd>
            {note && <dd className={styles.metricNote}>{note}</dd>}
        </div>
    );
}

function Health({ label, state }: { label: string; state: HealthState }) {
    return (
        <div className={styles.metric}>
            <dt className="label">{label}</dt>
            <dd className={styles.metricValue}>
                <span className={`badge ${state === 'NOMINAL' ? 'state-nominal' : 'state-fault'}`}>{state}</span>
            </dd>
        </div>
    );
}

function Value({ reading }: { reading: Reading }) {
    return <span className={reading.tone ? `state-${reading.tone}` : undefined}>{reading.value}</span>;
}

export default function ResearchWorkspace() {
    const [tab, setTab] = useState<Tab>('Mission');
    const [scenario, setScenario] = useState<Exclude<Scenario, 'nominal'>>('solar-degradation');
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const nominal = simulate('nominal');
    const budget = orbitBudget('nominal');
    const faultSamples = simulate(scenario);
    const faultBudget = orbitBudget(scenario);
    const faultHealth = healthOf(scenario);
    const dod = ((POWER.loadEclipseW / POWER.etaEps) * (ECLIPSE_MIN / 60)) / POWER.batteryWh;
    const propagation = PROPAGATION[scenario];
    const maxWh = Math.max(budget.generatedWh, budget.requiredWh);

    const select = (name: Tab, i: number) => {
        setTab(name);
        tabRefs.current[i]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };

    const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
        const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!delta) return;
        e.preventDefault();
        const next = (i + delta + TABS.length) % TABS.length;
        select(TABS[next], next);
        tabRefs.current[next]?.focus();
    };

    const panel = (name: Tab, children: ReactNode) => (
        <section
            id={`ws-panel-${name}`}
            role="tabpanel"
            aria-labelledby={`ws-tab-${name}`}
            hidden={tab !== name}
            className={styles.panel}
            tabIndex={0}
        >
            {children}
        </section>
    );

    return (
        <div className={styles.workspace}>
            <div className={styles.rail}>
                <div role="tablist" aria-label="Research workspace" className={styles.tabs}>
                    {TABS.map((name, i) => (
                        <button
                            key={name}
                            ref={(el) => {
                                tabRefs.current[i] = el;
                            }}
                            type="button"
                            role="tab"
                            id={`ws-tab-${name}`}
                            aria-selected={tab === name}
                            aria-controls={`ws-panel-${name}`}
                            tabIndex={tab === name ? 0 : -1}
                            className={styles.tab}
                            onClick={() => select(name, i)}
                            onKeyDown={(e) => onKey(e, i)}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            {panel(
                'Mission',
                <>
                    <h3 className={styles.panelTitle}>Can the satellite generate, store and manage enough energy to complete its mission safely?</h3>
                    <OrbitInstrument scrubber idPrefix="ws-orbit" />
                    <details className="disclosure">
                        <summary>Reference case and assumptions</summary>
                        <div>
                            <dl className={styles.facts}>
                                <Metric label="Spacecraft" value={REFERENCE_CASE.spacecraft} />
                                <Metric label="Orbit" value={REFERENCE_CASE.orbit} />
                                <Metric label="Period" value={`${REFERENCE_CASE.period} · sunlight ${REFERENCE_CASE.sunlight} · eclipse ${REFERENCE_CASE.eclipse}`} />
                                <Metric label="Battery" value={REFERENCE_CASE.battery} />
                                <Metric label="Loads" value={`${POWER.loadSunW} W sunlight · ${POWER.loadEclipseW} W eclipse (payload off)`} />
                                <Metric label="Efficiencies" value={`EPS ${POWER.etaEps} · charge ${POWER.etaCharge}`} />
                            </dl>
                        </div>
                    </details>
                </>,
            )}

            {panel(
                'Energy',
                <>
                    <div className={styles.budget} aria-label="Orbit energy budget">
                        <div className={styles.budgetRow}>
                            <span className="label">Generated</span>
                            <span className={styles.bar}><i className={styles.barSolar} style={{ width: `${(budget.generatedWh / maxWh) * 100}%` }} /></span>
                            <span className="tabular">{budget.generatedWh.toFixed(1)} Wh</span>
                        </div>
                        <div className={styles.budgetRow}>
                            <span className="label">Required</span>
                            <span className={styles.bar}><i className={styles.barLoad} style={{ width: `${(budget.requiredWh / maxWh) * 100}%` }} /></span>
                            <span className="tabular">{budget.requiredWh.toFixed(1)} Wh</span>
                        </div>
                    </div>
                    <div className={styles.split}>
                        <div>
                            <h3 className={styles.panelTitle}>Battery state of charge, three orbits</h3>
                            <SocChart
                                samples={nominal}
                                seriesLabel="Nominal"
                                description={`Nominal battery state of charge over three orbits. It falls to ${(budget.minSoc * 100).toFixed(1)} % at the end of each eclipse and recovers in sunlight.`}
                            />
                        </div>
                        <aside className={styles.side}>
                            <dl className={styles.metrics}>
                                <Metric label="Orbit energy margin" value={`${signed(budget.marginPct)} %`} />
                                <Metric label="Depth of discharge" value={`${(dod * 100).toFixed(1)} %`} />
                                <Metric label="Lowest SOC" value={`${(budget.minSoc * 100).toFixed(1)} %`} />
                            </dl>
                            <details className="disclosure">
                                <summary>Method and equations</summary>
                                <div className={styles.equations}>
                                    <p><span className="mono">T = 2π √(a³ / μ) = {PERIOD_MIN.toFixed(1)} min</span></p>
                                    <p><span className="mono">f<sub>E</sub> = (1/180°) · cos⁻¹[√(h² + 2R<sub>E</sub>h) / ((R<sub>E</sub> + h) cos β)] = {ECLIPSE_FRACTION.toFixed(3)}</span></p>
                                    <p><span className="mono">E<sub>gen</sub> = P<sub>SA</sub> · t<sub>sun</sub> = {POWER.arrayW} W × {(SUNLIGHT_MIN / 60).toFixed(2)} h = {budget.generatedWh.toFixed(1)} Wh</span></p>
                                    <p><span className="mono">E<sub>req</sub> = (P<sub>sun</sub>t<sub>sun</sub> + P<sub>ecl</sub>t<sub>ecl</sub> / η<sub>batt</sub>) / η<sub>EPS</sub> = {budget.requiredWh.toFixed(1)} Wh</span></p>
                                    <p><span className="mono">M = (E<sub>gen</sub> − E<sub>req</sub>) / E<sub>req</sub> = {signed(budget.marginPct)} %</span></p>
                                    <p><span className="mono">SOC(t + Δt) = SOC(t) + η<sub>c</sub> · P<sub>batt</sub> · Δt / E<sub>batt</sub></span></p>
                                    <p className={styles.eqNote}>h = 550 km, R<sub>E</sub> = 6378 km, β = 20°, η<sub>batt</sub> = η<sub>EPS</sub> · η<sub>c</sub>. Charge tapers linearly above 95 % SOC.</p>
                                </div>
                            </details>
                        </aside>
                    </div>
                </>,
            )}

            {panel(
                'Telemetry',
                <>
                    <ol className={styles.stream} aria-label="Telemetry path">
                        {['Sensors', 'Onboard computer', 'Radio', 'Ground'].map((node, i, all) => (
                            <li key={node}>
                                <span className={styles.streamNode}>{node}</span>
                                {i < all.length - 1 && <span className={styles.streamLink} aria-hidden="true"><i /><i /><i /></span>}
                            </li>
                        ))}
                    </ol>
                    <table className={`data-table ${styles.telemetry}`}>
                        <thead>
                            <tr>
                                <th scope="col">Parameter</th>
                                <th scope="col">Sunlight</th>
                                <th scope="col">Eclipse</th>
                                <th scope="col" className={styles.sourceCol}>Source</th>
                            </tr>
                        </thead>
                        <tbody>
                            {TELEMETRY.map((p) => (
                                <tr key={p.label}>
                                    <th scope="row">{p.label}</th>
                                    <td className="mono tabular"><Value reading={p.sunlight} /></td>
                                    <td className="mono tabular"><Value reading={p.eclipse} /></td>
                                    <td className={styles.sourceCol}>{p.source}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className={styles.footnote}>{REFERENCE_CASE.note}</p>
                </>,
            )}

            {panel(
                'Faults',
                <>
                    <fieldset className={styles.scenarios}>
                        <legend className="label">Fault scenario</legend>
                        {(Object.keys(PROPAGATION) as (keyof typeof PROPAGATION)[]).map((s) => (
                            <label key={s} className={styles.scenario}>
                                <input type="radio" name="ws-scenario" value={s} checked={scenario === s} onChange={() => setScenario(s)} />
                                <span>{SCENARIOS[s].label}</span>
                            </label>
                        ))}
                    </fieldset>

                    <ol className={styles.propagation} aria-label="Fault propagation">
                        <li className={styles.source}><span className="badge state-fault">Fault</span>{propagation.source}</li>
                        {propagation.path.map((step, i) => (
                            <li key={step} style={{ ['--i' as string]: i }}>{step}</li>
                        ))}
                        {propagation.unaffected && <li className={styles.unaffected}><span className="badge state-nominal">OK</span>{propagation.unaffected}</li>}
                    </ol>

                    <div className={styles.split}>
                        <div>
                            <SocChart
                                samples={faultSamples}
                                reference={nominal}
                                seriesLabel={SCENARIOS[scenario].label}
                                description={`${SCENARIOS[scenario].label}: battery state of charge over three orbits compared with nominal. ${SCENARIOS[scenario].summary}`}
                            />
                            <p className={styles.summary}>{SCENARIOS[scenario].summary}</p>
                        </div>
                        <aside className={styles.side}>
                            <dl className={styles.metrics}>
                                <Health label="Energy health" state={faultHealth.energy} />
                                <Health label="Sensor health" state={faultHealth.sensors} />
                                <Metric label="Orbit energy margin" value={`${signed(faultBudget.marginPct)} %`} note={`nominal ${signed(budget.marginPct)} %`} />
                                <Metric label="SOC change / orbit" value={`${signed(faultBudget.socChangePerOrbit * 100, 2)} %`} />
                            </dl>
                        </aside>
                    </div>
                </>,
            )}

            {panel(
                'Evidence',
                <>
                    <ol className={styles.ladder} aria-label="Evidence items by maturity">
                        {LEVELS.map((level) => {
                            const count = EVIDENCE.filter((e) => e.status === level).length;
                            return (
                                <li key={level} className={count ? styles.has : ''}>
                                    <span className={`${styles.count} tabular`}>{count}</span>
                                    <span className={styles.level}>{level}</span>
                                </li>
                            );
                        })}
                    </ol>
                    <ul className={styles.evidence}>
                        {EVIDENCE.map((e) => (
                            <li key={e.item}>
                                <div>
                                    <p className={styles.evidenceItem}>{e.item}</p>
                                    <p className={styles.evidenceText}>
                                        {e.contents}{' '}
                                        {e.link && <ExternalLink href={e.link.href} className="inline-link">{e.link.label}</ExternalLink>}
                                    </p>
                                </div>
                                <MaturityBadge level={e.status} />
                            </li>
                        ))}
                    </ul>
                    <p className={styles.footnote}>Nothing here is production-ready or flight-qualified. No result is flight evidence.</p>
                    <details className="disclosure">
                        <summary>Limitations and known gaps</summary>
                        <div>
                            <ul className={styles.list}>{LIMITATIONS.map((l) => <li key={l}>{l}</li>)}</ul>
                        </div>
                    </details>
                    <details className="disclosure" id="open-questions">
                        <summary>Open research questions</summary>
                        <div>
                            <ol className={styles.list}>{OPEN_QUESTIONS.map((q) => <li key={q}>{q}</li>)}</ol>
                        </div>
                    </details>
                </>,
            )}
        </div>
    );
}
