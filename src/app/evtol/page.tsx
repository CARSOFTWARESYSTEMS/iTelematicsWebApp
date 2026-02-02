import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
    title: 'eVTOL Solutions | AI-Powered Air Taxi Engineering',
    description: 'AI-assisted engineering for safe, efficient, and certifiable electric Air Taxi (eVTOL) systems. End-to-end design, simulation, and certification support.',
    keywords: [
        'eVTOL',
        'Air Taxi',
        'Urban Air Mobility',
        'AI Engineering',
        'Electric Aircraft',
        'Certification',
        'Digital Twin',
        'Aerospace System Architecture'
    ]
};

export default function EvtolPage() {
    return (
        <div className="container">
            {/* HERO SECTION */}
            <div className={styles.hero}>
                <h1 className={styles.title}>AI-Powered Air Taxi (eVTOL) Solutions</h1>
                <h2 className={styles.subtitle}>
                    AI-assisted engineering for safe, efficient, and certifiable electric air mobility systems.
                </h2>
                <p className={styles.intro}>
                    End-to-end AI-assisted design and development of electric Air Taxi (eVTOL) systems covering mission definition, system architecture, and performance validation. Producing certification-ready engineering evidence, safety artifacts, and predictive operational intelligence.
                </p>
                <Link href="#contact" className="btn btn-primary">
                    Explore eVTOL Platform
                </Link>
            </div>

            {/* AI AGENT SECTION */}
            <div className={styles.grid}>
                {/* Card 1 */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>eVTOL System Architecture Agent</h2>
                        <span className={styles.cardSubtitle}>AI-assisted system-of-systems design</span>
                    </div>

                    <div style={{ marginBottom: '2rem', flex: 1 }}>
                        <h4 className={styles.sectionTitle}>Delivers</h4>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                            <li>Mission-driven requirement breakdown</li>
                            <li>Propulsion & battery architecture modeling</li>
                            <li>Avionics & communication network design</li>
                            <li>Thermal and structural integration</li>
                            <li>Redundancy and fail-safe architecture planning</li>
                        </ul>
                    </div>

                    <div>
                        <h4 className={styles.sectionTitle}>Agent Workflow</h4>
                        <div className={styles.workflowStep}>
                            define_mission → derive_requirements → generate_architecture → evaluate_tradeoffs → optimize_design
                        </div>
                    </div>
                </div>

                {/* Card 2 */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>eVTOL Digital Twin & Certification Copilot</h2>
                        <span className={styles.cardSubtitle}>Simulation, validation & safety intelligence</span>
                    </div>

                    <div style={{ marginBottom: '2rem', flex: 1 }}>
                        <h4 className={styles.sectionTitle}>Delivers</h4>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                            <li>Flight performance simulations</li>
                            <li>Structural stress & fatigue modeling</li>
                            <li>Thermal and battery safety simulation</li>
                            <li>AI-assisted safety analysis (FMEA, FHA)</li>
                            <li>Certification evidence documentation support</li>
                        </ul>
                    </div>

                    <div>
                        <h4 className={styles.sectionTitle}>Agent Workflow</h4>
                        <div className={styles.workflowStep}>
                            simulate_mission → analyze_structures → evaluate_safety → validate_models → generate_cert_artifacts
                        </div>
                    </div>
                </div>
            </div>

            {/* KEY HIGHLIGHTS GRID */}
            <div style={{ marginTop: '5rem', marginBottom: '2rem' }}>
                <h3 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '2rem' }}>Key Capabilities</h3>
                <div className={styles.highlightsGrid}>
                    <div className={styles.highlightCard}>
                        <div className={styles.highlightIcon}>🚁</div>
                        <h4 className={styles.highlightTitle}>Mission Engineering</h4>
                    </div>
                    <div className={styles.highlightCard}>
                        <div className={styles.highlightIcon}>📐</div>
                        <h4 className={styles.highlightTitle}>System-of-Systems Architecture</h4>
                    </div>
                    <div className={styles.highlightCard}>
                        <div className={styles.highlightIcon}>🤖</div>
                        <h4 className={styles.highlightTitle}>AI Design Optimization</h4>
                    </div>
                    <div className={styles.highlightCard}>
                        <div className={styles.highlightIcon}>🌐</div>
                        <h4 className={styles.highlightTitle}>Digital Twin Simulation</h4>
                    </div>
                    <div className={styles.highlightCard}>
                        <div className={styles.highlightIcon}>🛡️</div>
                        <h4 className={styles.highlightTitle}>Safety & Certification Intelligence</h4>
                    </div>
                    <div className={styles.highlightCard}>
                        <div className={styles.highlightIcon}>📊</div>
                        <h4 className={styles.highlightTitle}>Predictive Maintenance & Analytics</h4>
                    </div>
                </div>
            </div>

            {/* COMMON USE CASES */}
            <div className={styles.useCases}>
                <h3 style={{ marginBottom: '2rem', fontSize: '1.8rem' }}>Common Use Cases</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
                    <span className="pill">Urban Air Taxi Route Planning</span>
                    <span className="pill">Energy & Range Optimization</span>
                    <span className="pill">Structural Load Validation</span>
                    <span className="pill">Thermal Runaway Risk Analysis</span>
                    <span className="pill">Redundancy & Failure Modeling</span>
                    <span className="pill">Certification Evidence Preparation</span>
                    <span className="pill">Predictive Maintenance for eVTOL Fleets</span>
                </div>
            </div>

            {/* PLATFORM FOUNDATION STRIP */}
            <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Powered by AI Engineering Infrastructure</h3>
                <div className={styles.foundationStrip}>
                    <div className={styles.foundationItem}>
                        <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>☁️</span>
                        <span className={styles.foundationTitle}>Cloud simulation platform</span>
                    </div>
                    <div className={styles.foundationItem}>
                        <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🧠</span>
                        <span className={styles.foundationTitle}>AI model training pipelines</span>
                    </div>
                    <div className={styles.foundationItem}>
                        <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🕸️</span>
                        <span className={styles.foundationTitle}>Engineering knowledge graphs</span>
                    </div>
                    <div className={styles.foundationItem}>
                        <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>💾</span>
                        <span className={styles.foundationTitle}>Telemetry data lake</span>
                    </div>
                </div>
            </div>

            {/* FINAL CTA */}
            <div className={styles.ctaSection} id="contact">
                <h2 style={{ marginBottom: '1.5rem', fontSize: '2.5rem', fontWeight: 'bold' }}>Ready to design the future of urban air mobility?</h2>
                <Link href="/contact" className="btn btn-primary">
                    Talk to eVTOL Experts
                </Link>
            </div>
        </div>
    );
}
