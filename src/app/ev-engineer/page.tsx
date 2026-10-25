import type { Metadata } from 'next';
import { Fragment } from 'react';
import styles from './page.module.css';
import { pageMetadata } from '@/lib/metadata';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import Feature, { EvLink, type Cta } from '@/components/ev/Feature';
import EnergyHero from '@/components/ev/EnergyHero';
import LocalNav from '@/components/ev/LocalNav';
import ResearchIndex from '@/components/ev/ResearchIndex';
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
    BatteryFlagshipVisual,
    CanNetworkVisual,
    HealthVisual,
    Lab3dGlyph,
    LabCellsGlyph,
    LabOrbitGlyph,
    LabRocketGlyph,
    MobilityVisual,
    PackBuildVisual,
    SafetyVisual,
} from '@/components/ev/battery-visuals';
import {
    EV_BRAND_LINE,
    EV_DOMAINS,
    EV_HOME,
    EV_PERSON,
    EV_PILLARS,
    EV_PLATFORM,
    EV_URL,
    PARTNERS,
    PATHWAYS,
    PATHWAYS_INTRO,
    RESEARCH_INDEX,
} from '@/lib/ev-engineer';
import { SITE } from '@/lib/site';

const PATH = '/ev-engineer';
const TITLE = 'EV.ENGINEER™ | Energy, Battery, Space, Aerospace & Digital Twins';
const DESCRIPTION =
    'Explore EV.ENGINEER™ engineering and research across EV Battery Intelligence, Energy Systems, Space, Aerospace, Digital Twins, Cybersecurity and engineering education.';

export const metadata: Metadata = pageMetadata({
    path: PATH,
    title: TITLE,
    description: DESCRIPTION,
    absoluteTitle: true,
    image: { url: `${PATH}/opengraph-image`, width: 1200, height: 630, alt: 'EV.ENGINEER™: Energy, Battery, Space, Aerospace and Digital Twins' },
});

// ev.engineer serves this page, so "Explore / Visit EV.ENGINEER™" lead to the platform that hosts the research.
const exploreEv: Cta = { label: 'Explore EV.ENGINEER™ ↗', href: EV_PLATFORM, event: 'ev_engineer_external_click' };
const visitEv: Cta = { label: 'Visit EV.ENGINEER™ ↗', href: EV_PLATFORM, event: 'ev_engineer_external_click' };

/* ---------- Structured data: the page, the research topics, and the profile linked from it ---------- */

const PAGE_URL = `${SITE.url}${PATH}`;

function structuredData() {
    const topics = RESEARCH_INDEX.filter((g) => g.name !== 'Ecosystem').flatMap((g) => g.links);
    return [
        ...pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, breadcrumbs: [{ name: 'Ecosystem', path: '/partners' }, { name: 'EV.ENGINEER™', path: PATH }] }),
        {
            '@type': 'ItemList',
            '@id': `${PAGE_URL}#research`,
            name: 'EV.ENGINEER™ research topics',
            itemListElement: topics.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.label, url: t.href })),
        },
        {
            '@type': 'Person',
            '@id': `${PAGE_URL}#person`,
            name: EV_PERSON.name,
            url: EV_PERSON.profile,
            brand: { '@type': 'Brand', name: EV_PERSON.identity, url: EV_HOME },
            homeLocation: { '@type': 'Place', name: EV_PERSON.location },
            knowsAbout: ['EV battery engineering', 'Battery intelligence and diagnostics', 'Battery cybersecurity', 'Space systems', 'Satellite engineering', 'Aerospace cybersecurity', 'Digital twins'],
            subjectOf: { '@id': `${PAGE_URL}#webpage` },
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

/* ---------- Research overview: four primary domains, then compact links ---------- */

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
    battery: <><rect x="4" y="9" width="22" height="14" rx="2" /><path d="M28 13 V19 M9 13 V19 M14 13 V19 M19 13 V19" /></>,
    space: <><circle cx="16" cy="16" r="5" /><ellipse cx="16" cy="16" rx="13" ry="5.5" transform="rotate(-20 16 16)" /></>,
    aero: <><path d="M4 18 L28 12 M14 16 L10 6 M14 16 L12 26 M24 13 L26 8" /></>,
    twin: <><path d="M16 4 L27 10 V22 L16 28 L5 22 V10 Z M16 4 V16 M5 10 L16 16 L27 10" /></>,
};

