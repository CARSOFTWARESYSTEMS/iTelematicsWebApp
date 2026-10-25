import type { CSSProperties } from 'react';
import styles from './visuals.module.css';
import Live, { Ticker } from './Live';
import FlowSteps from './FlowSteps';
import { Readouts } from './space-visuals';

/**
 * Animated engineering visuals for the EV battery, cybersecurity, safety, mobility and lab sections.
 * Same conventions as space-visuals: <Live> frames, CSS-only motion, HTML readouts, and a vertical
 * <FlowSteps> variant on phones where a diagram would otherwise shrink past legibility.
 */

const v = (i: number) => ({ ['--i' as string]: i }) as CSSProperties;

/* ---------- Flagship: Battery Energy & Health Intelligence ---------- */

// Cell → module → pack along the top; pack → BMS → telemetry → diagnostics back along the bottom.
const STAGES = [
    { label: '01 CELL', x: 20, y: 40, w: 110, h: 150 },
    { label: '02 MODULE', x: 170, y: 40, w: 170, h: 150 },
    { label: '03 PACK', x: 380, y: 40, w: 360, h: 150 },
    { label: '04 BMS', x: 560, y: 250, w: 180, h: 140 },
    { label: '05 TELEMETRY', x: 320, y: 250, w: 200, h: 140 },
    { label: '06 DIAGNOSTICS', x: 20, y: 250, w: 260, h: 140 },
];

const STAGE_LINKS = [
    { d: 'M 130 115 H 164', head: 'M 164 110 L 170 115 L 164 120 Z', kind: 'energy' },
    { d: 'M 340 115 H 374', head: 'M 374 110 L 380 115 L 374 120 Z', kind: 'energy' },
    { d: 'M 650 190 V 244', head: 'M 645 244 L 650 250 L 655 244 Z', kind: 'data' },
    { d: 'M 560 320 H 526', head: 'M 526 315 L 520 320 L 526 325 Z', kind: 'data' },
    { d: 'M 320 320 H 286', head: 'M 286 315 L 280 320 L 286 325 Z', kind: 'data' },
] as const;

// Module temperatures (°C): a quiet thermal map with one warmer module.
const PACK_TEMPS = [30.8, 31.2, 31.6, 33.4, 31.0, 31.4, 31.9, 31.1];
const tempTone = (t: number) => (t >= 33 ? styles.tWarm : t >= 31.5 ? styles.tMid : styles.tCool);

const CELL_DV = [9, 11, 8, 12, 10, 7, 11, 9, 12, 10, 8, 11];

