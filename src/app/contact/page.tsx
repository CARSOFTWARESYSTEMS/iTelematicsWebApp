import type { Metadata } from 'next';
import styles from './contact.module.css';

export const metadata: Metadata = {
    title: 'Contact | iTelematics Software Private Limited | Bangalore, India',
    description: 'Contact iTelematics Software Private Limited. Powered by EV.ENGINEER™. Email: info@iTelematics.com | Phone: +91 91082 06147 | Bangalore, India.',
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

export default function ContactPage() {
    return (
        <div className="container">
            <div className={styles.section}>
                <div className={styles.grid}>

                    {/* Form Only - Centered */}
                    <div className={styles.centeredWrapper}>
                        <h1 className={styles.contactTitle}>Contact Us</h1>
                        <p style={{
                            maxWidth: '1000px',
                            margin: '0 auto 1.5rem',
                            fontSize: '1.15rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.6
                        }}>
                            Let’s discuss EV engineering platforms, AI agents, diagnostics, or training collaborations.
                        </p>
                        <p className={styles.intro} style={{ fontWeight: 700 }}>
                            iTelematics Software Private Limited
                        </p>

                        <div className={`bg-glass ${styles.infoCard}`}>
                            <div className={styles.detailGroup}>
                                <span className={styles.label}>Email</span>
                                <p className={styles.value}>
                                    <a href="mailto:info@iTelematics.com">info@iTelematics.com</a>
                                </p>
                            </div>

                            <div className={styles.detailGroup}>
                                <span className={styles.label}>Phone</span>
                                <p className={styles.value}>
                                    <a href="tel:+919108206147">+91 91082 06147</a>
                                </p>
                            </div>

                            <div className={styles.detailGroup}>
                                <span className={styles.label}>WhatsApp</span>
                                <p className={styles.value}>
                                    <a href="https://wa.me/919108206147" target="_blank" rel="noopener noreferrer">
                                        +91 91082 06147
                                    </a>
                                </p>
                            </div>

                            <div className={styles.detailGroup}>
                                <span className={styles.label}>Address</span>
                                <p className={styles.value}>
                                    Bhoganahalli, Bangalore - 560103, India
                                </p>
                            </div>

                            <div className={styles.detailGroup}>
                                <span className={styles.label}>Corporate Identity</span>
                                <p className={styles.value} style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                                    CIN: U72200KA2012PTC065650<br />
                                    GSTIN: 29AADCI0384D1ZQ
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