const DOMAINS = [
    {
        id: 'battery',
        icon: 'battery',
        label: 'Battery Intelligence',
        title: 'EV Battery & Energy',
        text: 'Battery health, safety, BMS intelligence, pack engineering, mobility and second life.',
        items: ['Battery Energy & Health Intelligence', 'Safety & Fire Prevention', 'Health & Diagnostics', 'Pack Engineering', 'Electric Mobility'],
    },
    {
        id: 'digital-twins',
        icon: 'twin',
        label: 'Interactive Lab',
        title: 'Digital Twins',
        text: 'Systems to run and observe: satellite, CubeSat energy, rocket propulsion and battery health.',
        items: ['Interactive 3D Satellite', 'CubeTwin', 'Rocket Propulsion Digital Twin', 'Battery Diagnostics Toolkit'],
    },
    {
        id: 'space',
        icon: 'space',
        label: 'Space Systems',
        title: 'Space & Satellites',
        text: 'Spacecraft, satellite power, CubeSat energy, propulsion and long-duration stations.',
        items: ['Space & Aerospace Technologies', 'Satellite Engineering', 'CubeTwin', 'Rocket Engineering', 'Space Station'],
    },
    {
        id: 'aerospace',
        icon: 'aero',
        label: 'Aerospace Systems',
        title: 'Aerospace',
        text: 'Connected aircraft, eVTOL health monitoring, cyber-resilience and quality assurance.',
        items: ['Aerospace Cybersecurity & Digital Twins', 'UFlight™ 3D', 'Aerospace Quality Intelligence'],
    },
];

const TOPICS = [
    ['satellite-engineering', 'Satellite Engineering'],
    ['rocket-engineering', 'Rocket Engineering'],
    ['aqip', 'Aerospace Quality Intelligence'],
    ['cybersecurity', 'Cybersecurity'],
    ['pathways', 'Engineering Pathways'],
] as const;

