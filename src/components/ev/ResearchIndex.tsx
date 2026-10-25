"use client";
import { useEffect, useState } from 'react';
import styles from './ResearchIndex.module.css';
import ExternalLink from '@/components/site/ExternalLink';
import type { IndexGroup } from '@/lib/ev-engineer';

const PHONE = '(max-width: 639px)';

function Links({ group }: { group: IndexGroup }) {
    return (
        <ul>
            {group.links.map((link) => (
                <li key={link.href + link.label}>
                    <ExternalLink href={link.href} className={styles.link} data-track={link.event} data-analytics-location="research-index" trackName={link.label}>
                        {link.label}
                        <span aria-hidden="true">↗</span>
                    </ExternalLink>
                </li>
            ))}
        </ul>
    );
}

const count = (group: IndexGroup) => <span className="mono">{String(group.links.length).padStart(2, '0')}</span>;

/**
 * Every research link, grouped. Rendered open (and in the server HTML) on wider screens; on phones
 * each group becomes a collapsed disclosure so the list stays compact.
 */
export default function ResearchIndex({ groups }: { groups: IndexGroup[] }) {
    const [compact, setCompact] = useState(false);

    useEffect(() => {
        const query = window.matchMedia(PHONE);
        const update = () => setCompact(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    return (
        <div className={styles.index}>
            {groups.map((group) =>
                compact ? (
                    <details key={group.name} className={styles.group}>
                        <summary className={styles.summary}>
                            <h3 className={styles.title}>{group.name}</h3>
                            {count(group)}
                        </summary>
                        <Links group={group} />
                    </details>
                ) : (
                    <div key={group.name} className={styles.group}>
                        <h3 className={`${styles.title} ${styles.heading}`}>
                            {group.name}
                            {count(group)}
                        </h3>
                        <Links group={group} />
                    </div>
                ),
            )}
        </div>
    );
}
