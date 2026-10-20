import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import ExternalLink from '@/components/site/ExternalLink';
import SubsystemExplorer from '@/components/site/SubsystemExplorer';
import SubsystemSatellite from '@/components/site/SubsystemSatellite';
import { PageHero } from '@/components/site/blocks';
import { RESOURCES } from '@/lib/site';

const PATH = '/satellite-engineering';
const TITLE = 'Satellite Engineering: The Spacecraft as One System';
const DESCRIPTION =
    'Satellite Engineering as one connected system: mission and orbit, power, avionics, ADCS, communications, payload, thermal and ground, with the telemetry that links them.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

export default function SatelliteEngineeringPage() {
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, breadcrumbs: [{ name: 'Satellite Engineering', path: PATH }] })} />
            <PageHero
                title="Satellite Engineering"
                lead="Understand the spacecraft as one connected system."
                breadcrumbs={[{ name: 'Satellite Engineering', path: PATH }]}
                visual={<SubsystemSatellite />}
            />

            <section className="section section-alt" data-analytics-section="subsystems">
                <div className="container">
                    <div className="section-head" data-reveal>
                        <h2>Eight subsystems. One mission.</h2>
                        <p className="lead">Select a subsystem to see what it does, what it depends on and what it reports.</p>
                    </div>
                    <SubsystemExplorer />
                </div>
            </section>

            <section className="section" data-analytics-section="engineering-resources">
                <div className="container">
                    <div className="section-head" data-reveal>
                        <h2>Go deeper.</h2>
                        <p className="lead">
                            {RESOURCES.satelliteEngineering.description} The complete reference and the interactive model
                            are hosted on EV.ENGINEER™.
                        </p>
                    </div>
                    <div className="actions">
                        <ExternalLink href={RESOURCES.satelliteEngineering.href} className="btn btn-primary" trackName="Explore Complete Satellite Engineering">
                            Explore Complete Satellite Engineering →
                        </ExternalLink>
                        <ExternalLink href={RESOURCES.interactive3d.href} className="btn btn-secondary" trackName="Open Interactive 3D">
                            Open Interactive 3D →
                        </ExternalLink>
                    </div>
                </div>
            </section>
        </>
    );
}
