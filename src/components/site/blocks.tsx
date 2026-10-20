import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './blocks.module.css';
import ExternalLink from './ExternalLink';
import { ECOSYSTEM } from '@/lib/site';

/* ---------- Shared inner-page hero: text 45 % / contextual visual 55 % ---------- */

type Crumb = { name: string; path: string };

export function PageHero({
    eyebrow,
    title,
    lead,
    breadcrumbs,
    visual,
    children,
}: {
    eyebrow?: string;
    title: ReactNode;
    lead?: ReactNode;
    breadcrumbs?: Crumb[];
    visual?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <section className={styles.pageHero}>
            <div className={`container ${styles.heroGrid} ${visual ? styles.withVisual : ''}`}>
                <div className={styles.heroText}>
                    {breadcrumbs && (
                        <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
                            <ol>
                                <li><Link href="/">Home</Link></li>
                                {breadcrumbs.map((crumb, i) => (
                                    <li key={crumb.path}>
                                        {i === breadcrumbs.length - 1 ? (
                                            <span aria-current="page">{crumb.name}</span>
                                        ) : (
                                            <Link href={crumb.path}>{crumb.name}</Link>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    )}
                    {eyebrow && <p className="eyebrow">{eyebrow}</p>}
                    <h1 className={styles.title}>{title}</h1>
                    {lead && <p className={`lead ${styles.lead}`}>{lead}</p>}
                    {children}
                </div>
                {visual && <div className={styles.heroVisual}>{visual}</div>}
            </div>
        </section>
    );
}

/* ---------- Maturity labels ---------- */

export type Maturity = 'Concept' | 'Research' | 'Simulation' | 'Prototype' | 'Experimental' | 'Validated' | 'Planned';

const MATURITY_TONE: Record<Maturity, string> = {
    Concept: 'state-orbit',
    Research: 'state-telemetry',
    Simulation: 'state-telemetry',
    Prototype: 'state-nominal',
    Experimental: 'state-solar',
    Validated: 'state-nominal',
    Planned: '',
};

export function MaturityBadge({ level }: { level: Maturity }) {
    return <span className={`badge ${MATURITY_TONE[level]}`}>{level}</span>;
}

/* ---------- Ecosystem rows: name + line / relationship / actions on one fixed grid ---------- */

export function EcosystemList({ compact = false }: { compact?: boolean }) {
    return (
        <ul className={styles.ecosystem}>
            {ECOSYSTEM.map((org) => (
                <li key={org.name} className={styles.org}>
                    <div>
                        <h3 className={styles.orgName}>{org.name}</h3>
                        {!compact && <p className={styles.orgLine}>{org.line}</p>}
                    </div>
                    <p className={styles.orgStatus}>{org.status}</p>
                    <div className={styles.orgLinks}>
                        {org.links.map((link) =>
                            link.kind === 'internal' ? (
                                <Link key={link.href} href={link.href} className="text-link">
                                    {link.label} →
                                </Link>
                            ) : (
                                <ExternalLink key={link.href} href={link.href} className="text-link" trackName={`${org.name} · ${link.label}`}>
                                    {link.label} {link.kind === 'context' ? '→' : '↗'}
                                </ExternalLink>
                            ),
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}

/* ---------- Closing call to action ---------- */

export function CtaBand({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
    return (
        <section className={`section ${styles.ctaBand}`}>
            <div className="container">
                <div className={styles.ctaInner} data-reveal>
                    <h2>{title}</h2>
                    {text && <p className="lead">{text}</p>}
                    <div className="actions hero-actions">{children}</div>
                </div>
            </div>
        </section>
    );
}
