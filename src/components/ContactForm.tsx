"use client";
import { Suspense, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './ContactForm.module.css';
import { track } from '@/lib/analytics/client';
import { ENQUIRY_OPTIONS, findEnquiry } from '@/lib/contact/enquiries';
import { LIMITS, validateContact, type ContactEnquiry, type ContactField } from '@/lib/contact/validation';
import { SITE } from '@/lib/site';

/** Preselects the enquiry type from ?enquiry=… (e.g. links from "Join Satellite Engineering" or "Apply / Discuss Internship"). */
function EnquiryFromUrl({ onChange }: { onChange: (value: string) => void }) {
    const value = useSearchParams().get('enquiry');
    useEffect(() => {
        if (findEnquiry(value)) onChange(value as string);
    }, [value, onChange]);
    return null;
}

export function buildEmail(e: ContactEnquiry) {
    const label = findEnquiry(e.enquiry)?.label ?? 'Enquiry';
    const subject = `${label}: ${e.name}`;
    const body = [
        e.message,
        '',
        '—',
        `Name: ${e.name}`,
        `Email: ${e.email}`,
        `Organisation / University: ${e.organisation || '—'}`,
        `Country: ${e.country || '—'}`,
        `Enquiry type: ${label}`,
    ].join('\n');
    const href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return { subject, body, href };
}

/**
 * Builds an email draft in the visitor's own email app. The website never sends or stores the
 * message, and never says it was sent: the visitor reviews the draft and presses Send.
 */
export default function ContactForm({ location = 'contact-page' }: { location?: string }) {
    const id = useId();
    const [enquiry, setEnquiry] = useState('');
    const [errors, setErrors] = useState<Partial<Record<ContactField, string>>>({});
    const [draft, setDraft] = useState<{ subject: string; body: string; href: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const statusRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (draft) statusRef.current?.focus();
    }, [draft]);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const result = validateContact(Object.fromEntries(new FormData(e.currentTarget)));
        if (!result.valid) {
            setErrors(result.errors);
            return;
        }
        setErrors({});
        const email = buildEmail(result.data);
        // Context and enquiry category only — never field values. This counts drafts opened, not emails sent.
        track('contact_submit', {
            section: 'contact',
            cta_location: location,
            enquiry_type: findEnquiry(result.data.enquiry)?.analytics,
        });
        setDraft(email);
        setCopied(false);
        window.location.href = email.href;
    }

    async function copyDraft() {
        if (!draft) return;
        try {
            await navigator.clipboard.writeText(`To: ${SITE.email}\nSubject: ${draft.subject}\n\n${draft.body}`);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    }

    const fieldProps = (field: ContactField) => ({
        id: `${id}-${field}`,
        name: field,
        'aria-invalid': errors[field] ? true : undefined,
        'aria-describedby': errors[field] ? `${id}-${field}-error` : undefined,
    });

    const errorFor = (field: ContactField) =>
        errors[field] ? <p id={`${id}-${field}-error`} className={styles.fieldError}>{errors[field]}</p> : null;

    return (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <Suspense fallback={null}>
                <EnquiryFromUrl onChange={setEnquiry} />
            </Suspense>

            <div className={styles.row}>
                <div className={styles.field}>
                    <label htmlFor={`${id}-name`}>Name</label>
                    <input {...fieldProps('name')} type="text" required maxLength={LIMITS.name} autoComplete="name" />
                    {errorFor('name')}
                </div>
                <div className={styles.field}>
                    <label htmlFor={`${id}-email`}>Email</label>
                    <input {...fieldProps('email')} type="email" required maxLength={LIMITS.email} autoComplete="email" />
                    {errorFor('email')}
                </div>
            </div>

            <div className={styles.row}>
                <div className={styles.field}>
                    <label htmlFor={`${id}-organisation`}>Organisation / University <span className={styles.optional}>optional</span></label>
                    <input {...fieldProps('organisation')} type="text" maxLength={LIMITS.organisation} autoComplete="organization" />
                    {errorFor('organisation')}
                </div>
                <div className={styles.field}>
                    <label htmlFor={`${id}-country`}>Country <span className={styles.optional}>optional</span></label>
                    <input {...fieldProps('country')} type="text" maxLength={LIMITS.country} autoComplete="country-name" />
                    {errorFor('country')}
                </div>
            </div>

            <div className={styles.field}>
                <label htmlFor={`${id}-enquiry`}>Enquiry type</label>
                <select {...fieldProps('enquiry')} required value={enquiry} onChange={(e) => setEnquiry(e.target.value)}>
                    <option value="" disabled>Choose one</option>
                    {ENQUIRY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                {errorFor('enquiry')}
            </div>

            <div className={styles.field}>
                <label htmlFor={`${id}-message`}>Message</label>
                <textarea
                    {...fieldProps('message')}
                    required
                    minLength={LIMITS.messageMin}
                    maxLength={LIMITS.messageMax}
                    rows={6}
                />
                {errorFor('message')}
            </div>

            <div className={styles.submitRow}>
                <button type="submit" className={`btn btn-primary ${styles.submit}`}>Open Email Draft →</button>
                <p className={styles.helper}>
                    Your email app will open with the information above pre-filled. Review it and press Send.
                </p>
            </div>

            {draft && (
                <div ref={statusRef} tabIndex={-1} className={styles.status} role="status">
                    <p className={styles.statusTitle}>Your email draft is ready.</p>
                    <p>
                        It is addressed to <a href={`mailto:${SITE.email}`} className="inline-link">{SITE.email}</a>. Nothing
                        has been sent yet: review the draft in your email app and press Send.
                    </p>
                    <p>Didn’t open? Copy the message and paste it into a new email.</p>
                    <button type="button" className="btn btn-secondary" onClick={copyDraft}>
                        {copied ? 'Copied' : 'Copy message'}
                    </button>
                </div>
            )}

            <p className={styles.privacy}>
                The website does not send or store your message. See our <Link href="/policies/privacy" className="inline-link">Privacy Policy</Link>.
            </p>
        </form>
    );
}
