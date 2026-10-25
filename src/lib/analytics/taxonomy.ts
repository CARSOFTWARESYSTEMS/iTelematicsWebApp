/**
 * Analytics event taxonomy and pure helpers for building safe event payloads.
 *
 * Only the events declared here are ever sent. Parameters are restricted to an
 * allowlist of non-personal context (page, section, CTA, destination, device),
 * URLs lose their query strings, and free text is scrubbed of anything that
 * looks like an email address or phone/ID number before it leaves the browser.
 * See docs/analytics/ANALYTICS.md for the event dictionary and GA4 setup.
 */

export const CLICK_EVENTS = [
    'satellite_engineering_click',
    'interactive_3d_click',
    'internship_apply_click',
    'research_collaboration_click',
    'consultancy_click',
    'partner_click',
    'join_rnd_click',
    'mobile_navigation_use',
    // EV.ENGINEER™ page (/ev-engineer): tagged explicitly with data-track on each CTA
    'ev_engineer_research_click',
    'ev_engineer_space_click',
    'ev_engineer_satellite_click',
    'ev_engineer_rocket_click',
    'ev_engineer_aerospace_click',
    'ev_engineer_aqip_click',
    'ev_engineer_battery_click',
    'ev_engineer_digital_twin_click',
    'ev_engineer_profile_click',
    'ev_engineer_partner_click',
    'ev_engineer_external_click',
] as const;

export const VIEW_EVENTS = ['research_platform_view', 'internship_view'] as const;

export type ClickEvent = (typeof CLICK_EVENTS)[number];
export type ViewEvent = (typeof VIEW_EVENTS)[number];
export type AnalyticsEvent = 'page_view' | 'contact_submit' | ClickEvent | ViewEvent;

/** Controlled vocabulary for `enquiry_type`; any other value is dropped before sending. */
export const ENQUIRY_TYPES = ['internship', 'research', 'academic', 'industry', 'consultancy', 'investment', 'other'] as const;

export type EnquiryType = (typeof ENQUIRY_TYPES)[number];
export type DestinationType = 'internal' | 'resource' | 'partner' | 'document' | 'external' | 'email' | 'phone';
export type DeviceCategory = 'mobile' | 'tablet' | 'desktop';

export type AnalyticsParams = {
    page_path?: string;
    page_location?: string;
    page_referrer?: string;
    section?: string;
    cta_name?: string;
    cta_location?: string;
    destination?: string;
    destination_type?: DestinationType;
    device_category?: DeviceCategory;
    enquiry_type?: EnquiryType;
};

// GA4 value limits: 100 chars for event parameters, more for page_location/page_referrer.
const PARAM_LIMITS: Record<keyof AnalyticsParams, number> = {
    page_path: 100,
    page_location: 1000,
    page_referrer: 420,
    section: 100,
    cta_name: 100,
    cta_location: 100,
    destination: 100,
    destination_type: 100,
    device_category: 100,
    enquiry_type: 100,
};

const FREE_TEXT_PARAMS = new Set<keyof AnalyticsParams>(['section', 'cta_name', 'cta_location']);
const EMAIL_RE = /[^\s@/]+@[^\s@/]+\.[^\s@/]+/g;
const LONG_NUMBER_RE = /\+?\d(?:[\s-]?\d){6,}/g;
const SAFE_HASH_RE = /^#[A-Za-z][\w-]{0,63}$/;

export function isClickEvent(value: unknown): value is ClickEvent {
    return typeof value === 'string' && (CLICK_EVENTS as readonly string[]).includes(value);
}

export function isViewEvent(value: unknown): value is ViewEvent {
    return typeof value === 'string' && (VIEW_EVENTS as readonly string[]).includes(value);
}

export function isEnquiryType(value: unknown): value is EnquiryType {
    return typeof value === 'string' && (ENQUIRY_TYPES as readonly string[]).includes(value);
}

/** Drops unknown keys and empty values, scrubs identifiers and enforces GA4 length limits. */
export function sanitizeParams(params: AnalyticsParams): Record<string, string> {
    const clean: Record<string, string> = {};
    for (const key of Object.keys(PARAM_LIMITS) as (keyof AnalyticsParams)[]) {
        const raw = params[key];
        if (raw === undefined || raw === null) continue;
        if (key === 'enquiry_type' && !isEnquiryType(raw)) continue;
        let value = String(raw).replace(/\s+/g, ' ').trim().replace(EMAIL_RE, '[email]');
        if (FREE_TEXT_PARAMS.has(key)) value = value.replace(LONG_NUMBER_RE, '[number]');
        if (value) clean[key] = value.slice(0, PARAM_LIMITS[key]);
    }
    return clean;
}

/** Returns origin + path with the query string and fragment removed, or '' if unparseable. */
export function stripQuery(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.origin + parsed.pathname;
    } catch {
        return '';
    }
}

type Destination = {
    destination: string;
    destination_type: DestinationType;
    host: string;
    path: string;
    internal: boolean;
};

