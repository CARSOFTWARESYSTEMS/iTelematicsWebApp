'use client';

import { useMemo, useState } from 'react';
import { EventRecord, EventDomain, EventMode, EventType } from '@/lib/events/types';
import EventCard from '@/components/events/EventCard';
import styles from './events.module.css';

const DOMAIN_OPTIONS: Array<EventDomain | 'All'> = ['All', 'Electric Mobility', 'Aerospace', 'Space'];
const MODE_OPTIONS: Array<EventMode | 'All'> = ['All', 'In-Person', 'Online', 'Hybrid'];
const TYPE_OPTIONS: Array<EventType | 'All'> = ['All', 'Free', 'Paid'];

export default function EventsCatalogueClient({ events }: { events: EventRecord[] }) {
    const [domain, setDomain] = useState<EventDomain | 'All'>('All');
    const [mode, setMode] = useState<EventMode | 'All'>('All');
    const [type, setType] = useState<EventType | 'All'>('All');
    const [timing, setTiming] = useState<'All' | 'Upcoming' | 'Past'>('All');

    const now = useMemo(() => Date.now(), []);

    const filtered = events.filter((event) => {
        if (domain !== 'All' && event.domain !== domain) return false;
        if (mode !== 'All' && event.mode !== mode) return false;
        if (type !== 'All' && event.type !== type) return false;
        if (timing !== 'All') {
            const isUpcoming = new Date(event.startDateTime).getTime() >= now;
            if (timing === 'Upcoming' && !isUpcoming) return false;
            if (timing === 'Past' && isUpcoming) return false;
        }
        return true;
    });

    return (
        <>
            <div className={styles.filters} role="group" aria-label="Filter events">
                <label className={styles.filterField}>
                    <span>Domain</span>
                    <select value={domain} onChange={(e) => setDomain(e.target.value as EventDomain | 'All')}>
                        {DOMAIN_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </label>
                <label className={styles.filterField}>
                    <span>Mode</span>
                    <select value={mode} onChange={(e) => setMode(e.target.value as EventMode | 'All')}>
                        {MODE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </label>
                <label className={styles.filterField}>
                    <span>Type</span>
                    <select value={type} onChange={(e) => setType(e.target.value as EventType | 'All')}>
                        {TYPE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </label>
                <label className={styles.filterField}>
                    <span>Timing</span>
                    <select value={timing} onChange={(e) => setTiming(e.target.value as 'All' | 'Upcoming' | 'Past')}>
                        <option value="All">All</option>
                        <option value="Upcoming">Upcoming</option>
                        <option value="Past">Past</option>
                    </select>
                </label>
            </div>

            {filtered.length === 0 ? (
                <p className={styles.emptyState} role="status">No events match the selected filters.</p>
            ) : (
                <div className={styles.grid}>
                    {filtered.map((event) => (
                        <EventCard key={event.slug} event={event} />
                    ))}
                </div>
            )}
        </>
    );
}
