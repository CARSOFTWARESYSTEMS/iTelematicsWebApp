import type { Metadata } from 'next';
import Link from 'next/link';
import { EVENTS } from '@/lib/events/data';
import { isPubliclyVisible, getPrimaryCta } from '@/lib/events/cta';
import EventsCatalogueClient from './EventsCatalogueClient';
import styles from './events.module.css';

export const metadata: Metadata = {
    title: 'Events & Registration | iTelematics Software Private Limited',
    description:
        'Discover and register for iTelematics events across Electric Mobility, Aerospace and Space. Join in-person, online and hybrid programs, workshops, technical sessions and industry events.',
};

export default function EventsPage() {
    const visibleEvents = EVENTS.filter(isPubliclyVisible);
    const pilotEvent = visibleEvents.find((e) => e.isPilot);
    const pilotCta = pilotEvent ? getPrimaryCta(pilotEvent) : null;

    return (
        <div className="container">
            <div className={styles.hero}>
                <h1 className={styles.title}>Events &amp; Registration</h1>
                <p className={styles.subtitle}>
                    Discover and register for iTelematics events across Electric Mobility, Aerospace and Space.
                    Join in-person, online and hybrid programs, workshops, technical sessions and industry events.
                </p>
                <div className={styles.heroActions}>
                    <a href="#catalogue" className="btn btn-primary">Explore Events</a>
                    <Link href="/events/my-registration" className="btn btn-secondary">View My Registration</Link>
                </div>
            </div>

            {pilotEvent && pilotCta && (
                <section className={`bg-glass ${styles.pilotBanner}`} aria-label="CCAvenue payment pilot">
                    <div>
                        <span className="pill">₹1 CCAvenue Validation Pilot</span>
                        <h2>{pilotEvent.title}</h2>
                        <p>
                            This ₹1 registration is a limited pilot for validating the event registration and online
                            payment workflow. No production event fee is represented by this pilot amount.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <Link href={`/events/${pilotEvent.slug}`} className="btn btn-secondary">View Details</Link>
                        {!pilotCta.disabled && pilotCta.href && (
                            <Link href={pilotCta.href} className="btn btn-primary">{pilotCta.label}</Link>
                        )}
                    </div>
                </section>
            )}

            <div id="catalogue">
                <EventsCatalogueClient events={visibleEvents} />
            </div>

            <section className={styles.section}>
                <h2>How Registration Works</h2>
                <div className={styles.steps}>
                    <div className={`bg-glass ${styles.step}`}>
                        <div className={styles.stepNumber}>1</div>
                        <p>Choose an event and view its details.</p>
                    </div>
                    <div className={`bg-glass ${styles.step}`}>
                        <div className={styles.stepNumber}>2</div>
                        <p>Register with your name, email and mobile — no login required.</p>
                    </div>
                    <div className={`bg-glass ${styles.step}`}>
                        <div className={styles.stepNumber}>3</div>
                        <p>Free events confirm instantly. Paid events proceed to a secure payment review.</p>
                    </div>
                    <div className={`bg-glass ${styles.step}`}>
                        <div className={styles.stepNumber}>4</div>
                        <p>In-person/hybrid attendees receive a QR Event Pass; online attendees receive an access link by email.</p>
                    </div>
                </div>
            </section>

            <section className={`bg-glass ${styles.securityNote}`}>
                <p>
                    Payments are processed securely through CCAvenue. iTelematics does not store card numbers, CVV,
                    UPI PINs or internet-banking credentials. Real CCAvenue checkout is not yet integrated — paid
                    registrations this sprint stop at a safe payment boundary and are never confirmed as paid.
                </p>
            </section>

            <nav className={styles.policyLinks} aria-label="Policies and support">
                <Link href="/policies/refund">Cancellation &amp; Refund Policy</Link>
                <Link href="/policies/privacy">Privacy Policy</Link>
                <Link href="/policies/terms">Terms &amp; Conditions</Link>
                <Link href="/policies/delivery">Delivery &amp; Fulfilment Policy</Link>
                <Link href="/contact">Contact Organizer</Link>
            </nav>
        </div>
    );
}
