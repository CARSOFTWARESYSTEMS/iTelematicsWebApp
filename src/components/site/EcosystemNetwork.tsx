import Link from 'next/link';
import styles from './EcosystemNetwork.module.css';
import ExternalLink from './ExternalLink';
import { ECOSYSTEM } from '@/lib/site';

// Node positions (% of the drawing) around the central iTelematics® node, in ECOSYSTEM order.
const POSITIONS = [
    { x: 20, y: 16 },
    { x: 80, y: 16 },
    { x: 89, y: 56 },
    { x: 72, y: 90 },
    { x: 11, y: 56 },
    { x: 28, y: 90 },
];

/** Relationship map: iTelematics® at the centre; each organisation around it links to its own site. */
export default function EcosystemNetwork() {
    return (
        <div className={styles.network} role="group" aria-label="iTelematics® engineering ecosystem" data-analytics-location="ecosystem-map">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.lines} aria-hidden="true">
                {POSITIONS.map((p, i) => (
                    <line key={i} x1="50" y1="48" x2={p.x} y2={p.y} className={styles.line} style={{ animationDelay: `${i * 0.7}s` }} />
                ))}
            </svg>
            <span className={`${styles.node} ${styles.center}`} style={{ left: '50%', top: '48%' }} aria-hidden="true">
                iTelematics®
            </span>
            {ECOSYSTEM.map((org, i) => {
                // The organisation's own site; the first listed link is the official one.
                const link = org.links[0];
                const style = { left: `${POSITIONS[i].x}%`, top: `${POSITIONS[i].y}%` };
                return link.kind === 'internal' ? (
                    <Link key={org.name} href={link.href} className={`${styles.node} ${styles.link}`} style={style}>
                        {org.name}
                    </Link>
                ) : (
                    <ExternalLink key={org.name} href={link.href} className={`${styles.node} ${styles.link}`} style={style} trackName={`${org.name} · ecosystem map`}>
                        {org.name}
                    </ExternalLink>
                );
            })}
        </div>
    );
}
