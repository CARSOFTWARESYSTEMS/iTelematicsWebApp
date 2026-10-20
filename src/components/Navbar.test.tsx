import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Navbar from './Navbar';
import { track } from '@/lib/analytics/client';

let mockPathname = '/';
vi.mock('next/navigation', () => ({
    usePathname: () => mockPathname,
}));

vi.mock('@/lib/analytics/client', () => ({ track: vi.fn() }));

const PRIMARY = ['Satellite Engineering', 'Research Platform', 'Internships', 'Partners & Ecosystem', 'About', 'Contact'];

describe('Navbar', () => {
    beforeEach(() => {
        mockPathname = '/';
        vi.mocked(track).mockClear();
    });

    it('renders the Satellite Engineering navigation and the Join R&D CTA', () => {
        render(<Navbar />);
        const nav = screen.getByRole('navigation', { name: 'Main' });
        for (const name of PRIMARY) {
            expect(within(nav).getAllByRole('link', { name }).length).toBeGreaterThan(0);
        }
        expect(within(nav).getAllByRole('button', { name: /Consultancy & Services/ }).length).toBeGreaterThan(0);
        const cta = within(nav).getAllByRole('link', { name: 'Join Satellite R&D' })[0];
        expect(cta).toHaveAttribute('data-track', 'join_rnd_click');
    });

    it('no longer links to Events & Registration or EV Academy', () => {
        const { container } = render(<Navbar />);
        expect(screen.queryByText(/Events & Registration/)).not.toBeInTheDocument();
        expect(screen.queryByText(/EV Academy/)).not.toBeInTheDocument();
        expect(container.querySelector('a[href^="/events"], a[href="/academy"]')).toBeNull();
    });

    it('keeps the Consultancy & Services groups behind an accessible disclosure', () => {
        render(<Navbar />);
        const toggle = screen.getAllByRole('button', { name: /Consultancy & Services/ })[0];
        expect(toggle).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        for (const group of ['Space Research & Workshops', 'EV Battery Workshops', 'Papers & Presentations', 'Battery Pack Aadhaar Systems', 'EV & AI Toolkits']) {
            expect(screen.getByText(group)).toBeInTheDocument();
        }
        expect(screen.getByRole('link', { name: /CubeTwin Simulator/ })).toHaveAttribute('href', 'https://aerospace.ev.engineer/space/cubesat');
        expect(screen.queryByText(/Battery Diagnostics \(POC\/UX\) - 3/)).not.toBeInTheDocument();

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('marks the current page', () => {
        mockPathname = '/research-platform';
        render(<Navbar />);
        const current = screen.getAllByRole('link', { name: 'Research Platform' }).filter((l) => l.getAttribute('aria-current') === 'page');
        expect(current.length).toBeGreaterThan(0);
    });

    it('reports mobile_navigation_use when the mobile menu opens, not when it closes', () => {
        render(<Navbar />);
        const toggle = screen.getByRole('button', { name: 'Toggle Menu' });
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        fireEvent.click(toggle);
        expect(track).toHaveBeenCalledTimes(1);
        expect(track).toHaveBeenCalledWith('mobile_navigation_use', { cta_name: 'Open menu', cta_location: 'header-mobile' });
    });

    it('marks desktop and mobile menus so their CTAs share event names with distinct locations', () => {
        const { container } = render(<Navbar />);
        expect(container.querySelector('[data-analytics-location="header-desktop"]')).not.toBeNull();
        const mobile = container.querySelector('[data-analytics-location="header-mobile"]');
        expect(mobile).toHaveAttribute('data-track-fallback', 'mobile_navigation_use');
        expect(container.querySelectorAll('[data-track-fallback="consultancy_click"]')).toHaveLength(2);
    });

    it('labels external submenu links for screen readers without changing the analytics CTA name', () => {
        render(<Navbar />);
        fireEvent.click(screen.getAllByRole('button', { name: /Consultancy & Services/ })[0]);
        const link = screen.getByRole('link', { name: /^CubeTwin Simulator\s*\(opens in a new tab\)$/ });
        expect(link).toHaveAttribute('data-track-name', 'CubeTwin Simulator');
        expect(link).toHaveAttribute('target', '_blank');
    });
});
