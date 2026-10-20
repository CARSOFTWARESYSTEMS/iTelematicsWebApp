import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import Link from 'next/link';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import { CtaBand, PageHero } from '@/components/site/blocks';
import { FLAGSHIP, REGIONS, SITE } from '@/lib/site';

const PATH = '/about';
const TITLE = 'About iTelematics: Satellite Engineering R&D';
const DESCRIPTION =
    'iTelematics Software Private Limited, Bangalore: intern-driven Satellite Engineering R&D in spacecraft energy, telemetry and system health.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

const DIRECTION = [
    ['Problem', 'Satellites depend on reliable energy generation, storage, telemetry and an understanding of subsystem health. A spacecraft cannot be repaired after launch, so these must be engineered and evidenced in advance.'],
    ['Research direction', 'iTelematics is building Satellite Engineering capability through an intern-driven R&D model, organised around one flagship platform: ' + FLAGSHIP + '.'],
    ['Technical focus', 'Spacecraft energy, telemetry and system health: solar arrays, the EPS, batteries, sensors, telemetry and health intelligence.'],
    ['Talent engine', 'Students and interns learn by carrying out structured engineering research and producing evidence that goes through technical review.'],
    ['Long-term value', 'Accumulated engineering models, simulations, datasets, workflows and system knowledge form reusable Satellite Engineering intellectual capital.'],
] as const;

const PRINCIPLES = [
    'Every result carries a maturity label: Concept, Research, Simulation, Prototype, Experimental, Validated or Planned.',
    'We do not claim flight heritage, satellite deployments or partnerships we cannot document.',
    'Assumptions and limitations are published alongside models and results.',
    'Students build the evidence; reviewers and experts are invited to challenge it.',
];

export default function AboutPage() {
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, type: 'AboutPage', breadcrumbs: [{ name: 'About', path: PATH }] })} />
            <PageHero
                eyebrow="About iTelematics"
                title="Satellite Engineering R&D, built by engineers in training"
                lead={`${SITE.legalName} provides an intern-driven Satellite Engineering research environment where students, engineers and researchers learn, simulate, experiment and develop engineering evidence around spacecraft energy, telemetry and system health.`}
                breadcrumbs={[{ name: 'About', path: PATH }]}
            />

            <section className="section" data-analytics-section="direction">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">What we are building</p>
                        <h2>Research direction</h2>
                    </div>
                    <div className="grid grid-3">
                        {DIRECTION.map(([title, text]) => (
                            <div key={title} className="card">
                                <h3>{title}</h3>
                                <p>{text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section" data-analytics-section="principles">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">How we work</p>
                        <h2>Credibility through evidence</h2>
                    </div>
                    <ul className="prose">
                        {PRINCIPLES.map((p) => <li key={p}>{p}</li>)}
                    </ul>
                </div>
            </section>

            <section className="section" data-analytics-section="global">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Global participation</p>
                        <h2>Open to researchers worldwide</h2>
                        <p>
                            Satellite Engineering is inherently global. iTelematics welcomes research discussions, technical
                            reviews, mentorship, academic collaboration and experimental contributions from engineers,
                            scientists and researchers worldwide.
                        </p>
                    </div>
                    <p className="regions">{REGIONS.join(' · ')}</p>
                </div>
            </section>

            <section className="section" data-analytics-section="company">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Company</p>
                        <h2>{SITE.legalName}</h2>
                    </div>
                    <div className="table-wrap">
                        <table className="data-table">
                            <tbody>
                                <tr><td>Registered office</td><td>{SITE.address.display}</td></tr>
                                <tr><td>CIN</td><td className="mono">{SITE.cin}</td></tr>
                                <tr><td>GSTIN</td><td className="mono">{SITE.gstin}</td></tr>
                                <tr><td>MSME</td><td className="mono">{SITE.msme}</td></tr>
                                <tr><td>Email</td><td><a href={`mailto:${SITE.email}`} className="inline-link">{SITE.email}</a></td></tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="hero-actions">
                        Consultancy, workshops and technical resources are offered alongside the research. See{' '}
                        <Link href="/consultancy" className="inline-link">Consultancy &amp; Services</Link>.
                    </p>
                </div>
            </section>

            <CtaBand title="Work with us" text="Internships, research collaboration, technical review or strategic discussion.">
                <Link href="/contact?enquiry=research" className="btn btn-primary" data-track="join_rnd_click">Join Satellite R&amp;D</Link>
                <Link href="/research-platform" className="btn btn-secondary">See the Research Platform</Link>
            </CtaBand>
        </>
    );
}
