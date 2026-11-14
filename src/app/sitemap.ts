import type { MetadataRoute } from 'next';
import { SITE, SITE_ROUTES, STATION_IMAGE } from '@/lib/site';

/** Pages whose main image should be indexed with them (image sitemap entries). */
const ROUTE_IMAGES: Record<string, string[]> = {
    '/': [`${SITE.url}${STATION_IMAGE.path}`],
    '/space-station': [`${SITE.url}${STATION_IMAGE.path}`, `${SITE.url}/images/station-twin/poster-station-src1.jpg`],
};

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();
    return SITE_ROUTES.map((route) => ({
        url: `${SITE.url}${route.path === '/' ? '' : route.path}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: route.priority,
        ...(ROUTE_IMAGES[route.path] ? { images: ROUTE_IMAGES[route.path] } : {}),
    }));
}
