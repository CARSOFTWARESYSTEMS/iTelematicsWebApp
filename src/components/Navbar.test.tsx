import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Navbar from './Navbar';
import { track } from '@/lib/analytics/client';

let mockPathname = '/';
vi.mock('next/navigation', () => ({
    usePathname: () => mockPathname,
}));

vi.mock('@/lib/analytics/client', () => ({ track: vi.fn() }));

const PRIMARY = ['Satellite Engineering', 'Research', 'Internships', 'Ecosystem', 'About'];

describe('Navbar', () => {
    beforeEach(() => {
        mockPathname = '/';
        vi.mocked(track).mockClear();
    });

    it('shows the six destinations, Contact and the Join Satellite Engineering CTA', () => {
        render(<Navbar />);
        const nav = screen.getByRole('navigation', { name: 'Main' });
        for (const name of PRIMARY) {
            expect(within(nav).getAllByRole('link', { name: new RegExp(`^${name}$`) }).length).toBeGreaterThan(0);
        }
        expect(within(nav).getByRole('button', { name: /^Consultancy/ })).toBeInTheDocument();
        expect(within(nav).getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact');
        const cta = within(nav).getByRole('link', { name: 'Join Satellite Engineering' });
        expect(cta).toHaveAttribute('data-track', 'join_rnd_click');
        expect(cta).toHaveAttribute('href', '/contact?enquiry=research');
    });

    it('labels the logo "Satellite Engineering"', () => {
        render(<Navbar />);
        const logo = screen.getByRole('link', { name: 'iTelematics® home' });
        expect(logo).toHaveTextContent('iTelematics®Satellite Engineering');
        expect(logo.textContent).not.toMatch(/R&D/);
    });

    it('offers Login on each host’s sign-in service, tracked, in the desktop bar and the mobile bar', () => {
        render(<Navbar />);
        const logins = screen.getAllByRole('link', { name: 'Login' });
        // iTelematics® and EV.ENGINEER™ variants, desktop and mobile; CSS shows the one for the host
        expect(logins.map((a) => a.getAttribute('href')).sort()).toEqual([
            'https://login.autonomous.ev.engineer',
            'https://login.autonomous.ev.engineer',
            'https://login.itelematics.com',
            'https://login.itelematics.com',
        ]);
        logins.forEach((a) => expect(a).toHaveAttribute('data-track', 'login_click'));
    });

    it('presents the logo as EV.ENGINEER™ on ev.engineer hosts', () => {
        document.documentElement.setAttribute('data-site', 'ev');
        mockPathname = '/ev-engineer';
        try {
            render(<Navbar />);
            const logo = screen.getByRole('link', { name: 'EV.ENGINEER™ home' });
            expect(logo).toHaveTextContent('EV.ENGINEER™Energy & Battery');
            expect(logo).toHaveAttribute('aria-current', 'page');
        } finally {
            document.documentElement.removeAttribute('data-site');
        }
    });

    it('no longer links to Events & Registration or EV Academy', () => {
        const { container } = render(<Navbar />);
        expect(screen.queryByText(/Events & Registration/)).not.toBeInTheDocument();
        expect(container.querySelector('a[href^="/events"], a[href="/academy"]')).toBeNull();
    });

    it('keeps the Consultancy & Services groups behind an accessible disclosure', () => {
        render(<Navbar />);
        const toggle = screen.getByRole('button', { name: /^Consultancy/ });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        for (const group of ['Space & Research', 'Energy & Engineering', 'Tools & Resources']) {
            expect(screen.getByText(group)).toBeInTheDocument();
        }
        expect(screen.getByRole('link', { name: 'View all Consultancy & Services →' })).toHaveAttribute('href', '/consultancy');
        expect(screen.getByRole('link', { name: /CubeTwin Simulator/ })).toHaveAttribute('href', 'https://aerospace.ev.engineer/space/cubesat');
        expect(screen.getByRole('link', { name: /EV Engineering Labs/ })).toHaveAttribute('href', 'https://labs.ev.engineer/');

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('marks the current page', () => {
        mockPathname = '/research-platform';
        render(<Navbar />);
        const current = screen.getAllByRole('link', { name: /^Research$/ }).filter((l) => l.getAttribute('aria-current') === 'page');
        expect(current.length).toBeGreaterThan(0);
    });

    it('opens a full-screen menu with Contact, the Consultancy accordion and the Join CTA', () => {
        render(<Navbar />);
        const toggle = screen.getByRole('button', { name: 'Toggle Menu' });
        fireEvent.click(toggle);
        const menu = document.getElementById('mobile-menu') as HTMLElement;
        expect(menu).not.toHaveAttribute('hidden');
        expect(within(menu).getByRole('link', { name: 'Contact' })).toBeInTheDocument();
        expect(within(menu).getByRole('link', { name: 'Join Satellite Engineering' })).toHaveAttribute('data-track', 'join_rnd_click');

        const accordion = within(menu).getByRole('button', { name: /^Consultancy/ });
        fireEvent.click(accordion);
        expect(accordion).toHaveAttribute('aria-expanded', 'true');
        expect(within(menu).getByText('Space & Research')).toBeInTheDocument();
        expect(within(menu).getByRole('link', { name: 'View all Consultancy & Services →' })).toBeInTheDocument();
    });

    it('reports mobile_navigation_use when the mobile menu opens, not when it closes', () => {
        render(<Navbar />);
        const toggle = screen.getByRole('button', { name: 'Toggle Menu' });
        fireEvent.click(toggle);
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
        fireEvent.click(screen.getByRole('button', { name: /^Consultancy/ }));
        const link = screen.getByRole('link', { name: /^CubeTwin Simulator\s*\(opens in a new tab\)$/ });
        expect(link).toHaveAttribute('data-track-name', 'CubeTwin Simulator');
        expect(link).toHaveAttribute('target', '_blank');
    });
});
