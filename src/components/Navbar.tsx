"use client";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

// Type definitions for navigation links
type NavLink = {
    name: string;
    href: string;
    external?: boolean;
    subLinks?: NavLink[];
};

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const toggleMenu = () => setIsOpen(!isOpen);

    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [openNestedDropdown, setOpenNestedDropdown] = useState<string | null>(null);

    const navLinks: NavLink[] = [
        { name: 'About', href: '/about' },
        { name: 'EV.ENGINEER™', href: '/ev-engineer' },
        {
            name: 'EV Academy',
            href: '/academy'
        },
        {
            name: 'Consultancy & Services',
            href: '#',
            subLinks: [
                { name: 'EV Workshops', href: 'https://labs.ev.engineer/', external: true },
                { name: 'Mobile Repair and Services', href: 'https://imacxrepair.com/', external: true },
                {
                    name: 'Papers & Presentations',
                    href: '#',
                    subLinks: [
                        { name: 'Battery Pack Aadhaar Services', href: '/public/EV.ENGINEER - Battery Pack Aadhaar - Krutarth S Karkala.pdf', external: true }
                    ]
                },
                {
                    name: 'Battery Pack Aadhaar Systems',
                    href: '#',
                    subLinks: [
                        { name: 'Battery Pack Aadhaar (Draft)', href: '/public/EV.ENGINEER - Battery Pack Aadhaar - Krutarth S Karkala.pdf', external: true },
                        { name: 'Battery Pack Aadhaar (POC/UX) - 1', href: 'https://tweak-stand-28567793.figma.site/', external: true },
                        { name: 'Battery Pack Aadhaar (POC/UX) - 2', href: 'https://stack-beta-65283525.figma.site/', external: true }
                    ]
                },
                {
                    name: 'EV & AI Toolkits',
                    href: '#',
                    subLinks: [
                        { name: 'Online Webinar Poster Generator', href: 'https://stove-trial-23088417.figma.site/', external: true },
                        { name: 'Online Certificate Generator', href: 'https://mount-shove-70578530.figma.site/', external: true },
                        { name: 'Chess Puzzle Generator', href: 'https://krutarth.in', external: true },
                    ]
                },
                { name: 'FAQ - Frequently Asked Questions', href: '/public/iTelematics-FrequentlyAskedQuestions.pdf', external: true }
            ]
        },
        { name: 'Contact', href: '/contact' },
    ];

    // Desktop nested submenu renderer
    const renderDesktopSubmenu = (subLinks: NavLink[]) => {
        return subLinks.map((sub) => {
            if (sub.subLinks) {
                // Nested submenu item
                return (
                    <div
                        key={sub.name}
                        className={styles.nestedDropdownContainer}
                        onMouseEnter={() => setOpenNestedDropdown(sub.name)}
                        onMouseLeave={() => setOpenNestedDropdown(null)}
                    >
                        <div className={styles.dropdownItemWithArrow}>
                            {sub.name} <span className={styles.arrowRight}>▶</span>
                        </div>
                        <div className={`${styles.nestedDropdown} ${openNestedDropdown === sub.name ? styles.show : ''}`}>
                            {renderDesktopSubmenu(sub.subLinks)}
                        </div>
                    </div>
                );
            } else {
                // Regular submenu item
                return (
                    <a
                        key={sub.name}
                        href={sub.href}
                        target={sub.external ? "_blank" : "_self"}
                        rel={sub.external ? "noopener noreferrer" : ""}
                        className={styles.dropdownItem}
                    >
                        {sub.name}
                    </a>
                );
            }
        });
    };

    // Mobile nested submenu renderer
    const renderMobileSubmenu = (subLinks: NavLink[], level: number = 0) => {
        return subLinks.map((sub) => {
            if (sub.subLinks) {
                // Nested submenu item
                return (
                    <div key={sub.name}>
                        <div
                            className={`${styles.mobileSubLink} ${styles.mobileNestedHeader}`}
                            style={{ paddingLeft: `${1.5 + level * 1}rem` }}
                            onClick={() => setOpenNestedDropdown(openNestedDropdown === sub.name ? null : sub.name)}
                        >
                            {sub.name} <span>{openNestedDropdown === sub.name ? '▲' : '▼'}</span>
                        </div>
                        {openNestedDropdown === sub.name && (
                            <div className={styles.mobileNestedSubLinks}>
                                {renderMobileSubmenu(sub.subLinks, level + 1)}
                            </div>
                        )}
                    </div>
                );
            } else {
                // Regular submenu item
                return (
                    <a
                        key={sub.name}
                        href={sub.href}
                        target={sub.external ? "_blank" : "_self"}
                        rel={sub.external ? "noopener noreferrer" : ""}
                        className={styles.mobileSubLink}
                        style={{ paddingLeft: `${1.5 + level * 1}rem` }}
                        onClick={() => setIsOpen(false)}
                    >
                        {sub.name}
                    </a>
                );
            }
        });
    };

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
                                    onMouseLeave={() => {
                                        setOpenDropdown(null);
                                        setOpenNestedDropdown(null);
                                    }}
                                >
                                    <span className={`${styles.link} ${openDropdown === link.name ? styles.active : ''}`}>
                                        {link.name} <span className={styles.arrow}>▼</span>
                                    </span>
                                    <div className={`${styles.dropdown} ${openDropdown === link.name ? styles.show : ''}`}>
                                        {renderDesktopSubmenu(link.subLinks)}
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
                                        onClick={() => {
                                            setOpenDropdown(openDropdown === link.name ? null : link.name);
                                            setOpenNestedDropdown(null);
                                        }}
                                    >
                                        {link.name} <span>{openDropdown === link.name ? '▲' : '▼'}</span>
                                    </div>
                                    {openDropdown === link.name && (
                                        <div className={styles.mobileSubLinks}>
                                            {renderMobileSubmenu(link.subLinks)}
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