const STEPS: [string, string, React.ReactNode][] = [
    ['Learn', 'Fundamentals', <path key="l" d="M5 7 H14 V25 H5 Z M14 7 H23 V25 H14" />],
    ['Model', 'Equations & simulation', <path key="m" d="M4 22 C9 22 10 8 15 8 S21 22 27 22" />],
    ['Build', 'Prototypes', <path key="b" d="M6 14 H16 V24 H6 Z M16 8 H26 V18 H16 Z" />],
    ['Test', 'Experiments', <path key="t" d="M3 16 H8 L11 8 L15 24 L19 12 L22 16 H29" />],
    ['Verify', 'Evidence', <path key="v" d="M6 16 L13 23 L26 9" />],
    ['Research', 'Open problems', <><circle key="c" cx="14" cy="14" r="8" /><path key="r" d="M20 20 L27 27" /></>],
    ['Lead', 'Direction', <path key="d" d="M16 27 V6 M9 13 L16 6 L23 13" />],
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

            {/* Hero: 45 % content / 55 % live engineering system */}
            <section className={styles.hero} data-analytics-section="ev-hero">
                <div className={`container ${styles.heroGrid}`}>
                    <div className={styles.heroCopy}>
                        <p className="eyebrow">EV.ENGINEER™ · Engineering &amp; Research</p>
                        <h1 className={styles.display}>
                            Building <em>World‑Class Engineers</em> to Solve <em>Energy</em> &amp; <em>Battery</em> Challenges
                        </h1>
                        <p className={`lead ${styles.heroLead}`}>
                            Engineering, research and learning across Energy, EV Batteries, Space, Aerospace, Digital Twins,
                            Cybersecurity and Engineering Intelligence.
                        </p>
                        <div className="actions hero-actions">
                            <a href="#research-development" className="btn btn-primary" data-track="ev_engineer_research_click" data-track-name="Explore Research & Development" data-analytics-location="hero">
                                Explore Research &amp; Development
                            </a>
                            <EvLink cta={exploreEv} className="btn btn-secondary" location="hero" />
                        </div>
                    </div>
                    <div className={styles.heroVisual}>
                        <EnergyHero />
                    </div>
                    <div className={styles.heroMeta}>
                        <p>
                            <Dotted items={['Energy', 'Battery', 'Space', 'Aerospace', 'Digital Twins', 'Cybersecurity']} />
                        </p>
                        <p>
                            <Dotted items={EV_PILLARS} />
                        </p>
                    </div>
                </div>
            </section>

            <LocalNav />

            <div id="overview" className={styles.group} tabIndex={-1}>
                {/* Research overview */}
                <section id="research-development" className={`section ${styles.rnd}`} data-analytics-section="research-development" tabIndex={-1}>
                    <div className="container">
                        <div className={styles.rndHead} data-reveal>
                            <div>
                                <p className={styles.kicker}>R&amp;D</p>
                                <h2>Research &amp; Development</h2>
                            </div>
                            <p className="lead">
                                Explore engineering problems, interactive laboratories, Digital Twins, research programs and
                                system-level projects across multiple domains.
                            </p>
                        </div>
                        <ul className={styles.domains}>
                            {DOMAINS.map((d, i) => (
                                <li key={d.id} data-reveal>
                                    <a href={`#${d.id}`} className={`${styles.domain} ${i === 0 ? styles.domainPrimary : ''}`} data-track="ev_engineer_research_click" data-track-name={d.title} data-analytics-location="domain-cards">
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
                        <nav className={styles.topics} aria-label="More research areas" data-reveal>
                            <span className={styles.topicsLabel}>Also in R&amp;D</span>
                            <ul>
                                {TOPICS.map(([id, name]) => (
                                    <li key={id}>
                                        <a href={`#${id}`} data-track="ev_engineer_research_click" data-track-name={name} data-analytics-location="topic-links">
                                            {name} <span aria-hidden="true">↓</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>
                </section>

                {/* Flagship engineering visual */}
                <section className={`section ${styles.flagship}`} data-analytics-section="battery-flagship">
                    <div className="container">
                        <div className={styles.flagshipHead} data-reveal>
                            <div>
                                <p className={styles.kicker}>Battery Intelligence · Flagship</p>
                                <h2>Battery Energy &amp; Health Intelligence</h2>
                            </div>
                            <div>
                                <p className="lead">How an EV battery stores, delivers, protects and reports energy throughout its operating life.</p>
                                <EvLink cta={{ label: 'Explore Battery Research ↗', href: EV_URL.batteryPortal, event: 'ev_engineer_battery_click' }} className={`text-link ${styles.flagshipLink}`} location="flagship" />
                            </div>
                        </div>
                        <BatteryFlagshipVisual />
                    </div>
                </section>
            </div>

            {/* Space */}
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
                            id="satellite-engineering"
                            section="satellite-engineering"
                            label="Satellite Systems"
                            maturity="Research"
                            title="Satellite Engineering"
                            description={<p>Explore spacecraft architecture, subsystem engineering, electrical power, telemetry, mission operations, verification and digital-twin-driven spacecraft understanding.</p>}
                            visual={<SatelliteSchematicVisual />}
                            chips={['EPS', 'Telemetry', 'Digital twin', 'Mission', 'Verification']}
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
                            chips={['Orbit & eclipse', 'Solar generation', 'Battery SOC', 'Faults', 'Safe mode']}
                            primary={{ label: 'Explore CubeTwin →', href: EV_URL.cubesat, event: 'ev_engineer_digital_twin_click' }}
                            meta={[['Type', 'Interactive simulation'], ['Domain', 'CubeSat EPS']]}
                            layout="wide"
                        />
                    </div>
                </section>

                <section className={`section ${styles.band}`}>
                    <div className={`container ${styles.stack}`}>
                        <Feature
                            id="rocket-engineering"
                            section="rocket-engineering"
                            label="Propulsion"
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

            {/* Aerospace */}
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

                <section id="aqip" className={`section ${styles.aqip}`} data-analytics-section="aqip">
                    <div className="container">
                        <div className={styles.splitHead} data-reveal>
                            <div>
                                <p className={styles.kicker}>Engineering Evidence · Aerospace &amp; Defence</p>
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

            {/* EV Battery & Energy */}
            <div id="battery" className={`${styles.group} ${styles.battery}`} tabIndex={-1}>
                <section className="section" data-analytics-section="battery-intelligence">
                    <div className="container">
                        <div className={styles.splitHead} data-reveal>
                            <div>
                                <p className={`${styles.kicker} ${styles.kickerSolar}`}>EV · Battery · Energy</p>
                                <h2>EV Battery &amp; Energy Intelligence</h2>
                            </div>
                            <div>
                                <p className="lead">
                                    Explore battery safety, diagnostics, BMS intelligence, cybersecurity, pack engineering, EV
                                    mobility, health monitoring and circular-economy challenges.
                                </p>
                                <ul className={styles.headChips} aria-label="Key topics">
                                    {['BMS intelligence', 'Battery safety', 'Diagnostics', 'Pack engineering', 'Circular economy'].map((c) => (
                                        <li key={c}>{c}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className={styles.batteryGrid}>
                            <Feature
                                section="battery-safety"
                                layout="card"
                                heading="h3"
                                label="Battery Safety"
                                title="Battery Safety & Fire Prevention"
                                description={<p>Thermal safety, second-life battery diagnostics and grading, and how a pack, its BMS and the vehicle network respond to a warming module.</p>}
                                visual={<SafetyVisual />}
                                chips={['Thermal safety', 'Second-life packs', 'Grading & traceability']}
                                primary={{ label: 'Explore Battery Safety →', href: EV_URL.batteryFire, event: 'ev_engineer_battery_click' }}
                            />
                            <Feature
                                section="battery-health"
                                layout="card"
                                heading="h3"
                                label="Battery Diagnostics"
                                title="Battery Health & Diagnostics"
                                description={<p>SOC, SOH, cell imbalance, cycle history and guided diagnostics, with battery identity and AI-assisted support workflows.</p>}
                                visual={<HealthVisual />}
                                chips={['SOC · SOH', 'Cell imbalance', 'Battery identity']}
                                primary={{ label: 'Explore Battery Intelligence →', href: EV_URL.batteryHealth, event: 'ev_engineer_battery_click' }}
                                related={[
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
                                chips={['Cell selection', 'Pack architecture', 'BMS', 'Thermal design', 'Validation']}
                                primary={{ label: 'Explore Battery Engineering →', href: EV_URL.packDesign, event: 'ev_engineer_battery_click' }}
                                related={[{ label: 'Battery Engineering Portal', href: EV_URL.batteryPortal, event: 'ev_engineer_battery_click' }]}
                            />
                            <Feature
                                section="electric-mobility"
                                layout="card"
                                heading="h3"
                                label="Electric Mobility"
                                title="Vehicle Engineering & Energy Simulation"
                                description={<p>Configure an electric auto-rickshaw, study passenger air-taxi (eVTOL) component architecture and model the battery circular economy.</p>}
                                visual={<MobilityVisual />}
                                chips={['Range', 'Energy use', 'Circular economy']}
                                primary={{ label: 'Explore Electric Mobility →', href: EV_URL.autoRickshaw, event: 'ev_engineer_battery_click' }}
                                related={[
                                    { label: 'Passenger Taxi', href: EV_URL.passengerTaxi, event: 'ev_engineer_battery_click' },
                                    { label: 'Battery Circular Economy', href: EV_URL.circular, event: 'ev_engineer_battery_click' },
                                ]}
                            />
                        </div>
                    </div>
                </section>

                <section className={`section ${styles.cyber}`}>
                    <div className="container">
                        <Feature
                            id="cybersecurity"
                            section="cybersecurity"
                            label="Cybersecurity"
                            maturity="Research"
                            title="Vehicle & Battery Cybersecurity"
                            description={<p>CAN-bus security for EV, BMS and BESS: model normal traffic between an ECU, the gateway, the BMS and the motor controller, detect an anomalous frame and isolate its source.</p>}
                            visual={<CanNetworkVisual />}
                            chips={['CAN bus', 'Intrusion detection', 'BMS threat models', 'Fault injection', 'Secure telemetry']}
                            primary={{ label: 'Explore AegisCAN™ →', href: EV_URL.aegisCan, event: 'ev_engineer_cybersecurity_click' }}
                            secondary={{ label: 'Battery Cybersecurity ↗', href: EV_URL.batteryCyber, event: 'ev_engineer_cybersecurity_click' }}
                            meta={[['Project', 'AegisCAN™ · 12 weeks'], ['Scope', 'EV · BMS · BESS']]}
                        />
                    </div>
                </section>
            </div>

            {/* Digital Twins: interactive labs */}
            <div id="digital-twins" className={styles.group} tabIndex={-1}>
                <section className={`section ${styles.bandAlt}`} data-analytics-section="interactive-labs">
                    <div className="container">
                        <div className={styles.splitHead} data-reveal>
                            <div>
                                <p className={styles.kicker}>Interactive Lab · Digital Twin</p>
                                <h2>Learn by Building</h2>
                            </div>
                            <p className="lead">
                                Interactive engineering experiences where systems can be modelled, simulated, observed and
                                understood—not just read about.
                            </p>
                        </div>
                        <ul className={styles.labs}>
                            {LABS.map((lab) => (
                                <li key={lab.title} className={styles.labCard} data-reveal>
                                    <div className={styles.labGlyph}>{lab.glyph}</div>
                                    <div className={styles.labBody}>
                                        <p className={styles.kicker}>{lab.label}</p>
                                        <h3>{lab.title}</h3>
                                        <p>{lab.text}</p>
                                        <EvLink cta={lab.cta} className={`text-link ${styles.cardLink}`} location="lab-card" />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            </div>

            {/* Learning: pathways and progression */}
            <div id="learning" className={styles.group} tabIndex={-1}>
                <section id="pathways" className="section" data-analytics-section="engineering-pathways">
                    <div className="container">
                        <div className={styles.splitHead} data-reveal>
                            <div>
                                <p className={styles.kicker}>Careers · Workshops · Field Engineering</p>
                                <h2>Engineering Pathways</h2>
                            </div>
                            <p className="lead">{PATHWAYS_INTRO}</p>
                        </div>
                        <ul className={styles.pathways}>
                            {PATHWAYS.map((p, i) => (
                                <li key={p.title} className={styles.pathway} data-reveal>
                                    <span className={`mono ${styles.pathIndex}`}>{String(i + 1).padStart(2, '0')}</span>
                                    <div>
                                        <p className={styles.pathLabel}>{p.label}</p>
                                        <h3>{p.title}</h3>
                                        <p>{p.text}</p>
                                        <EvLink cta={{ label: p.cta, href: p.href, event: p.event }} className={`text-link ${styles.cardLink}`} location="pathway" />
                                    </div>
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

            {/* Identity, ecosystem and research index */}
            <div id="ecosystem" className={styles.group} tabIndex={-1}>
                <section className={`section ${styles.identity}`} data-analytics-section="identity" aria-labelledby="ev-identity">
                    <div className="container">
                        <div className={styles.identityStack}>
                            <h2 id="ev-identity" className={styles.wordmark}>EV.ENGINEER™</h2>
                            <span className={styles.connector} aria-hidden="true" />
                            <p className={styles.identityDomains}>
                                <Dotted items={EV_DOMAINS} />
                            </p>
                            <span className={styles.connector} aria-hidden="true" />
                            <p className={styles.identityPillars}>
                                <Dotted items={EV_PILLARS} />
                            </p>
                            <p className={styles.identityLine}>{EV_BRAND_LINE}</p>
                        </div>
                    </div>
                </section>

                <section className={`section ${styles.ecosystem}`} data-analytics-section="ecosystem">
                    <div className="container">
                        <div className={styles.splitHead} data-reveal>
                            <div>
                                <p className={styles.kicker}>Ecosystem</p>
                                <h2>Partnerships &amp; Engineering Ecosystem</h2>
                            </div>
                            <p className="lead">
                                Engineering organisations, research initiatives, technology teams and communities connected across
                                Space, Aerospace, Software, Embedded Systems and EV Engineering.
                            </p>
                        </div>
                        <ul className={styles.partners}>
                            {PARTNERS.map((p) => (
                                <li key={p.label} className={styles.partner}>
                                    <span className={styles.mark} aria-hidden="true">{p.mark}</span>
                                    <div className={styles.partnerBody}>
                                        <h3>{p.label}</h3>
                                        <p className={styles.role}>{p.role}</p>
                                        <p className={styles.partnerLine}>{p.line}</p>
                                    </div>
                                    <EvLink cta={{ label: p.cta, href: p.href, event: p.event }} className={styles.partnerLink} location="partner" />
                                </li>
                            ))}
                        </ul>
                        <p className={styles.partnerNote}>
                            Organisations are described from their own published material; a listing here is not a claim of a
                            formal partnership.
                        </p>

                        <div className={styles.profileStrip} data-analytics-section="profile">
                            <div>
                                <p className={styles.profileLabel}>Profile</p>
                                <p className={styles.profileName}>{EV_PERSON.name}</p>
                                <p className={styles.profileMeta}>
                                    <Dotted items={[EV_PERSON.identity, ...EV_PERSON.focus.split(' · '), EV_PERSON.location]} />
                                </p>
                            </div>
                            <EvLink cta={{ label: 'View Profile →', href: EV_PERSON.profile, event: 'ev_engineer_profile_click' }} className="btn btn-secondary" location="profile" />
                        </div>
                    </div>
                </section>

                <section className="section" data-analytics-section="research-index">
                    <div className="container">
                        <div className="section-head" data-reveal>
                            <p className={styles.kicker}>Research Index</p>
                            <h2>Explore All Research Topics</h2>
                        </div>
                        <ResearchIndex groups={RESEARCH_INDEX} />
                    </div>
                </section>
            </div>

            {/* Final call to action */}
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
                    </div>
                </div>
            </section>
        </div>
    );
}