export function describeDestination(href: string, origin: string): Destination | null {
    let url: URL;
    try {
        url = new URL(href, origin);
    } catch {
        return null;
    }

    if (url.protocol === 'mailto:') return { destination: 'mailto', destination_type: 'email', host: '', path: '', internal: false };
    if (url.protocol === 'tel:') return { destination: 'tel', destination_type: 'phone', host: '', path: '', internal: false };
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    let path = url.pathname;
    try {
        path = decodeURI(path);
    } catch {
        // keep the encoded path
    }
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const internal = url.origin === origin;
    const isDocument = /\.pdf$/i.test(path);
    const destination = internal
        ? path + (SAFE_HASH_RE.test(url.hash) ? url.hash : '')
        : host + (path === '/' ? '' : path);

    return {
        destination,
        destination_type: isDocument ? 'document' : internal ? 'internal' : 'external',
        host,
        path,
        internal,
    };
}

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

const PARTNER_HOSTS = new Set([
    'aerosystems.gamyaa.in',
    'apexrocketsystems.com',
    'ifab.tech',
    'uflight.in',
    'evsociety.org',
    'autonomous.ev.engineer',
]);

type LinkRule = {
    event: ClickEvent;
    type?: DestinationType;
    match: (d: Destination) => boolean;
};

// Destination-based rules, most specific first. These make the same link fire the
// same event wherever it appears (hero, nav, footer, desktop or mobile).
const LINK_RULES: LinkRule[] = [
    {
        event: 'interactive_3d_click',
        type: 'resource',
        match: (d) => d.host === 'aerospace.ev.engineer' && under(d.path, '/space/satellite-engineering/interactive-3d'),
    },
    {
        event: 'satellite_engineering_click',
        type: 'resource',
        match: (d) => d.host === 'aerospace.ev.engineer' && under(d.path, '/space/satellite-engineering'),
    },
    { event: 'satellite_engineering_click', match: (d) => d.internal && under(d.path, '/satellite-engineering') },
    {
        event: 'partner_click',
        type: 'partner',
        match: (d) => PARTNER_HOSTS.has(d.host) || (d.host === 'aerospace.ev.engineer' && under(d.path, '/space/partners')),
    },
    { event: 'partner_click', match: (d) => d.internal && under(d.path, '/ev-engineer') },
    { event: 'consultancy_click', match: (d) => d.internal && under(d.path, '/consultancy') },
];

// Pages whose landing is itself the meaningful action. Update if the redesign uses other slugs.
const ROUTE_VIEWS: [string, ViewEvent][] = [
    ['/research-platform', 'research_platform_view'],
    ['/internships', 'internship_view'],
];

export function routeViewEvent(pathname: string): ViewEvent | null {
    return ROUTE_VIEWS.find(([prefix]) => under(pathname, prefix))?.[1] ?? null;
}

export type ClickPayload = { event: ClickEvent; params: AnalyticsParams };

/**
 * Maps a clicked element to an event, or null when the click isn't meaningful.
 *
 * Resolution order:
 *   1. `data-track="<event>"` on the clicked element (explicit CTAs such as Apply or Join R&D)
 *   2. destination rules above (Satellite Engineering, Interactive 3D, partners, consultancy)
 *   3. the nearest `data-track-fallback="<event>"` container (e.g. the Consultancy menu)
 *
 * Context comes from the nearest `data-analytics-section` and `data-analytics-location`
 * ancestors; `data-track-name` overrides the visible text as the CTA name.
 */
export function describeClick(el: Element, origin: string): ClickPayload | null {
    const href = el.tagName === 'A' ? el.getAttribute('href') : null;
    const dest = href ? describeDestination(href, origin) : null;

    const explicit = el.getAttribute('data-track');
    let event: ClickEvent | null = isClickEvent(explicit) ? explicit : null;
    let destinationType = dest?.destination_type;
    // Same-page anchors (local section navigation) only count when tagged explicitly.
    const inPage = href?.startsWith('#') ?? false;

    if (!event && dest && !inPage) {
        const rule = LINK_RULES.find((r) => r.match(dest));
        if (rule) {
            event = rule.event;
            destinationType = rule.type ?? destinationType;
        }
    }
    if (!event) {
        const fallback = el.closest('[data-track-fallback]')?.getAttribute('data-track-fallback');
        if (isClickEvent(fallback)) event = fallback;
    }
    if (!event) return null;

    const section = el.closest('[data-analytics-section]')?.getAttribute('data-analytics-section') ?? undefined;
    const location = el.closest('[data-analytics-location]')?.getAttribute('data-analytics-location') ?? section ?? 'page';

    return {
        event,
        params: {
            section,
            cta_location: location,
            cta_name: el.getAttribute('data-track-name') ?? el.getAttribute('aria-label') ?? el.textContent ?? undefined,
            destination: dest?.destination,
            destination_type: destinationType,
        },
    };
}
