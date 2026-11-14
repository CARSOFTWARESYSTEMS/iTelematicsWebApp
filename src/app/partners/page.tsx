import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';
import { pageMetadata } from '@/lib/metadata';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import EcosystemNetwork from '@/components/site/EcosystemNetwork';
import { CtaBand, EcosystemList, PageHero } from '@/components/site/blocks';

const PATH = '/partners';
const TITLE = 'Engineering Ecosystem';
const DESCRIPTION =
    'Space Station Digital Twin R&D collaboration with Gamyaa AeroSystems, APEX Rocket Systems, UFlight™, iFab, Thasmai Infotech, ISHAVASYAM.ORG and EV Society™.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

/** Areas where collaboration is welcome. No new formal relationship is implied by this list. */
const COLLABORATION_AREAS = [
    'Space station systems architecture',
    'Electrical power and energy systems',
    'Physics-based digital twins',
    'Software engineering',
    'Health monitoring',
    'Scientific validation',
    'Engineering assurance',
    'Research infrastructure',
];

export default function PartnersPage() {
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, type: 'CollectionPage', breadcrumbs: [{ name: 'Ecosystem', path: PATH }] })} />
            <PageHero
                title="Engineering Collaboration for Space Station Digital Twin R&D"
                lead="Organisations connected to our engineering projects and research, each relationship described as it stands."
                breadcrumbs={[{ name: 'Ecosystem', path: PATH }]}
                visual={<EcosystemNetwork />}
            />

            <section className="section section-alt" data-analytics-section="Partners & Ecosystem">
                <div className="container">
                    <EcosystemList />
                </div>
            </section>

            <section className="section" data-analytics-section="collaboration-areas">
                <div className="container">
                    <div className="section-head" data-reveal>
                        <h2>Where collaboration helps.</h2>
                        <p className="lead">
                            Areas in which we welcome engineering and research collaboration. Listing an area does not imply a formal partnership
                            with any organisation above.
                        </p>
                    </div>
                    <ul className={styles.areas} data-reveal>
                        {COLLABORATION_AREAS.map((area) => (
                            <li key={area} className="badge">
                                {area}
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <CtaBand title="Industry and ecosystem collaboration." text="Organisations working on space station, spacecraft and digital twin engineering problems are welcome to get in touch.">
                <Link href="/contact?enquiry=industry" className="btn btn-primary" data-track="research_collaboration_click">
                    Discuss Industry Collaboration
                </Link>
            </CtaBand>
        </>
    );
}
