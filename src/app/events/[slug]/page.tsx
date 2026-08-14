import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEventBySlug, getAllEventSlugs, computePricing } from '@/lib/events/data';
import { isPubliclyVisible, getPrimaryCta, formatEventDateRange } from '@/lib/events/cta';
import styles from './detail.module.css';

export function generateStaticParams() {
    return getAllEventSlugs().map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const event = getEventBySlug(slug);
    if (!event || !isPubliclyVisible(event)) {
        return { title: 'Event Not Found | iTelematics' };
    }
    return {
        title: `${event.title} | iTelematics Events & Registration`,
        description: event.description,
    };
}

export default async function EventDetailPage({ params }: Props) {
    const { slug } = await params;
    const event = getEventBySlug(slug);
    if (!event || !isPubliclyVisible(event)) {
        notFound();
    }

    const cta = getPrimaryCta(event);
    const pricing = computePricing(event);
    const showsVenue = event.mode === 'In-Person' || event.mode === 'Hybrid';
    const showsOnline = event.mode === 'Online' || event.mode === 'Hybrid';

    return (
        <div className="container">
            <div className={styles.section}>
                <div className={styles.badgeRow}>
                    <span className="pill">{event.domain}</span>
                    <span className="pill">{event.mode}</span>
                    <span className="pill">{event.type}</span>
                    {event.isPilot && <span className="pill">CCAvenue Validation Pilot</span>}
                </div>

                <h1 className={styles.title}>{event.title}</h1>
                <p className={styles.date}>{formatEventDateRange(event)}</p>
                <p className={styles.description}>{event.description}</p>

                <div className={styles.grid}>
                    <div className={`bg-glass ${styles.mainCol}`}>
                        <h2>Event Details</h2>
                        <dl className={styles.detailList}>
                            <div>
                                <dt>Organizer</dt>
                                <dd>{event.organizer}</dd>
                            </div>
                            {showsVenue && event.venue && (
                                <div>
                                    <dt>Venue</dt>
                                    <dd>{event.venue}</dd>
                                </div>
                            )}
                            {showsOnline && (
                                <div>
                                    <dt>Online Access</dt>
                                    <dd>
                                        Online badge — the meeting/access link is never shown publicly. It is sent
                                        by email only after a confirmed registration.
                                    </dd>
                                </div>
                            )}
                            {event.registrationDeadline && (
                                <div>
                                    <dt>Registration Deadline</dt>
                                    <dd>{new Date(event.registrationDeadline).toLocaleString('en-IN', { timeZone: event.timezone })}</dd>
                                </div>
                            )}
                            {event.capacity && (
                                <div>
                                    <dt>Capacity</dt>
                                    <dd>{event.capacity} seats</dd>
                                </div>
                            )}
                            {showsVenue && (
                                <div>
                                    <dt>QR Event Pass</dt>
                                    <dd>Issued after confirmed registration for check-in.</dd>
                                </div>
                            )}
                        </dl>

                        {event.type === 'Paid' && (
                            <>
                                <h2>Pricing</h2>
                                <dl className={styles.detailList}>
                                    <div>
                                        <dt>Registration Fee</dt>
                                        <dd>₹{pricing.baseFeeInr.toFixed(2)}</dd>
                                    </div>
                                    {pricing.taxesFeesInr > 0 && (
                                        <div>
                                            <dt>Taxes/Fees</dt>
                                            <dd>₹{pricing.taxesFeesInr.toFixed(2)}</dd>
                                        </div>
                                    )}
                                    <div>
                                        <dt>Final Payable</dt>
                                        <dd>₹{pricing.finalPayableInr.toFixed(2)} INR</dd>
                                    </div>
                                </dl>
                                {event.isPilot && (
                                    <p className={styles.pilotNote}>
                                        This ₹1 registration is a limited pilot for validating the event
                                        registration and online payment workflow. No production event fee is
                                        represented by this pilot amount.
                                    </p>
                                )}
                            </>
                        )}

                        {event.refundSummary && (
                            <p className={styles.refundSummary}>
                                {event.refundSummary} Full details: <Link href="/policies/refund">Cancellation &amp; Refund Policy</Link>.
                            </p>
                        )}
                    </div>

                    <aside className={`bg-glass ${styles.sideCol}`}>
                        <h2>Register</h2>
                        {cta.disabled ? (
                            <p className={styles.disabledCta}>{cta.label}</p>
                        ) : (
                            cta.href && (
                                <Link href={cta.href} className="btn btn-primary" style={{ width: '100%' }}>
                                    {cta.label}
                                </Link>
                            )
                        )}
                        <a
                            href={`mailto:${event.organizerContactEmail}`}
                            className="btn btn-secondary"
                            style={{ width: '100%', marginTop: '0.75rem' }}
                        >
                            Contact Organizer
                        </a>
                        <Link
                            href="/events/my-registration"
                            className={styles.viewRegistrationLink}
                        >
                            Already registered? View My Registration
                        </Link>
                    </aside>
                </div>
            </div>
        </div>
    );
}
