import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={`container ${styles.container}`}>
                <div className={styles.companyInfo}>
                    <h4>iTelematics Software Private Limited</h4>
                    <p>© {new Date().getFullYear()} All rights reserved.</p>
                </div>

                <nav className={styles.policyLinks} aria-label="Policies">
                    <Link href="/about">About</Link>
                    <Link href="/contact">Contact</Link>
                    <Link href="/events">Events &amp; Registration</Link>
                    <Link href="/policies/privacy">Privacy Policy</Link>
                    <Link href="/policies/terms">Terms &amp; Conditions</Link>
                    <Link href="/policies/refund">Cancellation &amp; Refund</Link>
                    <Link href="/policies/delivery">Delivery &amp; Fulfilment</Link>
                </nav>

                <div className={styles.centerContact}>
                    <a href="mailto:info@iTelematics.com">✉️ info@iTelematics.com</a>
                </div>

                <div className={styles.poweredBy}>
                    Powered by <span className={styles.evEngineer}>EV.ENGINEER™</span>
                </div>
            </div>
        </footer>
    );
}
