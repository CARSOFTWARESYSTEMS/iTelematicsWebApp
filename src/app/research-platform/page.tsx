import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import Link from 'next/link';
import styles from './page.module.css';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import ExternalLink from '@/components/site/ExternalLink';
import MissionStateExplorer from '@/components/site/MissionStateExplorer';
import { CtaBand, MaturityBadge, PageHero, SystemArchitecture, type Maturity } from '@/components/site/blocks';
import { REFERENCE_CASE, TELEMETRY } from '@/lib/reference-case';
import { CORE_QUESTION, FLAGSHIP, RESOURCES } from '@/lib/site';

const PATH = '/research-platform';
const TITLE = 'Satellite Energy & Telemetry Intelligence';
const DESCRIPTION =
    'Satellite Energy & Telemetry Intelligence: architecture, telemetry, equations, engineering evidence and open research questions on spacecraft energy.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

const EVIDENCE: { item: string; contents: string; status: Maturity; link?: { label: string; href: string } }[] = [
    { item: 'System architecture', contents: 'Energy and information paths, subsystem interfaces and the decision feedback loop (this page).', status: 'Research' },
    { item: 'Reference case & assumptions', contents: '6U Earth-observation CubeSat in a 550 km sun-synchronous orbit, with efficiencies and battery sizing (this page).', status: 'Research' },
    { item: 'Reference equations & worked example', contents: 'Orbit period, eclipse fraction, array power, orbit energy balance, depth of discharge and SOC (this page).', status: 'Research' },
    { item: 'Telemetry parameter set', contents: 'Eleven parameters with their purpose and sensor source (this page).', status: 'Research' },
    {
        item: 'CubeTwin energy simulator (v0.01)',
        contents: 'Solar generation, subsystem loads, battery energy, SOC, voltage and temperature, simplified eclipse and CSV telemetry export. Educational R&D prototype; simulated data, not flight software.',
        status: 'Simulation',
        link: { label: 'Open CubeTwin', href: RESOURCES.cubeTwin.href },
    },
    { item: 'Fault experiments', contents: 'Solar-array degradation and stuck-on heater injection in CubeTwin, with simulated “observed” versus true SOC.', status: 'Experimental' },
    { item: 'Requirements', contents: 'Verifiable energy, telemetry and health requirements traced to the architecture.', status: 'Concept' },
    { item: 'Scenario catalogue', contents: 'Structured nominal and abnormal test cases across β angles, load profiles and faults.', status: 'Planned' },
    { item: 'Battery SOH / RUL estimation', contents: 'Tracking battery degradation and remaining useful life from telemetry.', status: 'Planned' },
    { item: 'Health classification & anomaly detection', contents: 'Context-aware nominal / warning / fault logic, including distinguishing sensor faults from subsystem faults.', status: 'Planned' },
    { item: 'Hardware telemetry', contents: 'Measured telemetry from an educational flatsat engineering model.', status: 'Planned' },
    { item: 'Validation', contents: 'Comparison of models and simulations against independent reference data.', status: 'Planned' },
];

const ASSUMPTIONS = [
    ['Spacecraft', REFERENCE_CASE.spacecraft],
    ['Orbit', `${REFERENCE_CASE.orbit}; circular`],
    ['Orbit period', `${REFERENCE_CASE.period}; sunlight ${REFERENCE_CASE.sunlight}, eclipse ${REFERENCE_CASE.eclipse}`],
    ['Array output', '41.8 W orbit-average while sunlit (attitude not modelled)'],
    ['Loads', '22.0 W in sunlight; 14.0 W in eclipse with the payload off'],
    ['Battery', `${REFERENCE_CASE.battery}; capacity independent of temperature and age`],
    ['Efficiencies', 'EPS conversion 0.90; battery round trip 0.85'],
] as const;

const LIMITATIONS = [
    'One reference case: no seasonal variation of β angle or eclipse duration.',
    'Array power is an orbit average; attitude, pointing and shadowing by the spacecraft are not modelled.',
    'Loads are constant within each phase; ground-pass communication loads are not modelled.',
    'Battery capacity is fixed: no temperature dependence, ageing, SOH or remaining-useful-life model yet.',
    'Thermal behaviour is reduced to a heater threshold.',
    'CubeTwin represents eclipse as a configurable interval rather than computed geometry.',
    'Nothing is yet calibrated against a physical test article or measured mission data.',
];

const OPEN_QUESTIONS = [
    'How does eclipse duration affect satellite battery SOC?',
    'How should loads be prioritised during low-energy conditions?',
    'How can telemetry identify early battery degradation?',
    'How should solar-generation uncertainty be represented?',
    'How can sensor anomalies be distinguished from true subsystem faults?',
    'How should mission energy margins be calculated?',
    'How can telemetry support safe-mode decisions?',
];

