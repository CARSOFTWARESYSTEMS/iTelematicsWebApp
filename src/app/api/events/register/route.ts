import { NextRequest, NextResponse } from 'next/server';
import { getEventBySlug, computePricing } from '@/lib/events/data';
import { isPubliclyVisible } from '@/lib/events/cta';
import { validateGuestDetails } from '@/lib/events/validation';
import { isRateLimitedOrDuplicate, isIpRateLimited } from '@/lib/events/dedupe';
import { signRegistrationToken } from '@/lib/events/token';

const MAX_BODY_BYTES = 4096;

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

    const slug = typeof body.slug === 'string' ? body.slug.slice(0, 200) : '';
    const event = getEventBySlug(slug);
    if (!event || !isPubliclyVisible(event)) {
        return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }
    if (event.status !== 'registration_open') {
        return NextResponse.json({ error: 'Registration is not open for this event.' }, { status: 409 });
    }

    const { valid, errors } = validateGuestDetails({
        fullName: typeof body.fullName === 'string' ? body.fullName : '',
        email: typeof body.email === 'string' ? body.email : '',
        mobile: typeof body.mobile === 'string' ? body.mobile : '',
    });
    if (!valid) {
        return NextResponse.json({ error: 'Invalid details.', fieldErrors: errors }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (isIpRateLimited(ip)) {
        return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const fullName = (body.fullName as string).trim();
    const email = (body.email as string).trim();
    const mobile = (body.mobile as string).trim();

    if (isRateLimitedOrDuplicate(slug, email, mobile)) {
        return NextResponse.json(
            {
                error:
                    'A registration attempt for this event with these details was already received recently. If you already registered, no further action is needed.',
            },
            { status: 409 }
        );
    }

    const pricing = computePricing(event);

    // Client cannot declare amount, currency, or success for a paid event —
    // pricing above is derived solely from server-side event data, and no
    // paid event is ever confirmed by this endpoint.
    if (event.type === 'Paid') {
        return NextResponse.json({
            registrationStatus: 'awaiting_payment',
            event: { slug: event.slug, title: event.title },
            pricing,
        });
    }

    const registrationId = crypto.randomUUID();
    const registrationReference = signRegistrationToken({
        v: 1,
        registrationId,
        slug: event.slug,
        type: 'free',
        issuedAt: new Date().toISOString(),
    });

    return NextResponse.json({
        registrationStatus: 'confirmed',
        event: { slug: event.slug, title: event.title, mode: event.mode },
        pricing,
        registrationReference,
        guest: { fullName },
        note:
            'Save this reference now — it is shown once. Email confirmation is not yet implemented this sprint (see Known Limitations in the verification report).',
    });
}
