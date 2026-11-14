import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';
import { pageMetadata } from '@/lib/metadata';
import JsonLd, { faqSchema, imageObject, ORG_ID, pageSchema } from '@/components/JsonLd';
import { SITE, STATION_IMAGE } from '@/lib/site';
import StepFlow from '@/components/site/StepFlow';
import { CtaBand, MaturityBadge, PageHero } from '@/components/site/blocks';
import Explorer from '@/components/station-twin/Explorer';
import StationTwinViewer from '@/components/station-twin/StationTwinViewer';
import {
    DELIVERABLES,
    DEMONSTRATED,
    DIRECTIONS,
    DOMAIN_FIELDS,
    DOMAINS,
    EXPERIMENTS,
    FAQ,
    FLAGSHIP_STATION,
    FOUNDATIONS,
    GOALS,
    LEVELS,
    MILESTONES,
    PROGRAMS,
    ROADMAP,
    ROLE_FIELDS,
    ROLES,
    STATION,
    SYSTEM_FIELDS,
    SYSTEMS,
    TWIN_TERMS,
    WHY_TWINS,
} from '@/lib/space-station';

const PATH = '/space-station';
const TITLE = 'Space Station Digital Twin R&D';
const DESCRIPTION =
    'Space station engineering and digital twin R&D at iTelematics: energy systems, health monitoring, simulation, scientific research and engineering opportunities.';

export const metadata: Metadata = {
    ...pageMetadata({
        path: PATH,
        title: TITLE,
        description: DESCRIPTION,
        image: { url: '/images/og/space-station-rd-center.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Space Station Digital Twin R&D Center: a conceptual research space station in orbit above the Earth' },
    }),
    keywords: ['space station digital twin', 'space station engineering', 'station power and energy', 'battery energy storage', 'health monitoring', 'FDIR', 'physics-based modelling', 'mission assurance'],
};

const ON_THIS_PAGE = [
    { href: '#vision', label: 'Vision & goals' },
    { href: '#architecture', label: 'Systems' },
    { href: '#station-model', label: 'Station model' },
    { href: '#learn', label: 'Learn' },
    { href: '#research', label: 'Research' },
    { href: '#develop', label: 'Develop' },
    { href: '#opportunities', label: 'Opportunities' },
    { href: '#roadmap', label: 'Roadmap' },
    { href: '#faq', label: 'FAQ' },
];

const PHILOSOPHY_STEPS = STATION.philosophy.map((name, i, all) => ({ name, tone: i === all.length - 1 ? ('nominal' as const) : undefined }));

