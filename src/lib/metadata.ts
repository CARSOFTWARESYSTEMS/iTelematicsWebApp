import type { Metadata } from 'next';
import { SITE } from '@/lib/site';

type ShareImage = { url: string; width: number; height: number; alt: string; type?: string };

/**
 * The site-wide share card: the homepage hero space station with the site title. A static JPEG
 * (about 160 KB) rather than a generated PNG (about 540 KB), so link previews also appear in
 * apps with small image limits such as WhatsApp.
 */
export const OG_IMAGE: ShareImage = {
    url: '/images/og/itelematics-space-station.jpg',
    width: 1200,
    height: 630,
    type: 'image/jpeg',
    alt: 'iTelematics® - Space Station Digital Twin Research & Development: a conceptual research space station in orbit above the Earth',
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
    image?: ShareImage;
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
