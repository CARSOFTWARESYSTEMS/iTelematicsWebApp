import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import Link from 'next/link';
import styles from './page.module.css';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import ExternalLink from '@/components/site/ExternalLink';
import { PageHero } from '@/components/site/blocks';
import { CONSULTANCY_EXTRA_LINKS, CONSULTANCY_GROUPS } from '@/lib/site';

const PATH = '/consultancy';
const TITLE = 'Consultancy & Services';
const DESCRIPTION =
    'Engineering consultancy, workshops and technical resources offered alongside iTelematics Satellite Engineering R&D.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

export default function ConsultancyPage() {
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, type: 'CollectionPage', breadcrumbs: [{ name: TITLE, path: PATH }] })} />
            <PageHero
                eyebrow="Consultancy & Services"
                title="Engineering consultancy and services"
                lead="Alongside our Satellite Engineering R&D, iTelematics offers engineering advisory, workshops and technical resources. Increasingly, this work centres on architecture, simulation, telemetry and systems engineering."
                breadcrumbs={[{ name: TITLE, path: PATH }]}
            >
                <p className={styles.note}>
                    Our primary focus is <Link href="/satellite-engineering">Satellite Engineering R&amp;D</Link>. The services below are offered alongside it.
                </p>
            </PageHero>

            <section className="section" data-analytics-section="Consultancy & Services" data-track-fallback="consultancy_click">
                <div className="container">
                    <div className={styles.groups}>
                        {CONSULTANCY_GROUPS.map((group, i) => (
                            <section key={group.name} className="card" data-analytics-section={group.name} aria-labelledby={`consultancy-group-${i}`}>
                                <h2 id={`consultancy-group-${i}`} className="h3-like">{group.name}</h2>
                                <ul className={styles.links}>
                                    {group.links.map((link) => (
                                        <li key={link.name}>
                                            <ExternalLink href={link.href}>{link.name}</ExternalLink>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                        <section className="card" aria-labelledby="g-faq">
                            <h2 id="g-faq" className="h3-like">Reference</h2>
                            <ul className={styles.links}>
                                {CONSULTANCY_EXTRA_LINKS.map((link) => (
                                    <li key={link.name}>
                                        <ExternalLink href={link.href}>{link.name}</ExternalLink>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </div>

                    <div className={styles.cta}>
                        <div>
                            <h2 className="h3-like">Discuss an engagement</h2>
                            <p>Architecture reviews, simulation, telemetry and systems-engineering advisory, workshops and training.</p>
                        </div>
                        <Link href="/contact?enquiry=consultancy" className="btn btn-secondary">Discuss Consultancy</Link>
                    </div>
                </div>
            </section>
        </>
    );
}
