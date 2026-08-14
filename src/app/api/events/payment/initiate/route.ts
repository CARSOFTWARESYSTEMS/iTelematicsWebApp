import { NextRequest, NextResponse } from 'next/server';
import { getEventBySlug, computePricing } from '@/lib/events/data';
import { isPubliclyVisible } from '@/lib/events/cta';
import { validateGuestDetails } from '@/lib/events/validation';
import { isIpRateLimited } from '@/lib/events/dedupe';

const MAX_BODY_BYTES = 4096;

/**
 * Safe pre-gateway boundary. CCAvenue is NOT integrated this sprint — this
 * endpoint never returns a success/paid/confirmed status under any input.
 * Amount/currency/discount/status are never accepted from the client; the
 * only source of truth is the server-side event record.
 */
export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
        return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
        body = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (isIpRateLimited(ip)) {
        return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const slug = typeof body.slug === 'string' ? body.slug.slice(0, 200) : '';
    const event = getEventBySlug(slug);
    if (!event || !isPubliclyVisible(event)) {
        return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }
    if (event.status !== 'registration_open' || event.type !== 'Paid') {
        return NextResponse.json({ error: 'This event is not open for paid registration.' }, { status: 409 });
    }

    const { valid, errors } = validateGuestDetails({
        fullName: typeof body.fullName === 'string' ? body.fullName : '',
        email: typeof body.email === 'string' ? body.email : '',
        mobile: typeof body.mobile === 'string' ? body.mobile : '',
    });
    if (!valid) {
        return NextResponse.json({ error: 'Invalid details.', fieldErrors: errors }, { status: 400 });
    }

    // Server-authoritative pricing — any client-supplied amount/currency/
    // status fields in the request body are intentionally ignored above.
    const pricing = computePricing(event);

    return NextResponse.json({
        boundary: 'SAFE_INTEGRATION_BOUNDARY_REACHED',
        paymentStatus: 'not_processed',
        message:
            'CCAvenue is not yet integrated. No payment has been attempted, no amount has been charged, and no registration has been confirmed as paid.',
        event: { slug: event.slug, title: event.title },
        pricing,
    });
}
