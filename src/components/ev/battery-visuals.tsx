import type { CSSProperties } from 'react';
import styles from './visuals.module.css';
import Live, { Ticker } from './Live';
import { BatteryPackDrawing } from './drawings';
import { Readouts } from './space-visuals';

/**
 * Animated engineering visuals for the EV battery, safety, mobility and lab sections.
 * Same conventions as space-visuals: <Live> frames, CSS-only motion, HTML readouts.
 */

const v = (i: number) => ({ ['--i' as string]: i }) as CSSProperties;

/* ---------- EV Battery & Energy Intelligence: pack diagnostics environment ---------- */

const CELL_V = [96, 98, 97, 99, 95, 98, 97, 96, 98, 99, 97, 96, 98, 97, 95, 98];

export function BatteryVisual() {
    return (
        <Live
            label="Battery diagnostics environment: a 96-cell pack in eight modules with current flow, thermal zones, an anomaly scan and a BMS, beside pack readouts and cell voltages"
            className={`${styles.frame} ${styles.batteryFrame}`}
        >
            <svg viewBox="60 66 490 262" className={styles.svg}>
                <BatteryPackDrawing detail />
            </svg>
            <div className={styles.diagnostics}>
                <Readouts
                    items={[
                        { label: 'SOC', value: <Ticker values={['78 %', '78 %', '77 %']} every={5200} /> },
                        { label: 'SOH', value: '94 %' },
                        { label: 'Temp', value: <Ticker values={['31 °C', '32 °C', '31 °C']} every={4400} /> },
                        { label: 'Pack', value: <Ticker values={['386 V', '385 V', '386 V']} every={3800} /> },
                        { label: 'BMS', value: 'Online', tone: 'nominal' },
                        { label: 'Faults', value: '0', tone: 'nominal' },
                    ]}
                    note=""
                />
                <div className={styles.cellPanel}>
                    <div className={styles.cellHead}>
                        <span className="label">Cell voltages · module 1–2</span>
                        <span className="label tabular">ΔV 12 mV</span>
                    </div>
                    <div className={styles.cellBars}>
                        {CELL_V.map((h, i) => (
                            <i key={i} style={{ height: `${h}%`, ...v(i) }} />
                        ))}
                    </div>
                </div>
                <p className={styles.scanLine}>
                    <span className={styles.scanDot} aria-hidden="true" />
                    Anomaly detection · scanning
                </p>
                <p className={styles.note}>Simulated values</p>
            </div>
        </Live>
    );
}

/* ---------- Battery Safety: pack → thermal → BMS → CAN → detection → mitigation ---------- */

const SAFETY = [
    ['Battery pack', '386 V · 31 °C'],
    ['Thermal change', 'Module 3 · +4 °C'],
    ['BMS alert', 'Thermal warning'],
    ['CAN traffic', 'Frame rate rising'],
    ['Anomaly detection', 'Flagged'],
    ['Mitigation', 'Charge current limited'],
] as const;

const FRAMES = [
    ['0x0C1', '4F 21 00 7C'],
    ['0x18F', '0E 3A 11 00'],
    ['0x2A0', '7D 00 46 1B'],
    ['0x1A3', 'FF FF 3C 9A'],
    ['0x0C1', '4F 22 00 7C'],
] as const;

