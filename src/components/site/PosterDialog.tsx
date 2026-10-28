"use client";
import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import ExternalLink from './ExternalLink';
import styles from './PosterDialog.module.css';

export type PosterAction = { label: string; href: string; tone?: 'whatsapp' };

type Props = {
    /** Key for "already shown in this browser session". */
    id: string;
    src: string;
    width: number;
    height: number;
    alt: string;
    /** Accessible name of the dialog. */
    label: string;
    actions?: readonly PosterAction[];
    /** Seconds before the poster closes on its own. */
    seconds?: number;
};

/**
 * A poster that opens once per browser session when the page loads and closes itself after a few
 * seconds, or sooner with ✕, Esc or a click outside it. A bar shows the time left; the countdown
 * waits for the image and holds while the mouse is over the poster or the tab is in the background.
 */
export default function PosterDialog({ id, src, width, height, alt, label, actions = [], seconds = 8 }: Props) {
    const dialog = useRef<HTMLDialogElement>(null);
    const remaining = useRef(seconds * 1000);
    const [open, setOpen] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        const key = `poster-seen:${id}`;
        try {
            if (sessionStorage.getItem(key)) return;
            sessionStorage.setItem(key, '1');
        } catch {
            // storage blocked (private mode, policy): show it on every load rather than never
        }
        setOpen(true);
    }, [id]);

    useEffect(() => {
        const el = dialog.current;
        if (open && el && !el.open) el.showModal();
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const update = () => setHidden(document.hidden);
        update();
        document.addEventListener('visibilitychange', update);
        return () => document.removeEventListener('visibilitychange', update);
    }, [open]);

    const paused = !loaded || hovered || hidden;

    useEffect(() => {
        if (!open || paused) return;
        const started = Date.now();
        const timer = window.setTimeout(() => dialog.current?.close(), remaining.current);
        return () => {
            window.clearTimeout(timer);
            remaining.current -= Date.now() - started;
        };
    }, [open, paused]);

    if (!open) return null;

    const close = () => dialog.current?.close();

    return (
        <dialog
            ref={dialog}
            className={styles.dialog}
            aria-label={label}
            data-paused={paused || undefined}
            data-analytics-section="poster"
            onClose={() => setOpen(false)}
            // The dialog is the dimmed backdrop around the panel, so a click that lands on it is outside the poster.
            onClick={(e) => e.target === e.currentTarget && close()}
        >
            <div
                className={`${styles.panel} ${actions.length ? styles.withActions : ''}`}
                style={{ '--ratio': width / height, '--seconds': `${seconds}s` } as CSSProperties}
                // A move, not pointerenter: a cursor resting where the poster appears should not hold it open.
                onPointerMove={(e) => e.pointerType === 'mouse' && setHovered(true)}
                onPointerLeave={() => setHovered(false)}
            >
                <button type="button" className={styles.close} aria-label="Close" onClick={close}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <path d="M18 6 6 18 M6 6 l12 12" />
                    </svg>
                </button>
                <Image
                    src={src}
                    width={width}
                    height={height}
                    alt={alt}
                    className={styles.poster}
                    sizes="(max-width: 992px) 100vw, 960px"
                    loading="eager"
                    onLoad={() => setLoaded(true)}
                />
                <span className={styles.timer} aria-hidden="true" />
                {actions.length > 0 && (
                    <div className={styles.actions}>
                        {actions.map(({ label: text, href, tone }) => {
                            const className = `btn ${tone === 'whatsapp' ? styles.whatsapp : 'btn-secondary'} ${styles.action}`;
                            return /^https?:/.test(href) ? (
                                <ExternalLink key={href} href={href} className={className}>
                                    {text}
                                </ExternalLink>
                            ) : (
                                <a key={href} href={href} className={className}>
                                    {text}
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>
        </dialog>
    );
}
