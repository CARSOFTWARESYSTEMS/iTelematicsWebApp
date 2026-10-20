"use client";
import { useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import ConsentBanner from './ConsentBanner';
import {
    CONSENT_OPEN_EVENT,
    getAnalyticsMode,
    getMeasurementId,
    readConsent,
    startGtag,
    stopGtag,
    track,
    trackPageView,
    writeConsent,
    type AnalyticsMode,
    type ConsentState,
} from '@/lib/analytics/client';
import { describeClick, isViewEvent } from '@/lib/analytics/taxonomy';

export default function Analytics() {
    const pathname = usePathname();
    const [mode, setMode] = useState<AnalyticsMode>('off');
    const [consent, setConsent] = useState<ConsentState>('unset');
    const [showBanner, setShowBanner] = useState(false);

    // Mode and stored consent depend on the browser, so resolve them after mount.
    useEffect(() => {
        const resolved = getAnalyticsMode(window.location.hostname);
        const stored = readConsent();
        if (resolved === 'live' && stored === 'granted') startGtag(getMeasurementId());
        setMode(resolved);
        setConsent(stored);
        setShowBanner(resolved !== 'off' && stored === 'unset');

        if (resolved === 'off') return;
        const reopen = () => setShowBanner(true);
        window.addEventListener(CONSENT_OPEN_EVENT, reopen);
        return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
    }, []);

    const active = mode !== 'off' && consent === 'granted';

    useEffect(() => {
        if (active) trackPageView(pathname);
    }, [active, pathname]);

    // One delegated listener covers every CTA, so desktop and mobile share event names.
    // Capture phase runs before menus close or the page navigates away.
    useEffect(() => {
        if (!active) return;
        const onClick = (e: MouseEvent) => {
            if (e.type === 'auxclick' && e.button !== 1) return;
            const target = e.target instanceof Element ? e.target.closest('[data-track], a[href]') : null;
            const payload = target && describeClick(target, window.location.origin);
            if (payload) track(payload.event, payload.params);
        };
        document.addEventListener('click', onClick, true);
        document.addEventListener('auxclick', onClick, true);
        return () => {
            document.removeEventListener('click', onClick, true);
            document.removeEventListener('auxclick', onClick, true);
        };
    }, [active]);

    // Sections marked data-track-view="<event>" report once per page view when they
    // reach the upper part of the viewport (e.g. the homepage research-platform section).
    useEffect(() => {
        if (!active || typeof IntersectionObserver === 'undefined') return;
        const targets = document.querySelectorAll('[data-track-view]');
        if (targets.length === 0) return;
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    observer.unobserve(entry.target);
                    const event = entry.target.getAttribute('data-track-view');
                    const section = entry.target.getAttribute('data-analytics-section') ?? undefined;
                    if (isViewEvent(event)) track(event, { section, cta_location: 'viewport' });
                }
            },
            { rootMargin: '0px 0px -40% 0px' },
        );
        targets.forEach((t) => observer.observe(t));
        return () => observer.disconnect();
    }, [active, pathname]);

    const decide = (choice: 'granted' | 'denied') => {
        writeConsent(choice);
        if (mode === 'live') {
            if (choice === 'granted') startGtag(getMeasurementId());
            else stopGtag(getMeasurementId());
        }
        setConsent(choice);
        setShowBanner(false);
    };

    return (
        <>
            {mode === 'live' && consent === 'granted' && (
                <Script
                    src={`https://www.googletagmanager.com/gtag/js?id=${getMeasurementId()}`}
                    strategy="afterInteractive"
                />
            )}
            {showBanner && <ConsentBanner consent={consent} onDecide={decide} />}
        </>
    );
}
