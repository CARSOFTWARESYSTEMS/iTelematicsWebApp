import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';
import { pageMetadata } from '@/lib/metadata';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import ExternalLink from '@/components/site/ExternalLink';
import { PageHero } from '@/components/site/blocks';
import { CONSULTANCY_EXTRA_LINKS, CONSULTANCY_GROUPS } from '@/lib/site';

const PATH = '/consultancy';
const TITLE = 'Consultancy & Services';
const DESCRIPTION = 'Engineering consultancy, workshops and technical resources from iTelematics®, offered alongside its Satellite Engineering work.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

export default function ConsultancyPage() {
    const groups = [...CONSULTANCY_GROUPS, { name: 'Reference', links: CONSULTANCY_EXTRA_LINKS }];
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, type: 'CollectionPage', breadcrumbs: [{ name: 'Consultancy', path: PATH }] })} />
            <PageHero
                title="Consultancy & Services"
                lead="Engineering advisory, workshops and technical resources, offered alongside our Satellite Engineering work."
                breadcrumbs={[{ name: 'Consultancy', path: PATH }]}
            />

            <section className="section section-alt" data-analytics-section="Consultancy & Services" data-track-fallback="consultancy_click">
                <div className="container">
                    <div className={styles.groups}>
                        {groups.map((group, i) => (
                            <section
                                key={group.name}
                                id={group.name.toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                                data-analytics-section={group.name}
                                aria-labelledby={`consultancy-group-${i}`}
                            >
                                <h2 id={`consultancy-group-${i}`} className={styles.groupTitle}>{group.name}</h2>
                                <ul className={styles.links}>
                                    {group.links.map((link) => (
                                        <li key={link.name}>
                                            <ExternalLink href={link.href}>{link.name}</ExternalLink>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>
                    <p className={styles.cta}>
                        Architecture reviews, simulation, telemetry and systems-engineering advisory.{' '}
                        <Link href="/contact?enquiry=consultancy" className="inline-link">Discuss consultancy</Link>
                    </p>
                </div>
            </section>
        </>
    );
}
