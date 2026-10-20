import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Analytics from './Analytics';
import { CONSENT_STORAGE_KEY, openConsentPreferences, resetAnalyticsForTests } from '@/lib/analytics/client';

let mockPathname = '/';
vi.mock('next/navigation', () => ({
    usePathname: () => mockPathname,
}));

// next/script needs the Next runtime; record what would load instead.
vi.mock('next/script', () => ({
    default: ({ src }: { src: string }) => <script data-testid="gtag-script" data-src={src} />,
}));

function eventCalls(name: string) {
    return (window.gtag as unknown as ReturnType<typeof vi.fn>).mock.calls.filter((c) => c[0] === 'event' && c[1] === name);
}

describe('<Analytics />', () => {
    beforeEach(() => {
        resetAnalyticsForTests();
        window.localStorage.clear();
        delete window.gtag;
        delete window.dataLayer;
        mockPathname = '/';
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('NEXT_PUBLIC_ANALYTICS_HOSTS', 'localhost');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        document.body.innerHTML = '';
    });

    it('renders nothing and loads nothing outside production hosts', () => {
        vi.stubEnv('NEXT_PUBLIC_ANALYTICS_HOSTS', 'itelematics.com');
        render(<Analytics />);
        expect(screen.queryByRole('region', { name: 'Analytics preferences' })).not.toBeInTheDocument();
        expect(screen.queryByTestId('gtag-script')).not.toBeInTheDocument();
    });

    it('asks for consent first and loads gtag only after it is allowed', () => {
        render(<Analytics />);
        expect(screen.getByRole('region', { name: 'Analytics preferences' })).toBeInTheDocument();
        expect(screen.queryByTestId('gtag-script')).not.toBeInTheDocument();
        expect(window.gtag).toBeUndefined();

        fireEvent.click(screen.getByRole('button', { name: 'Allow analytics' }));
        expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('granted');
        expect(screen.getByTestId('gtag-script')).toHaveAttribute('data-src', expect.stringContaining('googletagmanager.com/gtag/js'));
        expect(screen.queryByRole('region', { name: 'Analytics preferences' })).not.toBeInTheDocument();
    });

    it('declining keeps gtag unloaded and the choice can be reopened from preferences', () => {
        render(<Analytics />);
        fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
        expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('denied');
        expect(screen.queryByTestId('gtag-script')).not.toBeInTheDocument();

        act(() => openConsentPreferences());
        expect(screen.getByText('Analytics is currently off.')).toBeInTheDocument();
    });

    it('sends exactly one page_view per SPA route change', () => {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
        const { rerender } = render(<Analytics />);
        window.gtag = vi.fn(window.gtag);
        // Initial view was sent during mount, before the spy; re-rendering the same path must not resend.
        rerender(<Analytics />);
        expect(eventCalls('page_view')).toHaveLength(0);

        mockPathname = '/research-platform';
        rerender(<Analytics />);
        expect(eventCalls('page_view')).toHaveLength(1);
        expect(eventCalls('research_platform_view')).toHaveLength(1);
    });

    it('tracks outbound partner clicks through the delegated listener', () => {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
        render(
            <>
                {/* preventDefault stops jsdom attempting the navigation; tracking runs in the capture phase first. */}
                <section data-analytics-section="Partners & Ecosystem" onClick={(e) => e.preventDefault()}>
                    <a href="https://aerosystems.gamyaa.in/" target="_blank" rel="noopener noreferrer">Gamyaa AeroSystems</a>
                    <a href="/about">About</a>
                </section>
                <Analytics />
            </>,
        );
        window.gtag = vi.fn();

        fireEvent.click(screen.getByText('About'));
        fireEvent.click(screen.getByText('Gamyaa AeroSystems'));

        expect((window.gtag as ReturnType<typeof vi.fn>).mock.calls).toEqual([
            [
                'event',
                'partner_click',
                {
                    page_path: '/',
                    section: 'Partners & Ecosystem',
                    cta_name: 'Gamyaa AeroSystems',
                    cta_location: 'Partners & Ecosystem',
                    destination: 'aerosystems.gamyaa.in',
                    destination_type: 'partner',
                    device_category: 'desktop',
                },
            ],
        ]);
    });
});
