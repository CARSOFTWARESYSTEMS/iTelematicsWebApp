'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { EventRecord } from '@/lib/events/types';
import styles from './register.module.css';

type Step = 'form' | 'confirmed' | 'review' | 'boundary';

interface Pricing {
    baseFeeInr: number;
    taxesFeesInr: number;
    finalPayableInr: number;
    currency: 'INR';
}

interface FieldErrors {
    fullName?: string;
    email?: string;
    mobile?: string;
}

export default function RegisterFlow({ event }: { event: EventRecord }) {
    const [step, setStep] = useState<Step>('form');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [pricing, setPricing] = useState<Pricing | null>(null);
    const [registrationReference, setRegistrationReference] = useState<string | null>(null);
    const [boundaryMessage, setBoundaryMessage] = useState<string | null>(null);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (submitting) return; // guards double-click/double-submit alongside server-side dedupe
        setSubmitting(true);
        setFormError(null);
        setFieldErrors({});

        try {
            const res = await fetch('/api/events/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: event.slug, fullName, email, mobile }),
            });
            const data = await res.json();

            if (!res.ok) {
                if (data.fieldErrors) setFieldErrors(data.fieldErrors);
                setFormError(data.error ?? 'Something went wrong. Please try again.');
                return;
            }

            setPricing(data.pricing);
            if (data.registrationStatus === 'confirmed') {
                setRegistrationReference(data.registrationReference);
                setStep('confirmed');
            } else {
                setStep('review');
            }
        } catch {
            setFormError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handlePay() {
        setSubmitting(true);
        setFormError(null);
        try {
            const res = await fetch('/api/events/payment/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: event.slug, fullName, email, mobile }),
            });
            const data = await res.json();
            if (!res.ok) {
                setFormError(data.error ?? 'Something went wrong. Please try again.');
                return;
            }
            setBoundaryMessage(data.message);
            setStep('boundary');
        } catch {
            setFormError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    if (step === 'confirmed' && pricing) {
        return (
            <div className={`bg-glass ${styles.panel}`} role="status">
                <h1>Registration Confirmed</h1>
                <p>You&apos;re registered for <strong>{event.title}</strong>.</p>
                {registrationReference && (
                    <div className={styles.referenceBox}>
                        <p className={styles.referenceLabel}>Your registration reference (save this now):</p>
                        <code className={styles.referenceCode}>{registrationReference}</code>
                    </div>
                )}
                <p className={styles.limitationNote}>
                    Email confirmation is not yet implemented this sprint — this reference is shown once and is not
                    sent to you automatically. Use it on the{' '}
                    <Link href="/events/my-registration">View My Registration</Link> page to re-verify your
                    registration later.
                </p>
                <Link href={`/events/${event.slug}`} className="btn btn-secondary">Back to Event</Link>
            </div>
        );
    }

    if (step === 'boundary') {
        return (
            <div className={`bg-glass ${styles.panel}`} role="status">
                <h1>Safe Integration Boundary Reached</h1>
                <p>{boundaryMessage}</p>
                <p className={styles.limitationNote}>
                    No payment has been processed. No registration for <strong>{event.title}</strong> has been
                    confirmed as paid. Real CCAvenue checkout is planned for the next sprint.
                </p>
                <Link href={`/events/${event.slug}`} className="btn btn-secondary">Back to Event</Link>
            </div>
        );
    }

    if (step === 'review' && pricing) {
        return (
            <div className={`bg-glass ${styles.panel}`}>
                <h1>Payment Review</h1>
                <dl className={styles.detailList}>
                    <div><dt>Event</dt><dd>{event.title}</dd></div>
                    <div><dt>Attendee</dt><dd>{fullName}</dd></div>
                    <div><dt>Email</dt><dd>{email}</dd></div>
                    <div><dt>Mobile</dt><dd>{mobile}</dd></div>
                    <div><dt>Mode / Type</dt><dd>{event.mode} / {event.type}</dd></div>
                    <div><dt>Registration Fee</dt><dd>₹{pricing.baseFeeInr.toFixed(2)}</dd></div>
                    {pricing.taxesFeesInr > 0 && (
                        <div><dt>Taxes/Fees</dt><dd>₹{pricing.taxesFeesInr.toFixed(2)}</dd></div>
                    )}
                    <div><dt>Final Amount</dt><dd>₹{pricing.finalPayableInr.toFixed(2)} INR</dd></div>
                </dl>
                <p className={styles.limitationNote}>
                    <Link href="/policies/refund">Cancellation &amp; Refund Policy</Link>
                </p>
                {formError && <p className={styles.error} role="alert">{formError}</p>}
                <button type="button" className="btn btn-primary" onClick={handlePay} disabled={submitting}>
                    {submitting ? 'Please wait…' : `Pay ₹${pricing.finalPayableInr.toFixed(2)} Securely`}
                </button>
            </div>
        );
    }

    return (
        <form className={`bg-glass ${styles.panel}`} onSubmit={handleSubmit} noValidate>
            <h1>Register for {event.title}</h1>
            <p className={styles.introText}>No login required. We only collect your name, email and mobile number.</p>

            <div className={styles.field}>
                <label htmlFor="fullName">Full Name</label>
                <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    maxLength={100}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    aria-invalid={!!fieldErrors.fullName}
                    aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
                    required
                />
                {fieldErrors.fullName && <p id="fullName-error" className={styles.error} role="alert">{fieldErrors.fullName}</p>}
            </div>

            <div className={styles.field}>
                <label htmlFor="email">Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                    required
                />
                {fieldErrors.email && <p id="email-error" className={styles.error} role="alert">{fieldErrors.email}</p>}
            </div>

            <div className={styles.field}>
                <label htmlFor="mobile">Mobile</label>
                <input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    autoComplete="tel"
                    maxLength={15}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    aria-invalid={!!fieldErrors.mobile}
                    aria-describedby={fieldErrors.mobile ? 'mobile-error' : undefined}
                    required
                />
                {fieldErrors.mobile && <p id="mobile-error" className={styles.error} role="alert">{fieldErrors.mobile}</p>}
            </div>

            {formError && <p className={styles.error} role="alert">{formError}</p>}

            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%' }}>
                {submitting ? 'Please wait…' : event.type === 'Paid' ? 'Continue to Payment Review' : 'Free Registration'}
            </button>
        </form>
    );
}
