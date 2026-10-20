"use client";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';
import ExternalLink from './site/ExternalLink';
import { track } from '@/lib/analytics/client';
import { CONTACT_NAV, JOIN_HREF, PRIMARY_NAV, type NavGroup, type NavItem, type PrimaryNavItem } from '@/lib/site';

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function MenuLink({ link, className, onNavigate }: { link: NavItem; className?: string; onNavigate?: () => void }) {
    if (link.external) {
        return (
            <ExternalLink href={link.href} className={className} onClick={onNavigate}>
                {link.name}
            </ExternalLink>
        );
    }
    return (
        <Link href={link.href} className={className} onClick={onNavigate}>
            {link.name}
        </Link>
    );
}

function Groups({ item, onNavigate }: { item: PrimaryNavItem; onNavigate: () => void }) {
    return (
        <>
            {(item.groups ?? []).map((group: NavGroup) => (
                <div key={group.name} className={styles.group} data-analytics-section={group.name}>
                    <p className={styles.groupTitle}>{group.name}</p>
                    <ul>
                        {group.links.map((link) => (
                            <li key={link.name}>
                                <MenuLink link={link} className={styles.groupLink} onNavigate={onNavigate} />
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
            {item.extraLinks && (
                <div className={styles.group}>
                    <p className={styles.groupTitle}>Reference</p>
                    <ul>
                        {item.extraLinks.map((link) => (
                            <li key={link.name}>
                                <MenuLink link={link} className={styles.groupLink} onNavigate={onNavigate} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    );
}

export default function Navbar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
    const desktopRef = useRef<HTMLDivElement>(null);

    const closeAll = () => {
        setIsOpen(false);
        setOpenSubmenu(null);
    };

    const toggleMenu = () => {
        if (!isOpen) track('mobile_navigation_use', { cta_name: 'Open menu', cta_location: 'header-mobile' });
        setIsOpen(!isOpen);
        setOpenSubmenu(null);
    };

    // Close on navigation.
    useEffect(() => {
        setIsOpen(false);
        setOpenSubmenu(null);
    }, [pathname]);

    // Escape closes any open menu; clicks outside close the desktop submenu.
    useEffect(() => {
        if (!isOpen && !openSubmenu) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                setOpenSubmenu(null);
            }
        };
        const onPointer = (e: PointerEvent) => {
            if (!isOpen && desktopRef.current && !desktopRef.current.contains(e.target as Node)) setOpenSubmenu(null);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onPointer);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onPointer);
        };
    }, [isOpen, openSubmenu]);

    // Lock page scroll behind the open mobile menu.
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <header className={styles.header}>
            <nav className={styles.bar} aria-label="Main">
                <Link href="/" className={styles.logo} aria-label="iTelematics® home" aria-current={pathname === '/' ? 'page' : undefined}>
                    <span className={styles.logoMark} aria-hidden="true" />
                    <span className={styles.logoText}>
                        <span className={styles.logoName}>iTelematics<sup className={styles.reg}>®</sup></span>
                        <span className={styles.logoTag}>Satellite Engineering</span>
                    </span>
                </Link>

                {/* Desktop */}
                <div ref={desktopRef} className={styles.desktop} data-analytics-location="header-desktop">
                    <ul className={styles.links}>
                        {PRIMARY_NAV.map((item) => (
                            <li
                                key={item.name}
                                data-analytics-section={item.groups ? item.name : undefined}
                                data-track-fallback={item.track}
                            >
                                {item.groups ? (
                                    <>
                                        <button
                                            type="button"
                                            className={`${styles.link} ${isActive(pathname, item.href) ? styles.active : ''}`}
                                            aria-expanded={openSubmenu === item.name}
                                            aria-controls="desktop-consultancy"
                                            onClick={() => setOpenSubmenu(openSubmenu === item.name ? null : item.name)}
                                        >
                                            {item.name}
                                            <span className={styles.chevron} aria-hidden="true" />
                                        </button>
                                        {!isOpen && openSubmenu === item.name && (
                                            <div id="desktop-consultancy" className={styles.panel}>
                                                <div className={styles.panelGroups}>
                                                    <Groups item={item} onNavigate={closeAll} />
                                                </div>
                                                <Link href={item.href} className={`text-link ${styles.viewAll}`} onClick={closeAll}>
                                                    View all Consultancy &amp; Services →
                                                </Link>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <Link
                                        href={item.href}
                                        className={`${styles.link} ${isActive(pathname, item.href) ? styles.active : ''}`}
                                        aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                                    >
                                        {item.name}
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                    <div className={styles.right}>
                        <Link
                            href={CONTACT_NAV.href}
                            className={`${styles.link} ${isActive(pathname, CONTACT_NAV.href) ? styles.active : ''}`}
                            aria-current={isActive(pathname, CONTACT_NAV.href) ? 'page' : undefined}
                        >
                            {CONTACT_NAV.name}
                        </Link>
                        <Link href={JOIN_HREF} className={`btn ${styles.cta}`} data-track="join_rnd_click">
                            Join R&amp;D
                        </Link>
                    </div>
                </div>

                {/* Mobile and tablet */}
                <button
                    type="button"
                    className={styles.menuButton}
                    onClick={toggleMenu}
                    aria-label="Toggle Menu"
                    aria-expanded={isOpen}
                    aria-controls="mobile-menu"
                >
                    <span className={`${styles.burger} ${isOpen ? styles.burgerOpen : ''}`} aria-hidden="true" />
                </button>

                <div
                    id="mobile-menu"
                    className={styles.mobile}
                    data-analytics-location="header-mobile"
                    data-track-fallback="mobile_navigation_use"
                    hidden={!isOpen}
                >
                    <ul className={styles.mobileList}>
                        {[...PRIMARY_NAV, CONTACT_NAV].map((item: PrimaryNavItem) => (
                            <li
                                key={item.name}
                                data-analytics-section={item.groups ? item.name : undefined}
                                data-track-fallback={item.track}
                            >
                                {item.groups ? (
                                    <>
                                        <button
                                            type="button"
                                            className={styles.mobileLink}
                                            aria-expanded={openSubmenu === item.name}
                                            aria-controls="mobile-consultancy"
                                            onClick={() => setOpenSubmenu(openSubmenu === item.name ? null : item.name)}
                                        >
                                            {item.name}
                                            <span className={styles.plus} aria-hidden="true">{openSubmenu === item.name ? '−' : '+'}</span>
                                        </button>
                                        {isOpen && openSubmenu === item.name && (
                                            <div id="mobile-consultancy" className={styles.accordion}>
                                                <Groups item={item} onNavigate={closeAll} />
                                                <Link href={item.href} className={`text-link ${styles.viewAll}`} onClick={closeAll}>
                                                    View all Consultancy &amp; Services →
                                                </Link>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <Link
                                        href={item.href}
                                        className={styles.mobileLink}
                                        onClick={closeAll}
                                        aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                                    >
                                        {item.name}
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                    <div className={styles.mobileFoot}>
                        <Link href={JOIN_HREF} className={`btn btn-primary ${styles.mobileCta}`} data-track="join_rnd_click" onClick={closeAll}>
                            Join Satellite R&amp;D
                        </Link>
                    </div>
                </div>
            </nav>
        </header>
    );
}
