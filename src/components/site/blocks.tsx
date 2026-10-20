import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './blocks.module.css';
import ExternalLink from './ExternalLink';
import { ECOSYSTEM, RESOURCES, type EcosystemOrg } from '@/lib/site';

/* ---------- Page hero with visible breadcrumbs ---------- */

type Crumb = { name: string; path: string };

export function PageHero({
    eyebrow,
    title,
    lead,
    breadcrumbs,
    children,
}: {
    eyebrow: string;
    title: ReactNode;
    lead?: ReactNode;
    breadcrumbs?: Crumb[];
    children?: ReactNode;
}) {
    return (
        <section className={styles.pageHero}>
            <div className="container">
                {breadcrumbs && (
                    <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
                        <ol>
                            <li><Link href="/">Home</Link></li>
                            {breadcrumbs.map((crumb, i) => (
                                <li key={crumb.path}>
                                    {i === breadcrumbs.length - 1 ? (
                                        <span aria-current="page">{crumb.name}</span>
                                    ) : (
                                        <Link href={crumb.path}>{crumb.name}</Link>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </nav>
                )}
                <p className="eyebrow">{eyebrow}</p>
                <h1 className={styles.pageTitle}>{title}</h1>
                {lead && <p className={`lead ${styles.pageLead}`}>{lead}</p>}
                {children}
            </div>
        </section>
    );
}

/* ---------- Maturity labels ---------- */

export type Maturity = 'Concept' | 'Research' | 'Simulation' | 'Prototype' | 'Experimental' | 'Validation' | 'Planned';

const MATURITY_TONE: Record<Maturity, string> = {
    Concept: 'state-eclipse',
    Research: 'state-charging',
    Simulation: 'state-charging',
    Prototype: 'state-nominal',
    Experimental: 'state-warning',
    Validation: 'state-nominal',
    Planned: '',
};

export function MaturityBadge({ level }: { level: Maturity }) {
    return <span className={`badge ${MATURITY_TONE[level]}`}>{level}</span>;
}

/* ---------- Mission flow (compact, homepage) ---------- */

const COMPACT_FLOW = [
    ['Sun', 'Energy source'],
    ['Solar', 'Generation'],
    ['EPS', 'Regulation'],
    ['Battery', 'Storage'],
    ['Loads', 'Consumption'],
    ['Sensors', 'Measurement'],
    ['Telemetry', 'Communication'],
    ['Health', 'Assessment'],
    ['Mission', 'Decision'],
] as const;

export function MissionFlow() {
    return (
        <ol className={styles.missionFlow} aria-label="Satellite energy and information flow">
            {COMPACT_FLOW.map(([name, role], i) => (
                <li key={name}>
                    <span className={`mono ${styles.step}`}>{String(i + 1).padStart(2, '0')}</span>
                    <span className={styles.flowName}>{name}</span>
                    <span className={styles.flowRole}>{role}</span>
                </li>
            ))}
        </ol>
    );
}

/* ---------- Full system architecture (system of systems) ---------- */

type ArchStep = { name: string; text: string };

const ENERGY_PATH: ArchStep[] = [
    { name: 'Sun', text: 'About 1361 W/m² above the atmosphere (the solar constant), available only outside Earth’s shadow.' },
    { name: 'Solar array', text: 'Photovoltaic cells convert sunlight into electrical power. Output depends on sun angle, cell temperature and degradation over the mission.' },
    { name: 'Electrical Power System (EPS)', text: 'Tracks the array’s maximum power point, charges the battery and distributes protected, regulated power rails to every subsystem.' },
    { name: 'Battery', text: 'Stores surplus energy in sunlight and carries the spacecraft through eclipse. Depth of discharge per orbit drives battery lifetime.' },
    { name: 'Spacecraft loads', text: 'Onboard computer, ADCS, communications, payload and heaters. Scheduling them is the main lever on energy margin.' },
];

const INFORMATION_PATH: ArchStep[] = [
    { name: 'Sensors', text: 'Voltage, current and temperature on arrays, battery and rails, plus sun sensors, magnetometers, radiation and payload sensors.' },
    { name: 'Onboard computer', text: 'Samples sensors, checks limits, runs safe-mode logic and packs housekeeping telemetry.' },
    { name: 'Telemetry', text: 'Housekeeping frames are stored onboard and downlinked during ground-station passes.' },
    { name: 'Ground / engineering analysis', text: 'Engineers trend telemetry, compare it with models and look for drift, faults and anomalies.' },
    { name: 'Spacecraft health', text: 'A per-subsystem judgement (nominal, warning or fault) that accounts for context such as eclipse.' },
    { name: 'Mission decision', text: 'Continue, reschedule loads, enter safe mode or change operations. Decisions feed back into the loads.' },
];

function ArchColumn({ title, steps, offset }: { title: string; steps: ArchStep[]; offset: number }) {
    return (
        <div className={styles.archColumn}>
            <h3 className={styles.archTitle}>{title}</h3>
            <ol className={styles.arch} start={offset + 1}>
                {steps.map((step, i) => (
                    <li key={step.name}>
                        <span className={`mono ${styles.step}`}>{String(offset + i + 1).padStart(2, '0')}</span>
                        <div>
                            <h4 className={styles.archName}>{step.name}</h4>
                            <p>{step.text}</p>
                        </div>
                    </li>
                ))}
            </ol>
        </div>
    );
}

export function SystemArchitecture() {
    return (
        <div>
            <div className={styles.archGrid}>
                <ArchColumn title="Energy path" steps={ENERGY_PATH} offset={0} />
                <ArchColumn title="Information path" steps={INFORMATION_PATH} offset={ENERGY_PATH.length} />
            </div>
            <p className={styles.loop}>
                <span className="mono" aria-hidden="true">↺</span> The paths meet at the loads: sensors measure what the
                energy path is doing, and mission decisions change which loads run. Satellite Engineering is the
                engineering of that loop, a system of systems.
            </p>
        </div>
    );
}

/* ---------- Engineering resources ---------- */

function CoursePreview() {
    const gates = ['SRR', 'PDR', 'CDR', 'TRR', 'ORR', 'MRR'];
    return (
        <svg viewBox="0 0 320 120" className={styles.preview} aria-hidden="true">
            <line x1="24" y1="84" x2="296" y2="84" stroke="currentColor" strokeOpacity="0.3" />
            {gates.map((g, i) => {
                const x = 24 + i * 54.4;
                return (
                    <g key={g}>
                        <circle cx={x} cy="84" r="5" fill="#050B12" stroke="#22D3EE" strokeWidth="1.5" />
                        <text x={x} y="106" textAnchor="middle" fontSize="10" fill="#94A3B8" fontFamily="monospace">{g}</text>
                    </g>
                );
            })}
            {['Orbit', 'Power', 'ADCS', 'RF', 'Avionics'].map((s, i) => (
                <g key={s}>
                    <rect x={24 + i * 56} y="22" width="48" height="30" rx="4" fill="none" stroke="#3B82F6" strokeOpacity="0.7" />
                    <text x={48 + i * 56} y="41" textAnchor="middle" fontSize="9" fill="#CBD5E1" fontFamily="monospace">{s}</text>
                </g>
            ))}
        </svg>
    );
}

function SatellitePreview() {
    return (
        <svg viewBox="0 0 320 120" className={styles.preview} aria-hidden="true">
            <ellipse cx="160" cy="60" rx="140" ry="40" fill="none" stroke="#94A3B8" strokeOpacity="0.25" strokeDasharray="3 5" />
            <g stroke="#22D3EE" strokeWidth="1.3" fill="none">
                <rect x="140" y="42" width="40" height="36" rx="3" fill="#0B1520" />
                <line x1="140" y1="60" x2="122" y2="60" />
                <line x1="180" y1="60" x2="198" y2="60" />
            </g>
            <g stroke="#3B82F6" strokeWidth="1.2" fill="rgba(59,130,246,0.12)">
                <rect x="66" y="48" width="56" height="24" />
                <rect x="198" y="48" width="56" height="24" />
            </g>
            <g stroke="#3B82F6" strokeOpacity="0.6">
                {[80, 94, 108, 212, 226, 240].map((x) => <line key={x} x1={x} y1="48" x2={x} y2="72" />)}
            </g>
            <circle cx="160" cy="84" r="3" fill="#22D3EE" />
        </svg>
    );
}

export function ResourceCards() {
    const items = [
        { ...RESOURCES.satelliteEngineering, Preview: CoursePreview, tag: 'Course' },
        { ...RESOURCES.interactive3d, Preview: SatellitePreview, tag: 'Interactive' },
    ];
    return (
        <div className="grid grid-2">
            {items.map(({ name, href, cta, description, detail, Preview, tag }) => (
                <article key={name} className={`card ${styles.resource}`}>
                    <div className={styles.previewFrame}>
                        <Preview />
                    </div>
                    <span className="badge">{tag}</span>
                    <h3>{name}</h3>
                    <p>{description}</p>
                    <p className={styles.resourceDetail}>{detail}</p>
                    <ExternalLink href={href} className="btn btn-secondary" trackName={cta}>
                        {cta} →
                    </ExternalLink>
                </article>
            ))}
        </div>
    );
}

/* ---------- Ecosystem ---------- */

function OrgLinks({ org }: { org: EcosystemOrg }) {
    return (
        <div className={styles.orgLinks}>
            {org.links.map((link) =>
                link.kind === 'internal' ? (
                    <Link key={link.href} href={link.href} className="text-link">
                        {link.label} →
                    </Link>
                ) : (
                    <ExternalLink key={link.href} href={link.href} className="text-link" trackName={`${org.name} · ${link.label}`}>
                        {link.label} ↗
                    </ExternalLink>
                ),
            )}
        </div>
    );
}

export function EcosystemGrid({ compact = false }: { compact?: boolean }) {
    return (
        <ul className={`${styles.ecosystem} ${compact ? styles.ecosystemCompact : ''}`}>
            {ECOSYSTEM.map((org) => (
                <li key={org.name} className={styles.org}>
                    <p className={`mono ${styles.orgLabel}`}>{org.relationshipLabel}</p>
                    <h3>{org.name}</h3>
                    {!compact && <p>{org.summary}</p>}
                    {!compact && <p className={styles.orgRelationship}>{org.relationship}</p>}
                    <OrgLinks org={org} />
                </li>
            ))}
        </ul>
    );
}

/* ---------- Closing call to action ---------- */

export function CtaBand({ title, text, children }: { title: string; text: string; children: ReactNode }) {
    return (
        <section className="section">
            <div className={`container ${styles.ctaBand}`}>
                <div>
                    <h2>{title}</h2>
                    <p>{text}</p>
                </div>
                <div className="actions">{children}</div>
            </div>
        </section>
    );
}
