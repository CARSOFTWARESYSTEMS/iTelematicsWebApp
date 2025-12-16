import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
    return (
        <div className="container">
            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.heroGlow} />
                <div className={styles.heroContent}>

                    <div className={styles.leftCol}>
                        <div className={`pill ${styles.locationBadge}`}>
                            iTelematics Software Private Limited
                        </div>

                        <h1 className={styles.headline}>
                            Engineering-grade <span className={styles.highlight}>Telematics</span> & <span className={styles.highlight}>EV Intelligence</span> for real-world decisions
                        </h1>

                        <p className={styles.subheadline}>
                            Engineering-grade platforms and AI agents that transform EV telematics and battery signals into clear, actionable engineering decisions.
                        </p>

                        <div className={styles.actions}>
                            <Link href="/ev-engineer" className="btn btn-primary">
                                EV.ENGINEER™
                            </Link>
                            <Link href="/contact" className="btn btn-secondary">
                                Contact
                            </Link>
                        </div>
                    </div>

                    <div className={styles.rightCol}>

                        <div className={`${styles.floatingCard} ${styles.card1}`}>
                            <h3 className={styles.cardTitle}>EV Battery Health (SOH)</h3>
                            <p className={styles.cardText}>Track capacity fade, internal resistance rise, cycle aging, and real-world usage patterns.</p>
                        </div>

                        <div className={`${styles.floatingCard} ${styles.card2}`}>
                            <h3 className={styles.cardTitle}>AI Agents for EV Engineers</h3>
                            <p className={styles.cardText}>Battery and vehicle diagnostics, risk assessment, and AI-driven corrective recommendations.</p>
                        </div>

                        <div className={`${styles.floatingCard} ${styles.card3}`}>
                            <div className={styles.chipContainer}>
                                <span className="pill">GenAI</span>
                                <span className="pill">Agentic AI</span>
                                <span className="pill">EV Diagnostics</span>
                                <span className="pill">Predictive Maintenance</span>
                                <span className="pill">Agent Orchestration</span>
                                <span className="pill">Cybersecurity</span>
                                <span className="pill">Mobile & iOS Engineering</span>
                            </div>
                        </div>

                    </div>

                </div>
            </section>

            {/* 3 Section Strip */}
            <section className={styles.featuresStrip}>
                <div className={`${styles.featureCard} bg-glass`} style={{ padding: '2rem' }}>
                    <h3>Telematics Platforms</h3>
                    <ul style={{ paddingLeft: '1.2rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
                        <li>OEM-grade data pipeline</li>
                        <li>Real-time telemetry ingestion</li>
                        <li>Edge-based filtering</li>
                    </ul>
                </div>

                <div className={`${styles.featureCard} bg-glass`} style={{ padding: '2rem' }}>
                    <h3>Battery Intelligence</h3>
                    <ul style={{ paddingLeft: '1.2rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
                        <li>SOH / RUL prediction models</li>
                        <li>Thermal runaway detection</li>
                        <li>Charging profile optimization</li>
                    </ul>
                </div>

                <div className={`${styles.featureCard} bg-glass`} style={{ padding: '2rem' }}>
                    <h3>Secure eMobility</h3>
                    <ul style={{ paddingLeft: '1.2rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
                        <li>End-to-end encryption</li>
                        <li>V2G / V2X protocol support</li>
                        <li>OTA update management</li>
                    </ul>
                </div>
            </section>
        </div>
    );
}
