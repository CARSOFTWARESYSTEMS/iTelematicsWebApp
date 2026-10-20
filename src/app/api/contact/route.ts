import { NextRequest, NextResponse } from 'next/server';
import { validateContact } from '@/lib/contact/validation';
import { isRateLimited } from '@/lib/contact/rate-limit';
import { sendEnquiry } from '@/lib/contact/send';
import { SITE } from '@/lib/site';

const MAX_BODY_BYTES = 16 * 1024;
const FALLBACK = `Please email ${SITE.email} instead.`;

export async function POST(req: NextRequest) {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
        return NextResponse.json({ ok: false, error: 'Your message is too long.' }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
        body = JSON.parse(raw);
    } catch {
        return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
    }

    // Honeypot: real visitors never see or fill this field. Pretend success so bots learn nothing.
    if (typeof body.website === 'string' && body.website.trim() !== '') {
        return NextResponse.json({ ok: true });
    }

    const result = validateContact(body);
    if (!result.valid) {
        return NextResponse.json(
            { ok: false, error: 'Please check the highlighted fields.', fieldErrors: result.errors },
            { status: 400 },
        );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
        return NextResponse.json(
            { ok: false, error: `Too many enquiries from this connection. Try again in a few minutes, or email ${SITE.email}.` },
            { status: 429 },
        );
    }

    const sent = await sendEnquiry(result.data);
    if (!sent.ok) {
        const status = sent.reason === 'not_configured' ? 503 : 502;
        return NextResponse.json(
            { ok: false, error: `We couldn’t send your enquiry just now. ${FALLBACK}` },
            { status },
        );
    }

    return NextResponse.json({ ok: true });
}
