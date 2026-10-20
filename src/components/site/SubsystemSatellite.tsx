"use client";
import { useEffect, useRef, useState } from 'react';
import styles from './SubsystemSatellite.module.css';

const CYCLE = ['power', 'avionics', 'adcs', 'comms', 'payload', 'thermal'] as const;

const CAPTIONS: Record<string, string> = {
    mission: 'Mission & orbit · environment and access',
    power: 'Power · arrays, EPS, battery',
    avionics: 'Avionics · onboard computer',
    adcs: 'ADCS · attitude sensing and control',
    comms: 'Communications · telemetry and commands',
    payload: 'Payload · Earth-observation imager',
    thermal: 'Thermal · radiator and heaters',
    ground: 'Ground · operations and analysis',
};

/**
 * Line drawing of a 6U spacecraft whose subsystems light up one at a time.
 * Uncontrolled it cycles through the onboard subsystems; with `active` it follows the selection.
 */
export default function SubsystemSatellite({ active, caption = true }: { active?: string; caption?: boolean }) {
    const [auto, setAuto] = useState<string>(CYCLE[0]);
    const root = useRef<HTMLDivElement>(null);
    const controlled = active !== undefined;
    const current = controlled ? active : auto;

    useEffect(() => {
        if (controlled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let visible = true;
        const observer = typeof IntersectionObserver !== 'undefined' && root.current
            ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; })
            : null;
        if (observer && root.current) observer.observe(root.current);
        const timer = setInterval(() => {
            if (visible) setAuto((id) => CYCLE[(CYCLE.indexOf(id as (typeof CYCLE)[number]) + 1) % CYCLE.length]);
        }, 2600);
        return () => {
            clearInterval(timer);
            observer?.disconnect();
        };
    }, [controlled]);

    const on = (id: string) => `${styles.region} ${current === id ? styles.on : ''} ${id === 'power' ? styles.power : ''}`;

    return (
        <div ref={root} className={styles.wrap}>
            <svg viewBox="0 0 520 400" className={styles.svg} role="img" aria-label={`6U spacecraft schematic. Highlighted: ${CAPTIONS[current] ?? ''}`}>
                <g className={on('mission')}>
                    <ellipse cx="270" cy="205" rx="248" ry="72" className={styles.orbit} />
                </g>

                <g className={on('ground')}>
                    <path d="M 52 372 L 88 372 L 70 346 Z" className={styles.solid} />
                    <path d="M 70 346 Q 120 170 279 50" className={styles.link} />
                </g>

                <g className={on('power')}>
                    <rect x="58" y="140" width="156" height="98" className={styles.panel} />
                    {[84, 110, 136, 162, 188].map((x) => <line key={`l${x}`} x1={x} y1="140" x2={x} y2="238" className={styles.cell} />)}
                    {[164.5, 189, 213.5].map((y) => <line key={`lh${y}`} x1="58" y1={y} x2="214" y2={y} className={styles.cell} />)}
                </g>

                <polygon points="214,112 254,88 344,88 304,112" className={styles.body} />
                <g className={on('thermal')}>
                    <polygon points="304,112 344,88 344,268 304,292" className={styles.side} />
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <line key={i} x1="310" y1={128 + i * 26} x2="338" y2={112 + i * 26} className={styles.hatch} />
                    ))}
                </g>
                <rect x="214" y="112" width="90" height="180" className={styles.body} />

                <g className={on('avionics')}>
                    <rect x="226" y="128" width="66" height="24" rx="2" className={styles.part} />
                    {[236, 248, 260, 272, 284].map((x) => <line key={x} x1={x} y1="152" x2={x} y2="158" className={styles.cell} />)}
                </g>
                <g className={on('adcs')}>
                    <circle cx="259" cy="186" r="18" className={styles.part} />
                    <circle cx="259" cy="186" r="6" className={styles.part} />
                </g>
                <g className={on('power')}>
                    <rect x="226" y="216" width="66" height="26" rx="2" className={styles.part} />
                    <line x1="248" y1="216" x2="248" y2="242" className={styles.cell} />
                    <line x1="270" y1="216" x2="270" y2="242" className={styles.cell} />
                </g>
                <g className={on('payload')}>
                    <circle cx="259" cy="268" r="13" className={styles.part} />
                    <circle cx="259" cy="268" r="5" className={styles.solid} />
                </g>

                <g className={on('comms')}>
                    <line x1="279" y1="100" x2="279" y2="52" className={styles.part} />
                    <path d="M 266 52 Q 279 40 292 52" className={styles.part} />
                </g>

                <g className={on('power')}>
                    <line x1="324" y1="177" x2="336" y2="177" className={styles.part} />
                    <rect x="336" y="128" width="156" height="98" className={styles.panel} />
                    {[362, 388, 414, 440, 466].map((x) => <line key={`r${x}`} x1={x} y1="128" x2={x} y2="226" className={styles.cell} />)}
                    {[152.5, 177, 201.5].map((y) => <line key={`rh${y}`} x1="336" y1={y} x2="492" y2={y} className={styles.cell} />)}
                </g>
            </svg>
            {caption && (
                <p className={styles.caption} aria-hidden="true">
                    <span className={styles.dot} />
                    {CAPTIONS[current]}
                </p>
            )}
        </div>
    );
}
