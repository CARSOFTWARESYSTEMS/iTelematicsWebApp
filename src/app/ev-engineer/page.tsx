import type { Metadata } from 'next';
import { Fragment } from 'react';
import styles from './page.module.css';
import { pageMetadata } from '@/lib/metadata';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import ExternalLink from '@/components/site/ExternalLink';
import Feature, { EvLink, type Cta } from '@/components/ev/Feature';
import HeroSystems from '@/components/ev/HeroSystems';
import LocalNav from '@/components/ev/LocalNav';
import {
    AerospaceVisual,
    AqipVisual,
    CubeTwinVisual,
    RocketVisual,
    SatelliteSchematicVisual,
    SpaceOrbitVisual,
    StationVisual,
} from '@/components/ev/space-visuals';
import {
    BatteryVisual,
    HealthVisual,
    Lab3dGlyph,
    LabCellsGlyph,
    LabOrbitGlyph,
    LabRocketGlyph,
    MobilityVisual,
    PackBuildVisual,
    SafetyVisual,
} from '@/components/ev/battery-visuals';
import { EV_DOMAINS, EV_HOME, EV_PERSON, EV_URL, PARTNERS, PATHWAYS, PATHWAYS_INTRO, RESEARCH_INDEX } from '@/lib/ev-engineer';
import { SITE } from '@/lib/site';

const PATH = '/ev-engineer';
const TITLE = 'EV.ENGINEER™ | Energy, Battery, Space, Aerospace & Digital Twins';
const DESCRIPTION =
    'Explore EV.ENGINEER™ research and engineering across EV Battery Intelligence, Energy Systems, Space, Aerospace, Digital Twins, Cybersecurity and engineering education.';

export const metadata: Metadata = pageMetadata({
    path: PATH,
    title: TITLE,
    description: DESCRIPTION,
    absoluteTitle: true,
    image: { url: `${PATH}/opengraph-image`, width: 1200, height: 630, alt: 'EV.ENGINEER™: Energy, Battery, Space, Aerospace and Digital Twins' },
});

const visitEv: Cta = { label: 'Visit EV.ENGINEER™ ↗', href: EV_HOME, event: 'ev_engineer_external_click' };

/* ---------- Structured data: the page, the person behind EV.ENGINEER™, and the research topics ---------- */

const PAGE_URL = `${SITE.url}${PATH}`;

function structuredData() {
    const topics = RESEARCH_INDEX.filter((g) => g.name !== 'Ecosystem').flatMap((g) => g.links);
    return [
        ...pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, breadcrumbs: [{ name: 'Ecosystem', path: '/partners' }, { name: 'EV.ENGINEER™', path: PATH }] }),
        {
            '@type': 'Person',
            '@id': `${PAGE_URL}#person`,
            name: EV_PERSON.name,
            url: EV_PERSON.profile,
            brand: { '@type': 'Brand', name: EV_PERSON.identity, url: EV_HOME },
            homeLocation: { '@type': 'Place', name: EV_PERSON.location },
            knowsAbout: ['EV battery engineering', 'Battery intelligence and diagnostics', 'Battery cybersecurity', 'Space systems', 'Satellite engineering', 'Aerospace cybersecurity', 'Digital twins', 'Rocket engine digital twins'],
            subjectOf: { '@id': `${PAGE_URL}#webpage` },
        },
        {
            '@type': 'ItemList',
            '@id': `${PAGE_URL}#research`,
            name: 'EV.ENGINEER™ research topics',
            itemListElement: topics.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.label, url: t.href })),
        },
    ];
}

/** A "·"-separated run that only breaks between items, so no line starts with a separator. */
function Dotted({ items }: { items: readonly string[] }) {
    return (
        <>
            {items.map((item, i) => (
                <Fragment key={item}>
                    <span className={styles.nowrap}>
                        {item}
                        {i < items.length - 1 && ' ·'}
                    </span>
                    {i < items.length - 1 && ' '}
                </Fragment>
            ))}
        </>
    );
}

