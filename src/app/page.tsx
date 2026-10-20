import Link from 'next/link';
import styles from './page.module.css';
import ContactForm from '@/components/ContactForm';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import ExternalLink from '@/components/site/ExternalLink';
import MissionStateExplorer from '@/components/site/MissionStateExplorer';
import OrbitVisual from '@/components/site/OrbitVisual';
import { EcosystemGrid, MissionFlow, ResourceCards } from '@/components/site/blocks';
import { CORE_QUESTION, FLAGSHIP, REGIONS, RESOURCES, SITE } from '@/lib/site';

const LEARNING = [
    ['Fundamentals', 'Mission, orbit and spacecraft architecture'],
    ['Energy', 'Solar array, EPS, battery and power budget'],
    ['Instrumentation', 'Sensors, voltage, current and thermal measurements'],
    ['Telemetry', 'Onboard data, communication and ground analysis'],
    ['Simulation', 'Sunlight, eclipse, loads and energy behaviour'],
    ['Health Intelligence', 'Nominal state, faults, anomalies and mission decisions'],
    ['Engineering Evidence', 'Requirements, models, test results and technical documentation'],
] as const;

const PARTICIPATION = [
    ['Researchers', 'Review models, assumptions, simulations and engineering methods.'],
    ['Space scientists', 'Contribute domain perspectives and research questions.'],
    ['Professors', 'Guide student research, experiments and engineering validation.'],
    ['Industry engineers', 'Bring practical spacecraft requirements and verification perspectives.'],
    ['CTOs & chief architects', 'Evaluate the architecture, system interactions and research direction.'],
    ['Students & interns', 'Build simulations, run experiments and produce engineering evidence.'],
] as const;

