import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMetadata } from '@/lib/metadata';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import ExternalLink from '@/components/site/ExternalLink';
import { PageHero } from '@/components/site/blocks';
import { RESOURCES } from '@/lib/site';

const PATH = '/ev-engineer';
const TITLE = 'EV.ENGINEER™';
const DESCRIPTION =
    'EV.ENGINEER™ is the iTelematics® engineering platform that hosts the Satellite Engineering reference and the Interactive 3D Satellite, alongside battery-intelligence engineering resources.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

export default function EVEngineerPage() {
    const crumbs = [
        { name: 'Ecosystem', path: '/partners' },
        { name: 'EV.ENGINEER™', path: PATH },
    ];
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, breadcrumbs: crumbs })} />
            <PageHero
                eyebrow="Engineering ecosystem"
                title="EV.ENGINEER™"
                lead="The iTelematics® engineering platform. It hosts the Satellite Engineering reference and the Interactive 3D Satellite, alongside battery-intelligence resources."
                breadcrumbs={crumbs}
            >
                <div className="actions hero-actions">
                    <ExternalLink href={RESOURCES.satelliteEngineering.href} className="btn btn-primary" trackName="Explore Complete Satellite Engineering">
                        Satellite Engineering →
                    </ExternalLink>
                    <ExternalLink href={RESOURCES.interactive3d.href} className="btn btn-secondary" trackName="Open Interactive 3D">
                        Interactive 3D →
                    </ExternalLink>
                </div>
            </PageHero>

            <section className="section section-alt" data-analytics-section="battery-intelligence">
                <div className="container prose">
                    <h2>Battery intelligence</h2>
                    <p>
                        EV.ENGINEER™ also hosts battery-diagnostics and decision-support workflows: fault classification and
                        risk assessment from battery telemetry, and retrieval-based assistance over engineering
                        documentation and fault logs. See{' '}
                        <ExternalLink href="https://autonomous.ev.engineer/" className="inline-link" trackName="autonomous.ev.engineer">
                            autonomous.ev.engineer
                        </ExternalLink>
                        .
                    </p>
                    <p>
                        EV.ENGINEER™ is part of the <Link href="/partners" className="inline-link">iTelematics® engineering ecosystem</Link>.
                        The company’s focus is <Link href="/satellite-engineering" className="inline-link">Satellite Engineering</Link>.
                    </p>
                </div>
            </section>
        </>
    );
}
