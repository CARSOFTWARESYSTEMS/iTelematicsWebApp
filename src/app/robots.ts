import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

/**
 * Search engines and AI search/answer crawlers may read the whole public site (only /api/ is
 * excluded). AI crawlers are named explicitly so the permission is unambiguous; a crawler that
 * matches a named group ignores the "*" group, so each group repeats the same rules.
 */
const AI_AND_SEARCH_CRAWLERS = [
    'Googlebot',
    'Google-Extended',
    'Bingbot',
    'Applebot',
    'Applebot-Extended',
    'OAI-SearchBot',
    'ChatGPT-User',
    'GPTBot',
    'ClaudeBot',
    'Claude-User',
    'Claude-SearchBot',
    'PerplexityBot',
    'Perplexity-User',
    'DuckAssistBot',
    'Meta-ExternalAgent',
];

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            { userAgent: '*', allow: '/', disallow: ['/api/'] },
            { userAgent: AI_AND_SEARCH_CRAWLERS, allow: '/', disallow: ['/api/'] },
        ],
        sitemap: `${SITE.url}/sitemap.xml`,
        host: SITE.url,
    };
}
