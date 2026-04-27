import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './eve.module.css';

export const metadata: Metadata = {
    title: 'EV.ENGINEER™ | AI Agents for EV Battery Diagnostics & Automotive Engineering',
    description: 'EV.ENGINEER™ is an AI-powered engineering assistant platform for Battery Aadhaar, EV battery diagnostics, fault analysis, safety assessment, and telematics-driven decision support. Built by iTelematics Software Private Limited, Bangalore, India.',
    keywords: [
        'Battery Aadhaar',
        'Battery Passport',
        'EV Battery Diagnostics',
        'EV Telematics',
        'Predictive Maintenance',
        'Automotive AI Copilot',
        'Battery SoC SOH RUL',
        'Engineering AI Agents',
        'EV Software Platform',
        'Autonomous EV'
    ]
};

export default function EVEngineerPage() {
    return (
        <div className="container">
            <div className={styles.hero}>
                <h1 className={styles.title}>EV.ENGINEER™</h1>

                <p className={styles.tagline}>
                    Building{' '}
                    <strong className={styles.glowWord}>World-Class Engineers</strong>
                    {' '}to Solve{' '}
                    <strong className={styles.glowWord}>Energy</strong>
                    {' '}and{' '}
                    <strong className={styles.glowWord}>EV Battery</strong>
                    {' '}Challenges
                </p>

                <p className={styles.intro}>
                    AI-powered engineering assistants for diagnostics, safety analysis, and decision-making.
                    <br />
                    Solutions for <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Battery Aadhaar</span> & <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Battery Passport</span> systems.
                </p>
            </div>




            <div className={styles.grid}>
                {/* Card 1 */}
                <div className={`bg-glass ${styles.card}`}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>EV Battery Diagnostic Agent</h2>
                        <span className={styles.cardSubtitle}>Fault Classification & Risk Assessment</span>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <h4 className={styles.sectionTitle}>Delivers</h4>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Automated fault root cause analysis, thermal runaway likelihood prediction, and maintenance urgency classification.
                        </p>
                    </div>

                    <div>
                        <h4 className={styles.sectionTitle}>Agent Workflow</h4>
                        <div className={styles.workflowStep}>
                            ingest_telemetry ➔ detect_anomalies ➔ explain_risk ➔ recommend_action
                        </div>
                    </div>
                </div>

                {/* Card 2 */}
                <div className={`bg-glass ${styles.card}`}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>AI Copilot for Autonomous EV</h2>
                        <span className={styles.cardSubtitle}>RAG-based Decision Support</span>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <h4 className={styles.sectionTitle}>Delivers</h4>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Interactive Q&A over engineering documentation, DTC logs, and historical service records to speed up troubleshooting.
                        </p>
                    </div>

                    <div>
                        <h4 className={styles.sectionTitle}>Agent Workflow</h4>
                        <div className={styles.workflowStep}>
                            connect_docs ➔ retrieve_context ➔ analyze_logs ➔ guide_engineer
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.useCases}>
                <h3 style={{ marginBottom: '1.5rem' }}>Common Use Cases</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
                    <span className="pill">Battery Aadhaar</span>
                    <span className="pill">Battery Passport</span>
                    <span className="pill">EV Motor Diagnostics</span>
                    <span className="pill">Fleet Battery Monitoring</span>
                    <span className="pill">R&D Battery & Pack Analysis</span>
                    <span className="pill">Service Center Fault Triage</span>
                    <span className="pill">Warranty & Failure Validation</span>
                    <span className="pill">Predictive Maintenance</span>
                    <span className="pill">Autonomous EV</span>
                </div>
            </div>

            <div className={styles.ctaSection}>
                <h2 style={{ marginBottom: '1.5rem' }}>Ready to optimize your EV engineering workflows?</h2>
                <div className={styles.ctaButtons}>
                    <Link href="/contact" className="btn btn-primary">
                        Contact for Demo
                    </Link>
                    <a href="https://autonomous.ev.engineer/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                        AV Workshops
                    </a>
                </div>
            </div>
        </div >
    );
}
