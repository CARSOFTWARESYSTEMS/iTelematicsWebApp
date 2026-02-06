"use client";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const toggleMenu = () => setIsOpen(!isOpen);

    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const navLinks = [
        { name: 'About', href: '/about' },
        { name: 'EV.ENGINEER™', href: '/ev-engineer' },
        { name: 'eVTOL', href: '/evtol' },
        {
            name: 'EV Academy',
            href: '/academy'
        },
        {
            name: 'Consultancy & Services',
            href: '#',
            subLinks: [
                { name: 'EV Workshops', href: 'https://labs.ev.engineer/', external: true },
                { name: 'Battery Pack Aadhaar Services', href: '/public/EV.ENGINEER - Battery Pack Aadhaar - Krutarth S Karkala.pdf', external: true },
                { name: 'Mobile Repair and Services', href: 'https://imacxrepair.com/', external: true },
                { name: 'AI Driven Solutions', href: 'https://krutarth.in', external: true },
                { name: 'FAQ - Frequently Asked Questions', href: '/public/iTelematics-FrequentlyAskedQuestions.pdf', external: true },
                {
                    name: 'EV & AI Toolkits',
                    href: '#', subLinks: [
                        { name: 'Online Certificate generator', href: 'https://mount-shove-70578530.figma.site/', external: true }
                    ]
                }

            ]
        },
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
                        <div key={link.name} className={styles.navItem}>
                            {link.subLinks ? (
                                <div
                                    className={styles.dropdownContainer}
                                    onMouseEnter={() => setOpenDropdown(link.name)}
                                    onMouseLeave={() => setOpenDropdown(null)}
                                >
                                    <span className={`${styles.link} ${openDropdown === link.name ? styles.active : ''}`}>
                                        {link.name} <span className={styles.arrow}>▼</span>
                                    </span>
                                    <div className={`${styles.dropdown} ${openDropdown === link.name ? styles.show : ''}`}>
                                        {link.subLinks.map((sub) => (
                                            <a
                                                key={sub.name}
                                                href={sub.href}
                                                target={sub.external ? "_blank" : "_self"}
                                                rel={sub.external ? "noopener noreferrer" : ""}
                                                className={styles.dropdownItem}
                                            >
                                                {sub.name}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <Link
                                    href={link.href}
                                    className={`${styles.link} ${pathname === link.href ? styles.active : ''}`}
                                >
                                    {link.name}
                                </Link>
                            )}
                        </div>
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
                        <div key={link.name}>
                            {link.subLinks ? (
                                <>
                                    <div
                                        className={`${styles.link} ${styles.mobileSubMenuHeader}`}
                                        onClick={() => setOpenDropdown(openDropdown === link.name ? null : link.name)}
                                    >
                                        {link.name} <span>{openDropdown === link.name ? '▲' : '▼'}</span>
                                    </div>
                                    {openDropdown === link.name && (
                                        <div className={styles.mobileSubLinks}>
                                            {link.subLinks.map((sub) => (
                                                <a
                                                    key={sub.name}
                                                    href={sub.href}
                                                    target={sub.external ? "_blank" : "_self"}
                                                    rel={sub.external ? "noopener noreferrer" : ""}
                                                    className={styles.mobileSubLink}
                                                    onClick={() => setIsOpen(false)}
                                                >
                                                    {sub.name}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <Link
                                    href={link.href}
                                    className={`${styles.link} ${pathname === link.href ? styles.active : ''}`}
                                    onClick={() => setIsOpen(false)}
                                >
                                    {link.name}
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </nav>
    );
}
