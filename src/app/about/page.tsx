import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';
import { pageMetadata } from '@/lib/metadata';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import StepFlow from '@/components/site/StepFlow';
import { PageHero } from '@/components/site/blocks';
import { SITE } from '@/lib/site';

const PATH = '/about';
const TITLE = 'About iTelematics®';
const DESCRIPTION =
    'iTelematics Software Private Limited, Bangalore: applied Satellite Engineering projects shaped by startup opportunities, industry requirements and real career pathways.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

const PILLARS = [
    ['Mission', 'Practical Satellite Engineering capability in spacecraft energy, telemetry and system health.'],
    ['Method', 'Applied projects built on startup ideas, industry requirements and real engineering problems.'],
    ['Evidence', 'Model, simulate, validate and document. Every result carries an honest maturity label.'],
] as const;

export default function AboutPage() {
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, type: 'AboutPage', breadcrumbs: [{ name: 'About', path: PATH }] })} />
            <PageHero
                eyebrow="Why iTelematics®"
                title="Satellite Engineering"
                lead="Applied projects shaped by startup opportunities, industry requirements and real career pathways in space engineering."
                breadcrumbs={[{ name: 'About', path: PATH }]}
                visual={
                    <StepFlow
                        variant="ladder"
                        label="Mission, energy, telemetry, evidence"
                        steps={[
                            { name: 'Mission', tone: 'orbit' },
                            { name: 'Energy', tone: 'solar' },
                            { name: 'Telemetry', tone: 'telemetry' },
                            { name: 'Evidence', tone: 'nominal' },
                        ]}
                    />
                }
            />

            <section className="section section-alt" data-analytics-section="pillars">
                <div className="container">
                    <ol className={styles.pillars}>
                        {PILLARS.map(([title, text], i) => (
                            <li key={title} data-reveal>
                                <span className="mono">0{i + 1}</span>
                                <h2>{title}</h2>
                                <p>{text}</p>
                            </li>
                        ))}
                    </ol>
                    <p className={styles.principle}>
                        We do not claim flight heritage, satellite deployments or partnerships we cannot document.
                        Consultancy and workshops are offered alongside this work; see{' '}
                        <Link href="/consultancy" className="inline-link">Consultancy &amp; Services</Link>.
                    </p>
                </div>
            </section>

            <section className="section" data-analytics-section="company">
                <div className="container">
                    <h2 className={styles.companyTitle}>Company information</h2>
                    <dl className={styles.company}>
                        <div><dt className="label">Company</dt><dd>{SITE.legalName}</dd></div>
                        <div><dt className="label">Registered office</dt><dd>{SITE.address.display}</dd></div>
                        <div><dt className="label">CIN</dt><dd className="mono">{SITE.cin}</dd></div>
                        <div><dt className="label">GSTIN</dt><dd className="mono">{SITE.gstin}</dd></div>
                        <div><dt className="label">MSME</dt><dd className="mono">{SITE.msme}</dd></div>
                        <div><dt className="label">Email</dt><dd><a href={`mailto:${SITE.email}`} className="inline-link">{SITE.email}</a></dd></div>
                    </dl>
                </div>
            </section>
        </>
    );
}
