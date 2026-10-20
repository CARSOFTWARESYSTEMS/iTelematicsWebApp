import type { Metadata } from 'next';
import { SITE } from '@/lib/site';

const OG_IMAGE = {
    url: '/opengraph-image',
    width: 1200,
    height: 630,
    alt: 'iTelematics®: Satellite Engineering and internships',
};

/**
 * Per-page metadata. A page-level `openGraph` replaces the inherited one entirely, so the
 * share image and Twitter card are restated here rather than relying on inheritance.
 */
export function pageMetadata({ path, title, description }: { path: string; title: string; description: string }): Metadata {
    const shareTitle = `${title} | ${SITE.name}`;
    return {
        title,
        description,
        alternates: { canonical: path },
        openGraph: {
            type: 'website',
            siteName: SITE.name,
            locale: 'en',
            url: path,
            title: shareTitle,
            description,
            images: [OG_IMAGE],
        },
        twitter: {
            card: 'summary_large_image',
            title: shareTitle,
            description,
            images: [OG_IMAGE.url],
        },
    };
}
