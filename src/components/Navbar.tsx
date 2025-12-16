"use client";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const toggleMenu = () => setIsOpen(!isOpen);

    const navLinks = [
        { name: 'About', href: '/about' },
        { name: 'EV.ENGINEER™', href: '/ev-engineer' },
        { name: 'EV Academy', href: '/academy' },
        { name: 'Contact', href: '/contact' },
    ];

    return (
        <nav className={styles.nav}>
            <div className={`container ${styles.container}`}>
                <Link href="/" className={styles.logo}>
                    iTelematics®
                </Link>

                {/* Desktop Links */}
                <div className={styles.links}>
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`${styles.link} ${pathname === link.href ? styles.active : ''}`}
                        >
                            {link.name}
                        </Link>
                    ))}
                    <Link href="/contact" className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>
                        Let's Talk
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button className={styles.mobileMenuBtn} onClick={toggleMenu} aria-label="Toggle Menu">
                    {isOpen ? '✕' : '☰'}
                </button>

                {/* Mobile Menu */}
                <div className={`${styles.mobileMenu} ${isOpen ? styles.open : ''}`}>
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={styles.link}
                            onClick={() => setIsOpen(false)}
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
}
