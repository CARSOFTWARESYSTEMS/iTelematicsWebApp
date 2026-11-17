import Link from 'next/link';
import styles from './page.module.css';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import ArchitectureLine from '@/components/site/ArchitectureLine';
import ExternalLink from '@/components/site/ExternalLink';
import OrbitInstrument from '@/components/site/OrbitInstrument';
import PosterDialog from '@/components/site/PosterDialog';
import Satellite3D from '@/components/site/Satellite3D';
import SpaceTwinSection from '@/components/space-twin/SpaceTwinSection';
import StationHero from '@/components/station-twin/StationHero';
import { EcosystemList } from '@/components/site/blocks';
import { RESEARCH_THEMES } from '@/lib/research-lab';
import { FLAGSHIP, JOIN_HREF, RESOURCES, SITE, STATION_IMAGE } from '@/lib/site';
import { EXPERIENCES } from '@/lib/space-twin/experiences';
import { EXTRA_TABS } from '@/lib/space-twin/launch';

const SPACE_LAUNCH_REGISTRY = [...EXPERIENCES, ...EXTRA_TABS].map(({ id, number }) => ({ id, number }));

export default function Home() {
    return (
        <>
            <JsonLd data={pageSchema({ path: '/', name: SITE.title, description: SITE.description, image: STATION_IMAGE })} />
            <PosterDialog
                id="gamyaa-digital-twin"
                spaceLaunchRegistry={SPACE_LAUNCH_REGISTRY}
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
                    <div className={`${styles.heroCopy} ${styles.heroCopyFit}`}>
                        <p className="eyebrow">{SITE.name} · Space Research</p>
                        <h1 className={`${styles.display} ${styles.displayTwoLine}`}>
                            <span>Space Station</span> <span>Digital Twin R&amp;D</span>
                        </h1>
                        <p className={styles.heroStatement}>Engineering the Intelligence Behind Future Space Stations.</p>
                        <p className={`lead ${styles.heroLead}`}>
                            Research and develop physics-based digital twins, energy systems intelligence, integrated health monitoring and
                            engineering assurance technologies for future orbital infrastructure.
                        </p>
                        <div className="actions hero-actions">
                            <Link href="/space-station" className="btn btn-primary">Explore Space Station R&amp;D</Link>
                            <Link href="/research-lab" className="btn btn-secondary">Explore Research Lab</Link>
                        </div>
                    </div>
                    <div className={styles.heroVisual}>
                        <StationHero label="Illustrative conceptual space station in low Earth orbit, with solar wings, truss, radiators and pressurised modules, passing between sunlight and eclipse" />
                    </div>
                    <div className={styles.heroMeta}>
                        <p className="mono">Solar · EPS · Battery · Sensors · Telemetry · Health</p>
                        <Link href="/research-lab" className="text-link">Space Station Digital Twin Research Lab →</Link>
                    </div>
                </div>
            </section>

            {/* 2 — One engineering question */}
            <section className="section section-alt" data-analytics-section="question">
                <div className="container">
                    <div className="section-head center" data-reveal>
                        <h2>Can the satellite complete its mission safely?</h2>
                        <p className="lead">
                            Everything begins with energy, sensing and reliable telemetry. Understanding spacecraft energy and health is an
                            essential foundation for integrated orbital infrastructure research.
                        </p>
                    </div>
                    <div data-reveal>
                        <ArchitectureLine />
                    </div>
                </div>
            </section>

            {/* 3 — Space Digital Twin: four interactive 3D experiences */}
            <SpaceTwinSection />

            {/* 4 — Flagship research */}
            <section className="section" data-analytics-section="home-research-platform" data-track-view="research_platform_view">
                <div className="container">
                    <div className="section-head" data-reveal>
                        <p className="eyebrow">Flagship research</p>
                        <h2>{FLAGSHIP}</h2>
                        <p className="lead">
                            Model how spacecraft generate, store, consume and report energy throughout a mission. Foundational spacecraft
                            energy research supporting the development of future station power and health intelligence.
                        </p>
                    </div>
                    <OrbitInstrument idPrefix="home-orbit" />
                    <div className="actions hero-actions">
                        <Link href="/research-lab#flagship-research" className="btn btn-secondary">Run Mission Scenario</Link>
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
                        <h2>Space Station Digital Twin Research Lab</h2>
                        <p className="lead">
                            Scientific research, mathematical modelling, physics simulation, engineering prototypes, telemetry and health
                            monitoring, experimentation and verification evidence, inspired by startup ideas and real industry requirements.
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
                        <h2>Collaborate on Space Station Digital Twin Research.</h2>
                        <p className="lead">Research, engineering projects, technical reviews, collaboration or consultancy.</p>
                        <div className="actions hero-actions">
                            <Link href={JOIN_HREF} className="btn btn-primary" data-track="join_rnd_click">Discuss Research</Link>
                            <Link href="/space-station" className="btn btn-secondary">Explore Space Station R&amp;D</Link>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
