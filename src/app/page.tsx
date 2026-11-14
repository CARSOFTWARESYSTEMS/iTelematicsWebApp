import Link from 'next/link';
import styles from './page.module.css';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import ArchitectureLine from '@/components/site/ArchitectureLine';
import ExternalLink from '@/components/site/ExternalLink';
import OrbitInstrument from '@/components/site/OrbitInstrument';
import PosterDialog from '@/components/site/PosterDialog';
import Satellite3D from '@/components/site/Satellite3D';
import SpaceTwinViewer from '@/components/space-twin/SpaceTwinViewer';
import { EcosystemList } from '@/components/site/blocks';
import { RESEARCH_THEMES } from '@/lib/research-lab';
import { FLAGSHIP, JOIN_HREF, RESOURCES, SITE } from '@/lib/site';

export default function Home() {
    return (
        <>
            <JsonLd data={pageSchema({ path: '/', name: 'iTelematics® | Satellite Engineering & Research Lab', description: SITE.description })} />
            <PosterDialog
                id="gamyaa-digital-twin"
                src="/images/gamyaa-digital-twin-research.webp"
                width={1672}
                height={941}
                label="Gamyaa AeroSystems: Digital Twin Design"
                alt="Digital Twin Design, physics based: a dimensioned blueprint of a space station module above the Earth. GAMYAA Aero Systems Private Limited, Space Systems & Digital Twin Research. Aerospace, Defence, Space."
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
                            Practical satellite engineering research, digital twin development and collaborative R&amp;D addressing real industry challenges.
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
                        <Link href="/research-lab" className="text-link">Satellite Engineering Research Lab →</Link>
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

            {/* 3 — Space Station Digital Twin R&D Center: four interactive 3D experiences */}
            <section id="space-digital-twin" className={styles.twin} data-analytics-section="space-digital-twin">
                <div className="container">
                    <div className={styles.twinHead} data-reveal>
                        <div>
                            <p className="eyebrow">
                                <span className={styles.brandCase}>{SITE.name}</span> · Space Research
                            </p>
                            <h2>Space Station Digital Twin R&amp;D Center</h2>
                            <p className={styles.twinTitle}>Learn to Protect Missions.</p>
                            <p className={styles.twinSupport}>Build Systems That Protect Spacecraft.</p>
                        </div>
                        <div className={styles.twinIntro}>
                            <p className="lead">
                                Explore satellites, spacecraft, orbital constellations and space stations through realistic 3D engineering
                                experiences. Discover how electrical power, energy storage, telemetry, physics, cybersecurity and intelligent
                                health monitoring support space missions.
                            </p>
                            <p className="label">Explore. Experiment. Understand.</p>
                        </div>
                    </div>
                    <SpaceTwinViewer />
                </div>
            </section>

            {/* 4 — Flagship research */}
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

            {/* 5 — Interactive satellite */}
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

            {/* 6 — Research Lab */}
            <section className="section section-alt" data-analytics-section="internship-cta">
                <div className={`container ${styles.split}`}>
                    <div data-reveal>
                        <h2>Satellite Engineering Research Lab</h2>
                        <p className="lead">
                            Practical research inspired by startup ideas, industry requirements and real engineering problems
                            in the space sector.
                        </p>
                        <div className="actions hero-actions">
                            <Link href="/research-lab" className="btn btn-primary">Explore Research Lab</Link>
                            <Link href="/contact?enquiry=internship" className="btn btn-secondary" data-track="internship_apply_click">
                                Discuss Research
                            </Link>
                        </div>
                    </div>
                    <ol className={styles.themes} data-reveal>
                        {RESEARCH_THEMES.map((theme, i) => (
                            <li key={theme.title}>
                                <span className="mono">0{i + 1}</span>
                                {theme.title}
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* 7 — Ecosystem and final call to action */}
            <section className="section" data-analytics-section="partners">
                <div className="container">
                    <div className={styles.ecoHead} data-reveal>
                        <h2>Engineering ecosystem</h2>
                        <Link href="/partners" className="text-link">How each relationship stands →</Link>
                    </div>
                    <EcosystemList compact />

                    <div className={styles.final} data-reveal>
                        <h2>Start a Satellite Engineering discussion.</h2>
                        <p className="lead">Research, engineering projects, technical reviews, collaboration or consultancy.</p>
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
