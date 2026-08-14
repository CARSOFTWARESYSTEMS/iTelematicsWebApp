import type { Metadata } from 'next';
import styles from '../policies.module.css';

export const metadata: Metadata = {
    title: 'Privacy Policy | iTelematics Software Private Limited',
    description: 'Privacy Policy for iTelematics Software Private Limited, including Events & Registration.',
};

export default function PrivacyPolicyPage() {
    return (
        <div className="container">
            <div className={styles.section}>
                <h1 className={styles.title}>Privacy Policy</h1>
                <p className={styles.updated}>Applies to itelematics.com, including the Events &amp; Registration section.</p>

                <h2>What We Collect</h2>
                <p>
                    For event registration, we collect only your full name, email address and mobile number. Phase 1
                    registration does not require an account, password, or login — we do not collect or store
                    credentials for event registration.
                </p>
                <p>
                    For paid events, payment is intended to be processed by CCAvenue, a third-party payment gateway.
                    iTelematics does not collect or store card numbers, CVV, UPI PINs or internet-banking credentials.
                    As of this release, real CCAvenue checkout is not yet integrated (see Terms &amp; Conditions and
                    the event registration flow for details) — no live card/UPI/bank data is transmitted or
                    processed through this site today.
                </p>

                <h2>How We Use It</h2>
                <ul>
                    <li>To process and confirm your event registration.</li>
                    <li>To send event-related communication (e.g. confirmation, access details, QR Event Pass), where email delivery is implemented.</li>
                    <li>To prevent duplicate or abusive registration attempts.</li>
                    <li>To meet legal, tax and accounting obligations related to paid events.</li>
                </ul>

                <h2>What We Do Not Do</h2>
                <ul>
                    <li>We do not sell your personal information.</li>
                    <li>We do not request more personal information than is needed to register for an event.</li>
                    <li>We do not publicly display your registration, email or mobile number.</li>
                </ul>

                <h2>Third Parties</h2>
                <p>
                    When real payment processing is integrated, CCAvenue will process payment details directly and
                    will act as an independent data controller for payment data under its own privacy practices.
                </p>

                <h2>Your Rights</h2>
                <p>
                    You may request access to, correction of, or deletion of your registration details by writing to{' '}
                    <a href="mailto:info@iTelematics.com">info@iTelematics.com</a>.
                </p>

                <h2>Contact</h2>
                <div className={`bg-glass ${styles.companyBlock}`}>
                    <p>iTelematics Software Private Limited</p>
                    <p>Bhoganahalli, Bangalore - 560103, India</p>
                    <p>Email: <a href="mailto:info@iTelematics.com">info@iTelematics.com</a> · Phone: <a href="tel:+919108206147">+91 91082 06147</a></p>
                </div>
            </div>
        </div>
    );
}
