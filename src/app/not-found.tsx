import Link from 'next/link';
import { PageHero } from '@/components/site/blocks';

export default function NotFound() {
    return (
        <PageHero
            eyebrow="404 · Page not found"
            title="This page isn’t part of the site"
            lead="It may have moved during our move to a Satellite Engineering R&D focus. These are the main places to go from here."
        >
            <div className="actions hero-actions">
                <Link href="/" className="btn btn-primary">Home</Link>
                <Link href="/satellite-engineering" className="btn btn-secondary">Satellite Engineering</Link>
                <Link href="/internships" className="btn btn-secondary">Internships</Link>
                <Link href="/contact" className="btn btn-secondary">Contact</Link>
            </div>
        </PageHero>
    );
}
