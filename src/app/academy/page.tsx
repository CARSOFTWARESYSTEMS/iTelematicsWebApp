import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './academy.module.css';

export const metadata: Metadata = {
    title: 'EV Academy | Practical EV Engineering Programs & Corporate Training',
    description: 'EV Academy by iTelematics® offers hands-on EV engineering programs, internships, campus collaborations, and corporate workshops powered by EV.ENGINEER™.',
    keywords: [
        'Battery Aadhaar',
        'Battery Passport',
        'EV Battery Diagnostics',
        'EV Telematics',
        'Predictive Maintenance',
        'Automotive AI Copilot',
        'Battery SoC SOH RUL',
        'Engineering AI Agents',
        'EV Software Platform'
    ]
};

export default function AcademyPage() {
    return (
        <div className="container">
            <div className={styles.hero}>
                <h1 className={styles.title}>EV Academy</h1>
                <p className={styles.subtitle}>
                    Programs designed to build <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>industry-ready EV engineering skills</span> through hands-on labs, real-world data, and production workflows.
                </p>
            </div>

            <div className={styles.grid}>
                <div className={`bg-glass ${styles.card}`}>
                    <div>
                        <h3 className={styles.cardTitle}>Campus Collaborations</h3>
                        <p className={styles.cardText}>
                            Curriculum design and lab setup for engineering colleges to bridge the industry–production gap.
                        </p>
                    </div>
                    <Link href="/contact" className="btn btn-secondary">
                        Partner with Us
                    </Link>
                </div>

                <div className={`bg-glass ${styles.card}`}>
                    <div>
                        <h3 className={styles.cardTitle}>Industry Internships</h3>
                        <p className={styles.cardText}>
                            Hands-on project experience using real-world EV telematics data, battery signals, and diagnostics workflows.
                        </p>
                    </div>
                    <Link href="/contact" className="btn btn-secondary">
                        Apply Now
                    </Link>
                </div>

                <div className={`bg-glass ${styles.card}`}>
                    <div>
                        <h3 className={styles.cardTitle}>Workshops & Training</h3>
                        <p className={styles.cardText}>
                            Intensive corporate training tracks for upskilling engineering teams in EV software, battery systems, and diagnostics.
                        </p>
                    </div>
                    <Link href="/contact" className="btn btn-secondary">
                        Enquire
                    </Link>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '3rem', marginBottom: '4rem', color: 'var(--text-secondary)', opacity: 0.9 }}>
                <p style={{ maxWidth: '1000px', margin: '0 auto', fontSize: '1.1rem' }}>
                    Built by engineers. Delivered using real EV data, production architectures, and field-tested workflows.
                </p>
            </div>
        </div>
    );
}
