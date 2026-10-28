import Link from 'next/link';
import styles from './page.module.css';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import ArchitectureLine from '@/components/site/ArchitectureLine';
import ExternalLink from '@/components/site/ExternalLink';
import OrbitInstrument from '@/components/site/OrbitInstrument';
import PosterDialog from '@/components/site/PosterDialog';
import Satellite3D from '@/components/site/Satellite3D';
import { EcosystemList } from '@/components/site/blocks';
import { INTERNSHIP_THEMES } from '@/lib/internships';
import { FLAGSHIP, JOIN_HREF, RESOURCES, SITE } from '@/lib/site';

export default function Home() {
    return (
        <>
            <JsonLd data={pageSchema({ path: '/', name: 'iTelematics® | Satellite Engineering & Internships', description: SITE.description })} />
            <PosterDialog
                id="ishavasyam-digital-twin"
                src="/images/ishavasyam-digital-twin.webp"
                width={1672}
                height={941}
                label="ISHAVASYAM.ORG: Digital Twin Design"
                alt="Digital Twin Design, physics based: a dimensioned blueprint of a space station module above the Earth. ISHAVASYAM.ORG, Space Station Research Organisation. Aerospace, Defence, Space."
                actions={[
                    { label: 'WhatsApp', href: SITE.whatsappHref, tone: 'whatsapp' },
                    { label: `Call ${SITE.phone}`, href: SITE.phoneHref },
                    { label: SITE.email, href: `mailto:${SITE.email}` },
                ]}
            />

            {/* 1 — Hero */}
            <section className={styles.hero} data-analytics-section="hero">
                <div className={`container ${styles.heroGrid}`}>
                    <div className={styles.heroCopy}>
                        <p className="eyebrow">{SITE.legalName}</p>
                        <h1 className={styles.display}>Satellite Engineering</h1>
                        <p className={`lead ${styles.heroLead}`}>
                            Practical projects for startups, industry requirements and career-focused engineering internships.
                        </p>
                        <div className="actions hero-actions">
                            <Link href="/research-platform" className="btn btn-primary">Explore Research</Link>
                            <Link href={JOIN_HREF} className="btn btn-secondary" data-track="join_rnd_click">Discuss Research</Link>
                        </div>
                    </div>
                    <div className={styles.heroVisual}>
                        <Satellite3D
                            variant="hero"
                            label="Illustrative 6U satellite with deployed solar arrays, alternating between sunlight and eclipse"
                        />
                    </div>
                    <div className={styles.heroMeta}>
                        <p className="mono">Solar · EPS · Battery · Sensors · Telemetry · Health</p>
                        <Link href="/internships" className="text-link">Satellite Engineering Internships →</Link>
                    </div>
                </div>
            </section>

            {/* 2 — One engineering question */}
            <section className="section section-alt" data-analytics-section="question">
                <div className="container">
                    <div className="section-head center" data-reveal>
                        <h2>Can the satellite complete its mission safely?</h2>
                        <p className="lead">Everything begins with energy, sensing and reliable telemetry.</p>
                    </div>
                    <div data-reveal>
                        <ArchitectureLine />
                    </div>
                </div>
            </section>

            {/* 3 — Flagship research */}
            <section className="section" data-analytics-section="home-research-platform" data-track-view="research_platform_view">
                <div className="container">
                    <div className="section-head" data-reveal>
                        <p className="eyebrow">Flagship research</p>
                        <h2>{FLAGSHIP}</h2>
                        <p className="lead">Model how spacecraft generate, store, consume and report energy throughout a mission.</p>
                    </div>
                    <OrbitInstrument idPrefix="home-orbit" />
                    <div className="actions hero-actions">
                        <Link href="/research-platform" className="btn btn-secondary">Explore Research Platform</Link>
                    </div>
                </div>
            </section>

            {/* 4 — Interactive satellite */}
            <section className={styles.cinema} data-analytics-section="interactive-3d">
                <div className={`container ${styles.cinemaGrid}`}>
                    <div className={styles.cinemaCopy} data-reveal>
                        <p className="eyebrow">Interactive satellite</p>
                        <h2>Open the spacecraft.</h2>
                        <p className="lead">Explore subsystem relationships, power paths, telemetry and mission flow.</p>
                        <div className="actions hero-actions">
                            <ExternalLink href={RESOURCES.interactive3d.href} className="btn btn-primary" trackName="Launch Interactive 3D">
                                Launch Interactive 3D →
                            </ExternalLink>
                        </div>
                        <ExternalLink href={RESOURCES.satelliteEngineering.href} className={`text-link ${styles.cinemaLink}`} trackName="Explore complete Satellite Engineering">
                            Explore complete Satellite Engineering ↗
                        </ExternalLink>
                    </div>
                    <div className={styles.cinemaVisual}>
                        <Satellite3D variant="open" label="Exploded 6U satellite showing its internal stack: EPS, onboard computer, ADCS, radio and payload" />
                    </div>
                </div>
            </section>

            {/* 5 — Internships */}
            <section className="section section-alt" data-analytics-section="internship-cta">
                <div className={`container ${styles.split}`}>
                    <div data-reveal>
                        <h2>Satellite Engineering Internships</h2>
                        <p className="lead">
                            Work on practical projects inspired by startup ideas, industry requirements and real engineering
                            problems in the space sector.
                        </p>
                        <div className="actions hero-actions">
                            <Link href="/internships" className="btn btn-primary">Explore Internships</Link>
                            <Link href="/contact?enquiry=internship" className="btn btn-secondary" data-track="internship_apply_click">
                                Apply / Discuss
                            </Link>
                        </div>
                    </div>
                    <ol className={styles.themes} data-reveal>
                        {INTERNSHIP_THEMES.map((theme, i) => (
                            <li key={theme.title}>
                                <span className="mono">0{i + 1}</span>
                                {theme.title}
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* 6 — Ecosystem and final call to action */}
            <section className="section" data-analytics-section="partners">
                <div className="container">
                    <div className={styles.ecoHead} data-reveal>
                        <h2>Engineering ecosystem</h2>
                        <Link href="/partners" className="text-link">How each relationship stands →</Link>
                    </div>
                    <EcosystemList compact />

                    <div className={styles.final} data-reveal>
                        <h2>Start a Satellite Engineering discussion.</h2>
                        <p className="lead">Research, internships, technical reviews, collaboration or consultancy.</p>
                        <div className="actions hero-actions">
                            <Link href="/contact" className="btn btn-primary">Start a Discussion</Link>
                            <Link href="/satellite-engineering" className="btn btn-secondary">Explore Satellite Engineering</Link>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
