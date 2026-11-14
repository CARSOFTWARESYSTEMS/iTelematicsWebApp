import type { Metadata } from 'next';
import styles from './page.module.css';
import { pageMetadata } from '@/lib/metadata';
import ContactForm from '@/components/ContactForm';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import SignalWave from '@/components/site/SignalWave';
import { PageHero } from '@/components/site/blocks';
import { SITE } from '@/lib/site';

const PATH = '/contact';
const TITLE = 'Discuss Space Station Research & Development';
const DESCRIPTION =
    'Contact iTelematics® about Space Station Digital Twin R&D, the Research Lab, research collaboration, technical reviews, industry projects, consultancy or investment.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

const DISCUSS = [
    'Space Station Digital Twin R&D',
    'Research Collaboration',
    'Space Station Digital Twin Research Lab',
    'Academic Collaboration',
    'Industry R&D',
    'Technical Review',
    'Consultancy',
    'Strategic / Investment Discussion',
];

export default function ContactPage() {
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, type: 'ContactPage', breadcrumbs: [{ name: 'Contact', path: PATH }] })} />
            <PageHero
                title="Discuss Space Station Research & Development"
                lead="Research, engineering projects, technical reviews, collaboration or consultancy."
                breadcrumbs={[{ name: 'Contact', path: PATH }]}
                visual={<SignalWave />}
            />

            <section className={styles.main} id="enquiry" data-analytics-section="contact">
                <div className={`container ${styles.grid}`}>
                    <ContactForm location="contact-page" />

                    <aside className={styles.context} aria-label="Ways to get in touch">
                        <div>
                            <h2 className={styles.heading}>Discuss</h2>
                            <ul className={styles.topics}>
                                {DISCUSS.map((topic) => <li key={topic}>{topic}</li>)}
                            </ul>
                        </div>
                        <dl className={styles.direct}>
                            <div>
                                <dt className="label">Email</dt>
                                <dd><a href={`mailto:${SITE.email}`}>{SITE.email}</a></dd>
                            </div>
                            <div>
                                <dt className="label">HR</dt>
                                <dd><a href={`mailto:${SITE.hrEmail}`}>{SITE.hrEmail}</a></dd>
                            </div>
                            <div>
                                <dt className="label">Phone &amp; WhatsApp</dt>
                                <dd><a href={SITE.phoneHref}>{SITE.phone}</a></dd>
                            </div>
                        </dl>
                    </aside>
                </div>
            </section>

            <section className={styles.company} aria-labelledby="company-info">
                <div className="container">
                    <h2 id="company-info" className="label">Company information</h2>
                    <p>
                        {SITE.legalName} · {SITE.address.display}
                        <br />
                        <span className="mono">CIN {SITE.cin} · GSTIN {SITE.gstin} · MSME {SITE.msme}</span>
                    </p>
                </div>
            </section>
        </>
    );
}
