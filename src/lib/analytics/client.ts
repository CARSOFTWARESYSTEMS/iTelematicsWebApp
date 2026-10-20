/**
 * Browser-side analytics: production gating, consent and the GA4 (gtag) transport.
 *
 * Nothing is loaded or sent until the visitor allows analytics. Global Privacy
 * Control is honoured as a refusal. Outside the production hostnames analytics
 * is off, or logs to the console when NEXT_PUBLIC_ANALYTICS_DEBUG=true.
 */
import {
    routeViewEvent,
    sanitizeParams,
    stripQuery,
    type AnalyticsEvent,
    type AnalyticsParams,
    type DeviceCategory,
} from './taxonomy';

declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
    }
}

const DEFAULT_MEASUREMENT_ID = 'G-8JBWVSV5GE';
const DEFAULT_HOSTS = 'itelematics.com,www.itelematics.com,ev.engineer,www.ev.engineer';

export const CONSENT_STORAGE_KEY = 'itelematics-analytics-consent';
export const CONSENT_OPEN_EVENT = 'itelematics:analytics-preferences';

export type AnalyticsMode = 'off' | 'debug' | 'live';
export type ConsentState = 'granted' | 'denied' | 'unset';

let sessionConsent: ConsentState | null = null;
let gtagStarted = false;
let lastLocation: string | null = null;

/** An empty NEXT_PUBLIC_GA_MEASUREMENT_ID disables analytics; unset falls back to the existing property. */
export function getMeasurementId(): string {
    return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? DEFAULT_MEASUREMENT_ID;
}

export function getAnalyticsMode(hostname: string): AnalyticsMode {
    if (process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === 'true') return 'debug';
    if (process.env.NODE_ENV !== 'production' || !getMeasurementId()) return 'off';
    const hosts = (process.env.NEXT_PUBLIC_ANALYTICS_HOSTS ?? DEFAULT_HOSTS)
        .split(',')
        .map((h) => h.trim().toLowerCase());
    return hosts.includes(hostname.toLowerCase()) ? 'live' : 'off';
}

export function readConsent(): ConsentState {
    if (sessionConsent) return sessionConsent;
    try {
        const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
        if (stored === 'granted' || stored === 'denied') return stored;
    } catch {
        // storage blocked (private mode, policy): fall through to the defaults
    }
    const nav = window.navigator as Navigator & { globalPrivacyControl?: boolean };
    return nav.globalPrivacyControl ? 'denied' : 'unset';
}

export function writeConsent(state: 'granted' | 'denied'): void {
    sessionConsent = state;
    try {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, state);
    } catch {
        // still honoured for this session via sessionConsent
    }
}

export function openConsentPreferences(): void {
    window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

function setGaDisabled(measurementId: string, disabled: boolean): void {
    // Official GA opt-out flag: gtag sends nothing for this property while it is true.
    (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = disabled;
}

/** Queues gtag configuration; the gtag.js script itself is loaded by <Analytics />. */
export function startGtag(measurementId: string): void {
    setGaDisabled(measurementId, false);
    if (gtagStarted) {
        window.gtag?.('consent', 'update', { analytics_storage: 'granted' });
        return;
    }
    gtagStarted = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
        // gtag.js expects the Arguments object itself, not an array copy.
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
    };
    window.gtag('consent', 'default', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
    });
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
        send_page_view: false, // page_view is sent manually on every App Router navigation
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
    });
}

export function stopGtag(measurementId: string): void {
    setGaDisabled(measurementId, true);
    window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
    clearGaCookies();
}

function clearGaCookies(): void {
    const host = window.location.hostname;
    const domains = ['', host, `.${host.replace(/^www\./, '')}`];
    for (const cookie of document.cookie.split(';')) {
        const name = cookie.split('=')[0].trim();
        if (name !== '_ga' && !name.startsWith('_ga_')) continue;
        for (const domain of domains) {
            document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
        }
    }
}

export function getDeviceCategory(): DeviceCategory {
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    if (!coarse) return 'desktop';
    return Math.min(window.screen.width, window.screen.height) >= 600 ? 'tablet' : 'mobile';
}

export function track(event: AnalyticsEvent, params: AnalyticsParams = {}): void {
    if (typeof window === 'undefined') return;
    const mode = getAnalyticsMode(window.location.hostname);
    if (mode === 'off' || readConsent() !== 'granted') return;

    const payload = sanitizeParams({
        page_path: window.location.pathname,
        device_category: getDeviceCategory(),
        ...params,
    });
    if (mode === 'debug') {
        console.info('[analytics]', event, payload);
        return;
    }
    window.gtag?.('event', event, payload);
}

/**
 * Sends one page_view per distinct path (query strings are never sent), plus the
 * route's view event if it has one. Repeated calls for the same path are ignored,
 * which guards against re-renders and React Strict Mode double effects.
 */
export function trackPageView(pathname: string): void {
    if (typeof window === 'undefined') return;
    const location = window.location.origin + pathname;
    if (location === lastLocation) return;
    const referrer = lastLocation ?? stripQuery(document.referrer);
    lastLocation = location;

    // Applies to every later hit, so custom events also carry the query-free URL.
    window.gtag?.('set', { page_location: location, page_referrer: referrer });
    track('page_view', { page_location: location, page_referrer: referrer, page_path: pathname });

    const view = routeViewEvent(pathname);
    if (view) track(view, { section: 'page', cta_location: 'route', page_path: pathname });
}

/** Test-only: clears module state between test cases. */
export function resetAnalyticsForTests(): void {
    sessionConsent = null;
    gtagStarted = false;
    lastLocation = null;
}
