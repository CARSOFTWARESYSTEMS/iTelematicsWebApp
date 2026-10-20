import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    CONSENT_STORAGE_KEY,
    getAnalyticsMode,
    readConsent,
    resetAnalyticsForTests,
    startGtag,
    stopGtag,
    track,
    trackPageView,
    writeConsent,
} from './client';

function liveEnv() {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_HOSTS', 'localhost');
}

describe('analytics client', () => {
    beforeEach(() => {
        resetAnalyticsForTests();
        window.localStorage.clear();
        delete window.gtag;
        delete window.dataLayer;
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    describe('getAnalyticsMode', () => {
        it('is off outside production builds', () => {
            expect(getAnalyticsMode('itelematics.com')).toBe('off');
        });

        it('is live only on allowed production hosts', () => {
            vi.stubEnv('NODE_ENV', 'production');
            expect(getAnalyticsMode('itelematics.com')).toBe('live');
            expect(getAnalyticsMode('WWW.iTelematics.com')).toBe('live');
            expect(getAnalyticsMode('itelematics-preview.vercel.app')).toBe('off');
            expect(getAnalyticsMode('localhost')).toBe('off');
        });

        it('can be disabled with an empty measurement ID', () => {
            vi.stubEnv('NODE_ENV', 'production');
            vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', '');
            expect(getAnalyticsMode('itelematics.com')).toBe('off');
        });

        it('switches to console debugging when requested', () => {
            vi.stubEnv('NEXT_PUBLIC_ANALYTICS_DEBUG', 'true');
            expect(getAnalyticsMode('localhost')).toBe('debug');
        });
    });

    describe('consent', () => {
        it('defaults to unset and persists choices', () => {
            expect(readConsent()).toBe('unset');
            writeConsent('granted');
            expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('granted');
            resetAnalyticsForTests();
            expect(readConsent()).toBe('granted');
        });

        it('treats Global Privacy Control as a refusal', () => {
            Object.defineProperty(window.navigator, 'globalPrivacyControl', { value: true, configurable: true });
            try {
                expect(readConsent()).toBe('denied');
            } finally {
                delete (window.navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
            }
        });

        it('still honours a choice for the session when storage is blocked', () => {
            vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('blocked');
            });
            vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('blocked');
            });
            writeConsent('granted');
            expect(readConsent()).toBe('granted');
        });
    });

    describe('track', () => {
        it('sends nothing without consent', () => {
            liveEnv();
            startGtag('G-TEST');
            const gtag = vi.spyOn(window, 'gtag');
            track('partner_click', { destination: 'evsociety.org' });
            expect(gtag).not.toHaveBeenCalled();
        });

        it('sends sanitized events once consent is granted', () => {
            liveEnv();
            writeConsent('granted');
            startGtag('G-TEST');
            const gtag = vi.spyOn(window, 'gtag');
            track('partner_click', { destination: 'evsociety.org', cta_name: 'EV Society' });
            expect(gtag).toHaveBeenCalledWith('event', 'partner_click', {
                page_path: '/',
                cta_name: 'EV Society',
                destination: 'evsociety.org',
                device_category: 'desktop',
            });
        });

        it('configures gtag without automatic page views, ads or Google signals', () => {
            liveEnv();
            startGtag('G-TEST');
            const config = window.dataLayer!.map((args) => Array.from(args as ArrayLike<unknown>)).find((a) => a[0] === 'config');
            expect(config).toEqual(['config', 'G-TEST', { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false }]);
        });

        it('sets the GA opt-out flag and clears _ga cookies on withdrawal', () => {
            liveEnv();
            startGtag('G-TEST');
            document.cookie = '_ga=GA1.1.123; path=/';
            stopGtag('G-TEST');
            expect((window as unknown as Record<string, unknown>)['ga-disable-G-TEST']).toBe(true);
            expect(document.cookie).not.toContain('_ga=');
        });

        it('logs instead of sending in debug mode', () => {
            vi.stubEnv('NEXT_PUBLIC_ANALYTICS_DEBUG', 'true');
            writeConsent('granted');
            const info = vi.spyOn(console, 'info').mockImplementation(() => {});
            track('join_rnd_click', { cta_location: 'hero' });
            expect(info).toHaveBeenCalledWith('[analytics]', 'join_rnd_click', expect.objectContaining({ cta_location: 'hero' }));
        });
    });

    describe('trackPageView', () => {
        it('sends one page_view per path, without query strings, plus route view events', () => {
            liveEnv();
            writeConsent('granted');
            startGtag('G-TEST');
            const gtag = vi.spyOn(window, 'gtag');
            const pageViews = () => gtag.mock.calls.filter((c) => c[0] === 'event' && c[1] === 'page_view');

            trackPageView('/');
            trackPageView('/');
            expect(pageViews()).toHaveLength(1);
            expect(pageViews()[0][2]).toMatchObject({ page_location: 'http://localhost:3000/', page_path: '/' });

            trackPageView('/internships');
            expect(pageViews()).toHaveLength(2);
            expect(pageViews()[1][2]).toMatchObject({ page_referrer: 'http://localhost:3000/' });
            expect(gtag).toHaveBeenCalledWith('event', 'internship_view', expect.objectContaining({ page_path: '/internships' }));
            expect(gtag).toHaveBeenCalledWith('set', { page_location: 'http://localhost:3000/internships', page_referrer: 'http://localhost:3000/' });
        });
    });
});
