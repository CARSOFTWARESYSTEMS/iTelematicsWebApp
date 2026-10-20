import { describe, it, expect } from 'vitest';
import { describeClick, describeDestination, routeViewEvent, sanitizeParams, stripQuery } from './taxonomy';

const ORIGIN = 'https://itelematics.com';

function link(href: string, html = 'Link', wrapper = '') {
    const host = document.createElement('div');
    host.innerHTML = wrapper ? wrapper.replace('{link}', `<a href="${href}">${html}</a>`) : `<a href="${href}">${html}</a>`;
    document.body.replaceChildren(host);
    return host.querySelector('a')!;
}

describe('describeDestination', () => {
    it('strips query strings from internal links but keeps safe anchors', () => {
        expect(describeDestination('/contact?email=a@b.com#form', ORIGIN)).toMatchObject({
            destination: '/contact#form',
            destination_type: 'internal',
        });
        expect(describeDestination('/contact#token=abc123', ORIGIN)?.destination).toBe('/contact');
    });

    it('reduces external links to host + path', () => {
        expect(describeDestination('https://www.evsociety.org/?utm_source=x', ORIGIN)).toMatchObject({
            destination: 'evsociety.org',
            destination_type: 'external',
        });
    });

    it('never exposes mailto/tel addresses', () => {
        expect(describeDestination('mailto:info@iTelematics.com', ORIGIN)?.destination).toBe('mailto');
        expect(describeDestination('tel:+919108206147', ORIGIN)?.destination).toBe('tel');
    });

    it('labels PDFs as documents and decodes their paths', () => {
        expect(describeDestination('/space/Space%20Careers.pdf', ORIGIN)).toMatchObject({
            destination: '/space/Space Careers.pdf',
            destination_type: 'document',
        });
    });
});

describe('describeClick destination rules', () => {
    it('classifies the Interactive 3D resource ahead of the Satellite Engineering resource', () => {
        const el = link('https://aerospace.ev.engineer/space/satellite-engineering/interactive-3d', 'Explore Interactive 3D');
        expect(describeClick(el, ORIGIN)).toMatchObject({
            event: 'interactive_3d_click',
            params: { destination_type: 'resource', cta_name: 'Explore Interactive 3D' },
        });
    });

    it('classifies Satellite Engineering links, internal or external', () => {
        expect(describeClick(link('https://aerospace.ev.engineer/space/satellite-engineering'), ORIGIN)?.event).toBe('satellite_engineering_click');
        expect(describeClick(link('/satellite-engineering'), ORIGIN)?.event).toBe('satellite_engineering_click');
        expect(describeClick(link('https://aerospace.ev.engineer/space/cubesat'), ORIGIN)).toBeNull();
    });

    it('classifies every ecosystem partner, including both APEX links', () => {
        for (const href of [
            'https://aerosystems.gamyaa.in/',
            'https://www.apexrocketsystems.com/',
            'https://aerospace.ev.engineer/space/partners/apexrocketsystems',
            'https://ifab.tech/',
            'https://evsociety.org/',
            'https://autonomous.ev.engineer/',
        ]) {
            expect(describeClick(link(href), ORIGIN), href).toMatchObject({ event: 'partner_click', params: { destination_type: 'partner' } });
        }
        expect(describeClick(link('/ev-engineer'), ORIGIN)).toMatchObject({ event: 'partner_click', params: { destination_type: 'internal' } });
    });

    it('ignores ordinary links that no rule claims', () => {
        expect(describeClick(link('/about'), ORIGIN)).toBeNull();
        expect(describeClick(link('https://example.com'), ORIGIN)).toBeNull();
    });
});

describe('describeClick context', () => {
    it('lets an explicit data-track override destination rules', () => {
        const el = link('/contact', 'Discuss R&D Collaboration');
        el.setAttribute('data-track', 'research_collaboration_click');
        expect(describeClick(el, ORIGIN)?.event).toBe('research_collaboration_click');
    });

    it('ignores unknown data-track values', () => {
        const el = link('/about');
        el.setAttribute('data-track', 'everything_click');
        expect(describeClick(el, ORIGIN)).toBeNull();
    });

    it('uses the nearest fallback, section and location', () => {
        const el = link(
            'https://repair.ev.engineer/',
            'EV Workshops',
            `<nav data-analytics-location="header-mobile" data-track-fallback="mobile_navigation_use">
               <div data-analytics-section="Consultancy &amp; Services" data-track-fallback="consultancy_click">
                 <div data-analytics-section="EV Battery Workshops">{link}</div>
               </div>
             </nav>`,
        );
        expect(describeClick(el, ORIGIN)).toEqual({
            event: 'consultancy_click',
            params: {
                section: 'EV Battery Workshops',
                cta_location: 'header-mobile',
                cta_name: 'EV Workshops',
                destination: 'repair.ev.engineer',
                destination_type: 'external',
            },
        });
    });

    it('keeps the same event name on desktop and mobile for the same partner link', () => {
        const wrap = (loc: string) => `<div data-analytics-location="${loc}" data-track-fallback="mobile_navigation_use">{link}</div>`;
        const mobile = describeClick(link('https://www.evsociety.org/', 'EV Society', wrap('header-mobile')), ORIGIN);
        const desktop = describeClick(link('https://www.evsociety.org/', 'EV Society', wrap('header-desktop')), ORIGIN);
        expect(mobile?.event).toBe('partner_click');
        expect(desktop?.event).toBe('partner_click');
        expect(mobile?.params.cta_location).toBe('header-mobile');
    });
});

describe('sanitizeParams', () => {
    it('drops keys outside the allowlist and empty values', () => {
        const out = sanitizeParams({ section: 'hero', cta_name: '  ', ...({ email: 'a@b.com', message: 'hi' } as object) });
        expect(out).toEqual({ section: 'hero' });
    });

    it('redacts emails and phone-like numbers from free text', () => {
        const out = sanitizeParams({ cta_name: 'Write to info@iTelematics.com or +91 91082 06147, 2026 - 2027 cohort' });
        expect(out.cta_name).toBe('Write to [email] or [number], 2026 - 2027 cohort');
    });

    it('only passes enquiry_type values from the controlled vocabulary', () => {
        expect(sanitizeParams({ enquiry_type: 'internship' })).toEqual({ enquiry_type: 'internship' });
        expect(sanitizeParams({ enquiry_type: 'jane@example.org' as never })).toEqual({});
        expect(sanitizeParams({ enquiry_type: 'Research' as never })).toEqual({});
    });

    it('truncates to GA4 limits', () => {
        const out = sanitizeParams({ cta_name: 'x'.repeat(150), page_location: `${ORIGIN}/${'y'.repeat(500)}` });
        expect(out.cta_name).toHaveLength(100);
        expect(out.page_location.length).toBeGreaterThan(100);
    });
});

describe('routeViewEvent / stripQuery', () => {
    it('maps research platform and internship routes', () => {
        expect(routeViewEvent('/research-platform')).toBe('research_platform_view');
        expect(routeViewEvent('/internships/satellite-energy')).toBe('internship_view');
        expect(routeViewEvent('/internships-old')).toBeNull();
        expect(routeViewEvent('/')).toBeNull();
    });

    it('removes query and fragment from referrers', () => {
        expect(stripQuery('https://www.google.com/search?q=satellite')).toBe('https://www.google.com/search');
        expect(stripQuery('')).toBe('');
    });
});
