import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';
import { pageMetadata } from '@/lib/metadata';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import ExternalLink from '@/components/site/ExternalLink';
import StepFlow from '@/components/site/StepFlow';
import { CtaBand, PageHero } from '@/components/site/blocks';
import { RESEARCH_AREAS, RESEARCH_THEMES } from '@/lib/research-lab';

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

            <CtaBand title="Choose your Satellite Engineering research." text="Tell us your background and the engineering problem you want to work on.">
                <ResearchLabButtons location="cta-band" />
            </CtaBand>
        </>
    );
}
