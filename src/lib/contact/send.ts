import { findEnquiry } from './enquiries';
import type { ContactEnquiry } from './validation';

export type SendResult = { ok: true } | { ok: false; reason: 'not_configured' | 'provider_error' };

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_TO = 'info@iTelematics.com';

export function isContactConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL);
}

function formatBody(e: ContactEnquiry): string {
    return [
        `Enquiry type: ${findEnquiry(e.enquiry)?.label ?? e.enquiry}`,
        `Name: ${e.name}`,
        `Email: ${e.email}`,
        `Organisation: ${e.organisation || '—'}`,
        `Country: ${e.country || '—'}`,
        '',
        e.message,
        '',
        '— Sent from the itelematics.com contact form',
    ].join('\n');
}

/** Delivers an enquiry by email through Resend. Success means Resend accepted the message. */
export async function sendEnquiry(enquiry: ContactEnquiry): Promise<SendResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.CONTACT_FROM_EMAIL;
    if (!apiKey || !from) return { ok: false, reason: 'not_configured' };

    const label = findEnquiry(enquiry.enquiry)?.label ?? 'Enquiry';
    try {
        const res = await fetch(RESEND_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from,
                to: [process.env.CONTACT_TO_EMAIL || DEFAULT_TO],
                reply_to: enquiry.email,
                subject: `[Website] ${label} — ${enquiry.name}`,
                text: formatBody(enquiry),
            }),
            signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) {
            console.error(`[contact] Resend rejected the enquiry: HTTP ${res.status}`);
            return { ok: false, reason: 'provider_error' };
        }
        return { ok: true };
    } catch (err) {
        console.error('[contact] Resend request failed:', err instanceof Error ? err.message : err);
        return { ok: false, reason: 'provider_error' };
    }
}
