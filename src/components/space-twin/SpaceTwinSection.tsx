import SpaceTwinViewer from './SpaceTwinViewer';
import styles from './SpaceTwinSection.module.css';
import { SITE } from '@/lib/site';
import { TWIN_BASIS } from '@/lib/space-twin/experiences';

/**
 * Space Digital Twin: the four interactive 3D experiences with their heading.
 * One section, shown on the homepage and on /research-lab.
 */
export default function SpaceTwinSection() {
    return (
        <section id="space-digital-twin" className={styles.twin} data-analytics-section="space-digital-twin">
            <div className="container">
                <div className={styles.twinHead} data-reveal>
                    <div>
                        <p className="eyebrow">
                            <span className={styles.brandCase}>{SITE.name}</span> · Space Research
                        </p>
                        <h2>Space Digital Twin</h2>
                        <p className={styles.twinTitle}>Learn to Protect Missions.</p>
                        <p className={styles.twinSupport}>Build Systems That Protect Spacecraft.</p>
                    </div>
                    <div className={styles.twinIntro}>
                        <ul className={styles.basis} aria-label="What the experiences are built on">
                            {TWIN_BASIS.map(({ label, planned }) => (
                                <li key={label} className={planned ? `badge ${styles.planned}` : 'badge state-telemetry'}>
                                    {label}
                                    {planned && <>{' '}<span className={styles.plannedTag}>Planned</span></>}
                                </li>
                            ))}
                        </ul>
                        <p className="label">Explore. Experiment. Understand.</p>
                    </div>
                </div>
                <SpaceTwinViewer />
                <p className={`lead ${styles.twinAfter}`} data-reveal>
                    Explore satellites, spacecraft, orbital constellations and space stations through realistic 3D engineering
                    experiences. Discover how electrical power, energy storage, telemetry, physics, cybersecurity and intelligent
                    health monitoring support space missions.
                </p>
            </div>
        </section>
    );
}
