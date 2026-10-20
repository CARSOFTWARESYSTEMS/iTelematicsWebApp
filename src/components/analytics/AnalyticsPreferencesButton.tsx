"use client";
import { useEffect, useState } from 'react';
import { getAnalyticsMode, openConsentPreferences } from '@/lib/analytics/client';

/** Footer control for changing or withdrawing analytics consent. Hidden where analytics is off. */
export default function AnalyticsPreferencesButton({ className }: { className?: string }) {
    const [available, setAvailable] = useState(false);

    useEffect(() => {
        setAvailable(getAnalyticsMode(window.location.hostname) !== 'off');
    }, []);

    if (!available) return null;
    return (
        <button type="button" className={className} onClick={openConsentPreferences}>
            Analytics preferences
        </button>
    );
}