export function BatteryFlagshipVisual() {
    return (
        <Live
            label="Battery energy and health system: a cell, a twelve-cell module and a 96-cell pack with a thermal map feed the BMS, telemetry and diagnostics, which rate the risk as low. Simulated values."
            className={`${styles.frame} ${styles.flagship}`}
        >
            <svg viewBox="0 0 760 410" className={`${styles.svg} ${styles.wideOnly}`}>
                {STAGE_LINKS.map((link) => (
                    <g key={link.d} className={link.kind === 'energy' ? styles.linkEnergy : styles.linkData}>
                        <path d={link.d} className={styles.linkTrack} />
                        <path d={link.d} className={styles.linkFlow} />
                        <path d={link.head} className={styles.linkHead} />
                    </g>
                ))}

                {STAGES.map((s, i) => (
                    <g key={s.label}>
                        <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={8} className={styles.stageFrame} style={v(i)} />
                        <text x={s.x} y={s.y - 10} className={styles.svgLabelStrong}>{s.label}</text>
                    </g>
                ))}

                {/* Cell */}
                <rect x={67} y={56} width={16} height={6} rx={2} className={styles.cellCap} />
                <rect x={57} y={62} width={36} height={96} rx={7} className={styles.cellBody} />
                <rect x={61} y={85} width={28} height={69} rx={4} className={styles.cellFill} />
                <text x={75} y={180} textAnchor="middle" className={styles.svgLabel}>3.6 V · 5 Ah</text>

                {/* Module */}
                {Array.from({ length: 12 }, (_, c) => (
                    <circle key={c} cx={197 + (c % 4) * 38} cy={76 + Math.floor(c / 4) * 32} r={11} className={styles.cellDot} />
                ))}
                <text x={255} y={180} textAnchor="middle" className={styles.svgLabel}>12S · 43.2 V</text>

                {/* Pack thermal map */}
                {PACK_TEMPS.map((t, m) => {
                    const x = 396 + (m % 4) * 84;
                    const y = 56 + Math.floor(m / 4) * 58;
                    return (
                        <g key={m}>
                            <rect x={x} y={y} width={72} height={48} rx={4} className={`${styles.packModule} ${tempTone(t)} ${t >= 33 ? styles.breathe : ''}`} />
                            <text x={x + 36} y={y + 29} textAnchor="middle" className={styles.moduleTemp}>{t.toFixed(1)}</text>
                        </g>
                    );
                })}
                <text x={560} y={180} textAnchor="middle" className={styles.svgLabel}>96S · 8 MODULES · THERMAL MAP °C</text>

                {/* BMS */}
                <rect x={574} y={276} width={40} height={40} rx={4} className={styles.chip} />
                <rect x={585} y={287} width={18} height={18} rx={2} className={styles.chipCore} />
                {[284, 296, 308].map((y) => (
                    <path key={y} d={`M 567 ${y} H 574 M 614 ${y} H 621`} className={styles.pin} />
                ))}
                <text x={630} y={290} className={styles.svgLabelStrong}>CELL ΔV 12 mV</text>
                <text x={630} y={310} className={styles.svgLabel}>BALANCING</text>
                {CELL_DV.map((h, i) => (
                    <rect key={i} x={580 + i * 12.5} y={376 - h * 2.2} width={8} height={h * 2.2} className={styles.dvBar} style={v(i)} />
                ))}

                {/* Telemetry */}
                <path d="M 336 306 q 10 -20 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0" pathLength={1} className={styles.waveTrace} />
                <text x={336} y={350} className={styles.svgLabel}>CAN · 500 kbit/s</text>
                <text x={336} y={370} className={`${styles.svgLabel} ${styles.t_telemetry}`}>CLOUD SYNC ACTIVE</text>

                {/* Diagnostics */}
                <text x={36} y={290} className={styles.svgLabel}>RISK</text>
                <text x={36} y={322} className={styles.riskValue}>LOW</text>
                <text x={36} y={352} className={styles.svgLabel}>ANOMALY SCAN · CLEAR</text>
                <text x={36} y={372} className={styles.svgLabel}>THERMAL · NOMINAL</text>
                <circle cx={226} cy={318} r={34} className={styles.ringTrack} />
                <circle cx={226} cy={318} r={34} pathLength={100} className={styles.ring} transform="rotate(-90 226 318)" />
                <text x={226} y={322} textAnchor="middle" className={styles.ringSmall}>SOH</text>
            </svg>

            <FlowSteps
                className={styles.narrowOnly}
                steps={[
                    { name: 'Cell', detail: '3.6 V nominal', tone: 'solar' },
                    { name: 'Module', detail: '12 cells in series', tone: 'solar' },
                    { name: 'Pack', detail: '96S · thermal map', tone: 'solar' },
                    { name: 'BMS', detail: 'Cell ΔV · balancing', tone: 'telemetry' },
                    { name: 'Telemetry', detail: 'CAN · cloud sync', tone: 'telemetry' },
                    { name: 'Diagnostics', detail: 'Risk low', tone: 'nominal' },
                ]}
            />

            <aside className={styles.valuePanel}>
                <p className={styles.panelTitle}>Simulated engineering values</p>
                <dl>
                    <div><dt>SOC</dt><dd><Ticker values={['78.4 %', '78.3 %', '78.2 %', '78.1 %']} every={6200} /></dd></div>
                    <div><dt>SOH</dt><dd>94.2 %</dd></div>
                    <div><dt>Voltage</dt><dd><Ticker values={['386.4 V', '386.1 V', '385.9 V', '386.2 V']} every={5200} /></dd></div>
                    <div><dt>Current</dt><dd><Ticker values={['−42.6 A', '−44.1 A', '−41.8 A', '−43.0 A']} every={4400} /></dd></div>
                    <div><dt>Temp</dt><dd><Ticker values={['31.6 °C', '31.7 °C', '31.8 °C', '31.7 °C']} every={5600} /></dd></div>
                    <div><dt>Cell ΔV</dt><dd><Ticker values={['12 mV', '11 mV', '12 mV', '13 mV']} every={6800} /></dd></div>
                    <div><dt>Risk</dt><dd><span className={`${styles.dot} state-nominal`} aria-hidden="true" />Low</dd></div>
                </dl>
            </aside>
        </Live>
    );
}

