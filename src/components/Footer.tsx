import Link from 'next/link';
import styles from './Footer.module.css';
import AnalyticsPreferencesButton from './analytics/AnalyticsPreferencesButton';
import ExternalLink from './site/ExternalLink';
import { RESOURCES, SITE } from '@/lib/site';

export default function Footer() {
    return (
        <footer className={styles.footer} data-analytics-location="footer">
            <div className={`container ${styles.grid}`}>
                <div className={styles.brand}>
                    <p className={styles.brandName}>iTelematics</p>
                    <p className={styles.brandLine}>{SITE.positioning}</p>
                    <p className={`mono ${styles.descriptor}`}>{SITE.descriptor}</p>
                    <p className={styles.address}>
                        {SITE.legalName}
                        <br />
                        {SITE.address.display}
                        <br />
                        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
                    </p>
                </div>

                <nav aria-label="Satellite Engineering" className={styles.column}>
                    <p className={styles.heading}>Satellite Engineering</p>
                    <ul>
                        <li><Link href="/satellite-engineering">Satellite Engineering</Link></li>
                        <li><Link href="/research-platform">Research Platform</Link></li>
                        <li><Link href="/internships">Internships</Link></li>
                        <li><ExternalLink href={RESOURCES.interactive3d.href}>Interactive 3D</ExternalLink></li>
                    </ul>
                </nav>

                <nav aria-label="Company" className={styles.column}>
                    <p className={styles.heading}>Company</p>
                    <ul>
                        <li><Link href="/about">About</Link></li>
                        <li><Link href="/consultancy">Consultancy &amp; Services</Link></li>
                        <li><Link href="/partners">Partners &amp; Ecosystem</Link></li>
                        <li><Link href="/contact">Contact</Link></li>
                    </ul>
                </nav>

                <nav aria-label="Legal" className={styles.column}>
                    <p className={styles.heading}>Legal</p>
                    <ul>
                        <li><Link href="/policies/privacy">Privacy</Link></li>
                        <li><Link href="/policies/terms">Terms</Link></li>
                        <li><AnalyticsPreferencesButton className={styles.preferencesButton} /></li>
                    </ul>
                </nav>
            </div>

            <div className={`container ${styles.bottom}`}>
                <p>© {new Date().getFullYear()} {SITE.legalName}</p>
                <p className="mono">CIN {SITE.cin}</p>
            </div>
        </footer>
    );
}
