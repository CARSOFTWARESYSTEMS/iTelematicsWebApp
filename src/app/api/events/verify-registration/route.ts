import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationToken } from '@/lib/events/token';
import { getEventBySlug } from '@/lib/events/data';
import { isPubliclyVisible } from '@/lib/events/cta';

const MAX_BODY_BYTES = 4096;

/**
 * "View My Registration" without a database: verifies the HMAC signature on
 * a reference issued by /api/events/register rather than looking anything
 * up. A guessed/incorrect reference always returns { valid: false } with no
 * distinction between "not found" and "wrong signature" — this avoids
 * registration enumeration.
 */
export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
        return NextResponse.json({ valid: false }, { status: 200 });
    }

    let body: Record<string, unknown>;
    try {
        body = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ valid: false }, { status: 200 });
    }

    const token = typeof body.reference === 'string' ? body.reference : '';
    const payload = verifyRegistrationToken(token);
    if (!payload) {
        return NextResponse.json({ valid: false });
    }

    const event = getEventBySlug(payload.slug);
    if (!event || !isPubliclyVisible(event)) {
        return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
        valid: true,
        event: { slug: event.slug, title: event.title, mode: event.mode },
        registrationStatus: 'confirmed (free)',
        issuedAt: payload.issuedAt,
    });
}