const THEMES = [
    ['Energy', ['Solar generation modelling', 'Eclipse energy analysis', 'EPS behaviour', 'Power budgeting', 'Load prioritisation', 'Mission energy margin']],
    ['Battery', ['Satellite battery SOC', 'Satellite battery SOH', 'Battery temperature']],
    ['Telemetry & sensing', ['Sensor telemetry', 'Telemetry anomaly detection', 'Ground telemetry visualisation']],
    ['Health & decisions', ['Fault injection', 'Health monitoring', 'Safe mode', 'Mission decision support']],
    ['Digital twins', ['Satellite digital twins']],
] as const;

const ROADMAP: { phase: string; text: string; status: Maturity }[] = [
    { phase: 'Reference models', text: 'Architecture, equations, parameter set and assumptions.', status: 'Research' },
    { phase: 'Simulation scenarios', text: 'A scenario catalogue on CubeTwin across β angles, loads and injected faults.', status: 'Simulation' },
    { phase: 'Health intelligence', text: 'Context-aware health classification and telemetry anomaly detection.', status: 'Planned' },
    { phase: 'Hardware telemetry', text: 'Instrumented measurements on an educational flatsat.', status: 'Planned' },
    { phase: 'Validation & reporting', text: 'Comparison with reference data and published technical reports.', status: 'Planned' },
];

