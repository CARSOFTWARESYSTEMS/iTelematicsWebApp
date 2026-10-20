import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { resetRateLimitForTests } from '@/lib/contact/rate-limit';

const VALID = {
    name: 'Jane Researcher',
    email: 'jane@example.org',
    organisation: 'Example University',
    country: 'India',
    enquiry: 'research',
    message: 'I would like to discuss eclipse energy modelling.',
};

function request(body: unknown, ip = '203.0.113.7') {
    return new NextRequest('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
        body: typeof body === 'string' ? body : JSON.stringify(body),
    });
}

describe('POST /api/contact', () => {
    beforeEach(() => {
        resetRateLimitForTests();
        vi.stubEnv('RESEND_API_KEY', 're_test');
        vi.stubEnv('CONTACT_FROM_EMAIL', 'iTelematics Website <website@itelematics.com>');
        vi.stubEnv('CONTACT_TO_EMAIL', 'info@itelematics.com');
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it('delivers a valid enquiry through Resend and reports success', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 'abc' }), { status: 200 }));
        const res = await POST(request(VALID));
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });

        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe('https://api.resend.com/emails');
        expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer re_test' });
        const sent = JSON.parse((init as RequestInit).body as string);
        expect(sent).toMatchObject({
            from: 'iTelematics Website <website@itelematics.com>',
            to: ['info@itelematics.com'],
            reply_to: 'jane@example.org',
            subject: '[Website] Research Collaboration — Jane Researcher',
        });
        expect(sent.text).toContain('I would like to discuss eclipse energy modelling.');
    });

    it('rejects invalid input with field errors and sends nothing', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        const res = await POST(request({ ...VALID, email: 'nope', enquiry: 'spam', message: 'short' }));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(Object.keys(body.fieldErrors).sort()).toEqual(['email', 'enquiry', 'message']);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects malformed and oversized bodies', async () => {
        expect((await POST(request('{not json'))).status).toBe(400);
        expect((await POST(request({ ...VALID, message: 'x'.repeat(20_000) }))).status).toBe(413);
    });

    it('silently accepts honeypot submissions without sending', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        const res = await POST(request({ ...VALID, website: 'http://spam.example' }));
        expect(res.status).toBe(200);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns 503 with a fallback when email delivery is not configured', async () => {
        vi.stubEnv('RESEND_API_KEY', '');
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        const res = await POST(request(VALID));
        expect(res.status).toBe(503);
        expect((await res.json()).error).toContain('info@iTelematics.com');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns 502 when Resend rejects or is unreachable', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 422 }));
        expect((await POST(request(VALID))).status).toBe(502);

        vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('timeout'));
        expect((await POST(request(VALID, '198.51.100.9'))).status).toBe(502);
    });

    it('rate-limits repeated submissions from one connection', async () => {
        vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 200 }));
        const statuses = [];
        for (let i = 0; i < 6; i++) statuses.push((await POST(request(VALID))).status);
        expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    });
});