/* ---------- Cybersecurity: CAN network with one anomalous frame (12 s; resting frame = isolated) ---------- */

const CAN_NODES = [
    ['ECU', 'Vehicle controller'],
    ['Gateway', 'Security gateway · IDS'],
    ['BMS', 'Battery management'],
    ['Motor controller', 'Inverter · drive'],
] as const;

export function CanNetworkVisual() {
    return (
        <Live
            label="CAN network of an ECU, a security gateway, the BMS and a motor controller: normal frames flow, one anomalous frame from the ECU is detected at the gateway and the ECU is isolated"
            className={`${styles.frame} ${styles.can}`}
        >
            <div className={styles.canHead}>
                <span className="label">CAN bus · 500 kbit/s</span>
                <span className={`${styles.stack} ${styles.canState}`}>
                    <span className={styles.canNormal}>Normal</span>
                    <span className={styles.canDetected}>Anomaly detected</span>
                    <span className={styles.canIsolated}>Isolated</span>
                </span>
            </div>

            <div className={styles.canNet}>
                <ul className={styles.canNodes}>
                    {CAN_NODES.map(([name, role], i) => (
                        <li key={name} className={i === 0 ? styles.canSource : i === 1 ? styles.canGateway : undefined}>
                            <span className={styles.canName}>{name}</span>
                            <span className={styles.canRole}>{role}</span>
                        </li>
                    ))}
                </ul>
                <div className={styles.bus} aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                        <i key={i} className={styles.canFrameDot} style={v(i)} />
                    ))}
                    <i className={styles.canBad} />
                </div>
            </div>

            <ol className={styles.canStates}>
                <li className={styles.canStep1}>Normal traffic</li>
                <li className={styles.canStep2}>Anomaly detected</li>
                <li className={styles.canStep3}>Source isolated</li>
            </ol>
            <p className={styles.note}>Illustrative sequence</p>
        </Live>
    );
}

/* ---------- Battery Safety: pack → thermal → BMS → CAN → detection → mitigation (12 s) ---------- */

const SAFETY = [
    ['Battery pack', '386 V · 31 °C'],
    ['Thermal change', 'Module 3 · +4 °C'],
    ['BMS alert', 'Thermal warning'],
    ['CAN traffic', 'Alert broadcast'],
    ['Anomaly detection', 'Flagged'],
    ['Mitigation', 'Charge current limited'],
] as const;

const SAFETY_TEMPS = [31.0, 31.2, null, 30.9, 31.1, 31.4, 30.8, 31.0];

export function SafetyVisual() {
    return (
        <Live label="Safety sequence: a module warms, the BMS raises an alert over CAN, anomaly detection flags it and charge current is limited until the module cools" className={styles.frame}>
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
                <div className={styles.thermalMap}>
                    <p className="label">Thermal map · °C</p>
                    <ul>
                        {SAFETY_TEMPS.map((t, i) =>
                            t === null ? (
                                <li key={i} className={styles.hotModule}>
                                    <span className={styles.stack}>
                                        <span className={styles.tempBefore}>31.4</span>
                                        <span className={styles.tempHot}>35.2</span>
                                        <span className={styles.tempAfter}>32.0</span>
                                    </span>
                                </li>
                            ) : (
                                <li key={i}>{t.toFixed(1)}</li>
                            ),
                        )}
                    </ul>
                    <p className={styles.thermalNote}>Module 3 · monitored</p>
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
