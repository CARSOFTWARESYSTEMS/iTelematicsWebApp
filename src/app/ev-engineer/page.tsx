import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import Link from 'next/link';
import styles from './page.module.css';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import ExternalLink from '@/components/site/ExternalLink';
import { PageHero } from '@/components/site/blocks';
import { RESOURCES } from '@/lib/site';

const PATH = '/ev-engineer';
const TITLE = 'EV.ENGINEER™ Engineering-Learning Platform';
const DESCRIPTION =
    'EV.ENGINEER™ is the iTelematics engineering-learning platform, hosting the Satellite Engineering course and the Interactive 3D Satellite explorer.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

const AGENTS = [
    {
        name: 'Battery diagnostic agent',
        role: 'Fault classification and risk assessment',
        delivers: 'Automated fault root-cause analysis, thermal-runaway likelihood estimation and maintenance-urgency classification.',
        workflow: 'ingest_telemetry → detect_anomalies → explain_risk → recommend_action',
    },
    {
        name: 'Engineering copilot',
        role: 'Retrieval-based decision support',
        delivers: 'Question answering over engineering documentation, fault logs and service records to speed up troubleshooting.',
        workflow: 'connect_docs → retrieve_context → analyze_logs → guide_engineer',
    },
];

export default function EVEngineerPage() {
    return (
        <>
            <JsonLd
                data={pageSchema({
                    path: PATH,
                    name: TITLE,
                    description: DESCRIPTION,
                    breadcrumbs: [
                        { name: 'Partners & Ecosystem', path: '/partners' },
                        { name: 'EV.ENGINEER™', path: PATH },
                    ],
                })}
            />
            <PageHero
                eyebrow="Partners & Ecosystem"
                title="EV.ENGINEER™"
                lead="The iTelematics engineering-learning platform. It supports our Satellite Engineering research with structured learning and interactive models, and hosts battery-intelligence engineering resources."
                breadcrumbs={[
                    { name: 'Partners & Ecosystem', path: '/partners' },
                    { name: 'EV.ENGINEER™', path: PATH },
                ]}
            >
                <div className="actions hero-actions">
                    <ExternalLink href="https://autonomous.ev.engineer/" className="btn btn-secondary" trackName="autonomous.ev.engineer">
                        Visit autonomous.ev.engineer ↗
                    </ExternalLink>
                </div>
            </PageHero>

            <section className="section" data-analytics-section="satellite-resources">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Satellite Engineering on EV.ENGINEER™</p>
                        <h2>Learning resources used by our research</h2>
                    </div>
                    <div className="grid grid-2">
                        <div className="card">
                            <h3>{RESOURCES.satelliteEngineering.name}</h3>
                            <p>{RESOURCES.satelliteEngineering.description}</p>
                            <ExternalLink href={RESOURCES.satelliteEngineering.href} className="text-link" trackName={RESOURCES.satelliteEngineering.cta}>
                                {RESOURCES.satelliteEngineering.cta} ↗
                            </ExternalLink>
                        </div>
                        <div className="card">
                            <h3>{RESOURCES.interactive3d.name}</h3>
                            <p>{RESOURCES.interactive3d.description}</p>
                            <ExternalLink href={RESOURCES.interactive3d.href} className="text-link" trackName={RESOURCES.interactive3d.cta}>
                                {RESOURCES.interactive3d.cta} ↗
                            </ExternalLink>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section" data-analytics-section="battery-intelligence">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Battery intelligence</p>
                        <h2>Engineering agents</h2>
                        <p>Battery diagnostics and decision-support workflows developed on the platform.</p>
                    </div>
                    <div className="grid grid-2">
                        {AGENTS.map((a) => (
                            <article key={a.name} className="card">
                                <h3>{a.name}</h3>
                                <p className={styles.role}>{a.role}</p>
                                <p>{a.delivers}</p>
                                <p className={`mono ${styles.workflow}`}>{a.workflow}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <p>
                        EV.ENGINEER™ is one of several organisations and platforms in the{' '}
                        <Link href="/partners" className="inline-link">iTelematics engineering ecosystem</Link>. The company’s
                        primary focus is <Link href="/satellite-engineering" className="inline-link">Satellite Engineering R&amp;D</Link>.
                    </p>
                </div>
            </section>
        </>
    );
}