export function SafetyVisual() {
    return (
        <Live label="Safety sequence: a thermal change in the pack raises a BMS alert, unusual CAN traffic is flagged by anomaly detection and the system mitigates by limiting charge current" className={styles.frame}>
            <div className={styles.safety}>
                <ol className={styles.chain}>
                    {SAFETY.map(([name, detail], i) => (
                        <li key={name} style={v(i)}>
                            <span className={styles.chainMarker} aria-hidden="true" />
                            <span className={styles.chainName}>{name}</span>
                            <span className={styles.chainDetail}>{detail}</span>
                        </li>
                    ))}
                </ol>
                <div className={styles.canLog}>
                    <p className="label">CAN bus · live frames</p>
                    <ul>
                        {FRAMES.map(([id, data], i) => (
                            <li key={i} className={i === 3 ? styles.flagged : undefined} style={v(i)}>
                                <span>{id}</span>
                                <span>{data}</span>
                                {i === 3 && (
                                    <span className={styles.stack}>
                                        <span className={styles.frameOk}>OK</span>
                                        <span className={styles.frameFlag}>Anomaly</span>
                                        <span className={styles.frameMitigated}>Mitigated</span>
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <p className={styles.note}>Illustrative sequence</p>
        </Live>
    );
}

/* ---------- Battery Health & Diagnostics ---------- */

const CELLS = [97, 98, 96, 98, 97, 99, 82, 97, 98, 96, 98, 97];

export function HealthVisual() {
    return (
        <Live label="Battery health view: state-of-health ring at 94 percent, twelve cell voltages with one low cell flagged, and a cycle-history trace" className={styles.frame}>
            <svg viewBox="0 0 560 210" className={styles.svg}>
                <circle cx={80} cy={100} r={56} className={styles.ringTrack} />
                <circle cx={80} cy={100} r={56} pathLength={100} className={styles.ring} transform="rotate(-90 80 100)" />
                <text x={80} y={104} textAnchor="middle" className={styles.ringValue}>94%</text>
                <text x={80} y={124} textAnchor="middle" className={styles.svgLabel}>SOH</text>

                {CELLS.map((h, i) => {
                    const height = (h - 70) * 3.6;
                    return (
                        <rect
                            key={i}
                            x={170 + i * 16}
                            y={160 - height}
                            width={9}
                            height={height}
                            className={i === 6 ? styles.cellLow : styles.cellBar}
                            style={v(i)}
                        />
                    );
                })}
                <line x1={166} y1={160} x2={362} y2={160} className={styles.gridLine} />
                <text x={170} y={184} className={styles.svgLabel}>CELLS 01–12</text>
                <text x={274} y={42} textAnchor="middle" className={`${styles.svgLabel} ${styles.t_solar}`}>CELL 07</text>

                <line x1={392} y1={160} x2={544} y2={160} className={styles.gridLine} />
                <path d="M 392 64 L 410 66 L 428 67 L 446 71 L 464 72 L 482 76 L 500 79 L 518 80 L 536 84 L 544 85" pathLength={1} className={styles.history} />
                <text x={392} y={184} className={styles.svgLabel}>CYCLE HISTORY</text>
            </svg>
            <Readouts
                items={[
                    { label: 'Health score', value: '92 / 100' },
                    { label: 'Imbalance', value: <Ticker values={['18 mV', '19 mV', '18 mV']} every={5000} /> },
                    { label: 'Cycles', value: <Ticker values={['412', '413']} every={9000} /> },
                    { label: 'Anomaly', value: 'Cell 07 low', tone: 'solar' },
                ]}
            />
        </Live>
    );
}

/* ---------- Battery Pack Engineering: cell → module → pack ---------- */

export function PackBuildVisual() {
    return (
        <Live label="Pack architecture: a single cell, a twelve-cell module and a pack of modules with its BMS" className={styles.frame}>
            <svg viewBox="0 0 560 210" className={styles.svg}>
                <g className={styles.buildStep} style={v(0)}>
                    <rect x={40} y={56} width={40} height={96} rx={8} className={styles.block} />
                    <line x1={52} y1={50} x2={68} y2={50} className={styles.wireStrongThin} />
                    <text x={60} y={184} textAnchor="middle" className={styles.blockLabel}>CELL</text>
                </g>
                <path d="M 96 104 H 128 M 120 98 L 128 104 L 120 110" className={styles.arrow} />

                <g className={styles.buildStep} style={v(1)}>
                    <rect x={142} y={50} width={128} height={108} rx={6} className={styles.block} />
                    {Array.from({ length: 12 }, (_, c) => (
                        <circle key={c} cx={166 + (c % 4) * 27} cy={74 + Math.floor(c / 4) * 30} r={10} className={styles.cellDot} />
                    ))}
                    <text x={206} y={184} textAnchor="middle" className={styles.blockLabel}>MODULE</text>
                </g>
                <path d="M 286 104 H 318 M 310 98 L 318 104 L 310 110" className={styles.arrow} />

                <g className={styles.buildStep} style={v(2)}>
                    <rect x={332} y={30} width={204} height={146} rx={8} className={styles.block} />
                    {[
                        [346, 44],
                        [430, 44],
                        [346, 110],
                        [430, 110],
                    ].map(([x, y]) => (
                        <rect key={`${x}-${y}`} x={x} y={y} width={76} height={54} rx={4} className={styles.moduleSmall} />
                    ))}
                    <rect x={512} y={74} width={16} height={56} rx={3} className={styles.bmsSmall} />
                    <text x={434} y={200} textAnchor="middle" className={styles.blockLabel}>PACK + BMS</text>
                </g>
            </svg>
            <Readouts
                items={[
                    { label: 'Cell', value: '3.6 V nominal' },
                    { label: 'Module', value: '12 cells' },
                    { label: 'Pack', value: '96S · 8 modules' },
                    { label: 'Validation', value: 'Thermal · BMS', tone: 'nominal' },
                ]}
                note="Reference architecture · illustrative"
            />
        </Live>
    );
}

/* ---------- Electric Mobility: battery → inverter → motor → wheels → terrain → range ---------- */

const POWERTRAIN = ['BATTERY', 'INVERTER', 'MOTOR', 'WHEELS'];

export function MobilityVisual() {
    return (
        <Live label="Vehicle energy model: battery, inverter, motor and wheels over a mixed-terrain route, with energy consumption rising on climbs and an estimated range" className={styles.frame}>
            <svg viewBox="0 0 560 230" className={styles.svg}>
                {POWERTRAIN.map((name, i) => (
                    <g key={name}>
                        <rect x={16 + i * 136} y={16} width={104} height={44} rx={6} className={styles.block} />
                        <text x={68 + i * 136} y={43} textAnchor="middle" className={styles.blockLabel}>{name}</text>
                        {i < POWERTRAIN.length - 1 && (
                            <>
                                <line x1={120 + i * 136} y1={38} x2={152 + i * 136} y2={38} className={styles.wire} />
                                <line x1={120 + i * 136} y1={38} x2={152 + i * 136} y2={38} className={styles.powerFlow} />
                            </>
                        )}
                    </g>
                ))}

                <path d="M 16 196 C 80 196 100 162 150 162 S 220 202 280 192 S 360 150 410 154 S 500 198 544 190 V 226 H 16 Z" className={styles.terrainFill} />
                <path d="M 16 196 C 80 196 100 162 150 162 S 220 202 280 192 S 360 150 410 154 S 500 198 544 190" className={styles.terrain} />
                <path d="M 16 132 C 80 132 100 100 150 104 S 220 140 280 132 S 360 94 410 100 S 500 138 544 128" pathLength={1} className={styles.energyTrace} />
                <text x={16} y={92} className={`${styles.svgLabel} ${styles.t_solar}`}>ENERGY Wh/km</text>
                <text x={16} y={222} className={styles.svgLabel}>TERRAIN</text>
            </svg>
            <Readouts
                items={[
                    { label: 'Consumption', value: <Ticker values={['62 Wh/km', '66 Wh/km', '60 Wh/km', '64 Wh/km']} every={3800} /> },
                    { label: 'Est. range', value: <Ticker values={['128 km', '124 km', '130 km', '126 km']} every={3800} /> },
                    { label: 'Duty', value: 'D+6 · mixed' },
                    { label: 'Speed', value: '50 km/h' },
                ]}
                note="Illustrative values · auto-rickshaw scenario"
            />
        </Live>
    );
}

/* ---------- Interactive lab glyphs (small, one idea each) ---------- */

export function Lab3dGlyph() {
    return (
        <Live className={styles.glyph}>
            <svg viewBox="0 0 240 140" className={styles.svg}>
                {[0, 1, 2, 3, 4].map((i) => (
                    <path key={i} d={`M 70 ${100 - i * 16} L 120 ${78 - i * 16} L 170 ${100 - i * 16} L 120 ${122 - i * 16} Z`} className={i === 1 ? styles.boardEps : styles.board} style={v(i)} />
                ))}
                <path d="M 40 70 L 70 68 M 170 68 L 200 70" className={styles.wireStrongThin} />
                <path d="M 8 58 L 40 64 V 82 L 8 76 Z" className={styles.arrayBlock} />
                <path d="M 200 64 L 232 58 V 76 L 200 82 Z" className={styles.arrayBlock} />
            </svg>
        </Live>
    );
}

export function LabOrbitGlyph() {
    return (
        <Live className={styles.glyph}>
            <svg viewBox="0 0 240 140" className={styles.svg}>
                <rect x={120} y={46} width={120} height={48} className={styles.umbra} />
                <circle cx={120} cy={70} r={48} className={styles.orbitPath} />
                <circle cx={120} cy={70} r={22} className={styles.earth} />
                <g className={styles.orbitingSmall}>
                    <circle cx={72} cy={70} r={4} className={styles.sensorDot} />
                </g>
                <rect x={196} y={24} width={14} height={92} rx={3} className={styles.socTrack} />
                <rect x={196} y={24} width={14} height={92} rx={3} className={styles.socFill} />
            </svg>
        </Live>
    );
}

export function LabRocketGlyph() {
    return (
        <Live className={styles.glyph}>
            <svg viewBox="0 0 240 140" className={styles.svg}>
                <path d="M 30 50 H 80 V 90 H 30 Z M 80 58 C 92 58 96 64 102 66 C 130 60 160 44 190 34 V 106 C 160 96 130 80 102 74 C 96 76 92 82 80 82" className={styles.engineSmall} />
                <path d="M 104 70 H 186 M 104 66 L 184 46 M 104 74 L 184 94" className={styles.exhaustSmall} />
                <path d="M 30 70 H 6" className={styles.flowSmall} />
                <path d="M 200 120 A 26 26 0 0 1 236 120" className={styles.gauge} />
                <line x1={218} y1={122} x2={218} y2={102} className={styles.needle} />
                <circle cx={58} cy={50} r={3} className={styles.sensorDot} />
                <circle cx={150} cy={52} r={3} className={styles.sensorDot} />
            </svg>
        </Live>
    );
}

export function LabCellsGlyph() {
    return (
        <Live className={styles.glyph}>
            <svg viewBox="0 0 240 140" className={styles.svg}>
                {CELLS.slice(0, 10).map((h, i) => {
                    const height = (h - 70) * 3;
                    return <rect key={i} x={22 + i * 14} y={110 - height} width={8} height={height} className={i === 6 ? styles.cellLow : styles.cellBar} style={v(i)} />;
                })}
                <line x1={18} y1={110} x2={162} y2={110} className={styles.gridLine} />
                <circle cx={200} cy={70} r={26} className={styles.ringTrack} />
                <circle cx={200} cy={70} r={26} pathLength={100} className={styles.ring} transform="rotate(-90 200 70)" />
            </svg>
        </Live>
    );
}
