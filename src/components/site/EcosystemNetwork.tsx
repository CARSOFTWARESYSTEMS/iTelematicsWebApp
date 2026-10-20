import styles from './EcosystemNetwork.module.css';
import { ECOSYSTEM } from '@/lib/site';

// Node positions (% of the drawing) around the central iTelematics® node.
const POSITIONS = [
    { x: 20, y: 18 },
    { x: 80, y: 18 },
    { x: 90, y: 62 },
    { x: 10, y: 62 },
    { x: 50, y: 90 },
];

/** Quiet relationship map: iTelematics® at the centre, ecosystem organisations around it. */
export default function EcosystemNetwork() {
    return (
        <div className={styles.network} role="img" aria-label={`iTelematics® connected to ${ECOSYSTEM.map((o) => o.name).join(', ')}`}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.lines} aria-hidden="true">
                {POSITIONS.map((p, i) => (
                    <line key={i} x1="50" y1="48" x2={p.x} y2={p.y} className={styles.line} style={{ animationDelay: `${i * 0.7}s` }} />
                ))}
            </svg>
            <span className={`${styles.node} ${styles.center}`} style={{ left: '50%', top: '48%' }} aria-hidden="true">
                iTelematics®
            </span>
            {ECOSYSTEM.map((org, i) => (
                <span key={org.name} className={styles.node} style={{ left: `${POSITIONS[i].x}%`, top: `${POSITIONS[i].y}%` }} aria-hidden="true">
                    {org.name}
                </span>
            ))}
        </div>
    );
}
