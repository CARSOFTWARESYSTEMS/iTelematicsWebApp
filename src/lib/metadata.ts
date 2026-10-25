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
 * `absoluteTitle` uses the title as written, without the "| iTelematics®" suffix.
 */
export function pageMetadata({
    path,
    title,
    description,
    absoluteTitle = false,
    image = OG_IMAGE,
}: {
    path: string;
    title: string;
    description: string;
    absoluteTitle?: boolean;
    image?: typeof OG_IMAGE;
}): Metadata {
    const shareTitle = absoluteTitle ? title : `${title} | ${SITE.name}`;
    return {
        title: absoluteTitle ? { absolute: title } : title,
        description,
        alternates: { canonical: path },
        openGraph: {
            type: 'website',
            siteName: SITE.name,
            locale: 'en',
            url: path,
            title: shareTitle,
            description,
            images: [image],
        },
        twitter: {
            card: 'summary_large_image',
            title: shareTitle,
            description,
            images: [image.url],
        },
    };
}