const slug = (s: string) => s.toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function SpaceStationPage() {
    return (
        <>
            <JsonLd
                data={[
                    ...pageSchema({ path: PATH, name: `${TITLE} | iTelematics®`, description: DESCRIPTION, breadcrumbs: [{ name: 'Space Station', path: PATH }], image: STATION_IMAGE }),
                    {
                        '@type': 'ResearchProject',
                        '@id': `${SITE.url}${PATH}#research-center`,
                        name: STATION.center,
                        slogan: STATION.headline,
                        description: STATION.mission,
                        url: `${SITE.url}${PATH}`,
                        image: imageObject(STATION_IMAGE),
                        parentOrganization: { '@id': ORG_ID },
                        knowsAbout: [...STATION.identity, ...SYSTEMS.map((s) => s.name)],
                    },
                    { ...faqSchema([...FAQ]), '@id': `${SITE.url}${PATH}#faq` },
                ]}
            />
            {/* Links and CTAs on this page that no other event claims report as space_station_click. */}
            <div data-track-fallback="space_station_click">

            {/* A — Hero */}
            <PageHero
                eyebrow="Space Station Research & Development"
                title={STATION.center}
                lead={STATION.headline}
                breadcrumbs={[{ name: 'Space Station', path: PATH }]}
                visual={<StepFlow steps={PHILOSOPHY_STEPS} variant="path" label="Research philosophy: understand, model, investigate, verify" />}
            >
                <p className={styles.heroText}>
                    Explore the engineering systems, scientific challenges, research opportunities and digital twin technologies required to
                    understand, design, simulate, monitor and verify future space stations.
                </p>
                <div className="actions hero-actions">
                    <Link href="/research-lab" className="btn btn-primary">
                        Explore Research Lab
                    </Link>
                    <Link href="/contact?enquiry=research" className="btn btn-secondary" data-track="research_collaboration_click">
                        Research Collaboration
                    </Link>
                </div>
                <ul className={styles.identity} aria-label="Core research identity">
                    {STATION.identity.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </PageHero>

            <nav className={styles.onPage} aria-label="On this page">
                <div className="container">
                    <ul>
                        {ON_THIS_PAGE.map((l) => (
                            <li key={l.href}>
                                <a href={l.href} data-track-name={`On this page: ${l.label}`}>
                                    {l.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </nav>

            {/* Why digital twins */}
            <section className="section section-alt" data-analytics-section="why-digital-twins">
                <div className="container">
                    <div className="section-head" data-reveal>
                        <p className="eyebrow">The engineering problem</p>
                        <h2>Why space stations need digital twins.</h2>
                        <p className="lead">
                            A space station is a long-lived, tightly coupled system that cannot be taken apart to see what is wrong. Trusted models,
                            kept in step with telemetry, are how engineers understand it.
                        </p>
                    </div>
                    <ul className={styles.grid4}>
                        {WHY_TWINS.map((w) => (
                            <li key={w.title} className={styles.card} data-reveal>
                                <h3>{w.title}</h3>
                                <p>{w.text}</p>
                            </li>
                        ))}
                    </ul>
                    <div className={styles.terms} data-reveal>
                        <p className="label">How we use the words</p>
                        <dl>
                            {TWIN_TERMS.map((t) => (
                                <div key={t.term}>
                                    <dt>{t.term}</dt>
                                    <dd>{t.text}</dd>
                                </div>
                            ))}
                        </dl>
                        <p className={styles.note}>
                            By these definitions, nothing on this site is yet an operational digital twin: the station model below is a simulation of a
                            conceptual station.
                        </p>
                    </div>
                </div>
            </section>

            {/* B — Vision, mission, goals and objectives */}
            <section id="vision" className="section" data-analytics-section="vision-mission">
                <div className="container">
                    <div className={styles.vm}>
                        <div data-reveal>
                            <p className="eyebrow">Vision · {STATION.horizon}</p>
                            <p className={styles.statement}>{STATION.vision}</p>
                        </div>
                        <div data-reveal>
                            <p className="eyebrow">Mission</p>
                            <p className={styles.statement}>{STATION.mission}</p>
                        </div>
                    </div>

                    <div className={`section-head ${styles.subhead}`} data-reveal>
                        <h2>Eight strategic goals.</h2>
                        <p className="lead">Each goal has an objective that can be checked.</p>
                    </div>
                    <ol className={styles.goals}>
                        {GOALS.map((g, i) => (
                            <li key={g.title} data-reveal>
                                <span className={styles.index}>{String(i + 1).padStart(2, '0')}</span>
                                <div>
                                    <h3>{g.title}</h3>
                                    <p>
                                        <span className={styles.fieldLabel}>Objective</span> {g.objective}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>

                    <div className={`section-head ${styles.subhead}`} data-reveal>
                        <h2>Proposed milestones.</h2>
                        <p className="lead">Planning targets, not commitments or achievements. Each depends on research results, people and funding.</p>
                    </div>
                    <ol className={styles.timeline}>
                        {MILESTONES.map((m) => (
                            <li key={m.year} data-reveal>
                                <p className={styles.year}>
                                    {m.year} <MaturityBadge level="Planned" />
                                </p>
                                <p>{m.text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* C — Space station systems architecture */}
            <section id="architecture" className="section section-alt" data-analytics-section="station-architecture">
                <div className="container">
                    <div className="section-head" data-reveal>
                        <p className="eyebrow">Space station systems architecture</p>
                        <h2>Twelve systems. One station.</h2>
                        <p className="lead">
                            Select a system to see its purpose, the physics behind it, what it connects to and what it reports, and where digital
                            twins could help. These are research directions: complete twins do not yet exist for any of them.
                        </p>
                    </div>
                    <Explorer
                        label="Space station systems"
                        prefix="system-"
                        items={SYSTEMS.map((s) => ({ id: s.id, number: s.number, title: s.name, fields: SYSTEM_FIELDS.map((f) => ({ label: f.label, value: s[f.key] })) }))}
                    />
                </div>
            </section>

            {/* D — Interactive station model */}
            <section id="station-model" className="section" data-analytics-section="station-model" data-track-view="station_model_view">
                <div className="container">
                    <div className="section-head" data-reveal>
                        <p className="eyebrow">Interactive station model</p>
                        <h2>Inside a conceptual research station.</h2>
                        <p className="lead">
                            Reveal the station, explore its subsystems, follow its energy and health through an eclipse, then watch a simulated power
                            fault and the protected response. Every value comes from the station reference simulation.
                        </p>
                    </div>
                    <StationTwinViewer />
                </div>
            </section>

            {/* E — What you will learn */}
            <section id="learn" className="section section-alt" data-analytics-section="learn">
                <div className="container">
                    <div className="section-head" data-reveal>
                        <p className="eyebrow">What you will learn</p>
                        <h2>A technical competency pathway.</h2>
                        <p className="lead">
                            For engineers, scientists and technical leaders. A proposed pathway for research competence, not a set of formal courses:
                            each domain is learned through modelling and experiments.
                        </p>
                    </div>
                    <ol className={styles.grid4}>
                        {LEVELS.map((l) => (
                            <li key={l.title} className={styles.card} data-reveal>
                                <p className={styles.fieldLabel}>{l.level}</p>
                                <h3>{l.title}</h3>
                                <p>{l.text}</p>
                            </li>
                        ))}
                    </ol>
                    <div className={styles.domains}>
                        {DOMAINS.map((d, i) => (
                            <details key={d.title} className="disclosure">
                                <summary>
                                    <span>
                                        <span className={styles.domainNum}>{String(i + 1).padStart(2, '0')}</span>
                                        {d.title}
                                    </span>
                                </summary>
                                <div>
                                    <dl className={styles.fields}>
                                        {DOMAIN_FIELDS.map((f) => (
                                            <div key={f.key}>
                                                <dt>{f.label}</dt>
                                                <dd>{d[f.key]}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* F — What you will research */}
            <section id="research" className="section" data-analytics-section="research-programs">
                <div className="container">
                    <div className="section-head" data-reveal>
                        <p className="eyebrow">What you will research</p>
                        <h2>Six R&amp;D programmes.</h2>
                        <p className="lead">
                            Two are active priorities. The others are defined research directions without funded teams or active projects yet.
                        </p>
                    </div>
                    <ul className={styles.grid3}>
                        {PROGRAMS.map((p) => (
                            <li key={p.title} className={styles.card} data-reveal>
                                <div className={styles.badges}>
                                    {p.priority && <span className="badge state-telemetry">Active priority</span>}
                                    <MaturityBadge level={p.maturity} />
                                </div>
                                <h3>{p.title}</h3>
                                <p>{p.text}</p>
                            </li>
                        ))}
                    </ul>
                    <div className={styles.directions} data-reveal>
                        <p className="label">Research directions across the programmes</p>
                        <ul>
                            {DIRECTIONS.map((d) => (
                                <li key={d.title}>
                                    <h3>
                                        {d.title} <MaturityBadge level="Planned" />
                                    </h3>
                                    <p>{d.text}</p>
                                </li>
                            ))}
                        </ul>
                        <p className={styles.note}>All simulated fault injection stays isolated from real control systems.</p>
                    </div>
                </div>
            </section>

            {/* G — What you will develop */}
            <section id="develop" className="section section-alt" data-analytics-section="develop">
                <div className="container">
                    <div className="section-head" data-reveal>
                        <p className="eyebrow">What you will develop</p>
                        <h2>From models to reusable engineering products.</h2>
                        <p className="lead">What exists today, and what is planned. Research becomes a product only once it is verified and documented.</p>
                    </div>
                    <ul className={styles.grid3}>
                        {FOUNDATIONS.map((f) => (
                            <li key={f.title} className={styles.card} data-reveal>
                                <div className={styles.badges}>
                                    <span className="badge state-nominal">Available</span>
                                    {f.maturity.map((m) => (
                                        <MaturityBadge key={m} level={m} />
                                    ))}
                                </div>
                                <h3>{f.title}</h3>
                                <p>{f.text}</p>
                                <Link href={f.href} className={`text-link ${styles.cardLink}`} data-track-name={`See it: ${f.title}`}>
                                    See it →
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <div className={styles.tableWrap} data-reveal>
                        <table className="data-table">
                            <caption className="visually-hidden">Engineering deliverables and their status</caption>
                            <thead>
                                <tr>
                                    <th scope="col">Deliverable</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Where it stands</th>
                                </tr>
                            </thead>
                            <tbody>
                                {DELIVERABLES.map((d) => (
                                    <tr key={d.title}>
                                        <th scope="row">{d.title}</th>
                                        <td>
                                            <span className={`badge ${d.status === 'Started' ? 'state-telemetry' : ''}`}>{d.status}</span>
                                        </td>
                                        <td>{d.note}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* H — Flagship research */}
            <section id="flagship" className="section" data-analytics-section="station-flagship">
                <div className="container">
                    <div className="section-head" data-reveal>
                        <p className="eyebrow">Flagship research</p>
                        <h2>{FLAGSHIP_STATION.title}</h2>
                        <p className={styles.question}>&ldquo;{FLAGSHIP_STATION.question}&rdquo;</p>
                    </div>
                    <ol className={styles.experiments}>
                        {EXPERIMENTS.map((e, i) => (
                            <li key={e.title} className={styles.card} data-reveal>
                                <p className={styles.fieldLabel}>Experiment {i + 1}</p>
                                <h3>{e.title}</h3>
                                <dl className={styles.fields}>
                                    <div>
                                        <dt>Hypothesis</dt>
                                        <dd>{e.hypothesis}</dd>
                                    </div>
                                    <div>
                                        <dt>Model assumptions</dt>
                                        <dd>{e.assumptions}</dd>
                                    </div>
                                    <div>
                                        <dt>Expected outputs</dt>
                                        <dd>{e.outputs}</dd>
                                    </div>
                                    <div>
                                        <dt>Validation criteria</dt>
                                        <dd>{e.validation}</dd>
                                    </div>
                                </dl>
                            </li>
                        ))}
                    </ol>
                    <p className={styles.note}>
                        {DEMONSTRATED} The experiments themselves are defined but not yet run; results will be published with their evidence.
                    </p>
                </div>
            </section>

            {/* I — Skills and research opportunities */}
            <section id="opportunities" className="section section-alt" data-analytics-section="opportunities">
                <div className="container">
                    <div className="section-head" data-reveal>
                        <p className="eyebrow">Skills &amp; research opportunities</p>
                        <h2>Thirteen competency pathways.</h2>
                        <p className="lead">
                            The background, knowledge and tools each kind of contribution needs. These are capability pathways for research, not
                            vacancies or offers of employment.
                        </p>
                    </div>
                    <Explorer
                        label="Competency pathways"
                        prefix="role-"
                        items={ROLES.map((r) => ({ id: slug(r.title), title: r.title, fields: ROLE_FIELDS.map((f) => ({ label: f.label, value: r[f.key] })) }))}
                    />
                </div>
            </section>

            {/* J — Research roadmap */}
            <section id="roadmap" className="section" data-analytics-section="roadmap">
                <div className="container">
                    <div className="section-head" data-reveal>
                        <p className="eyebrow">Research roadmap</p>
                        <h2>From foundations to a long-term vision.</h2>
                        <p className="lead">Each phase depends on the evidence of the one before it.</p>
                    </div>
                    <ol className={styles.roadmap}>
                        {ROADMAP.map((r) => (
                            <li key={r.period} data-reveal>
                                <p className={styles.year}>{r.period}</p>
                                <h3>{r.title}</h3>
                                <p>{r.text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* Frequently asked questions (also published as FAQPage structured data). */}
            <section id="faq" className="section section-alt" data-analytics-section="faq">
                <div className="container">
                    <div className="section-head" data-reveal>
                        <p className="eyebrow">Questions</p>
                        <h2>Frequently asked questions.</h2>
                    </div>
                    <div className={styles.faq}>
                        {FAQ.map((f) => (
                            <details key={f.question} className="disclosure">
                                <summary>{f.question}</summary>
                                <div>
                                    <p>{f.answer}</p>
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* K — Research collaboration */}
            <CtaBand
                title="Collaborate on Space Station Digital Twin Research."
                text="Scientists, researchers, engineering organisations and technical leaders can propose a project, review a model or contribute to an experiment. Tell us the problem, your background and the evidence you could bring. Taking part does not imply employment, funding, certification or university affiliation."
            >
                <Link href="/research-lab" className="btn btn-primary">
                    Explore Research Lab
                </Link>
                <Link href="/contact?enquiry=research" className="btn btn-secondary" data-track="research_collaboration_click">
                    Discuss Research Collaboration
                </Link>
            </CtaBand>
            </div>
        </>
    );
}
