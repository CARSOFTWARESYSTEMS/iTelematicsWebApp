import Link from 'next/link';
import type { ConsentState } from '@/lib/analytics/client';
import styles from './ConsentBanner.module.css';

type Props = {
    consent: ConsentState;
    onDecide: (choice: 'granted' | 'denied') => void;
};

export default function ConsentBanner({ consent, onDecide }: Props) {
    return (
        <section className={styles.banner} aria-label="Analytics preferences">
            <div className={styles.text}>
                <p className={styles.title}>Analytics preferences</p>
                <p>
                    With your permission, we use Google Analytics to understand which pages and links visitors find
                    useful. We never record what you type into forms, and analytics is not used for advertising.{' '}
                    <Link href="/policies/privacy">Privacy Policy</Link>
                </p>
                {consent !== 'unset' && (
                    <p className={styles.status}>
                        Analytics is currently {consent === 'granted' ? 'allowed' : 'off'}.
                    </p>
                )}
            </div>
            {/* Equal-weight buttons: declining is as easy as allowing. */}
            <div className={styles.actions}>
                <button type="button" className={`btn btn-secondary ${styles.button}`} onClick={() => onDecide('denied')}>
                    Decline
                </button>
                <button type="button" className={`btn btn-secondary ${styles.button}`} onClick={() => onDecide('granted')}>
                    Allow analytics
                </button>
            </div>
        </section>
    );
}
