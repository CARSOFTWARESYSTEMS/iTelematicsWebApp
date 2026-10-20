import { SITE } from '@/lib/site';

type Schema = Record<string, unknown>;

export const ORG_ID = `${SITE.url}/#organization`;
export const WEBSITE_ID = `${SITE.url}/#website`;

export function organizationSchema(): Schema {
    return {
        '@type': 'Organization',
        '@id': ORG_ID,
        name: SITE.legalName,
        alternateName: SITE.name,
        url: SITE.url,
        logo: `${SITE.url}/iTelematics.png`,
        description: SITE.description,
        email: SITE.email,
        telephone: SITE.phone,
        knowsAbout: [
            'Satellite Engineering',
            'Spacecraft electrical power systems',
            'Satellite battery state of charge and state of health',
            'Satellite telemetry',
            'Spacecraft health monitoring',
            'Satellite digital twins',
        ],
        address: {
            '@type': 'PostalAddress',
            streetAddress: SITE.address.street,
            addressLocality: SITE.address.locality,
            addressRegion: SITE.address.region,
            postalCode: SITE.address.postalCode,
            addressCountry: SITE.address.country,
        },
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'research and internship enquiries',
            email: SITE.email,
            telephone: SITE.phone,
            availableLanguage: ['English'],
        },
    };
}

export function websiteSchema(): Schema {
    return {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        name: SITE.name,
        url: SITE.url,
        publisher: { '@id': ORG_ID },
        inLanguage: 'en',
    };
}

type PageSchemaInput = {
    path: string;
    name: string;
    description: string;
    type?: string;
    breadcrumbs?: { name: string; path: string }[];
};

/** WebPage (or subtype) plus an optional BreadcrumbList for an inner page. */
export function pageSchema({ path, name, description, type = 'WebPage', breadcrumbs }: PageSchemaInput): Schema[] {
    const url = `${SITE.url}${path === '/' ? '' : path}`;
    const page: Schema = {
        '@type': type,
        '@id': `${url}#webpage`,
        url,
        name,
        description,
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': ORG_ID },
        inLanguage: 'en',
    };
    if (!breadcrumbs) return [page];

    const trail = [{ name: 'Home', path: '/' }, ...breadcrumbs];
    page.breadcrumb = { '@id': `${url}#breadcrumb` };
    return [
        page,
        {
            '@type': 'BreadcrumbList',
            '@id': `${url}#breadcrumb`,
            itemListElement: trail.map((crumb, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: crumb.name,
                item: `${SITE.url}${crumb.path === '/' ? '' : crumb.path}`,
            })),
        },
    ];
}

export function faqSchema(items: { question: string; answer: string }[]): Schema {
    return {
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
    };
}

export default function JsonLd({ data }: { data: Schema[] }) {
    const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': data }).replace(/</g, '\\u003c');
    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
