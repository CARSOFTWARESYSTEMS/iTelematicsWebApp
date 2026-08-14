import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/lib/events/data';
import { isPubliclyVisible } from '@/lib/events/cta';
import RegisterFlow from './RegisterFlow';
import styles from './register.module.css';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const event = getEventBySlug(slug);
    if (!event) return { title: 'Event Not Found | iTelematics' };
    return { title: `Register — ${event.title} | iTelematics` };
}

export default async function RegisterPage({ params }: Props) {
    const { slug } = await params;
    const event = getEventBySlug(slug);
    if (!event || !isPubliclyVisible(event) || event.status !== 'registration_open') {
        notFound();
    }

    return (
        <div className="container">
            <div className={styles.page}>
                <RegisterFlow event={event} />
            </div>
        </div>
    );
}