export default function Home() {
    return (
        <>
            <JsonLd data={pageSchema({ path: '/', name: 'iTelematics | Satellite Engineering R&D & Internships', description: SITE.description })} />

            {/* 01 — Hero */}
            <section className={styles.hero} data-analytics-section="hero">
                <div className={`container ${styles.heroGrid}`}>
                    <div>
                        <p className="eyebrow">Intern-driven Satellite Engineering R&amp;D</p>
                        <h1 className={styles.heroTitle}>
                            Satellite Engineering
                            <span className={styles.heroSub}>Learn. Simulate. Experiment. Engineer.</span>
                        </h1>
                        <p className={`lead ${styles.heroLead}`}>
                            {SITE.legalName} carries out practical research in spacecraft energy, solar power, batteries,
                            EPS, sensors, telemetry and satellite health intelligence, with Satellite Engineering
                            internships at its core.
                        </p>
                        <div className="actions">
                            <Link href="/satellite-engineering" className="btn btn-primary">Explore Satellite Engineering</Link>
                            <Link href="/contact?enquiry=research" className="btn btn-secondary" data-track="join_rnd_click">Join R&amp;D</Link>
                        </div>
                        <p className={`mono ${styles.descriptor}`}>{SITE.descriptor}</p>
                    </div>
                    <OrbitVisual />
                </div>

                <div className="container">
                    <ul className={styles.signposts}>
                        <li>
                            <span className={styles.signLabel}>Flagship R&amp;D</span>
                            <Link href="/research-platform" className={styles.signLink}>{FLAGSHIP} →</Link>
                        </li>
                        <li>
                            <span className={styles.signLabel}>Internships</span>
                            <Link href="/internships" className={styles.signLink}>Research-based Satellite Engineering internships →</Link>
                        </li>
                        <li>
                            <span className={styles.signLabel}>Learning environment</span>
                            <span className={styles.signLinks}>
                                <ExternalLink href={RESOURCES.satelliteEngineering.href} className={styles.signLink}>Satellite Engineering course ↗</ExternalLink>
                                <ExternalLink href={RESOURCES.interactive3d.href} className={styles.signLink}>Interactive 3D satellite ↗</ExternalLink>
                            </span>
                        </li>
                    </ul>
                </div>
            </section>

            {/* 02 — One mission */}
            <section className="section" data-analytics-section="mission">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">One engineering mission</p>
                        <h2 className={styles.statement}>
                            Understand how a satellite generates energy, stores it, distributes it, measures its environment,
                            communicates its state and remains healthy throughout a mission.
                        </h2>
                    </div>
                    <MissionFlow />
                </div>
            </section>

            {/* 03 — Flagship research platform */}
            <section
                className="section"
                data-analytics-section="home-research-platform"
                data-track-view="research_platform_view"
            >
                <div className="container">
                    <div className={styles.flagshipHead}>
                        <div className="section-head">
                            <p className="eyebrow">Flagship research platform</p>
                            <h2>{FLAGSHIP}</h2>
                            <p>Build an engineering understanding of spacecraft energy and health from telemetry.</p>
                        </div>
                        <blockquote className={styles.question}>
                            <span className={styles.questionLabel}>Core engineering question</span>
                            <p>{CORE_QUESTION}</p>
                        </blockquote>
                    </div>
                    <MissionStateExplorer idPrefix="home" />
                    <div className={`actions ${styles.sectionActions}`}>
                        <Link href="/research-platform" className="btn btn-primary">Explore the Research Platform</Link>
                    </div>
                </div>
            </section>

            {/* 04 — Learning progression */}
            <section className="section" data-analytics-section="learning">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Learning path</p>
                        <h2>Learn Satellite Engineering by engineering it</h2>
                    </div>
                    <ol className={styles.learning}>
                        {LEARNING.map(([title, text], i) => (
                            <li key={title}>
                                <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                                <h3>{title}</h3>
                                <p>{text}</p>
                            </li>
                        ))}
                    </ol>
                    <Link href="/satellite-engineering" className="text-link">How the subsystems fit together →</Link>
                </div>
            </section>

            {/* 05 — Engineering resources */}
            <section className="section" data-analytics-section="engineering-resources">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Engineering learning environment</p>
                        <h2>Go deeper into spacecraft systems</h2>
                        <p>Hosted on EV.ENGINEER™, the iTelematics engineering-learning platform.</p>
                    </div>
                    <ResourceCards />
                </div>
            </section>

            {/* 06 — Global research participation */}
            <section className="section" data-analytics-section="global-research">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Global research participation</p>
                        <h2>Research without borders</h2>
                        <p>
                            We welcome technical discussions with students, researchers, professors, engineers, space
                            scientists, systems architects, CTOs and R&amp;D leaders interested in Satellite Engineering.
                        </p>
                    </div>
                    <p className={`mono ${styles.regions}`}>{REGIONS.join(' · ')}</p>
                    <dl className={styles.participation}>
                        {PARTICIPATION.map(([who, what]) => (
                            <div key={who}>
                                <dt>{who}</dt>
                                <dd>{what}</dd>
                            </div>
                        ))}
                    </dl>
                    <div className={`actions ${styles.sectionActions}`}>
                        <Link href="/contact?enquiry=research" className="btn btn-primary" data-track="research_collaboration_click">
                            Discuss R&amp;D Collaboration
                        </Link>
                        <Link href="/research-platform#open-questions" className="btn btn-secondary">Join Research</Link>
                    </div>
                </div>
            </section>

            {/* 07 — Partners & ecosystem */}
            <section className="section" data-analytics-section="partners">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Partners &amp; ecosystem</p>
                        <h2>The engineering ecosystem around our research</h2>
                    </div>
                    <EcosystemGrid compact />
                    <Link href="/partners" className="text-link">How each relationship stands →</Link>
                </div>
            </section>

            {/* 08 — Internship */}
            <section className="section" data-analytics-section="internship-cta">
                <div className="container">
                    <div className={styles.internship}>
                        <div>
                            <p className="eyebrow">Satellite Engineering internships</p>
                            <h2>Build your Satellite Engineering foundation</h2>
                            <p>
                                Work on real engineering questions involving spacecraft energy, telemetry, sensors,
                                simulations and system behaviour, and leave with engineering evidence you can defend.
                            </p>
                        </div>
                        <div className="actions">
                            <Link href="/internships" className="btn btn-primary">Explore Satellite Engineering Internship</Link>
                            <Link href="/contact?enquiry=internship" className="btn btn-secondary" data-track="internship_apply_click">
                                Apply for Internship
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* 09 — Contact */}
            <section className="section" id="contact" data-analytics-section="contact">
                <div className={`container ${styles.contact}`}>
                    <div>
                        <p className="eyebrow">Contact</p>
                        <h2>Discuss Satellite Engineering</h2>
                        <p>
                            Internships, research or academic collaboration, technical reviews, industry collaboration,
                            consultancy, the research platform, or investment and strategic discussions.
                        </p>
                        <p className={styles.contactDirect}>
                            Prefer email? <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
                        </p>
                    </div>
                    <ContactForm location="home-contact" />
                </div>
            </section>
        </>
    );
}
