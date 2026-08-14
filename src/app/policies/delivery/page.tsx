import type { Metadata } from 'next';
import styles from '../policies.module.css';

export const metadata: Metadata = {
    title: 'Delivery & Service Fulfilment Policy | iTelematics Software Private Limited',
    description: 'Delivery & Service Fulfilment Policy for iTelematics events and registrations.',
};

export default function DeliveryPolicyPage() {
    return (
        <div className="container">
            <div className={styles.section}>
                <h1 className={styles.title}>Delivery &amp; Service Fulfilment Policy</h1>
                <p className={styles.updated}>Applies to itelematics.com Events &amp; Registration.</p>

                <p>
                    Event registration is a service, not a physical good — nothing is shipped. Fulfilment depends on
                    the event mode:
                </p>

                <h2>Online Events</h2>
                <p>
                    Confirmation and the meeting/access link are intended to be delivered by email after a confirmed
                    registration. The meeting link is never published publicly and is never shown before
                    confirmation.
                </p>

                <h2>In-Person Events</h2>
                <p>
                    Confirmation is provided along with venue details already shown on the event page. A QR Event
                    Pass is issued after confirmed registration for check-in at the venue.
                </p>

                <h2>Hybrid Events</h2>
                <p>Combines both: venue details plus a QR Event Pass for in-person attendance, and an access link by email for online attendance.</p>

                <h2>Current Limitation</h2>
                <p>
                    As of this release, automated email delivery is not yet implemented. Where this applies, it is
                    stated explicitly on the relevant registration/confirmation screen rather than assumed. This will
                    be addressed in a future sprint before any event relies on it for delivery.
                </p>

                <h2>Contact</h2>
                <div className={`bg-glass ${styles.companyBlock}`}>
                    <p>iTelematics Software Private Limited</p>
                    <p>Bhoganahalli, Bangalore - 560103, India</p>
                    <p>Email: <a href="mailto:info@iTelematics.com">info@iTelematics.com</a></p>
                </div>
            </div>
        </div>
    );
}
