import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import Link from 'next/link';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import { CtaBand, EcosystemGrid, PageHero } from '@/components/site/blocks';

const PATH = '/partners';
const TITLE = 'Partners & Ecosystem';
const DESCRIPTION =
    'The iTelematics engineering ecosystem: Gamyaa AeroSystems, APEX Rocket Systems, iFab Innovations, EV Society™ and EV.ENGINEER™, each described as it stands.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

export default function PartnersPage() {
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, type: 'CollectionPage', breadcrumbs: [{ name: TITLE, path: PATH }] })} />
            <PageHero
                eyebrow="Partners & Ecosystem"
                title="The engineering ecosystem around our research"
                lead="Each relationship is described as it currently stands, including whether it is confirmed or proposed. None of these organisations is presented as a customer, sponsor or endorser of iTelematics."
                breadcrumbs={[{ name: TITLE, path: PATH }]}
            />

            <section className="section" data-analytics-section="Partners & Ecosystem">
                <div className="container">
                    <EcosystemGrid />
                </div>
            </section>

            <CtaBand
                title="Ecosystem and industry collaboration"
                text="Organisations interested in Satellite Engineering research, technical review or collaboration are welcome to get in touch."
            >
                <Link href="/contact?enquiry=industry" className="btn btn-primary" data-track="research_collaboration_click">
                    Discuss Industry Collaboration
                </Link>
                <Link href="/research-platform" className="btn btn-secondary">See the Research Platform</Link>
            </CtaBand>
        </>
    );
}
