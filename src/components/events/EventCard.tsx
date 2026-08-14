import Link from 'next/link';
import { EventRecord } from '@/lib/events/types';
import { getPrimaryCta, formatEventDateRange } from '@/lib/events/cta';
import styles from './EventCard.module.css';

const STATUS_LABEL: Record<EventRecord['status'], string> = {
    draft: 'Draft',
    registration_open: 'Registration Open',
    registration_closed: 'Registration Closed',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

export default function EventCard({ event }: { event: EventRecord }) {
    const cta = getPrimaryCta(event);

    return (
        <article className={`bg-glass ${styles.card}`}>
            <div className={styles.badgeRow}>
                <span className="pill">{event.domain}</span>
                <span className="pill">{event.mode}</span>
                <span className="pill">{event.type}</span>
            </div>

            <h3 className={styles.title}>{event.title}</h3>
            <p className={styles.date}>{formatEventDateRange(event)}</p>
            <p className={styles.description}>{event.description}</p>

            <div className={styles.footer}>
                <span
                    className={`${styles.statusBadge} ${event.status === 'registration_open' ? styles.statusOpen : styles.statusClosed}`}
                >
                    {STATUS_LABEL[event.status]}
                </span>
                <div className={styles.actions}>
                    <Link href={`/events/${event.slug}`} className="btn btn-secondary">
                        View Details
                    </Link>
                    {!cta.disabled && cta.href && (
                        <Link href={cta.href} className="btn btn-primary">
                            {cta.label}
                        </Link>
                    )}
                </div>
            </div>
        </article>
    );
}
