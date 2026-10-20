import Link from 'next/link';
import styles from './Footer.module.css';
import AnalyticsPreferencesButton from './analytics/AnalyticsPreferencesButton';
import ExternalLink from './site/ExternalLink';
import { RESOURCES, SITE } from '@/lib/site';

export default function Footer() {
    return (
        <footer className={styles.footer} data-analytics-location="footer">
            <div className={styles.inner}>
                <div className={styles.brand}>
                    <p className={styles.brandName}>iTelematics®</p>
                    <p className={styles.brandLine}>Satellite Engineering</p>
                </div>

                <nav aria-label="Research" className={styles.column}>
                    <p className={styles.heading}>Research</p>
                    <ul>
                        <li><Link href="/satellite-engineering">Satellite Engineering</Link></li>
                        <li><Link href="/research-platform">Research Platform</Link></li>
                        <li><ExternalLink href={RESOURCES.interactive3d.href}>Interactive 3D</ExternalLink></li>
                        <li><Link href="/internships">Internships</Link></li>
                    </ul>
                </nav>

                <nav aria-label="Company" className={styles.column}>
                    <p className={styles.heading}>Company</p>
                    <ul>
                        <li><Link href="/partners">Ecosystem</Link></li>
                        <li><Link href="/consultancy">Consultancy</Link></li>
                        <li><Link href="/about">About</Link></li>
                        <li><Link href="/contact">Contact</Link></li>
                    </ul>
                </nav>

                <nav aria-label="Legal" className={styles.column}>
                    <p className={styles.heading}>Legal</p>
                    <ul>
                        <li><Link href="/policies/privacy">Privacy</Link></li>
                        <li><Link href="/policies/terms">Terms</Link></li>
                        <li><AnalyticsPreferencesButton className={styles.preferences} /></li>
                    </ul>
                </nav>
            </div>
            <p className={styles.bottom}>© {new Date().getFullYear()} {SITE.legalName}</p>
        </footer>
    );
}
