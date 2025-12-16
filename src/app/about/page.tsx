import type { Metadata } from 'next';
import styles from './about.module.css';

export const metadata: Metadata = {
    title: 'About | iTelematics Software Private Limited (Bangalore, India)',
    description: 'Learn about iTelematics Software Private Limited—engineering-grade EV telematics, battery intelligence, and secure connected mobility. Powered by EV.ENGINEER™. Bangalore, India.',
};

export default function AboutPage() {
    return (
        <div className="container section">
            <div className={styles.header}>
                <h1 className={styles.title}>About Us</h1>
                <p className={styles.intro}>
                    iTelematics® builds engineering-grade telematics and EV intelligence platforms for fleets, OEMs, and battery-centric mobility systems.
                </p>
            </div>

            <div className={styles.grid}>
                <div className={`bg-glass ${styles.card}`}>
                    <h3 className={styles.cardTitle}>What we build</h3>
                    <ul className={styles.list}>
                        <li>Telematics engineering for EV fleets</li>
                        <li>Battery analytics + diagnostic workflows</li>
                        <li>Secure-by-design connected systems</li>
                        <li>AI-driven EV battery diagnostics & predictive maintenance</li>
                    </ul>
                </div>

                <div className={`bg-glass ${styles.card}`}>
                    <h3 className={styles.cardTitle}>Where we operate</h3>
                    <ul className={styles.list}>
                        <li>Bangalore, India (HQ)</li>
                        <li>Remote delivery for global customers</li>
                        <li>On-site deployment support</li>
                    </ul>
                </div>

                <div className={`bg-glass ${styles.card}`}>
                    <h3 className={styles.cardTitle}>How we work</h3>
                    <ul className={styles.list}>
                        <li>Architecture-first delivery</li>
                        <li>Production-grade engineering</li>
                        <li>Security + reliability focus</li>
                    </ul>
                </div>
            </div>

            <div className={styles.capabilities}>
                <h3>Core Capabilities</h3>
                <div className={styles.chipGrid}>
                    <span className="pill">Cloud Native</span>
                    <span className="pill">Edge AI</span>
                    <span className="pill">BMS Protocols</span>
                    <span className="pill">Cybersecurity</span>
                    <span className="pill">Full Stack</span>
                    <span className="pill">Data Science</span>
                    <span className="pill">Mobile & iOS Engineering</span>
                </div>
            </div>
        </div >
    );
}
