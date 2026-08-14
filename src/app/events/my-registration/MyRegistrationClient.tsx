'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import styles from './my-registration.module.css';

interface VerifyResult {
    valid: boolean;
    event?: { slug: string; title: string; mode: string };
    registrationStatus?: string;
    issuedAt?: string;
}

export default function MyRegistrationClient() {
    const [reference, setReference] = useState('');
    const [result, setResult] = useState<VerifyResult | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setResult(null);
        try {
            const res = await fetch('/api/events/verify-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference: reference.trim() }),
            });
            const data = await res.json();
            setResult(data);
        } catch {
            setResult({ valid: false });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className={`bg-glass ${styles.panel}`}>
            <h1>View My Registration</h1>
            <p className={styles.introText}>
                Paste the registration reference you were shown at confirmation. It is not stored on our servers —
                it is re-verified cryptographically each time, so it cannot be guessed or enumerated.
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>
                <label htmlFor="reference">Registration Reference</label>
                <textarea
                    id="reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    maxLength={2048}
                    rows={3}
                    required
                />
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Checking…' : 'Verify Registration'}
                </button>
            </form>

            {result && (
                <div className={styles.resultBox} role="status">
                    {result.valid ? (
                        <>
                            <p className={styles.validLabel}>Valid registration found.</p>
                            <p>Event: {result.event?.title}</p>
                            <p>Status: {result.registrationStatus}</p>
                        </>
                    ) : (
                        <p className={styles.invalidLabel}>
                            No valid registration found for this reference. Check that you pasted it in full.
                        </p>
                    )}
                </div>
            )}

            <p className={styles.limitationNote}>
                This covers free-event registrations only this sprint. Paid registrations are never confirmed
                without real CCAvenue integration, so there is nothing to look up for them yet. For any
                registration issue, use{' '}
                <Link href="/contact">Contact Organizer</Link>.
            </p>
        </div>
    );
}
