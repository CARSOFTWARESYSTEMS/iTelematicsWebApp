import Link from 'next/link';
import styles from './EcosystemNetwork.module.css';
import ExternalLink from './ExternalLink';
import { ExternalOrgIcon } from './ExternalOrgMark';
import { ECOSYSTEM } from '@/lib/site';

// Node positions (% of the drawing) on a ring around the central iTelematics® node, in ECOSYSTEM order.
// The two longest names sit along the top; shorter ones down the sides and three along the bottom.
const POSITIONS = [
    { x: 25, y: 11 },
    { x: 75, y: 11 },
    { x: 87, y: 37 },
    { x: 87, y: 64 },
    { x: 79, y: 90 },
    { x: 21, y: 90 },
    { x: 13, y: 64 },
    { x: 13, y: 37 },
    { x: 50, y: 90 },
];

/** Relationship map: iTelematics® at the centre; each organisation around it links to its own site. */
export default function EcosystemNetwork() {
    const anyExternal = ECOSYSTEM.some((org) => org.external);
    return (
        <div className={styles.wrap}>
            <div className={styles.network} role="group" aria-label="iTelematics® engineering ecosystem" data-analytics-location="ecosystem-map">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.lines} aria-hidden="true">
                    {ECOSYSTEM.map((org, i) => (
                        <line
                            key={org.name}
                            x1="50"
                            y1="50"
                            x2={POSITIONS[i].x}
                            y2={POSITIONS[i].y}
                            className={`${styles.line} ${org.external ? styles.lineExternal : ''}`}
                            style={{ animationDelay: `${i * 0.7}s` }}
                        />
                    ))}
                </svg>
                <span className={`${styles.node} ${styles.center}`} style={{ left: '50%', top: '50%' }} aria-hidden="true">
                    iTelematics®
                </span>
                {ECOSYSTEM.map((org, i) => {
                    // The organisation's own site; the first listed link is the official one.
                    const link = org.links[0];
                    const style = { left: `${POSITIONS[i].x}%`, top: `${POSITIONS[i].y}%` };
                    const className = `${styles.node} ${styles.link} ${org.external ? styles.external : ''}`;
                    const label = (
                        <>
                            {org.short ?? org.name}
                            {org.external && (
                                <>
                                    <ExternalOrgIcon />
                                    <span className="visually-hidden"> (external organisation)</span>
                                </>
                            )}
                        </>
                    );
                    return link.kind === 'internal' ? (
                        <Link key={org.name} href={link.href} className={className} style={style}>
                            {label}
                        </Link>
                    ) : (
                        <ExternalLink key={org.name} href={link.href} className={className} style={style} trackName={`${org.name} · ecosystem map`}>
                            {label}
                        </ExternalLink>
                    );
                })}
            </div>
            {anyExternal && (
                <p className={styles.legend}>
                    <span className={styles.legendKey} aria-hidden="true">
                        <ExternalOrgIcon />
                    </span>
                    External organisation, independent of iTelematics®
                </p>
            )}
        </div>
    );
}
