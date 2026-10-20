import styles from './ArchitectureLine.module.css';

type Node = { name: string; role: string; tone: 'solar' | 'power' | 'telemetry' | 'mission' };

const NODES: Node[] = [
    { name: 'Sun', role: 'Energy source', tone: 'solar' },
    { name: 'Solar', role: 'Generation', tone: 'solar' },
    { name: 'EPS', role: 'Regulation', tone: 'power' },
    { name: 'Battery', role: 'Storage', tone: 'power' },
    { name: 'Loads', role: 'Consumption', tone: 'power' },
    { name: 'Sensors', role: 'Measurement', tone: 'telemetry' },
    { name: 'Telemetry', role: 'Communication', tone: 'telemetry' },
    { name: 'Mission', role: 'Decision', tone: 'mission' },
];

/** One continuous system line: energy path into information path. Horizontal on desktop, vertical on phones. */
export default function ArchitectureLine() {
    return (
        <ol className={styles.line} aria-label="Satellite energy and information flow">
            {NODES.map((node, i) => (
                <li key={node.name} className={`${styles.node} ${styles[node.tone]}`} style={{ ['--i' as string]: i }}>
                    <span className={styles.marker} aria-hidden="true" />
                    <span className={styles.name}>{node.name}</span>
                    <span className={styles.role}>{node.role}</span>
                </li>
            ))}
        </ol>
    );
}
