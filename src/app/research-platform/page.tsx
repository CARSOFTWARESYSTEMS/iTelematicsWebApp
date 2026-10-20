import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';
import { pageMetadata } from '@/lib/metadata';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import EnergyFlow from '@/components/site/EnergyFlow';
import ResearchWorkspace from '@/components/site/ResearchWorkspace';
import { CtaBand, MaturityBadge, PageHero } from '@/components/site/blocks';
import { FLAGSHIP } from '@/lib/site';

const PATH = '/research-platform';
const TITLE = 'Satellite Energy & Telemetry Intelligence';
const DESCRIPTION =
    'A research instrument for spacecraft energy: orbit, battery state of charge, telemetry and fault scenarios for a 6U reference mission, with equations and engineering evidence.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

export default function ResearchPlatformPage() {
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, breadcrumbs: [{ name: 'Research', path: PATH }] })} />
            <PageHero
                eyebrow="Flagship research"
                title={FLAGSHIP}
                lead="How a spacecraft generates, stores, consumes and reports energy through every orbit."
                breadcrumbs={[{ name: 'Research', path: PATH }]}
                visual={<EnergyFlow />}
            >
                <div className={styles.meta}>
                    <MaturityBadge level="Research" />
                    <MaturityBadge level="Simulation" />
                </div>
                <div className="actions hero-actions">
                    <a href="#workspace" className="btn btn-primary">Run Mission Scenario</a>
                </div>
            </PageHero>

            <section id="workspace" className="section section-alt" data-analytics-section="workspace">
                <div className="container">
                    <ResearchWorkspace />
                </div>
            </section>

            <CtaBand title="Review, guide or contribute." text="Research and collaboration enquiries are welcome from academia, industry and the global space ecosystem.">
                <Link href="/contact?enquiry=research" className="btn btn-primary" data-track="research_collaboration_click">
                    Discuss Research Collaboration
                </Link>
                <Link href="/internships" className="btn btn-secondary">Satellite Engineering Internships</Link>
            </CtaBand>
        </>
    );
}
