import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ContactForm from './ContactForm';
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
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: 'Battery SOC research during eclipse.' } });
}

function mockFetch(status: number, body: unknown) {
    return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe('ContactForm', () => {
    beforeEach(() => {
        mockSearch = '';
        vi.mocked(track).mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('fires contact_submit with the enquiry category only after a successful delivery', async () => {
        const fetchSpy = mockFetch(200, { ok: true });
        render(<ContactForm location="contact-page" />);
        fill();
        fireEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));

        expect(await screen.findByText('Thank you. Your enquiry has been sent.')).toBeInTheDocument();
        expect(fetchSpy).toHaveBeenCalledWith('/api/contact', expect.objectContaining({ method: 'POST' }));
        expect(track).toHaveBeenCalledTimes(1);
        expect(track).toHaveBeenCalledWith('contact_submit', {
            section: 'contact',
            cta_location: 'contact-page',
            enquiry_type: 'internship',
        });
        expect(JSON.stringify(vi.mocked(track).mock.calls)).not.toMatch(/Jane|jane@example|Battery SOC/);
    });

    it('maps specific enquiry options to the controlled analytics vocabulary', async () => {
        mockFetch(200, { ok: true });
        render(<ContactForm />);
        fill();
        fireEvent.change(screen.getByLabelText(/^Enquiry type/), { target: { value: 'technical-review' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));
        await screen.findByText('Thank you. Your enquiry has been sent.');
        expect(track).toHaveBeenCalledWith('contact_submit', expect.objectContaining({ enquiry_type: 'research' }));
    });

    it('shows the failure state and does not track when delivery fails', async () => {
        mockFetch(503, { ok: false, error: 'We couldn’t send your enquiry just now. Please email info@iTelematics.com instead.' });
        render(<ContactForm />);
        fill();
        fireEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('Not sent');
        expect(alert).toHaveTextContent('info@iTelematics.com');
        expect(track).not.toHaveBeenCalled();
        expect(screen.getByLabelText(/^Name/)).toHaveValue('Jane Researcher');
    });

    it('shows server field errors next to the fields', async () => {
        mockFetch(400, { ok: false, error: 'Please check the highlighted fields.', fieldErrors: { email: 'Enter a valid email address.' } });
        render(<ContactForm />);
        fill();
        fireEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));

        expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
        expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true');
        expect(track).not.toHaveBeenCalled();
    });

    it('does not track on a network error', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
        render(<ContactForm />);
        fill();
        fireEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('network problem');
        expect(track).not.toHaveBeenCalled();
    });

    it('preselects the enquiry type from ?enquiry=', async () => {
        mockSearch = 'enquiry=research';
        render(<ContactForm />);
        await waitFor(() => expect(screen.getByLabelText(/^Enquiry type/)).toHaveValue('research'));
    });

    it('ignores unknown ?enquiry= values', () => {
        mockSearch = 'enquiry=<script>';
        render(<ContactForm />);
        expect(screen.getByLabelText(/^Enquiry type/)).toHaveValue('');
    });
});
