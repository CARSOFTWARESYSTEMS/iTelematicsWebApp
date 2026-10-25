"use client";
import { useEffect, useRef, useState } from 'react';
import styles from './LocalNav.module.css';
import { setMotionPaused, useMotionPaused, useReducedMotion } from './Live';

export const LOCAL_SECTIONS = [
    { id: 'research-development', label: 'Overview' },
    { id: 'space', label: 'Space' },
    { id: 'aerospace', label: 'Aerospace' },
    { id: 'battery', label: 'EV & Battery' },
    { id: 'digital-twins', label: 'Digital Twins' },
    { id: 'learning', label: 'Learning' },
    { id: 'ecosystem', label: 'Ecosystem' },
] as const;

/**
 * Sticky section navigation for the EV.ENGINEER™ page, below the site header. Plain anchors
 * (smooth scrolling comes from CSS, off under reduced motion); the section in the reading band
 * is highlighted. Also holds the page-wide control that pauses every animation.
 */
export default function LocalNav() {
    const [active, setActive] = useState<string | null>(null);
    const list = useRef<HTMLUListElement>(null);
    const paused = useMotionPaused();
    const reduced = useReducedMotion();

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') return;
        const targets = LOCAL_SECTIONS.map(({ id }) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
        const visible = new Set<string>();
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) visible.add(entry.target.id);
                    else visible.delete(entry.target.id);
                }
                // The reading band is thin, so at most one or two groups are in it; prefer the later one.
                const current = [...LOCAL_SECTIONS].reverse().find(({ id }) => visible.has(id));
                setActive(current?.id ?? null);
            },
            { rootMargin: '-30% 0px -60% 0px' },
        );
        targets.forEach((t) => observer.observe(t));
        return () => observer.disconnect();
    }, []);

    // Keep the active tab visible in the horizontally scrolling list on narrow screens.
    useEffect(() => {
        const el = list.current;
        const tab = active ? el?.querySelector<HTMLElement>(`[data-id="${active}"]`) : null;
        if (!el || !tab || el.scrollWidth <= el.clientWidth) return;
        el.scrollTo({ left: tab.offsetLeft - (el.clientWidth - tab.offsetWidth) / 2, behavior: reduced ? 'auto' : 'smooth' });
    }, [active, reduced]);

    return (
        <nav className={styles.nav} aria-label="EV.ENGINEER™ sections">
            <div className={`container ${styles.inner}`}>
                <ul ref={list} className={styles.list}>
                    {LOCAL_SECTIONS.map(({ id, label }) => (
                        <li key={id}>
                            <a href={`#${id}`} data-id={id} className={styles.link} aria-current={active === id ? 'true' : undefined}>
                                {label}
                            </a>
                        </li>
                    ))}
                </ul>
                {!reduced && (
                    <button type="button" className={styles.motion} aria-pressed={paused} onClick={() => setMotionPaused(!paused)}>
                        <span aria-hidden="true">{paused ? '▶' : '❚❚'}</span>
                        <span className={styles.motionText}>{paused ? 'Play motion' : 'Pause motion'}</span>
                    </button>
                )}
            </div>
        </nav>
    );
}
