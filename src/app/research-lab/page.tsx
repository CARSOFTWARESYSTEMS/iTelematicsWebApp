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
import { RESEARCH_AREAS, RESEARCH_THEMES } from '@/lib/research-lab';
import { FLAGSHIP } from '@/lib/site';

const PATH = '/research-lab';
const TITLE = 'Satellite Engineering Research Lab';
const DESCRIPTION =
    'Explore practical research in satellite electrical power systems, battery energy storage, telemetry, spacecraft health, physics-based modelling and digital twin engineering.';

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
                title="Satellite Engineering Research Lab"
                lead="Practical satellite engineering research, digital twin development and collaborative R&D addressing real industry challenges."
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
                            <div className={styles.meta}>
                                <MaturityBadge level="Research" />
                                <MaturityBadge level="Simulation" />
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

            <CtaBand title="Choose your Satellite Engineering research." text="Tell us your background and the engineering problem you want to work on.">
                <ResearchLabButtons location="cta-band" />
            </CtaBand>
        </>
    );
}
