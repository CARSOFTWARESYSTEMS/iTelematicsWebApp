import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ContactForm, { buildEmail, siteName } from './ContactForm';
import { track } from '@/lib/analytics/client';

let mockSearch = '';
vi.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams(mockSearch),
}));

vi.mock('@/lib/analytics/client', () => ({ track: vi.fn() }));

function fill() {
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Jane Researcher' } });
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'jane@example.org' } });
    fireEvent.change(screen.getByLabelText(/^Enquiry type/), { target: { value: 'internship' } });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: 'Battery SOC research during eclipse & safe mode.' } });
}

describe('ContactForm (email draft)', () => {
    let hrefSetter: Mock<(href: string) => void>;

    beforeEach(() => {
        mockSearch = '';
        vi.mocked(track).mockClear();
        hrefSetter = vi.fn<(href: string) => void>();
        // Capture the mailto: navigation instead of letting jsdom attempt it.
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...window.location, set href(v: string) { hrefSetter(v); } },
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('opens a pre-filled draft to info@iTelematics.com and tracks it without personal data', () => {
        render(<ContactForm location="contact-page" />);
        fill();
        fireEvent.click(screen.getByRole('button', { name: 'Open Email Draft →' }));

        expect(hrefSetter).toHaveBeenCalledTimes(1);
        const href: string = hrefSetter.mock.calls[0][0];
        expect(href.startsWith('mailto:info@iTelematics.com?subject=')).toBe(true);
        const params = new URLSearchParams(href.split('?')[1]);
        // The site's domain leads the subject and is named in the body (jsdom runs on localhost).
        expect(params.get('subject')).toBe('[localhost] Space Station Digital Twin: Jane Researcher');
        expect(params.get('body')).toMatch(/\nWebsite: localhost \(http:\/\/localhost(:\d+)?\/[^)?]*\)$/);
        expect(params.get('body')).toContain('Battery SOC research during eclipse & safe mode.');
        expect(params.get('body')).toContain('Email: jane@example.org');

        expect(track).toHaveBeenCalledTimes(1);
        expect(track).toHaveBeenCalledWith('contact_submit', { section: 'contact', cta_location: 'contact-page', enquiry_type: 'internship' });
        expect(JSON.stringify(vi.mocked(track).mock.calls)).not.toMatch(/Jane|jane@example|Battery SOC/);

        expect(screen.getByRole('status')).toHaveTextContent('Nothing has been sent yet');
    });

    it('never claims the message was sent', () => {
        render(<ContactForm />);
        fill();
        fireEvent.click(screen.getByRole('button', { name: 'Open Email Draft →' }));
        expect(screen.queryByText(/has been sent\.|message sent|enquiry sent/i)).not.toBeInTheDocument();
    });

    it('shows field errors and opens nothing when the form is invalid', () => {
        render(<ContactForm />);
        fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'not-an-email' } });
        fireEvent.click(screen.getByRole('button', { name: 'Open Email Draft →' }));

        expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
        expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true');
        expect(hrefSetter).not.toHaveBeenCalled();
        expect(track).not.toHaveBeenCalled();
    });

    it('offers a copy fallback when no email app opens', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
        render(<ContactForm />);
        fill();
        fireEvent.click(screen.getByRole('button', { name: 'Open Email Draft →' }));
        fireEvent.click(screen.getByRole('button', { name: 'Copy message' }));

        await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument());
        expect(writeText.mock.calls[0][0]).toMatch(/^To: info@iTelematics\.com\nSubject: \[localhost\] Space Station Digital Twin: Jane Researcher/);
    });

    it('preselects the enquiry type from ?enquiry= and ignores unknown values', async () => {
        mockSearch = 'enquiry=research';
        const { unmount } = render(<ContactForm />);
        await waitFor(() => expect(screen.getByLabelText(/^Enquiry type/)).toHaveValue('research'));
        unmount();

        mockSearch = 'enquiry=<script>';
        render(<ContactForm />);
        expect(screen.getByLabelText(/^Enquiry type/)).toHaveValue('');
    });

    it('maps specific options to the controlled analytics vocabulary', () => {
        render(<ContactForm />);
        fill();
        fireEvent.change(screen.getByLabelText(/^Enquiry type/), { target: { value: 'technical-review' } });
        fireEvent.click(screen.getByRole('button', { name: 'Open Email Draft →' }));
        expect(track).toHaveBeenCalledWith('contact_submit', expect.objectContaining({ enquiry_type: 'research' }));
    });

    it('offers Internships below the Research Lab, with its own value, subject line and analytics category', () => {
        render(<ContactForm />);
        const select = screen.getByLabelText(/^Enquiry type/) as HTMLSelectElement;
        const labels = [...select.options].map((o) => o.textContent);
        expect(labels.indexOf('Internships')).toBe(labels.indexOf('Space Station Digital Twin') + 1);
        expect(labels.indexOf('Student’s space playground')).toBe(labels.indexOf('Internships') + 1);
        expect(labels).toContain('Satellite Energy Intelligence');
        expect(labels).not.toContain('Satellite Energy & Telemetry Intelligence');
        fill();
        fireEvent.change(select, { target: { value: 'internships' } });
        fireEvent.click(screen.getByRole('button', { name: 'Open Email Draft →' }));
        expect(track).toHaveBeenCalledWith('contact_submit', expect.objectContaining({ enquiry_type: 'internships' }));
        expect(buildEmail({ name: 'Jane Researcher', email: 'jane@example.org', phone: '', organisation: '', country: '', enquiry: 'internships', message: 'x'.repeat(30) }).subject).toBe('Internships: Jane Researcher');
    });

    it('names the website the enquiry came from, so the same inbox can tell the domains apart', () => {
        expect(siteName('itelematics.com')).toBe('iTelematics.com');
        expect(siteName('www.itelematics.com')).toBe('iTelematics.com');
        expect(siteName('ev.engineer')).toBe('EV.ENGINEER');
        expect(siteName('www.ev.engineer')).toBe('EV.ENGINEER');
        expect(siteName('WWW.Example.ORG')).toBe('example.org');

        const draft = buildEmail(
            { name: 'Jane Researcher', email: 'jane@example.org', phone: '', organisation: '', country: '', enquiry: 'internships', message: 'x'.repeat(30) },
            { site: siteName('www.ev.engineer'), page: 'https://www.ev.engineer/contact' },
        );
        expect(draft.subject).toBe('[EV.ENGINEER] Internships: Jane Researcher');
        expect(draft.body.split('\n').at(-1)).toBe('Website: EV.ENGINEER (https://www.ev.engineer/contact)');
        expect(new URLSearchParams(draft.href.split('?')[1]).get('subject')).toBe('[EV.ENGINEER] Internships: Jane Researcher');
    });

    it('adds an optional phone / WhatsApp number to the draft, never to analytics', () => {
        render(<ContactForm location="contact-page" />);
        fill();
        fireEvent.change(screen.getByLabelText(/^Phone \/ WhatsApp/), { target: { value: '+91 98765 43210' } });
        fireEvent.click(screen.getByRole('button', { name: 'Open Email Draft →' }));
        const body = new URLSearchParams(hrefSetter.mock.calls[0][0].split('?')[1]).get('body');
        expect(body).toContain('Phone / WhatsApp: +91 98765 43210');
        expect(JSON.stringify((track as Mock).mock.calls)).not.toMatch(/98765/);
    });

    it('rejects an implausible phone number and leaves the field optional', () => {
        render(<ContactForm />);
        fill();
        fireEvent.change(screen.getByLabelText(/^Phone \/ WhatsApp/), { target: { value: 'call me' } });
        fireEvent.click(screen.getByRole('button', { name: 'Open Email Draft →' }));
        expect(hrefSetter).not.toHaveBeenCalled();
        expect(screen.getByText(/Enter a phone number with country code/)).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText(/^Phone \/ WhatsApp/), { target: { value: '' } });
        fireEvent.click(screen.getByRole('button', { name: 'Open Email Draft →' }));
        expect(hrefSetter).toHaveBeenCalledTimes(1);
        expect(new URLSearchParams(hrefSetter.mock.calls[0][0].split('?')[1]).get('body')).toContain('Phone / WhatsApp: —');
    });

    it('offers Student’s space playground with its own analytics category', () => {
        render(<ContactForm />);
        fill();
        fireEvent.change(screen.getByLabelText(/^Enquiry type/), { target: { value: 'students' } });
        fireEvent.click(screen.getByRole('button', { name: 'Open Email Draft →' }));
        expect(track).toHaveBeenCalledWith('contact_submit', expect.objectContaining({ enquiry_type: 'students' }));
        expect(new URLSearchParams(hrefSetter.mock.calls[0][0].split('?')[1]).get('subject')).toBe('[localhost] Student’s space playground: Jane Researcher');
    });

    it('preselects Internships from ?enquiry=internships', async () => {
        mockSearch = 'enquiry=internships';
        render(<ContactForm />);
        expect(await screen.findByDisplayValue('Internships')).toBeInTheDocument();
    });

    it('encodes line breaks and special characters safely in the draft', () => {
        const { href } = buildEmail({
            name: 'Zoë O’Brien',
            email: 'zoe@example.org',
            phone: '+353 1 234 5678',
            organisation: 'R&D Lab',
            country: 'Ireland',
            enquiry: 'research',
            message: 'Line one\nLine two & more ?=#',
        });
        const [, query] = href.split('?');
        const parts = query.split('&');
        expect(parts.map((part) => part.split('=')[0])).toEqual(['subject', 'body']);
        for (const part of parts) expect(part).not.toMatch(/[\n #]/);
        const body = new URLSearchParams(href.split('?')[1]).get('body');
        expect(body).toContain('Line one\nLine two & more ?=#');
        expect(body).toContain('Organisation / University: R&D Lab');
    });
});
