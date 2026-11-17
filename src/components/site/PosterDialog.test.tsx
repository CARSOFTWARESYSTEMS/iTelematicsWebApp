import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import PosterDialog from './PosterDialog';
import { EXPERIENCES } from '@/lib/space-twin/experiences';
import { EXTRA_TABS } from '@/lib/space-twin/launch';

const POSTER = { id: 'test', src: '/images/test.webp', width: 1600, height: 900, alt: 'Test poster image', label: 'Test poster' };

describe('PosterDialog', () => {
    // jsdom has the element but no modal behaviour: open and close it the way browsers do.
    // It also reports the page as hidden, which would hold the countdown.
    beforeAll(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
        HTMLDialogElement.prototype.showModal = function () {
            this.open = true;
        };
        HTMLDialogElement.prototype.close = function () {
            this.open = false;
            this.dispatchEvent(new Event('close'));
        };
    });

    beforeEach(() => sessionStorage.clear());
    afterEach(() => {
        vi.useRealTimers();
        window.history.replaceState(null, '', '/');
    });

    it.each([1, 2, 3, 4, 5, 6])('does not obstruct a valid mission URL %s or mark the poster as seen', (id) => {
        window.history.replaceState(null, '', `/?space_digital_twin=${id}`);
        render(<PosterDialog {...POSTER} spaceLaunchRegistry={[...EXPERIENCES, ...EXTRA_TABS]} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(sessionStorage.getItem('poster-seen:test')).toBeNull();
    });

    it('keeps the normal poster for invalid mission URLs', () => {
        window.history.replaceState(null, '', '/?space_digital_twin=7');
        render(<PosterDialog {...POSTER} spaceLaunchRegistry={[...EXPERIENCES, ...EXTRA_TABS]} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not change posters on other pages', () => {
        window.history.replaceState(null, '', '/ev-engineer?space_digital_twin=6');
        render(<PosterDialog {...POSTER} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('opens once per browser session', () => {
        const first = render(<PosterDialog {...POSTER} />);
        expect(screen.getByRole('dialog', { name: 'Test poster' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Test poster image' })).toBeInTheDocument();
        first.unmount();

        render(<PosterDialog {...POSTER} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes with the close button', () => {
        render(<PosterDialog {...POSTER} />);
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes itself a few seconds after the image loads, holding while the pointer is on it', async () => {
        vi.useFakeTimers();
        render(<PosterDialog {...POSTER} seconds={5} />);
        const dialog = screen.getByRole('dialog');

        act(() => vi.advanceTimersByTime(10_000));
        expect(dialog).toHaveAttribute('data-paused'); // image not loaded yet

        // next/image reports the load after a decode promise
        await act(async () => fireEvent.load(screen.getByRole('img')));
        expect(dialog).not.toHaveAttribute('data-paused');
        act(() => vi.advanceTimersByTime(3_000));
        const panel = screen.getByRole('img').parentElement!;
        fireEvent.pointerEnter(panel, { pointerType: 'mouse' }); // appearing under a resting cursor does not hold it
        expect(dialog).not.toHaveAttribute('data-paused');
        fireEvent.pointerMove(panel, { pointerType: 'mouse' });
        act(() => vi.advanceTimersByTime(10_000));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        fireEvent.pointerLeave(panel, { pointerType: 'mouse' });
        act(() => vi.advanceTimersByTime(1_900));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        act(() => vi.advanceTimersByTime(200));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('offers its contact actions', () => {
        render(
            <PosterDialog
                {...POSTER}
                actions={[
                    { label: 'WhatsApp', href: 'https://wa.me/910000000000', tone: 'whatsapp' },
                    { label: 'Email', href: 'mailto:info@example.com' },
                ]}
            />,
        );
        const dialog = screen.getByRole('dialog');
        const whatsapp = within(dialog).getByRole('link', { name: /^WhatsApp/ });
        expect(whatsapp).toHaveAttribute('href', 'https://wa.me/910000000000');
        expect(whatsapp).toHaveAttribute('target', '_blank');
        expect(within(dialog).getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:info@example.com');
    });
});
