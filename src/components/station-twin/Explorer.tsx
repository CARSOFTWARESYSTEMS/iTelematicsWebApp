"use client";
// A list-and-detail explorer for /space-station (station subsystems, research roles). Every panel is
// rendered in the HTML, so the content is readable without script and indexable; script only
// chooses which panel shows. Keyboard: arrow keys, Home and End move between items. A link to
// #<prefix><id> (for example from the station model) opens that item and scrolls to it.
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { track } from '@/lib/analytics/client';
import styles from './Explorer.module.css';

export interface ExplorerItem {
    id: string;
    title: string;
    number?: string;
    fields: readonly { label: string; value: string }[];
}

export default function Explorer({ items, label, prefix }: { items: readonly ExplorerItem[]; label: string; prefix: string }) {
    const [active, setActive] = useState(items[0].id);
    const tabs = useRef<(HTMLButtonElement | null)[]>([]);
    const root = useRef<HTMLDivElement>(null);

    const openFromHash = useCallback(() => {
        const hash = decodeURIComponent(window.location.hash.slice(1));
        if (!hash.startsWith(prefix)) return;
        const id = hash.slice(prefix.length);
        if (!items.some((i) => i.id === id)) return;
        setActive(id);
        requestAnimationFrame(() => root.current?.scrollIntoView({ block: 'start' }));
    }, [items, prefix]);

    useEffect(() => {
        openFromHash();
        window.addEventListener('hashchange', openFromHash);
        return () => window.removeEventListener('hashchange', openFromHash);
    }, [openFromHash]);

    const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
        const delta = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
        const jump = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : null;
        if (!delta && jump === null) return;
        e.preventDefault();
        const next = jump ?? (i + delta + items.length) % items.length;
        setActive(items[next].id);
        // Keyboard selection is not a click, so it is reported here; clicks use data-track.
        track('station_explorer_select', { section: label, cta_location: 'keyboard', cta_name: `${label}: ${items[next].title}` });
        tabs.current[next]?.focus();
        tabs.current[next]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };

    return (
        <div ref={root} className={styles.explorer}>
            <div role="tablist" aria-label={label} aria-orientation="vertical" className={styles.list}>
                {items.map((item, i) => (
                    <button
                        key={item.id}
                        ref={(el) => {
                            tabs.current[i] = el;
                        }}
                        type="button"
                        role="tab"
                        id={`${prefix}tab-${item.id}`}
                        aria-selected={item.id === active}
                        aria-controls={`${prefix}${item.id}`}
                        tabIndex={item.id === active ? 0 : -1}
                        className={styles.tab}
                        onClick={() => setActive(item.id)}
                        onKeyDown={(e) => onKey(e, i)}
                        data-track="station_explorer_select"
                        data-track-name={`${label}: ${item.title}`}
                    >
                        {item.number && (
                            <span className={styles.num} aria-hidden="true">
                                {item.number}
                            </span>
                        )}
                        {item.title}
                    </button>
                ))}
            </div>
            {items.map((item) => (
                <div key={item.id} id={`${prefix}${item.id}`} role="tabpanel" aria-labelledby={`${prefix}tab-${item.id}`} hidden={item.id !== active} className={styles.panel} tabIndex={0}>
                    <h3 className={styles.title}>
                        {item.number && <span className={styles.titleNum}>{item.number}</span>}
                        {item.title}
                    </h3>
                    <dl className={styles.fields}>
                        {item.fields.map((f) => (
                            <div key={f.label}>
                                <dt>{f.label}</dt>
                                <dd>{f.value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            ))}
        </div>
    );
}
