import { Inter } from 'next/font/google';
import './globals.css';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';

import Script from 'next/script';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

export const metadata: Metadata = {
    title: 'iTelematics® | Advanced Automotive Telematics Software for EVs',
    description: 'AI-powered advanced automotive telematics software for Electric Vehicles, battery systems, and secure connected mobility.',
    keywords: ['EV telematics', 'automotive telematics software', 'EV battery diagnostics', 'BMS analytics', 'connected mobility', 'EV cybersecurity'],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.variable}>
                <Script
                    src="https://www.googletagmanager.com/gtag/js?id=G-8JBWVSV5GE"
                    strategy="afterInteractive"
                />
                <Script id="google-analytics" strategy="afterInteractive">
                    {`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());

                        gtag('config', 'G-8JBWVSV5GE');
                    `}
                </Script>
                <JsonLd />
                <Navbar />
                <main>{children}</main>
                <Footer />
            </body>
        </html>
    );
}