/* ---------- Small decorative glyphs ---------- */

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
    space: <><circle cx="16" cy="16" r="5" /><ellipse cx="16" cy="16" rx="13" ry="5.5" transform="rotate(-20 16 16)" /></>,
    aero: <><path d="M4 18 L28 12 M14 16 L10 6 M14 16 L12 26 M24 13 L26 8" /></>,
    battery: <><rect x="4" y="9" width="22" height="14" rx="2" /><path d="M28 13 V19 M9 13 V19 M14 13 V19 M19 13 V19" /></>,
    twin: <><path d="M16 4 L27 10 V22 L16 28 L5 22 V10 Z M16 4 V16 M5 10 L16 16 L27 10" /></>,
};

const STEPS: [string, string, React.ReactNode][] = [
    ['Learn', 'Fundamentals', <path key="l" d="M5 7 H14 V25 H5 Z M14 7 H23 V25 H14" />],
    ['Model', 'Equations & simulation', <path key="m" d="M4 22 C9 22 10 8 15 8 S21 22 27 22" />],
    ['Build', 'Prototypes', <path key="b" d="M6 14 H16 V24 H6 Z M16 8 H26 V18 H16 Z" />],
    ['Test', 'Experiments', <path key="t" d="M3 16 H8 L11 8 L15 24 L19 12 L22 16 H29" />],
    ['Verify', 'Evidence', <path key="v" d="M6 16 L13 23 L26 9" />],
    ['Research', 'Open problems', <><circle key="c" cx="14" cy="14" r="8" /><path key="r" d="M20 20 L27 27" /></>],
    ['Lead', 'Direction', <path key="d" d="M16 27 V6 M9 13 L16 6 L23 13" />],
];

const DOMAINS = [
    {
        id: 'space',
        icon: 'space',
        label: 'Space Systems',
        title: 'Space & Satellites',
        text: 'Spacecraft, satellite engineering, CubeSat energy, propulsion and long-duration stations.',
        items: ['Space & Aerospace Technologies', 'Satellite Engineering', 'CubeTwin', 'Rocket Engineering', 'Space Station'],
    },
    {
        id: 'aerospace',
        icon: 'aero',
        label: 'Aerospace Systems',
        title: 'Aerospace',
        text: 'Connected aircraft, eVTOL health monitoring, cyber-resilience and quality intelligence.',
        items: ['Aerospace Cybersecurity & Digital Twins', 'UFlight™ 3D', 'Aerospace Quality Intelligence'],
    },
    {
        id: 'battery',
        icon: 'battery',
        label: 'EV · Battery · Energy',
        title: 'EV Battery & Energy',
        text: 'Battery safety, diagnostics, BMS intelligence, pack engineering, mobility and second life.',
        items: ['Battery Safety & Cybersecurity', 'Health & Diagnostics', 'Pack Engineering', 'Electric Mobility'],
    },
    {
        id: 'digital-twins',
        icon: 'twin',
        label: 'Interactive Labs',
        title: 'Digital Twins',
        text: 'Models to run and observe: satellite, CubeSat energy, rocket propulsion and battery health.',
        items: ['Interactive 3D Satellite', 'CubeTwin', 'Rocket Propulsion Digital Twin', 'Battery Diagnostics Toolkit'],
    },
];

const LABS = [
    {
        label: 'Spacecraft Architecture',
        title: 'Interactive 3D Satellite',
        text: 'A 6U Earth-observation satellite in interactive 3D: structure, power, ADCS, avionics, payload and communications.',
        cta: { label: 'Launch Interactive 3D →', href: EV_URL.interactive3d, event: 'ev_engineer_digital_twin_click' },
        glyph: <Lab3dGlyph />,
    },
    {
        label: 'Energy · Mission · Reliability',
        title: 'CubeTwin',
        text: 'Simulate orbital sunlight, solar generation, battery SOC, mission loads, faults and reliability.',
        cta: { label: 'Explore CubeTwin →', href: EV_URL.cubesat, event: 'ev_engineer_digital_twin_click' },
        glyph: <LabOrbitGlyph />,
    },
    {
        label: 'Propulsion · Telemetry · FDIR',
        title: 'Rocket Propulsion Digital Twin',
        text: 'Physics-based models, telemetry, state estimation and fault detection for propulsion pressure monitoring.',
        cta: { label: 'Open Digital Twin →', href: EV_URL.rocketAdvanced, event: 'ev_engineer_digital_twin_click' },
        glyph: <LabRocketGlyph />,
    },
    {
        label: 'Battery · Health · Diagnostics',
        title: 'EV Battery Health & Diagnostics',
        text: 'Battery packs, BMS, cells, SOC, SOH, thermal behaviour and guided repair workflows in interactive 3D.',
        cta: { label: 'Explore Diagnostics Toolkit →', href: EV_URL.batteryHealth, event: 'ev_engineer_digital_twin_click' },
        glyph: <LabCellsGlyph />,
    },
] satisfies { label: string; title: string; text: string; cta: Cta; glyph: React.ReactNode }[];

