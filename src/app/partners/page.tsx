import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMetadata } from '@/lib/metadata';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import EcosystemNetwork from '@/components/site/EcosystemNetwork';
import { CtaBand, EcosystemList, PageHero } from '@/components/site/blocks';

const PATH = '/partners';
const TITLE = 'Engineering Ecosystem';
const DESCRIPTION =
    'Organisations and platforms connected to iTelematics® Satellite Engineering: Gamyaa AeroSystems, APEX Rocket Systems, UFlight™, iFab Innovations, EV Society™ and EV.ENGINEER™, each described as it stands.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

export default function PartnersPage() {
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, type: 'CollectionPage', breadcrumbs: [{ name: 'Ecosystem', path: PATH }] })} />
            <PageHero
                title="Engineering Ecosystem"
                lead="Organisations connected to our engineering projects and research."
                breadcrumbs={[{ name: 'Ecosystem', path: PATH }]}
                visual={<EcosystemNetwork />}
            />

            <section className="section section-alt" data-analytics-section="Partners & Ecosystem">
                <div className="container">
                    <EcosystemList />
                </div>
            </section>

            <CtaBand title="Industry and ecosystem collaboration." text="Organisations working on Satellite Engineering problems are welcome to get in touch.">
                <Link href="/contact?enquiry=industry" className="btn btn-primary" data-track="research_collaboration_click">
                    Discuss Industry Collaboration
                </Link>
            </CtaBand>
        </>
    );
}
