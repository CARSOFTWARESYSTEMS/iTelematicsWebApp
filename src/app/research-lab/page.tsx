import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';
import { pageMetadata } from '@/lib/metadata';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import ExternalLink from '@/components/site/ExternalLink';
import EnergyFlow from '@/components/site/EnergyFlow';
import ResearchWorkspace from '@/components/site/ResearchWorkspace';
import StepFlow from '@/components/site/StepFlow';
import { CtaBand, MaturityBadge, PageHero } from '@/components/site/blocks';
import SpaceTwinSection from '@/components/space-twin/SpaceTwinSection';
import { PARTICIPATION, RESEARCH_AREAS, RESEARCH_THEMES, STATION_PROGRAMS } from '@/lib/research-lab';
import { FLAGSHIP } from '@/lib/site';

const PATH = '/research-lab';
const TITLE = 'Space Station Digital Twin Research Lab';
const DESCRIPTION =
    'The practical R&D environment for space station digital twins: station energy and health, physics-based models and verification, built on spacecraft research.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

const EV_ENGINEER_HREF = 'https://ev.engineer';
const PREREQUISITES_HREF = 'https://autonomous.ev.engineer/internships';

/** Discuss Research, plus EV.ENGINEER™ and the prerequisites on autonomous.ev.engineer. */
function ResearchLabButtons({ location }: { location: string }) {
    return (
        <>
            <Link href="/contact?enquiry=internship" className="btn btn-primary" data-track="internship_apply_click">
                Discuss Research
            </Link>
            <ExternalLink href={EV_ENGINEER_HREF} className="btn btn-secondary" trackName="EV.ENGINEER™" data-analytics-location={location}>
                EV.ENGINEER™ ↗
            </ExternalLink>
            <ExternalLink href={PREREQUISITES_HREF} className="btn btn-secondary" trackName="Prerequisites" data-analytics-location={location}>
                Prerequisites ↗
            </ExternalLink>
        </>
    );
}

const PATH_STEPS = [
    { name: 'Startup Idea' },
    { name: 'Industry Problem' },
    { name: 'Engineering Project' },
    { name: 'Simulation / Prototype' },
    { name: 'Evidence' },
    { name: 'Research Outcome', tone: 'nominal' as const },
];

export default function ResearchLabPage() {
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, breadcrumbs: [{ name: 'Research Lab', path: PATH }] })} />
            <PageHero
                title="Space Station Digital Twin Research Lab"
                lead="The practical R&D environment for space station digital twins: physics-based models, simulations, experiments and verification evidence, addressing real engineering challenges."
                breadcrumbs={[{ name: 'Research Lab', path: PATH }]}
                visual={<StepFlow steps={PATH_STEPS} variant="path" label="Research path from startup idea to research outcome" />}
            >
                <div className="actions hero-actions">
                    <ResearchLabButtons location="hero" />
                </div>
            </PageHero>

            <SpaceTwinSection />

            <section className="section section-alt" data-analytics-section="themes">
                <div className="container">
                    <ol className={styles.themes}>
                        {RESEARCH_THEMES.map((theme, i) => (
                            <li key={theme.title} data-reveal>
                                <span className={styles.index}>0{i + 1}</span>
                                <h2 className={styles.themeTitle}>{theme.title}</h2>
                                <p className={styles.themeText}>{theme.text}</p>
                                {theme.areas && (
                                    <ul className={styles.roles} aria-label="Research areas">
                                        {RESEARCH_AREAS.map((area) => <li key={area}>{area}</li>)}
                                    </ul>
                                )}
                            </li>
                        ))}
                    </ol>
                    <p className={styles.note}>
                        Research uses simulation, engineering models and educational hardware; nothing is flight-qualified.
                        Taking part does not imply employment, university affiliation, research funding or certification.
                        Scope, format and availability are confirmed when we discuss your research.
                    </p>
                </div>
            </section>

            {/* Station R&D programmes: text-led, with each programme's maturity as it stands today. */}
            <section className="section" data-analytics-section="station-programs">
                <div className="container">
                    <div className="section-head" data-reveal>
                        <p className="eyebrow">Station R&amp;D programmes</p>
                        <h2>Space station digital twin research.</h2>
                        <p className="lead">
                            Six programmes, from the two active priorities (energy and health) to directions not yet started.{' '}
                            <Link href="/space-station#research" className="inline-link">The programmes in detail</Link>
                        </p>
                    </div>
                    <ul className={styles.programs}>
                        {STATION_PROGRAMS.map((p) => (
                            <li key={p.title} className={`surface ${styles.program}`} data-reveal>
                                <MaturityBadge level={p.maturity} />
                                <h3>{p.title}</h3>
                                <p>{p.text}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* Research participation. */}
            <section className="section section-alt" data-analytics-section="participation">
                <div className="container">
                    <div className="section-head" data-reveal>
                        <p className="eyebrow">Research participation</p>
                        <h2>How contributions work.</h2>
                    </div>
                    <dl className={styles.participation}>
                        {PARTICIPATION.map((p) => (
                            <div key={p.title} data-reveal>
                                <dt>{p.title}</dt>
                                <dd>{p.text}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className={styles.note}>
                        Participation does not automatically imply employment, funding, certification or university affiliation.
                    </p>
                </div>
            </section>

            {/* Flagship research: the former /research-platform page (2026-11-14), now part of the Research Lab. */}
            <section
                id="flagship-research"
                className={`section section-alt ${styles.flagship}`}
                data-analytics-section="workspace"
                data-track-view="research_platform_view"
            >
                <div className="container">
                    <div className={styles.flagshipHead}>
                        <div data-reveal>
                            <p className="eyebrow">Flagship research</p>
                            <h2>{FLAGSHIP}</h2>
                            <p className="lead">How a spacecraft generates, stores, consumes and reports energy through every orbit.</p>
                            <p className={styles.context}>
                                Foundational spacecraft power and telemetry research supporting the long-term development of Space Station
                                Digital Twin technologies.
                            </p>
                            <div className={styles.meta}>
                                <MaturityBadge level="Research" />
                                <MaturityBadge level="Simulation" />
                                <span className="badge">Foundational spacecraft reference case</span>
                            </div>
                        </div>
                        <EnergyFlow />
                    </div>
                    <ResearchWorkspace />
                    <div className={styles.collab} data-reveal>
                        <div>
                            <h3>Review, guide or contribute.</h3>
                            <p>Research and collaboration enquiries are welcome from academia, industry and the global space ecosystem.</p>
                        </div>
                        <Link href="/contact?enquiry=research" className="btn btn-primary" data-track="research_collaboration_click">
                            Discuss Research Collaboration
                        </Link>
                    </div>
                </div>
            </section>

            <CtaBand title="Choose your Space Station Digital Twin research." text="Tell us your background and the engineering problem you want to work on.">
                <ResearchLabButtons location="cta-band" />
            </CtaBand>
        </>
    );
}
