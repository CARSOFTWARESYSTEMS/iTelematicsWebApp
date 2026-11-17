'use client';
// Share (added 2026-11-17): the shareable link of the option on screen (docs/SPACE_DIGITAL_TWIN_LINKS.md),
// to copy, send by WhatsApp or email, or pass to the device's own share sheet where there is one.
import { useEffect, useId, useRef, useState } from 'react';
import ExternalLink from '@/components/site/ExternalLink';
import { SITE } from '@/lib/site';
import styles from './SpaceTwin.module.css';

/** The link that opens an option of the viewer, by its tab number: https://itelematics.com/?space_digital_twin=6 */
export const shareUrl = (number: string) => `${SITE.url}/?space_digital_twin=${Number(number)}`;

function ShareIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="3.5" r="2" />
            <circle cx="4" cy="8" r="2" />
            <circle cx="12" cy="12.5" r="2" />
            <path d="M5.8 7 10.2 4.5M5.8 9l4.4 2.5" />
        </svg>
    );
}

export default function ShareLink({ number, label, narrated }: { number: string; label: string; narrated: boolean }) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [canShare, setCanShare] = useState(false);
    const wrap = useRef<HTMLDivElement>(null);
    const toggle = useRef<HTMLButtonElement>(null);
    const copyBtn = useRef<HTMLButtonElement>(null);
    const field = useRef<HTMLParagraphElement>(null);
    const panelId = useId();
    const url = shareUrl(number);
    const title = `${label} · ${SITE.name} Space Digital Twin`;
    const line = `Opens ${label} full screen and plays every stage in order${narrated ? ', with sound and voice narration' : ''}.`;
    const track = (what: string) => `Space Digital Twin share: ${what} ${number}`;

    useEffect(() => setCanShare(typeof navigator.share === 'function'), []);
    // Another option chosen while the panel is open: it now shows that option's link.
    useEffect(() => setCopied(false), [url]);

    useEffect(() => {
        if (!open) return;
        copyBtn.current?.focus({ preventScroll: true });
        const onDown = (e: PointerEvent) => {
            if (!wrap.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            setOpen(false);
            toggle.current?.focus({ preventScroll: true });
        };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
        } catch {
            // No clipboard access (older browsers, insecure context): select the link so it can be copied by hand.
            const range = document.createRange();
            if (field.current) range.selectNodeContents(field.current);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(range);
            try {
                setCopied(document.execCommand('copy'));
            } catch {
                setCopied(false);
            }
        }
    };

    const shareNative = async () => {
        try {
            await navigator.share({ title, text: line, url });
            setOpen(false);
        } catch {
            // Cancelled, or not allowed here: the panel stays open with the other ways.
        }
    };

    return (
        <div ref={wrap} className={styles.share}>
            <button
                ref={toggle}
                type="button"
                className={`${styles.presentBtn} ${styles.shareBtn}`}
                aria-expanded={open}
                aria-controls={panelId}
                aria-label={`Share ${label}`}
                title={`Share a link to ${label}`}
                onClick={() => {
                    setCopied(false);
                    setOpen(!open);
                }}
                data-track="station_model_interaction"
                data-track-name={track('open')}
            >
                <ShareIcon />
                <span className={styles.presentLabel}>Share</span>
            </button>
            {open && (
                <div id={panelId} className={styles.sharePanel} role="dialog" aria-label={`Share ${label}`}>
                    <p className={styles.shareKicker}>
                        Share · {number} {label}
                    </p>
                    <p className={styles.shareLine}>{line}</p>
                    <p ref={field} className={styles.shareUrl} aria-label={`Link to ${label}`}>
                        {url}
                    </p>
                    <p className="visually-hidden" aria-live="polite">
                        {copied ? 'Link copied' : ''}
                    </p>
                    <div className={styles.shareVia}>
                        <button ref={copyBtn} type="button" className={styles.shareCopy} onClick={copy} data-copied={copied || undefined} data-track="station_model_interaction" data-track-name={track('copy')}>
                            {copied ? 'Copied ✓' : 'Copy link'}
                        </button>
                        <ExternalLink href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`} className={styles.shareAction} data-track="station_model_interaction" trackName={track('WhatsApp')}>
                            WhatsApp
                        </ExternalLink>
                        <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${line}\n\n${url}`)}`} className={styles.shareAction} data-track="station_model_interaction" data-track-name={track('email')}>
                            Email
                        </a>
                        {canShare && (
                            <button type="button" className={styles.shareAction} onClick={shareNative} data-track="station_model_interaction" data-track-name={track('device')}>
                                More…
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
