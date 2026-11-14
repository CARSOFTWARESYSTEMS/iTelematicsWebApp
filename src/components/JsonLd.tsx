import { SITE, STATION_IMAGE } from '@/lib/site';

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
        image: `${SITE.url}${STATION_IMAGE.path}`,
        slogan: 'Engineering the Intelligence Behind Future Space Stations.',
        description: SITE.description,
        email: SITE.email,
        telephone: SITE.phone,
        knowsAbout: [
            'Space station digital twins',
            'Space station electrical power and energy systems',
            'Integrated space station health monitoring',
            'Physics-based modelling and simulation',
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
            contactType: 'research and Research Lab enquiries',
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

type PageImage = { path: string; width: number; height: number; alt: string };

type PageSchemaInput = {
    path: string;
    name: string;
    description: string;
    type?: string;
    breadcrumbs?: { name: string; path: string }[];
    /** The page's main image, for search results and AI answers. */
    image?: PageImage;
};

/** An ImageObject for structured data, with an absolute URL. */
export function imageObject(image: PageImage): Schema {
    return {
        '@type': 'ImageObject',
        '@id': `${SITE.url}${image.path}`,
        url: `${SITE.url}${image.path}`,
        contentUrl: `${SITE.url}${image.path}`,
        width: image.width,
        height: image.height,
        caption: image.alt,
    };
}

/** WebPage (or subtype) plus an optional BreadcrumbList for an inner page. */
export function pageSchema({ path, name, description, type = 'WebPage', breadcrumbs, image }: PageSchemaInput): Schema[] {
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
        ...(image ? { primaryImageOfPage: imageObject(image), image: `${SITE.url}${image.path}` } : {}),
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
