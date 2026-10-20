"use client";
import { useEffect, useRef, useState } from 'react';
import styles from './OrbitInstrument.module.css';
import { ECLIPSE_FRACTION, PERIOD_MIN, sampleAtPhase } from '@/lib/energy-model';

const C = 210; // centre of the 420 × 420 drawing
const R_ORBIT = 150;
const R_EARTH = 92;
const HALF_ECLIPSE = ECLIPSE_FRACTION * 180; // degrees either side of the anti-sun point
const CONTACT_PHASE = 0.11;
const START_PHASE = 0.11; // sunlight, in contact: a representative still frame
const ORBIT_SECONDS = 30; // one orbit per 30 s on screen

const rad = (deg: number) => (deg * Math.PI) / 180;
const point = (r: number, deg: number) => [C + r * Math.cos(rad(deg)), C + r * Math.sin(rad(deg))] as const;
const angleOf = (phase: number) => 180 + phase * 360; // phase 0 = facing the Sun (left)

function arc(r: number, from: number, to: number) {
    const [x1, y1] = point(r, from);
    const [x2, y2] = point(r, to);
    const large = (((to - from) % 360) + 360) % 360 > 180 ? 1 : 0;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

const signed = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;

export default function OrbitInstrument({ scrubber = false, idPrefix = 'orbit' }: { scrubber?: boolean; idPrefix?: string }) {
    const [phase, setPhase] = useState(START_PHASE);
    const [playing, setPlaying] = useState(false);
    const [visible, setVisible] = useState(true);
    const root = useRef<HTMLDivElement>(null);

    // Autoplay unless the visitor prefers reduced motion.
    useEffect(() => {
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(true);
    }, []);

    // Don't spend frames while scrolled out of view.
    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined' || !root.current) return;
        const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
        observer.observe(root.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!playing || !visible) return;
        let frame = 0;
        let last = performance.now();
        const tick = (now: number) => {
            if (now - last >= 33) {
                const dt = (now - last) / 1000;
                last = now;
                setPhase((p) => (p + dt / ORBIT_SECONDS) % 1);
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [playing, visible]);

    const s = sampleAtPhase(phase);
    const [sx, sy] = point(R_ORBIT, angleOf(phase));
    const [gx, gy] = point(R_EARTH, angleOf(CONTACT_PHASE));
    const satAngle = angleOf(phase) + 90;

    const readouts = [
        { label: 'State', value: s.eclipse ? 'Eclipse' : 'Sunlight', tone: s.eclipse ? 'orbit' : 'solar' },
        { label: 'Solar', value: `${s.arrayW.toFixed(1)} W` },
        { label: 'Load', value: `${s.loadW.toFixed(1)} W` },
        { label: 'Battery', value: `${(s.soc * 100).toFixed(1)} %`, note: s.batteryW > 0.5 ? 'charging' : s.batteryW < -0.5 ? 'discharging' : 'full' },
        { label: 'Margin', value: `${signed(s.marginW)} W`, note: s.marginW < 0 ? 'battery supplying' : 'surplus' },
        { label: 'Link', value: s.contact ? 'Contact' : 'Stored', tone: s.contact ? 'telemetry' : undefined, note: s.contact ? 'downlink' : 'next pass' },
    ];

    return (
        <div ref={root} className={styles.instrument}>
            <figure className={styles.figure}>
                <svg viewBox="0 0 420 420" className={styles.svg} role="img" aria-labelledby={`${idPrefix}-title`}>
                    <title id={`${idPrefix}-title`}>
                        Schematic orbit: a satellite moving through sunlight and Earth’s shadow, with a ground-station pass
                    </title>
                    <defs>
                        <radialGradient id={`${idPrefix}-earth`} cx="0.35" cy="0.35">
                            <stop offset="0" stopColor="#13304A" />
                            <stop offset="1" stopColor="#081321" />
                        </radialGradient>
                    </defs>

                    {[170, 210, 250].map((y) => (
                        <g key={y} className={styles.ray}>
                            <line x1="6" y1={y} x2="40" y2={y} />
                            <path d={`M 40 ${y - 4} L 47 ${y} L 40 ${y + 4} Z`} />
                        </g>
                    ))}
                    <text x="6" y="152" className={`${styles.svgLabel} ${styles.sunLabel}`}>SUN</text>

                    {/* Earth's shadow and the two orbit segments */}
                    <path
                        d={`M ${C} ${C} L ${point(196, -HALF_ECLIPSE).join(' ')} A 196 196 0 0 1 ${point(196, HALF_ECLIPSE).join(' ')} Z`}
                        className={styles.shadow}
                    />
                    <path d={arc(R_ORBIT, HALF_ECLIPSE, 360 - HALF_ECLIPSE)} className={styles.sunArc} />
                    <path d={arc(R_ORBIT, -HALF_ECLIPSE, HALF_ECLIPSE)} className={styles.eclipseArc} />

                    <circle cx={C} cy={C} r={R_EARTH} fill={`url(#${idPrefix}-earth)`} className={styles.earth} />

                    {s.contact && <line x1={sx} y1={sy} x2={gx} y2={gy} className={styles.link} />}
                    <g transform={`translate(${gx} ${gy}) rotate(${angleOf(CONTACT_PHASE) + 90})`} className={styles.station}>
                        <path d="M -6 0 L 6 0 L 0 -9 Z" />
                    </g>

                    <g transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)}) rotate(${satAngle.toFixed(1)})`} className={styles.sat}>
                        <rect x="-15" y="-3.5" width="10" height="7" className={styles.panel} />
                        <rect x="5" y="-3.5" width="10" height="7" className={styles.panel} />
                        <rect x="-5" y="-6" width="10" height="12" rx="1.5" className={styles.body} />
                    </g>
                </svg>
                <figcaption className={styles.caption}>
                    Schematic, not to scale · one {PERIOD_MIN.toFixed(1)}-minute orbit shown in {ORBIT_SECONDS} s
                </figcaption>
            </figure>

            <div className={styles.panelArea}>
                <dl className={styles.readouts} aria-live="off">
                    {readouts.map((r) => (
                        <div key={r.label} className={styles.readout}>
                            <dt className="label">{r.label}</dt>
                            <dd className={styles.value}>
                                {r.tone && <span className={`${styles.dot} state-${r.tone}`} aria-hidden="true" />}
                                <span className="tabular">{r.value}</span>
                            </dd>
                            {r.note && <dd className={styles.note}>{r.note}</dd>}
                        </div>
                    ))}
                </dl>

                <div className={styles.controls}>
                    <button
                        type="button"
                        className={styles.play}
                        onClick={() => setPlaying(!playing)}
                        aria-label={playing ? 'Pause orbit animation' : 'Play orbit animation'}
                    >
                        <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
                    </button>
                    {scrubber ? (
                        <label className={styles.scrub}>
                            <span className="visually-hidden">Orbit position</span>
                            <input
                                type="range"
                                min={0}
                                max={1000}
                                value={Math.round(phase * 1000)}
                                onChange={(e) => {
                                    setPlaying(false);
                                    setPhase(Number(e.target.value) / 1000);
                                }}
                            />
                            <span className={`${styles.time} tabular`}>T+{(phase * PERIOD_MIN).toFixed(0).padStart(2, '0')} min</span>
                        </label>
                    ) : (
                        <span className={`${styles.time} tabular`}>T+{(phase * PERIOD_MIN).toFixed(0).padStart(2, '0')} min</span>
                    )}
                </div>
                <p className={styles.footnote}>6U reference case · simulated values, not flight data</p>
            </div>
        </div>
    );
}