export default function EVEngineerPage() {
    return (
        <div className={styles.page}>
            <JsonLd data={structuredData()} />

            {/* 1 — Hero */}
            <section className={styles.hero} data-analytics-section="ev-hero">
                <div className={`container ${styles.heroGrid}`}>
                    <div className={styles.heroCopy}>
                        <p className="eyebrow">EV.ENGINEER™ · Engineering &amp; Research</p>
                        <h1 className={styles.display}>
                            Building <em>World‑Class Engineers</em> to Solve <em>Energy</em> &amp; <em>Battery</em> Challenges
                        </h1>
                        <p className={`lead ${styles.heroLead}`}>
                            An engineering, research and learning ecosystem exploring Energy, EV Batteries, Space, Aerospace,
                            Digital Twins, Cybersecurity and Engineering Intelligence.
                        </p>
                        <div className="actions hero-actions">
                            <a href="#research-development" className="btn btn-primary" data-track="ev_engineer_research_click" data-track-name="Explore Research & Development" data-analytics-location="hero">
                                Explore Research &amp; Development
                            </a>
                            <EvLink cta={visitEv} className="btn btn-secondary" location="hero" />
                        </div>
                    </div>
                    <div className={styles.heroVisual}>
                        <HeroSystems />
                    </div>
                    <div className={styles.heroMeta}>
                        <p>
                            <Dotted items={['Energy', 'Battery', 'Space', 'Aerospace', 'Digital Twins', 'Cybersecurity']} />
                        </p>
                        <p>Bengaluru · India</p>
                    </div>
                </div>
            </section>

            {/* 2 — Local navigation */}
            <LocalNav />

            {/* 3 — Research & Development: discovery by domain */}
            <section id="research-development" className={`section ${styles.rnd}`} data-analytics-section="research-development" tabIndex={-1}>
                <div className="container">
                    <div className="section-head" data-reveal>
                        <p className="eyebrow">EV.ENGINEER™ R&amp;D</p>
                        <h2>Research &amp; Development</h2>
                        <p className="lead">
                            Explore engineering problems, interactive laboratories, Digital Twins, research programs and student
                            engineering projects across Energy, Space, Aerospace, Battery Systems, Cybersecurity and Engineering
                            Intelligence.
                        </p>
                    </div>
                    <ul className={styles.domains}>
                        {DOMAINS.map((d, i) => (
                            <li key={d.id} data-reveal>
                                <a href={`#${d.id}`} className={`${styles.domain} ${d.id === 'battery' ? styles.domainBattery : ''}`} data-track="ev_engineer_research_click" data-track-name={d.title} data-analytics-location="domain-cards">
                                    <span className={styles.domainTop}>
                                        <svg viewBox="0 0 32 32" className={styles.domainIcon} aria-hidden="true">{DOMAIN_ICONS[d.icon]}</svg>
                                        <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                                    </span>
                                    <span className={styles.domainLabel}>{d.label}</span>
                                    <span className={styles.domainTitle}>{d.title}</span>
                                    <span className={styles.domainText}>{d.text}</span>
                                    <span className={styles.domainItems}>
                                        {d.items.map((item) => (
                                            <span key={item}>{item}</span>
                                        ))}
                                    </span>
                                    <span className={styles.domainMore}>
                                        {d.items.length} areas <span aria-hidden="true">↓</span>
                                    </span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* 4–8 — Space */}
            <div id="space" className={styles.group} tabIndex={-1}>
                <section className={`section ${styles.band}`}>
                    <div className={`container ${styles.stack}`}>
                        <Feature
                            section="space-aerospace-technologies"
                            label="Space Systems"
                            maturity="Research"
                            title="Space & Aerospace Technologies"
                            description={<p>Explore spacecraft systems, mission engineering, satellite technologies, digital twins, orbital applications and future space-system architectures.</p>}
                            visual={<SpaceOrbitVisual />}
                            chips={['Spacecraft systems', 'Mission engineering', 'Orbital applications', 'Digital twins']}
                            primary={{ label: 'Explore Space Research →', href: EV_URL.space, event: 'ev_engineer_space_click' }}
                            secondary={{ label: 'Everyday Space Applications ↗', href: EV_URL.everyday, event: 'ev_engineer_space_click' }}
                            meta={[['Host', 'autonomous.ev.engineer'], ['Format', 'Research hub']]}
                        />

                        <Feature
                            section="satellite-engineering"
                            label="Satellite Systems"
                            maturity="Research"
                            title="Satellite Engineering"
                            description={<p>Explore spacecraft architecture, subsystem engineering, electrical power, telemetry, mission operations, verification and digital-twin-driven spacecraft understanding.</p>}
                            visual={<SatelliteSchematicVisual />}
                            chips={['Spacecraft architecture', 'Electrical power (EPS)', 'Telemetry', 'Mission operations', 'Verification']}
                            primary={{ label: 'Explore Satellite Engineering →', href: EV_URL.satellite, event: 'ev_engineer_satellite_click' }}
                            secondary={{ label: 'Open Interactive 3D ↗', href: EV_URL.interactive3d, event: 'ev_engineer_satellite_click' }}
                            related={[
                                { label: 'CubeSat · CubeTwin', href: EV_URL.cubesat, event: 'ev_engineer_satellite_click' },
                                { label: 'Everyday Applications', href: EV_URL.everyday, event: 'ev_engineer_satellite_click' },
                            ]}
                            meta={[['Reference', '6U Earth observation'], ['Format', 'Guided + interactive 3D']]}
                            reverse
                        />
                    </div>
                </section>

                <section className={`section ${styles.lab}`}>
                    <div className="container">
                        <Feature
                            section="cubetwin"
                            label="Digital Twin · Spacecraft Energy"
                            maturity="Simulation"
                            title="CubeTwin"
                            description={
                                <>
                                    <p className={styles.featureLead}>A Digital-Twin Simulation Platform for CubeSat Energy, Mission and Reliability Analysis.</p>
                                    <p>Run a CubeSat through orbits of sunlight and eclipse, watch solar generation and battery state of charge respond to mission loads, inject faults and see when safe mode is the right decision.</p>
                                </>
                            }
                            visual={<CubeTwinVisual />}
                            chips={['Orbit', 'Sunlight / eclipse', 'Solar generation', 'Battery SOC', 'Loads', 'Faults', 'Safe mode']}
                            primary={{ label: 'Explore CubeTwin →', href: EV_URL.cubesat, event: 'ev_engineer_digital_twin_click' }}
                            meta={[['Type', 'Interactive simulation'], ['Domain', 'CubeSat EPS']]}
                            layout="wide"
                        />
                    </div>
                </section>

                <section className={`section ${styles.band}`}>
                    <div className={`container ${styles.stack}`}>
                        <Feature
                            section="rocket-engineering"
                            label="Propulsion Systems"
                            maturity="Simulation"
                            title="Rocket Engineering & Digital Twins"
                            description={<p>Explore propulsion architecture, engineering instrumentation, telemetry, physics-based modelling, state estimation, fault diagnosis and digital-twin methods.</p>}
                            visual={<RocketVisual />}
                            chips={['Propulsion architecture', 'Instrumentation', 'State estimation', 'Fault diagnosis', 'Turbomachinery']}
                            primary={{ label: 'Explore Rocket Engineering →', href: EV_URL.rocket, event: 'ev_engineer_rocket_click' }}
                            secondary={{ label: 'Open Advanced Digital Twin ↗', href: EV_URL.rocketAdvanced, event: 'ev_engineer_rocket_click' }}
                            related={[{ label: 'Model Rocketry', href: EV_URL.modelRocketry, event: 'ev_engineer_rocket_click' }]}
                            meta={[['Models', 'Engine twin + advanced twin'], ['Methods', 'Physics · AI/ML · FDIR']]}
                        />

                        <Feature
                            section="space-station"
                            label="Future Space Systems"
                            maturity="Concept"
                            title="Space Station & Long-Duration Space Systems"
                            description={<p>Explore long-duration orbital infrastructure, systems thinking, research architectures and future space-station concepts.</p>}
                            visual={<StationVisual />}
                            chips={['Orbital infrastructure', 'Life support', 'Power', 'Docking & robotics', 'Systems thinking']}
                            primary={{ label: 'Explore Space Station Research →', href: EV_URL.spaceStation, event: 'ev_engineer_space_click' }}
                            secondary={{ label: 'Visit ISHAVASYAM.ORG ↗', href: EV_URL.ishavasyam, event: 'ev_engineer_external_click' }}
                            meta={[['Type', 'Research simulator'], ['Initiative', 'ISHAVASYAM.ORG']]}
                            reverse
                        />
                    </div>
                </section>
            </div>

            {/* 9–10 — Aerospace */}
            <div id="aerospace" className={styles.group} tabIndex={-1}>
                <section className={`section ${styles.bandAlt}`}>
                    <div className="container">
                        <Feature
                            section="aerospace-systems"
                            label="Aerospace Systems"
                            maturity="Research"
                            title="Aerospace Cybersecurity & Digital Twins"
                            description={<p>Explore connected aerospace systems, telemetry, health monitoring, cyber-resilient architectures, digital twins and next-generation mobility platforms.</p>}
                            visual={<AerospaceVisual />}
                            chips={['Connected aircraft', 'eVTOL', 'HUMS', 'Cyber-resilience', 'Telemetry']}
                            primary={{ label: 'Explore Aerospace Systems →', href: EV_URL.aerospace, event: 'ev_engineer_aerospace_click' }}
                            secondary={{ label: 'Open UFlight™ 3D ↗', href: EV_URL.uflight3d, event: 'ev_engineer_aerospace_click' }}
                            meta={[['Platforms', 'Aerospace · UFlight™ 3D'], ['Focus', 'Health · security']]}
                        />
                    </div>
                </section>

                <section className={`section ${styles.aqip}`} data-analytics-section="aqip">
                    <div className="container">
                        <div className={styles.aqipHead} data-reveal>
                            <div>
                                <p className={styles.kicker}>Aerospace &amp; Defence · Quality Intelligence</p>
                                <h2>Aerospace Quality Intelligence Platform</h2>
                            </div>
                            <div>
                                <p className="lead">
                                    Explore engineering assurance, inspection intelligence, First Article Inspection, measurement
                                    evidence and structured aerospace quality workflows.
                                </p>
                                <div className="actions hero-actions">
                                    <EvLink cta={{ label: 'Explore Aerospace Quality Intelligence →', href: EV_URL.aqip, event: 'ev_engineer_aqip_click' }} className="btn btn-primary" location="primary-cta" />
                                </div>
                            </div>
                        </div>
                        <ol className={styles.lifecycle} aria-label="Quality lifecycle" data-reveal>
                            {['Engineering', 'Manufacturing', 'Inspection', 'Measurement', 'Evidence', 'Acceptance'].map((step, i) => (
                                <li key={step}>
                                    <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                                    {step}
                                </li>
                            ))}
                        </ol>
                        <AqipVisual />
                    </div>
                </section>
            </div>

            {/* 11–15 — EV Battery & Energy */}
            <div id="battery" className={`${styles.group} ${styles.battery}`} tabIndex={-1}>
                <section className="section" data-analytics-section="battery-intelligence">
                    <div className="container">
                        <div className={styles.batteryHead} data-reveal>
                            <p className={styles.kicker}>EV · Battery · Energy</p>
                            <h2 className={styles.batteryTitle}>EV Battery &amp; Energy Intelligence</h2>
                            <p className="lead">
                                Explore battery safety, diagnostics, BMS intelligence, cybersecurity, pack engineering, EV mobility,
                                health monitoring and circular-economy challenges.
                            </p>
                            <ul className={styles.batteryChips} aria-label="Key topics">
                                {['Cells', 'Modules', 'Packs', 'BMS', 'SOC · SOH', 'Thermal zones', 'Diagnostics', 'Anomaly detection'].map((c) => (
                                    <li key={c}>{c}</li>
                                ))}
                            </ul>
                        </div>
                        <BatteryVisual />

                        <div className={styles.batteryGrid}>
                            <Feature
                                section="battery-safety"
                                layout="card"
                                heading="h3"
                                label="Battery Safety"
                                title="Safety, Fire Prevention & Cybersecurity"
                                description={<p>Thermal safety and second-life battery diagnostics, battery cybersecurity, and CAN-bus security for EV, BMS and BESS.</p>}
                                visual={<SafetyVisual />}
                                primary={{ label: 'Explore Battery Safety →', href: EV_URL.batteryFire, event: 'ev_engineer_battery_click' }}
                                related={[
                                    { label: 'Battery Fire Prevention', href: EV_URL.batteryFire, event: 'ev_engineer_battery_click' },
                                    { label: 'Battery Cybersecurity', href: EV_URL.batteryCyber, event: 'ev_engineer_battery_click' },
                                    { label: 'AegisCAN™', href: EV_URL.aegisCan, event: 'ev_engineer_battery_click' },
                                ]}
                            />
                            <Feature
                                section="battery-health"
                                layout="card"
                                heading="h3"
                                label="Battery Diagnostics"
                                title="Battery Health & Diagnostics"
                                description={<p>SOC, SOH, cell imbalance, cycle history and guided diagnostics, with battery identity and AI-assisted support workflows.</p>}
                                visual={<HealthVisual />}
                                primary={{ label: 'Explore Battery Intelligence →', href: EV_URL.batteryHealth, event: 'ev_engineer_battery_click' }}
                                related={[
                                    { label: 'Health & Diagnostics Toolkit', href: EV_URL.batteryHealth, event: 'ev_engineer_battery_click' },
                                    { label: 'Battery Aadhaar', href: EV_URL.batteryAadhaar, event: 'ev_engineer_battery_click' },
                                    { label: 'EV Help Agent Use Cases', href: EV_URL.evHelpAgent, event: 'ev_engineer_battery_click' },
                                ]}
                            />
                            <Feature
                                section="battery-engineering"
                                layout="card"
                                heading="h3"
                                label="Pack Engineering"
                                title="Battery Pack Engineering"
                                description={<p>From energy requirements and cell selection to module and pack architecture, BMS, thermal design, validation and diagnostics.</p>}
                                visual={<PackBuildVisual />}
                                chips={['Cell selection', 'Module architecture', 'Pack architecture', 'BMS', 'Thermal design', 'Energy requirements', 'Validation', 'Diagnostics']}
                                primary={{ label: 'Explore Battery Engineering →', href: EV_URL.packDesign, event: 'ev_engineer_battery_click' }}
                                related={[
                                    { label: 'Battery Pack Design', href: EV_URL.packDesign, event: 'ev_engineer_battery_click' },
                                    { label: 'Battery Engineering Portal', href: EV_URL.batteryPortal, event: 'ev_engineer_battery_click' },
                                ]}
                            />
                            <Feature
                                section="electric-mobility"
                                layout="card"
                                heading="h3"
                                label="Electric Mobility"
                                title="Vehicle Engineering & Energy Simulation"
                                description={<p>Configure an electric auto-rickshaw, study passenger air-taxi (eVTOL) component architecture and model the battery circular economy.</p>}
                                visual={<MobilityVisual />}
                                primary={{ label: 'Explore Electric Mobility →', href: EV_URL.autoRickshaw, event: 'ev_engineer_battery_click' }}
                                related={[
                                    { label: 'EV Auto Rickshaw', href: EV_URL.autoRickshaw, event: 'ev_engineer_battery_click' },
                                    { label: 'Passenger Taxi', href: EV_URL.passengerTaxi, event: 'ev_engineer_battery_click' },
                                    { label: 'Battery Circular Economy', href: EV_URL.circular, event: 'ev_engineer_battery_click' },
                                ]}
                            />
                        </div>
                    </div>
                </section>
            </div>

            {/* 16 — Interactive Engineering Labs */}
            <div id="digital-twins" className={styles.group} tabIndex={-1}>
                <section className={`section ${styles.bandAlt}`} data-analytics-section="interactive-labs">
                    <div className="container">
                        <div className="section-head" data-reveal>
                            <p className="eyebrow">Interactive engineering labs</p>
                            <h2>Learn by Building</h2>
                            <p className="lead">
                                Interactive engineering experiences where systems can be modelled, simulated, observed and
                                understood—not just read about.
                            </p>
                        </div>
                        <ul className={styles.labs}>
                            {LABS.map((lab) => (
                                <li key={lab.title} className={styles.labCard} data-reveal>
                                    <div className={styles.labGlyph}>{lab.glyph}</div>
                                    <p className={styles.kicker}>{lab.label}</p>
                                    <h3>{lab.title}</h3>
                                    <p>{lab.text}</p>
                                    <EvLink cta={lab.cta} className={`text-link ${styles.labLink}`} location="lab-card" />
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            </div>

            {/* 17–18 — Engineering Pathways and progression */}
            <div id="learning" className={styles.group} tabIndex={-1}>
                <section className="section" data-analytics-section="engineering-pathways">
                    <div className="container">
                        <div className="section-head" data-reveal>
                            <p className="eyebrow">Careers · workshops · field engineering</p>
                            <h2>Engineering Pathways</h2>
                            <p className="lead">{PATHWAYS_INTRO}</p>
                        </div>
                        <ul className={styles.pathways}>
                            {PATHWAYS.map((p) => (
                                <li key={p.title} className={styles.pathway} data-reveal>
                                    <p className={styles.kicker}>{p.label}</p>
                                    <h3>{p.title}</h3>
                                    <p>{p.text}</p>
                                    <EvLink cta={{ label: p.cta, href: p.href, event: p.event }} className={`text-link ${styles.pathLink}`} location="pathway-card" />
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className={`section ${styles.progressSection}`} data-analytics-section="progression">
                    <div className="container">
                        <div className="section-head center" data-reveal>
                            <h2 className={styles.progressTitle}>
                                Learn <span aria-hidden="true">→</span> Model <span aria-hidden="true">→</span> Build{' '}
                                <span aria-hidden="true">→</span> Test <span aria-hidden="true">→</span> Verify{' '}
                                <span aria-hidden="true">→</span> Research <span aria-hidden="true">→</span> Lead
                            </h2>
                            <p className="lead">
                                EV.ENGINEER™ connects engineering education with systems thinking, simulation, digital twins,
                                experimentation, verification and real-world problem solving.
                            </p>
                        </div>
                        <ol className={styles.progress} data-reveal>
                            {STEPS.map(([name, role, glyph], i) => (
                                <li key={name} style={{ ['--i' as string]: i }}>
                                    <svg viewBox="0 0 32 32" className={styles.stepIcon} aria-hidden="true">{glyph}</svg>
                                    <span className={styles.stepName}>{name}</span>
                                    <span className={styles.stepRole}>{role}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>
            </div>

            {/* 20–22 — Profile, ecosystem, index */}
            <div id="ecosystem" className={styles.group} tabIndex={-1}>
                <section className={`section ${styles.profile}`} data-analytics-section="profile">
                    <div className={`container ${styles.profileGrid}`}>
                        <div data-reveal>
                            <h2 className={styles.profileName}>{EV_PERSON.name}</h2>
                            <p className={styles.profileIdentity}>{EV_PERSON.identity}</p>
                            <p className={styles.profileFocus}>{EV_PERSON.focus}</p>
                            <p className={`lead ${styles.profileLine}`}>{EV_PERSON.line}</p>
                            <div className="actions hero-actions">
                                <EvLink cta={{ label: 'View Profile →', href: EV_PERSON.profile, event: 'ev_engineer_profile_click' }} className="btn btn-primary" location="profile" />
                                <EvLink cta={visitEv} className="btn btn-secondary" location="profile" />
                            </div>
                        </div>
                        <dl className={styles.profileCard} data-reveal>
                            <div>
                                <dt>Identity</dt>
                                <dd>{EV_PERSON.identity}</dd>
                            </div>
                            <div>
                                <dt>Focus</dt>
                                <dd>{EV_PERSON.focus}</dd>
                            </div>
                            <div>
                                <dt>Domains</dt>
                                <dd>
                                    <Dotted items={EV_DOMAINS} />
                                </dd>
                            </div>
                            <div>
                                <dt>Location</dt>
                                <dd>{EV_PERSON.location}</dd>
                            </div>
                        </dl>
                    </div>
                </section>

                <section className={`section ${styles.bandAlt}`} data-analytics-section="ecosystem">
                    <div className="container">
                        <div className="section-head" data-reveal>
                            <p className="eyebrow">Ecosystem</p>
                            <h2>Partnerships &amp; Engineering Ecosystem</h2>
                            <p className="lead">
                                Engineering organisations, research initiatives, technology teams and communities connected across
                                Space, Aerospace, Software, Embedded Systems and EV Engineering.
                            </p>
                        </div>
                        <ul className={styles.partners}>
                            {PARTNERS.map((p) => (
                                <li key={p.label} className={styles.partner} data-reveal>
                                    <p className={styles.kicker}>{p.status}</p>
                                    <h3>{p.label}</h3>
                                    <p>{p.line}</p>
                                    <EvLink cta={{ label: p.cta, href: p.href, event: p.event }} className={`text-link ${styles.partnerLink}`} location="partner-card" />
                                </li>
                            ))}
                        </ul>
                        <p className={styles.partnerNote}>
                            Organisations are described from their own published material; a listing here is not a claim of a
                            formal partnership.
                        </p>
                    </div>
                </section>

                <section className="section" data-analytics-section="research-index">
                    <div className="container">
                        <div className="section-head" data-reveal>
                            <p className="eyebrow">Research index</p>
                            <h2>Explore All Research Topics</h2>
                        </div>
                        <div className={styles.index}>
                            {RESEARCH_INDEX.map((group) => (
                                <div key={group.name} className={styles.indexGroup}>
                                    <h3 className={styles.indexTitle}>
                                        {group.name}
                                        <span className="mono">{String(group.links.length).padStart(2, '0')}</span>
                                    </h3>
                                    <ul>
                                        {group.links.map((link) => (
                                            <li key={link.href + link.label}>
                                                <ExternalLink href={link.href} className={styles.indexLink} data-track={link.event} data-analytics-location="research-index" trackName={link.label}>
                                                    {link.label}
                                                    <span aria-hidden="true">↗</span>
                                                </ExternalLink>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            {/* 23 — Final call to action */}
            <section className={`section ${styles.final}`} data-analytics-section="final-cta">
                <div className="container">
                    <div className={styles.finalInner} data-reveal>
                        <p className={styles.kicker}>EV.ENGINEER™</p>
                        <h2 className={styles.finalTitle}>Engineer the systems that matter.</h2>
                        <p className="lead">Learn deeply. Build real systems. Verify your engineering. Solve difficult problems.</p>
                        <div className="actions hero-actions">
                            <a href="#research-development" className="btn btn-primary" data-track="ev_engineer_research_click" data-track-name="Explore Research & Development" data-analytics-location="final-cta">
                                Explore Research &amp; Development
                            </a>
                            <EvLink cta={visitEv} className="btn btn-secondary" location="final-cta" />
                        </div>
                        <p className={styles.signature}>EV.ENGINEER™ · {EV_PERSON.location}</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
