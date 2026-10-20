"use client";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';
import ExternalLink from './site/ExternalLink';
import { track } from '@/lib/analytics/client';
import { PRIMARY_NAV, type NavGroup, type NavItem, type PrimaryNavItem } from '@/lib/site';

// Join R&D opens the enquiry form with Research Collaboration preselected; visitors can change it.
const JOIN_HREF = '/contact?enquiry=research';

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

function SubmenuGroups({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
    return (
        <>
            {groups.map((group) => (
                <div key={group.name} className={styles.group} data-analytics-section={group.name}>
                    <p className={styles.groupTitle}>{group.name}</p>
                    <ul>
                        {group.links.map((link) => (
                            <li key={link.name}>
                                <MenuLink link={link} className={styles.submenuLink} onNavigate={onNavigate} />
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </>
    );
}

function Submenu({ item, id, onNavigate }: { item: PrimaryNavItem; id: string; onNavigate: () => void }) {
    return (
        <div id={id} className={styles.submenu}>
            <div className={styles.submenuHead}>
                <p className={styles.submenuNote}>
                    Engineering consultancy, workshops and resources, offered alongside our Satellite Engineering R&D.
                </p>
                <Link href={item.href} className="text-link" onClick={onNavigate}>
                    Overview →
                </Link>
            </div>
            <div className={styles.groups}>
                <SubmenuGroups groups={item.groups ?? []} onNavigate={onNavigate} />
            </div>
            {item.extraLinks && (
                <ul className={styles.extraLinks}>
                    {item.extraLinks.map((link) => (
                        <li key={link.name}>
                            <MenuLink link={link} className={styles.submenuLink} onNavigate={onNavigate} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
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
            <nav className={`container ${styles.bar}`} aria-label="Main">
                <Link href="/" className={styles.logo} aria-label="iTelematics home" aria-current={pathname === '/' ? 'page' : undefined}>
                    <span className={styles.logoMark} aria-hidden="true" />
                    <span className={styles.logoText}>
                        <span className={styles.logoName}>iTelematics</span>
                        <span className={styles.logoTag}>Satellite Engineering R&amp;D</span>
                    </span>
                </Link>

                {/* Desktop */}
                <div ref={desktopRef} className={styles.desktop} data-analytics-location="header-desktop">
                    <ul className={styles.links}>
                        {PRIMARY_NAV.map((item) => (
                            <li
                                key={item.name}
                                className={styles.item}
                                data-analytics-section={item.groups ? item.name : undefined}
                                data-track-fallback={item.track}
                            >
                                {item.groups ? (
                                    <>
                                        <button
                                            type="button"
                                            className={`${styles.link} ${styles.secondaryLink} ${isActive(pathname, item.href) ? styles.active : ''}`}
                                            aria-expanded={openSubmenu === item.name}
                                            aria-controls="desktop-consultancy"
                                            onClick={() => setOpenSubmenu(openSubmenu === item.name ? null : item.name)}
                                        >
                                            {item.name}
                                            <span className={styles.chevron} aria-hidden="true" />
                                        </button>
                                        {!isOpen && openSubmenu === item.name && (
                                            <Submenu item={item} id="desktop-consultancy" onNavigate={closeAll} />
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
                    <Link href={JOIN_HREF} className={`btn btn-primary ${styles.cta}`} data-track="join_rnd_click">
                        Join Satellite R&amp;D
                    </Link>
                </div>

                {/* Mobile */}
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
                    className={`${styles.mobile} ${isOpen ? styles.mobileOpen : ''}`}
                    data-analytics-location="header-mobile"
                    data-track-fallback="mobile_navigation_use"
                    hidden={!isOpen}
                >
                    <ul className={styles.mobileList}>
                        <li>
                            <Link href="/" className={styles.mobileLink} onClick={closeAll} aria-current={pathname === '/' ? 'page' : undefined}>
                                Home
                            </Link>
                        </li>
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
                                            className={`${styles.mobileLink} ${styles.mobileToggle}`}
                                            aria-expanded={openSubmenu === item.name}
                                            aria-controls="mobile-consultancy"
                                            onClick={() => setOpenSubmenu(openSubmenu === item.name ? null : item.name)}
                                        >
                                            {item.name}
                                            <span className={styles.chevron} aria-hidden="true" />
                                        </button>
                                        {isOpen && openSubmenu === item.name && (
                                            <div id="mobile-consultancy" className={styles.mobileSubmenu}>
                                                <Link href={item.href} className={styles.submenuLink} onClick={closeAll}>
                                                    Consultancy &amp; Services overview
                                                </Link>
                                                <SubmenuGroups groups={item.groups} onNavigate={closeAll} />
                                                {item.extraLinks?.map((link) => (
                                                    <MenuLink key={link.name} link={link} className={styles.submenuLink} onNavigate={closeAll} />
                                                ))}
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
                    <Link href={JOIN_HREF} className={`btn btn-primary ${styles.mobileCta}`} data-track="join_rnd_click" onClick={closeAll}>
                        Join Satellite R&amp;D
                    </Link>
                </div>
            </nav>
        </header>
    );
}
