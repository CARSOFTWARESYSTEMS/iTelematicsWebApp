import type { Metadata } from 'next';
import styles from '../policies.module.css';

export const metadata: Metadata = {
    title: 'Terms & Conditions | iTelematics Software Private Limited',
    description: 'Terms & Conditions for iTelematics Software Private Limited, including Events & Registration.',
};

export default function TermsPage() {
    return (
        <div className="container">
            <div className={styles.section}>
                <h1 className={styles.title}>Terms &amp; Conditions</h1>
                <p className={styles.updated}>Applies to itelematics.com, including the Events &amp; Registration section.</p>

                <h2>Event Publishing</h2>
                <p>
                    Events listed under Events &amp; Registration are published solely by iTelematics Software
                    Private Limited (&quot;iTelematics&quot;, &quot;we&quot;, &quot;us&quot;). We are the organizer and merchant of
                    record for all listed events.
                </p>

                <h2>Registration</h2>
                <p>
                    Phase 1 registration does not require creating an account. You provide your full name, email and
                    mobile number, which must be accurate and belong to you. Registration for a given event is
                    subject to that event&apos;s availability, capacity and registration deadline, all enforced
                    server-side.
                </p>

                <h2>Pricing</h2>
                <p>
                    All fees are shown in Indian Rupees (INR) and are set solely by iTelematics for each event. The
                    amount shown in the payment review step is the amount that will be requested from the payment
                    gateway — it cannot be altered by your browser, device, or any request you send.
                </p>

                <h2>₹1 CCAvenue Validation Pilot</h2>
                <p>
                    &quot;Event Registration &amp; Payment Pilot&quot; is a ₹1 registration used solely to validate the
                    registration and payment workflow ahead of full CCAvenue integration. It does not represent a
                    production event fee.
                </p>

                <h2>Payment Processing</h2>
                <p>
                    Payments are intended to be processed securely through CCAvenue. iTelematics does not store card
                    numbers, CVV, UPI PINs or internet-banking credentials. As of this release, real CCAvenue
                    checkout is not yet integrated: paid registrations stop at a safe review boundary and are never
                    confirmed as paid by this site.
                </p>

                <h2>Conduct at Events</h2>
                <p>
                    Attendees are expected to conduct themselves professionally. iTelematics may refuse entry or
                    participation for conduct that disrupts an event or endangers other attendees.
                </p>

                <h2>Intellectual Property</h2>
                <p>
                    All content on this site, including event materials, is the property of iTelematics or its
                    licensors and may not be reproduced without permission.
                </p>

                <h2>Limitation of Liability</h2>
                <p>
                    iTelematics is not liable for indirect or consequential loss arising from event participation,
                    to the extent permitted by applicable law.
                </p>

                <h2>Governing Law</h2>
                <p>These terms are governed by the laws of India, with courts in Bangalore, Karnataka having jurisdiction.</p>

                <h2>Contact</h2>
                <div className={`bg-glass ${styles.companyBlock}`}>
                    <p>iTelematics Software Private Limited</p>
                    <p>CIN: U72200KA2012PTC065650 · GSTIN: 29AADCI0384D1ZQ · MSME: UDYAM-KR-02-0123269</p>
                    <p>Bhoganahalli, Bangalore - 560103, India</p>
                    <p>Email: <a href="mailto:info@iTelematics.com">info@iTelematics.com</a></p>
                </div>
            </div>
        </div>
    );
}
