import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';
import { pageMetadata } from '@/lib/metadata';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import ExternalLink from '@/components/site/ExternalLink';
import StepFlow from '@/components/site/StepFlow';
import { CtaBand, PageHero } from '@/components/site/blocks';
import { CAREER_ROLES, INTERNSHIP_THEMES } from '@/lib/internships';

const PATH = '/internships';
const TITLE = 'Satellite Engineering Internships';
const DESCRIPTION =
    'Satellite Engineering internships built on practical projects: startup ideas, industry requirements and career-focused work in spacecraft systems, energy, telemetry and sensors.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

const EV_ENGINEER_HREF = 'https://ev.engineer';
const PREREQUISITES_HREF = 'https://autonomous.ev.engineer/internships';

/** Apply, plus EV.ENGINEER™ and the internship prerequisites on autonomous.ev.engineer. */
function InternshipButtons({ location }: { location: string }) {
    return (
        <>
            <Link href="/contact?enquiry=internship" className="btn btn-primary" data-track="internship_apply_click">
                Apply / Discuss Internship
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
    { name: 'Career Alignment', tone: 'nominal' as const },
];

export default function InternshipsPage() {
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, breadcrumbs: [{ name: 'Internships', path: PATH }] })} />
            <PageHero
                title="Satellite Engineering Internships"
                lead="Work on practical projects inspired by startup ideas, industry requirements and real engineering problems in the space sector."
                breadcrumbs={[{ name: 'Internships', path: PATH }]}
                visual={<StepFlow steps={PATH_STEPS} variant="path" label="Project path from startup idea to career alignment" />}
            >
                <div className="actions hero-actions">
                    <InternshipButtons location="hero" />
                </div>
            </PageHero>

            <section className="section section-alt" data-analytics-section="themes">
                <div className="container">
                    <ol className={styles.themes}>
                        {INTERNSHIP_THEMES.map((theme, i) => (
                            <li key={theme.title} data-reveal>
                                <span className={styles.index}>0{i + 1}</span>
                                <h2 className={styles.themeTitle}>{theme.title}</h2>
                                <p className={styles.themeText}>{theme.text}</p>
                                {theme.title === 'Career-Focused Work' && (
                                    <ul className={styles.roles} aria-label="Roles">
                                        {CAREER_ROLES.map((role) => <li key={role}>{role}</li>)}
                                    </ul>
                                )}
                            </li>
                        ))}
                    </ol>
                    <p className={styles.note}>
                        Projects use simulation, engineering models and educational hardware; nothing is flight-qualified.
                        Duration, format and availability are confirmed when we discuss your project.
                    </p>
                </div>
            </section>

            <CtaBand title="Choose your Satellite Engineering project." text="Tell us your background and the problem or role you want to work towards.">
                <InternshipButtons location="cta-band" />
            </CtaBand>
        </>
    );
}
