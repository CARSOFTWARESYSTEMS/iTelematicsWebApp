import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import JsonLd, { organizationSchema, websiteSchema } from '@/components/JsonLd';
import Analytics from '@/components/analytics/Analytics';
import Reveal from '@/components/site/Reveal';
import { EV_SITE, SITE } from '@/lib/site';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

const mono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono-face',
    display: 'swap',
    weight: ['400', '500'],
});

const DEFAULT_TITLE = 'iTelematics® | Satellite Engineering & Internships';

export const metadata: Metadata = {
    metadataBase: new URL(SITE.url),
    title: { default: DEFAULT_TITLE, template: `%s | ${SITE.name}` },
    description: SITE.description,
    applicationName: SITE.name,
    alternates: { canonical: '/' },
    openGraph: {
        type: 'website',
        siteName: SITE.name,
        title: DEFAULT_TITLE,
        description: SITE.description,
        url: '/',
        locale: 'en',
    },
    twitter: {
        card: 'summary_large_image',
        title: DEFAULT_TITLE,
        description: SITE.description,
    },
    robots: { index: true, follow: true },
};

// Marks EV.ENGINEER™ hosts on <html> before first paint, so the header shows the right logo with no
// flash while every page stays statically rendered. "<host>.localhost" matches too, for local testing.
const SITE_VARIANT_SCRIPT = `(function(){var h=location.hostname.replace(/\\.localhost$/,'');if(${JSON.stringify(EV_SITE.hosts)}.indexOf(h)>-1)document.documentElement.setAttribute('data-site','ev')})()`;

export const viewport: Viewport = {
    themeColor: '#050B12',
    colorScheme: 'dark',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // suppressHydrationWarning: the variant script sets data-site on <html> before React hydrates
        <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
            <body>
                <script dangerouslySetInnerHTML={{ __html: SITE_VARIANT_SCRIPT }} />
                <a href="#main" className="skip-link">Skip to content</a>
                <JsonLd data={[organizationSchema(), websiteSchema()]} />
                <Navbar />
                <main id="main" tabIndex={-1}>{children}</main>
                <Footer />
                <Analytics />
                <Reveal />
            </body>
        </html>
    );
}
