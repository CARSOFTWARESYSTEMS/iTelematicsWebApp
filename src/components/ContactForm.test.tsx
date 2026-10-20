import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ContactForm, { buildEmail } from './ContactForm';
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
        expect(params.get('subject')).toBe('Satellite Engineering Internship: Jane Researcher');
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
        expect(writeText.mock.calls[0][0]).toMatch(/^To: info@iTelematics\.com\nSubject: Satellite Engineering Internship: Jane Researcher/);
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

    it('encodes line breaks and special characters safely in the draft', () => {
        const { href } = buildEmail({
            name: 'Zoë O’Brien',
            email: 'zoe@example.org',
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
