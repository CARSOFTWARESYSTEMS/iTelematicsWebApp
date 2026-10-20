"use client";
import { useEffect, useRef, useState } from 'react';
import styles from './EnergyFlow.module.css';
import { sampleAtPhase } from '@/lib/energy-model';

const NODES = ['Sun', 'Solar Array', 'EPS', 'Battery', 'Loads'] as const;
const ORBIT_SECONDS = 24;

/** Simplified live power path for the reference case, driven by the energy model. */
export default function EnergyFlow() {
    const [phase, setPhase] = useState(0.1);
    const root = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let visible = true;
        const observer = typeof IntersectionObserver !== 'undefined' && root.current
            ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; })
            : null;
        if (observer && root.current) observer.observe(root.current);
        const timer = setInterval(() => {
            if (visible) setPhase((p) => (p + 0.25 / ORBIT_SECONDS) % 1);
        }, 250);
        return () => {
            clearInterval(timer);
            observer?.disconnect();
        };
    }, []);

    const s = sampleAtPhase(phase);
    // In eclipse the energy path starts at the battery.
    const firstActive = s.eclipse ? 3 : 0;
    const signed = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;

    return (
        <div ref={root} className={`${styles.flow} ${s.eclipse ? styles.eclipse : ''}`}>
            <div className={styles.head}>
                <span className={`badge ${s.eclipse ? 'state-orbit' : 'state-solar'}`}>{s.eclipse ? 'Eclipse' : 'Sunlight'}</span>
                <span className={styles.simulated}>Simulated</span>
            </div>

            <ol className={styles.chain} aria-label="Power path">
                {NODES.map((node, i) => (
                    <li key={node} className={`${styles.node} ${i >= firstActive ? styles.active : ''}`}>
                        <span className={styles.marker} aria-hidden="true" />
                        <span className={styles.name}>{node}</span>
                        {i < NODES.length - 1 && (
                            <span className={`${styles.segment} ${i >= firstActive ? styles.live : ''}`} aria-hidden="true">
                                <i />
                            </span>
                        )}
                    </li>
                ))}
            </ol>

            <dl className={styles.values} aria-live="off">
                <div><dt className="label">Solar</dt><dd className="tabular">{s.arrayW.toFixed(1)} W</dd></div>
                <div><dt className="label">Battery</dt><dd className="tabular">{(s.soc * 100).toFixed(1)} %</dd></div>
                <div><dt className="label">Load</dt><dd className="tabular">{s.loadW.toFixed(1)} W</dd></div>
                <div><dt className="label">Margin</dt><dd className="tabular">{signed(s.marginW)} W</dd></div>
            </dl>
        </div>
    );
}
