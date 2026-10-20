import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import { PageHero } from '@/components/site/blocks';
import { SITE } from '@/lib/site';

const PATH = '/policies/terms';
const TITLE = 'Terms of Use';
const DESCRIPTION = 'Terms of use for itelematics.com, the website of iTelematics Software Private Limited.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

export default function TermsPage() {
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, breadcrumbs: [{ name: TITLE, path: PATH }] })} />
            <PageHero eyebrow="Legal" title={TITLE} lead="Applies to itelematics.com." breadcrumbs={[{ name: TITLE, path: PATH }]} />

            <section className="section">
                <div className="container prose">
                    <h2>About this website</h2>
                    <p>
                        This website is published by {SITE.legalName} (“iTelematics®”, “we”, “us”) to describe its Satellite
                        Engineering research, internships, consultancy and engineering ecosystem.
                    </p>

                    <h2>Technical content</h2>
                    <p>
                        Engineering content on this site, including models, equations, reference cases and telemetry values,
                        is provided for engineering reference and research. Values described as illustrative, simulated or reference are
                        not flight data and are not specifications for real spacecraft. Maturity labels describe the current
                        state of each item. Nothing on this site is flight-qualified or certified for operational use.
                    </p>

                    <h2>Third-party websites</h2>
                    <p>
                        Links to ecosystem organisations and external resources open websites we do not control. Their
                        content and privacy practices are their own. Listing an organisation does not mean it endorses
                        iTelematics®, and relationships are described as they currently stand.
                    </p>

                    <h2>Intellectual property</h2>
                    <p>
                        All content on this site is the property of iTelematics® or its licensors and may not be reproduced
                        without permission, except for brief quotation with attribution for research or review.
                    </p>

                    <h2>Limitation of liability</h2>
                    <p>
                        iTelematics® is not liable for indirect or consequential loss arising from use of this website or its
                        content, to the extent permitted by applicable law.
                    </p>

                    <h2>Governing law</h2>
                    <p>These terms are governed by the laws of India, with courts in Bangalore, Karnataka having jurisdiction.</p>

                    <h2>Contact</h2>
                    <p>
                        {SITE.legalName}
                        <br />
                        CIN {SITE.cin} · GSTIN {SITE.gstin} · MSME {SITE.msme}
                        <br />
                        {SITE.address.display}
                        <br />
                        Email: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
                    </p>
                </div>
            </section>
        </>
    );
}
