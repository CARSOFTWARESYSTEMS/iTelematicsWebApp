"use client";
import { useEffect, useRef, useState } from 'react';
import styles from './HeroSystems.module.css';
import liveStyles from './Live.module.css';
import { LiveContext, Ticker, useLiveState } from './Live';
import { BatteryPackDrawing, EvtolDrawing, RocketEngineDrawing, SatelliteDrawing } from './drawings';

type Readout = [label: string, values: string[], tone?: 'nominal' | 'telemetry'];

const SCENES: { name: string; Drawing: typeof BatteryPackDrawing; readouts: Readout[] }[] = [
    {
        name: 'Battery pack',
        Drawing: BatteryPackDrawing,
        readouts: [
            ['Pack', ['386 V', '385 V', '386 V']],
            ['SOC', ['78 %', '77 %']],
            ['Temp', ['31 °C', '32 °C', '31 °C']],
            ['BMS', ['Online'], 'nominal'],
        ],
    },
    {
        name: 'Satellite',
        Drawing: SatelliteDrawing,
        readouts: [
            ['SOC', ['82 %', '81 %']],
            ['EPS', ['Nominal'], 'nominal'],
            ['Downlink', ['Active'], 'telemetry'],
            ['Payload', ['12.4 W', '12.6 W']],
        ],
    },
    {
        name: 'Rocket engine',
        Drawing: RocketEngineDrawing,
        readouts: [
            ['Chamber', ['3.2 MPa', '3.3 MPa']],
            ['Turbopump', ['28.4 krpm', '28.6 krpm']],
            ['Flow', ['1.62 kg/s', '1.64 kg/s']],
            ['Controller', ['Mainstage'], 'nominal'],
        ],
    },
    {
        name: 'eVTOL system',
        Drawing: EvtolDrawing,
        readouts: [
            ['Propulsion', ['Nominal'], 'nominal'],
            ['Battery', ['71 %', '70 %']],
            ['Avionics', ['Nominal'], 'nominal'],
            ['Telemetry', ['Linked'], 'telemetry'],
        ],
    },
];

const SCENE_MS = 10000;

/**
 * Hero engineering model: battery pack → satellite → rocket engine → eVTOL, one model every
 * ten seconds while on screen. Visitors can pick a model; under reduced motion it stays put.
 */
export default function HeroSystems() {
    const ref = useRef<HTMLDivElement>(null);
    const live = useLiveState(ref);
    const [scene, setScene] = useState(0);
    const [epoch, setEpoch] = useState(0);

    useEffect(() => {
        if (!live) return;
        const timer = setInterval(() => setScene((s) => (s + 1) % SCENES.length), SCENE_MS);
        return () => clearInterval(timer);
    }, [live, epoch]);

    const current = SCENES[scene];

    return (
        <div ref={ref} className={styles.hero}>
            <LiveContext.Provider value={live}>
                <div
                    className={`${liveStyles.live} ${styles.stage}`}
                    data-live={live ? 'on' : 'off'}
                    role="img"
                    aria-label="Engineering model sequence: battery pack, satellite, rocket engine and eVTOL system, each shown with simulated telemetry"
                >
                    <div className={styles.hud}>
                        <span>
                            Model {String(scene + 1).padStart(2, '0')} / {String(SCENES.length).padStart(2, '0')} · {current.name}
                        </span>
                        <span>Simulated</span>
                    </div>
                    <svg viewBox="0 0 560 400" className={styles.svg}>
                        <path d="M 8 24 V 8 H 24 M 536 8 H 552 V 24 M 552 376 V 392 H 536 M 24 392 H 8 V 376" className={styles.ticks} />
                        {SCENES.map(({ name, Drawing }, i) => (
                            <g key={name} className={`${styles.scene} ${i === scene ? styles.active : ''}`}>
                                <Drawing detail />
                            </g>
                        ))}
                    </svg>
                    <dl className={styles.readouts}>
                        {current.readouts.map(([label, values, tone]) => (
                            <div key={`${scene}-${label}`}>
                                <dt className="label">{label}</dt>
                                <dd className="tabular">
                                    {tone && <span className={`${styles.dot} state-${tone}`} aria-hidden="true" />}
                                    <Ticker values={values} every={3600} />
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </LiveContext.Provider>

            <div className={styles.picker} role="group" aria-label="Choose an engineering model">
                {SCENES.map(({ name }, i) => (
                    <button
                        key={name}
                        type="button"
                        className={styles.pick}
                        aria-pressed={i === scene}
                        onClick={() => {
                            setScene(i);
                            setEpoch((e) => e + 1); // restart the interval so the chosen model gets its full time
                        }}
                    >
                        <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                        {name}
                    </button>
                ))}
            </div>
        </div>
    );
}