export default function ResearchPlatformPage() {
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, breadcrumbs: [{ name: 'Research Platform', path: PATH }] })} />
            <PageHero
                eyebrow="Flagship research platform"
                title={FLAGSHIP}
                lead="An intern-driven Satellite Engineering research environment for understanding how spacecraft generate, store, distribute, monitor and intelligently manage energy throughout a mission."
                breadcrumbs={[{ name: 'Research Platform', path: PATH }]}
            >
                <blockquote className={styles.question}>
                    <span className={styles.questionLabel}>Core engineering question</span>
                    <p>{CORE_QUESTION}</p>
                </blockquote>
                <p className={styles.status}>
                    <span>Current maturity</span>
                    <MaturityBadge level="Research" />
                    <MaturityBadge level="Simulation" />
                    <span className={styles.statusNote}>Not flight-qualified. No result here is flight evidence.</span>
                </p>
            </PageHero>

            <section className="section" data-analytics-section="explorer">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Mission state</p>
                        <h2>Sunlight and eclipse, seen through telemetry</h2>
                        <p>Switch state to see how the energy path changes and which telemetry tells you so.</p>
                    </div>
                    <MissionStateExplorer idPrefix="rp" />
                </div>
            </section>

            <section className="section" data-analytics-section="architecture">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Architecture</p>
                        <h2>Subsystems in interaction</h2>
                    </div>
                    <SystemArchitecture />
                </div>
            </section>

            <section className="section" data-analytics-section="parameters">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Telemetry modelled</p>
                        <h2>Engineering parameters and why they matter</h2>
                    </div>
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th scope="col">Parameter</th>
                                    <th scope="col">Why it matters</th>
                                    <th scope="col">Typical source</th>
                                </tr>
                            </thead>
                            <tbody>
                                {TELEMETRY.map((p) => (
                                    <tr key={p.label}>
                                        <td>{p.label}</td>
                                        <td>{p.why}</td>
                                        <td>{p.source}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="section" data-analytics-section="method">
                <div className={`container ${styles.method}`}>
                    <div>
                        <p className="eyebrow">Reference case</p>
                        <h2>Assumptions</h2>
                        <dl className={styles.assumptions}>
                            {ASSUMPTIONS.map(([k, v]) => (
                                <div key={k}>
                                    <dt>{k}</dt>
                                    <dd>{v}</dd>
                                </div>
                            ))}
                        </dl>
                        <p className={styles.note}>{REFERENCE_CASE.note}</p>
                    </div>
                    <div>
                        <p className="eyebrow">Worked example</p>
                        <h2>Equations</h2>
                        <ol className={styles.equations}>
                            <li>
                                <p className={styles.eqName}>Orbit period</p>
                                <p className={styles.eq}>T = 2π √(a³ / μ) = 95.6 min</p>
                                <p className={styles.eqWhere}>a = 6 928 km, μ = 398 600 km³/s²</p>
                            </li>
                            <li>
                                <p className={styles.eqName}>Eclipse fraction (circular orbit)</p>
                                <p className={styles.eq}>f<sub>E</sub> = (1/180°) · cos⁻¹[ √(h² + 2R<sub>E</sub>h) / ((R<sub>E</sub> + h) cos β) ] = 0.364</p>
                                <p className={styles.eqWhere}>h = 550 km, R<sub>E</sub> = 6 378 km, β = 20° → 34.8 min of eclipse</p>
                            </li>
                            <li>
                                <p className={styles.eqName}>Array power</p>
                                <p className={styles.eq}>P<sub>SA</sub> = S · A · η<sub>cell</sub> · cos θ · (1 − d)</p>
                                <p className={styles.eqWhere}>S = 1361 W/m², θ = sun incidence angle, d = accumulated degradation</p>
                            </li>
                            <li>
                                <p className={styles.eqName}>Energy required per orbit</p>
                                <p className={styles.eq}>E<sub>req</sub> = (P<sub>sun</sub>t<sub>sun</sub> + P<sub>ecl</sub>t<sub>ecl</sub> / η<sub>batt</sub>) / η<sub>EPS</sub> = 35.5 Wh</p>
                                <p className={styles.eqWhere}>(22.0 W × 1.02 h + 14.0 W × 0.58 h / 0.85) / 0.90</p>
                            </li>
                            <li>
                                <p className={styles.eqName}>Mission energy margin</p>
                                <p className={styles.eq}>M = (E<sub>gen</sub> − E<sub>req</sub>) / E<sub>req</sub> ≈ +20 %</p>
                                <p className={styles.eqWhere}>E<sub>gen</sub> = 41.8 W × 1.02 h = 42.5 Wh</p>
                            </li>
                            <li>
                                <p className={styles.eqName}>Depth of discharge</p>
                                <p className={styles.eq}>DoD = P<sub>ecl</sub>t<sub>ecl</sub> / (η<sub>EPS</sub> · E<sub>batt</sub>) ≈ 10.6 %</p>
                                <p className={styles.eqWhere}>14.0 W × 0.58 h / (0.90 × 86 Wh)</p>
                            </li>
                            <li>
                                <p className={styles.eqName}>State of charge (coulomb counting)</p>
                                <p className={styles.eq}>SOC(t + Δt) = SOC(t) + η<sub>c</sub> · I · Δt / Q<sub>nom</sub></p>
                                <p className={styles.eqWhere}>I &gt; 0 while charging; corrected against voltage at rest</p>
                            </li>
                        </ol>
                    </div>
                </div>
            </section>

            <section className="section" id="evidence" data-analytics-section="engineering-evidence">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Engineering evidence</p>
                        <h2>What exists, what is experimental, what is planned</h2>
                        <p>Every item carries an explicit maturity label. Nothing here is production-ready or flight-qualified.</p>
                    </div>
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th scope="col">Evidence</th>
                                    <th scope="col">Contents</th>
                                    <th scope="col">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {EVIDENCE.map((e) => (
                                    <tr key={e.item}>
                                        <td>{e.item}</td>
                                        <td>
                                            {e.contents}
                                            {e.link && (
                                                <>
                                                    {' '}
                                                    <ExternalLink href={e.link.href} className={styles.inlineLink}>{e.link.label}</ExternalLink>
                                                </>
                                            )}
                                        </td>
                                        <td><MaturityBadge level={e.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <h3 className={styles.subhead}>Limitations and known gaps</h3>
                    <ul className={styles.list}>
                        {LIMITATIONS.map((l) => <li key={l}>{l}</li>)}
                    </ul>
                </div>
            </section>

            <section className="section" id="open-questions" data-analytics-section="open-questions">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Open research questions</p>
                        <h2>Questions we want answered, with evidence</h2>
                        <p>Each can become an internship research project, a student thesis topic or a collaboration.</p>
                    </div>
                    <ol className={styles.questions}>
                        {OPEN_QUESTIONS.map((q, i) => (
                            <li key={q}>
                                <span className="mono">Q{String(i + 1).padStart(2, '0')}</span>
                                <p>{q}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section className="section" data-analytics-section="themes-roadmap">
                <div className={`container ${styles.method}`}>
                    <div>
                        <p className="eyebrow">Research themes</p>
                        <h2>All within Satellite Engineering</h2>
                        <div className={styles.themes}>
                            {THEMES.map(([group, items]) => (
                                <div key={group}>
                                    <h3>{group}</h3>
                                    <ul>
                                        {items.map((t) => <li key={t}>{t}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="eyebrow">Roadmap</p>
                        <h2>Research phases</h2>
                        <ol className={styles.roadmap}>
                            {ROADMAP.map((r, i) => (
                                <li key={r.phase}>
                                    <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                                    <div>
                                        <h3>{r.phase} <MaturityBadge level={r.status} /></h3>
                                        <p>{r.text}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </section>

            <section className="section" data-analytics-section="collaboration">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Collaboration sought</p>
                        <h2>Where reviewers and contributors help most</h2>
                    </div>
                    <div className="grid grid-3">
                        <div className="card">
                            <h3>Researchers &amp; space scientists</h3>
                            <p>Review the assumptions, equations and simulation method; propose research questions.</p>
                        </div>
                        <div className="card">
                            <h3>Professors</h3>
                            <p>Co-guide intern research and help design experiments and validation.</p>
                        </div>
                        <div className="card">
                            <h3>Industry engineers &amp; architects</h3>
                            <p>Share practical requirements, reference data and verification perspectives.</p>
                        </div>
                    </div>
                </div>
            </section>

            <CtaBand
                title="Review, guide or contribute"
                text="Research participation and collaboration enquiries are welcome from academia, industry and the global space ecosystem."
            >
                <Link href="/contact?enquiry=research" className="btn btn-primary" data-track="research_collaboration_click">
                    Discuss Research Collaboration
                </Link>
                <Link href="/contact?enquiry=internship" className="btn btn-secondary" data-track="internship_apply_click">
                    Apply for Internship
                </Link>
            </CtaBand>
        </>
    );
}
