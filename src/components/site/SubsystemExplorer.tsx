"use client";
import { useRef, useState, type KeyboardEvent } from 'react';
import styles from './SubsystemExplorer.module.css';
import SubsystemSatellite from './SubsystemSatellite';
import { SUBSYSTEMS } from '@/lib/subsystems';

// Each label sits next to its part of the spacecraft (% of the diagram); the connector runs from the
// label (x, y) to that part (tx, ty) of the schematic at the centre.
const ANCHORS: Record<string, { x: number; y: number; tx: number; ty: number }> = {
    comms: { x: 50, y: 6, tx: 52.3, ty: 28 },
    power: { x: 88, y: 20, tx: 68.4, ty: 46.7 },
    thermal: { x: 91, y: 52, tx: 57.6, ty: 48.6 },
    adcs: { x: 86, y: 82, tx: 49.9, ty: 48 },
    payload: { x: 50, y: 95, tx: 49.9, ty: 59.7 },
    ground: { x: 12, y: 84, tx: 27.3, ty: 72.9 },
    mission: { x: 12, y: 50, tx: 21.6, ty: 50.7 },
    avionics: { x: 12, y: 18, tx: 49.9, ty: 41.4 },
};

/**
 * The spacecraft as one integrated system: the schematic sits at the centre, the eight subsystems
 * around it. Selecting one lights its part of the spacecraft and its connection, and updates the
 * panel. Every panel is in the HTML (inactive ones hidden) for readers without JavaScript.
 */
export default function SubsystemExplorer() {
    const [active, setActive] = useState('power');
    const tabs = useRef<(HTMLButtonElement | null)[]>([]);

    const onKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
        const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!delta) return;
        e.preventDefault();
        const next = (index + delta + SUBSYSTEMS.length) % SUBSYSTEMS.length;
        setActive(SUBSYSTEMS[next].id);
        tabs.current[next]?.focus();
    };

    return (
        <div className={styles.explorer}>
            <div className={styles.diagram}>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.connectors} aria-hidden="true">
                    {SUBSYSTEMS.map((s) => (
                        <line
                            key={s.id}
                            x1={ANCHORS[s.id].x}
                            y1={ANCHORS[s.id].y}
                            x2={ANCHORS[s.id].tx}
                            y2={ANCHORS[s.id].ty}
                            className={`${styles.connector} ${active === s.id ? styles.connectorOn : ''}`}
                        />
                    ))}
                </svg>
                <div className={styles.craft}>
                    <SubsystemSatellite active={active} caption={false} />
                </div>
                <div role="tablist" aria-label="Spacecraft subsystems" className={styles.nodes}>
                    {SUBSYSTEMS.map((s, i) => (
                        <button
                            key={s.id}
                            ref={(el) => {
                                tabs.current[i] = el;
                            }}
                            type="button"
                            role="tab"
                            id={`tab-${s.id}`}
                            aria-selected={active === s.id}
                            aria-controls={`panel-${s.id}`}
                            tabIndex={active === s.id ? 0 : -1}
                            className={styles.node}
                            style={{ ['--x' as string]: `${ANCHORS[s.id].x}%`, ['--y' as string]: `${ANCHORS[s.id].y}%` }}
                            onClick={() => setActive(s.id)}
                            onKeyDown={(e) => onKey(e, i)}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.panels}>
                {SUBSYSTEMS.map((s) => (
                    <section
                        key={s.id}
                        id={`panel-${s.id}`}
                        role="tabpanel"
                        aria-labelledby={`tab-${s.id}`}
                        hidden={active !== s.id}
                        className={styles.panel}
                    >
                        <h3>{s.name}</h3>
                        <dl>
                            <div>
                                <dt className="label">Purpose</dt>
                                <dd>{s.purpose}</dd>
                            </div>
                            <div>
                                <dt className="label">Depends on</dt>
                                <dd>{s.dependsOn}</dd>
                            </div>
                            <div>
                                <dt className="label">Telemetry</dt>
                                <dd className={styles.telemetry}>{s.telemetry}</dd>
                            </div>
                            <div>
                                <dt className="label">Research question</dt>
                                <dd className={styles.question}>{s.question}</dd>
                            </div>
                        </dl>
                    </section>
                ))}
            </div>
        </div>
    );
}
