"use client";
import { Suspense, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './ContactForm.module.css';
import { track } from '@/lib/analytics/client';
import { ENQUIRY_OPTIONS, findEnquiry } from '@/lib/contact/enquiries';
import { LIMITS, type ContactField } from '@/lib/contact/validation';
import { SITE } from '@/lib/site';

type Status =
    | { kind: 'idle' }
    | { kind: 'submitting' }
    | { kind: 'success' }
    | { kind: 'error'; message: string };

/** Preselects the enquiry type from ?enquiry=… (e.g. links from "Apply for Internship"). */
function EnquiryFromUrl({ onChange }: { onChange: (value: string) => void }) {
    const value = useSearchParams().get('enquiry');
    useEffect(() => {
        if (findEnquiry(value)) onChange(value as string);
    }, [value, onChange]);
    return null;
}

export default function ContactForm({ location = 'contact-page' }: { location?: string }) {
    const id = useId();
    const [enquiry, setEnquiry] = useState('');
    const [status, setStatus] = useState<Status>({ kind: 'idle' });
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<ContactField, string>>>({});
    const statusRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (status.kind === 'success' || status.kind === 'error') statusRef.current?.focus();
    }, [status]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
        setStatus({ kind: 'submitting' });
        setFieldErrors({});

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const body = await res.json().catch(() => ({}));
            if (res.ok && body.ok === true) {
                // Only a delivered enquiry counts. Context and enquiry category only — never field values.
                track('contact_submit', {
                    section: 'contact',
                    cta_location: location,
                    enquiry_type: findEnquiry(data.enquiry)?.analytics,
                });
                form.reset();
                setEnquiry('');
                setStatus({ kind: 'success' });
                return;
            }
            setFieldErrors(body.fieldErrors ?? {});
            setStatus({ kind: 'error', message: body.error ?? `We couldn’t send your enquiry. Please email ${SITE.email}.` });
        } catch {
            setStatus({ kind: 'error', message: `Your enquiry was not sent because of a network problem. Please try again or email ${SITE.email}.` });
        }
    }

    const fieldProps = (field: ContactField) => ({
        id: `${id}-${field}`,
        name: field,
        'aria-invalid': fieldErrors[field] ? true : undefined,
        'aria-describedby': fieldErrors[field] ? `${id}-${field}-error` : undefined,
    });

    const errorFor = (field: ContactField) =>
        fieldErrors[field] ? (
            <p id={`${id}-${field}-error`} className={styles.fieldError}>{fieldErrors[field]}</p>
        ) : null;

    if (status.kind === 'success') {
        return (
            <div ref={statusRef} tabIndex={-1} className={`${styles.card} ${styles.success}`} role="status">
                <p className={`badge state-nominal ${styles.successBadge}`}>Sent</p>
                <h3>Thank you. Your enquiry has been sent.</h3>
                <p>The iTelematics team will reply by email from {SITE.email}.</p>
                <button type="button" className="btn btn-secondary" onClick={() => setStatus({ kind: 'idle' })}>
                    Send another enquiry
                </button>
            </div>
        );
    }

    return (
        <form className={styles.card} onSubmit={handleSubmit}>
            <Suspense fallback={null}>
                <EnquiryFromUrl onChange={setEnquiry} />
            </Suspense>

            <div className={styles.row}>
                <div className={styles.field}>
                    <label htmlFor={`${id}-name`}>Name <span aria-hidden="true">*</span></label>
                    <input {...fieldProps('name')} type="text" required maxLength={LIMITS.name} autoComplete="name" />
                    {errorFor('name')}
                </div>
                <div className={styles.field}>
                    <label htmlFor={`${id}-email`}>Email <span aria-hidden="true">*</span></label>
                    <input {...fieldProps('email')} type="email" required maxLength={LIMITS.email} autoComplete="email" />
                    {errorFor('email')}
                </div>
            </div>

            <div className={styles.row}>
                <div className={styles.field}>
                    <label htmlFor={`${id}-organisation`}>Organisation or university</label>
                    <input {...fieldProps('organisation')} type="text" maxLength={LIMITS.organisation} autoComplete="organization" />
                    {errorFor('organisation')}
                </div>
                <div className={styles.field}>
                    <label htmlFor={`${id}-country`}>Country</label>
                    <input {...fieldProps('country')} type="text" maxLength={LIMITS.country} autoComplete="country-name" />
                    {errorFor('country')}
                </div>
            </div>

            <div className={styles.field}>
                <label htmlFor={`${id}-enquiry`}>Enquiry type <span aria-hidden="true">*</span></label>
                <select {...fieldProps('enquiry')} required value={enquiry} onChange={(e) => setEnquiry(e.target.value)}>
                    <option value="" disabled>Choose one</option>
                    {ENQUIRY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                {errorFor('enquiry')}
            </div>

            <div className={styles.field}>
                <label htmlFor={`${id}-message`}>Message <span aria-hidden="true">*</span></label>
                <textarea
                    {...fieldProps('message')}
                    required
                    minLength={LIMITS.messageMin}
                    maxLength={LIMITS.messageMax}
                    rows={6}
                    aria-describedby={fieldErrors.message ? `${id}-message-error` : `${id}-message-hint`}
                />
                {errorFor('message') ?? (
                    <p id={`${id}-message-hint`} className={styles.hint}>
                        Your background, the research question or service you have in mind, and any timelines.
                    </p>
                )}
            </div>

            {/* Honeypot for bots; hidden from people and assistive technology. */}
            <div className={styles.honeypot} aria-hidden="true">
                <label htmlFor={`${id}-website`}>Website</label>
                <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            {status.kind === 'error' && (
                <div ref={statusRef} tabIndex={-1} className={styles.error} role="alert">
                    <p className={`badge state-critical ${styles.errorBadge}`}>Not sent</p>
                    <p>{status.message}</p>
                </div>
            )}

            <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={status.kind === 'submitting'}>
                {status.kind === 'submitting' ? 'Sending…' : 'Send enquiry'}
            </button>

            <p className={styles.privacy}>
                We use these details only to reply to your enquiry. See our <Link href="/policies/privacy">Privacy Policy</Link>.
            </p>
        </form>
    );
}
