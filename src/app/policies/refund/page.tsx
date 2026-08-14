import type { Metadata } from 'next';
import styles from '../policies.module.css';

export const metadata: Metadata = {
    title: 'Cancellation & Refund Policy | iTelematics Software Private Limited',
    description: 'Cancellation & Refund Policy for iTelematics events and registrations.',
};

export default function RefundPolicyPage() {
    return (
        <div className="container">
            <div className={styles.section}>
                <h1 className={styles.title}>Cancellation &amp; Refund Policy</h1>
                <p className={styles.updated}>Applies to itelematics.com Events &amp; Registration.</p>

                <h2>Event-Specific Rules</h2>
                <p>
                    Refund eligibility and any applicable refund window are specific to each event and are shown on
                    that event&apos;s detail and payment review pages where applicable. There is no single universal
                    refund period that applies to every event — always check the specific event before registering.
                </p>

                <h2>Free Events</h2>
                <p>
                    Free registrations carry no payment obligation and therefore no refund is applicable. You may
                    withdraw your registration at any time by contacting the organizer.
                </p>

                <h2>Paid Events</h2>
                <p>
                    For paid events, once real CCAvenue payment processing is integrated and a payment is
                    successfully captured and confirmed, refund requests will be handled according to the
                    event-specific refund terms disclosed at the time of registration. Until real payment processing
                    is live, no paid registration can be confirmed and no charge can occur through this site — see
                    the Payment Review step, which stops at a safe boundary rather than completing a transaction.
                </p>

                <h2>₹1 CCAvenue Validation Pilot</h2>
                <p>
                    The ₹1 pilot registration exists to validate the technical payment workflow. If a genuine
                    payment capture ever occurs for this pilot, it is refundable on request. If your account was
                    debited but no confirmed payment/registration was recorded on our side (a &quot;debited but
                    unconfirmed&quot; case), contact us with your bank/UPI transaction reference so we can investigate
                    with our payment gateway and either confirm your registration or process a refund.
                </p>

                <h2>Duplicate Payments</h2>
                <p>
                    If you believe you were charged more than once for the same registration, contact us with both
                    transaction references. We will investigate with the payment gateway before issuing any refund,
                    to confirm which charge (if any) was genuinely duplicated.
                </p>

                <h2>How to Request a Refund or Report an Issue</h2>
                <p>
                    Email <a href="mailto:info@iTelematics.com">info@iTelematics.com</a> with the event name, the
                    email/mobile used at registration, and (for payment issues) your transaction reference. We will
                    acknowledge your request and investigate before confirming any outcome.
                </p>

                <div className={`bg-glass ${styles.companyBlock}`}>
                    <p>iTelematics Software Private Limited</p>
                    <p>Bhoganahalli, Bangalore - 560103, India</p>
                    <p>Email: <a href="mailto:info@iTelematics.com">info@iTelematics.com</a></p>
                </div>
            </div>
        </div>
    );
}
