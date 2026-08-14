import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Navbar from './Navbar';

vi.mock('next/navigation', () => ({
    usePathname: () => '/events',
}));

describe('Navbar', () => {
    it('renders an Events & Registration link pointing to /events in both desktop and mobile menus', () => {
        render(<Navbar />);
        const links = screen.getAllByRole('link', { name: 'Events & Registration' });
        expect(links.length).toBeGreaterThanOrEqual(2);
        for (const link of links) {
            expect(link).toHaveAttribute('href', '/events');
        }
    });

    it('marks the Events & Registration link active when on /events', () => {
        render(<Navbar />);
        const links = screen.getAllByRole('link', { name: 'Events & Registration' });
        // At least the desktop link should carry the active class from Navbar.module.css
        expect(links.some((l) => l.className.includes('active'))).toBe(true);
    });

    it('still renders the existing EV.ENGINEER™ nav item (regression)', () => {
        render(<Navbar />);
        expect(screen.getAllByRole('link', { name: 'EV.ENGINEER™' }).length).toBeGreaterThan(0);
    });
});
