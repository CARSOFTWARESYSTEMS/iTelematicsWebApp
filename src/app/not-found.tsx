import Link from 'next/link';
import { PageHero } from '@/components/site/blocks';

export default function NotFound() {
    return (
        <PageHero
            eyebrow="404 · Page not found"
            title="This page isn’t part of the site"
            lead="It may have moved when the site was reorganised around Satellite Engineering. These are the main places to go from here."
        >
            <div className="actions hero-actions">
                <Link href="/" className="btn btn-primary">Home</Link>
                <Link href="/satellite-engineering" className="btn btn-secondary">Satellite Engineering</Link>
            </div>
        </PageHero>
    );
}
