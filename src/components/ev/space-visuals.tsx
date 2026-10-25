import type { CSSProperties, ReactNode } from 'react';
import styles from './visuals.module.css';
import Live, { Ticker } from './Live';
import { EvtolDrawing, RocketEngineDrawing } from './drawings';
import FlowSteps from './FlowSteps';

/**
 * Animated engineering visuals for the space and aerospace research sections. Each sits in a
 * <Live> frame (paused off screen, static under reduced motion) and pairs its drawing with
 * readable HTML readouts, so values never shrink with the drawing on phones.
 */

const v = (i: number) => ({ ['--i' as string]: i }) as CSSProperties;

export type Readout = { label: string; value: ReactNode; tone?: 'nominal' | 'telemetry' | 'solar' | 'orbit' | 'fault' };

export function Readouts({ items, note = 'Simulated values' }: { items: Readout[]; note?: string }) {
    return (
        <div className={styles.readoutArea}>
            <dl className={styles.readouts}>
                {items.map((r) => (
                    <div key={r.label}>
                        <dt className="label">{r.label}</dt>
                        <dd className="tabular">
                            {r.tone && <span className={`${styles.dot} state-${r.tone}`} aria-hidden="true" />}
                            {r.value}
                        </dd>
                    </div>
                ))}
            </dl>
            {note && <p className={styles.note}>{note}</p>}
        </div>
    );
}

/** Two values that alternate in step with a CSS cycle (e.g. Sunlight / Eclipse). */
function Phase({ a, b, kind }: { a: string; b: string; kind: 'sun' | 'link' }) {
    return (
        <span className={styles.stack}>
            <span className={kind === 'sun' ? styles.sunState : styles.linkIdle}>{a}</span>
            <span className={kind === 'sun' ? styles.eclState : styles.linkState}>{b}</span>
        </span>
    );
}

/* ---------- Space & Aerospace Technologies: Earth, orbit, sunlight/eclipse, contact ---------- */

export function SpaceOrbitVisual() {
    return (
        <Live label="Schematic orbit: a satellite passes through sunlight and Earth’s shadow and downlinks over a ground station" className={styles.frame}>
            <svg viewBox="0 0 480 380" className={styles.svg}>
                {[160, 190, 220].map((y) => (
                    <g key={y} className={styles.ray}>
                        <line x1={8} y1={y} x2={44} y2={y} />
                        <path d={`M 44 ${y - 4} L 51 ${y} L 44 ${y + 4} Z`} />
                    </g>
                ))}
                <text x={8} y={146} className={`${styles.svgLabel} ${styles.t_solar}`}>SUN</text>

                <rect x={250} y={128} width={230} height={124} className={styles.umbra} />
                <circle cx={250} cy={190} r={124} className={styles.orbitPath} />
                <path d="M 357.4 128 A 124 124 0 0 1 357.4 252" className={styles.eclipseArc} />
                <path d="M 203.6 75 A 124 124 0 0 1 296.4 75" className={styles.contactArc} />

                <circle cx={250} cy={190} r={62} className={styles.earth} />
                <ellipse cx={250} cy={190} rx={22} ry={62} className={styles.meridian} />
                <ellipse cx={250} cy={190} rx={46} ry={62} className={styles.meridian} />
                <line x1={188} y1={190} x2={312} y2={190} className={styles.meridian} />
                <line x1={196} y1={159} x2={304} y2={159} className={styles.meridian} />
                <line x1={196} y1={221} x2={304} y2={221} className={styles.meridian} />

                <path d="M 250 128 L 228 72 L 272 72 Z" className={styles.beam} />
                <path d="M 244 131 L 256 131 L 250 121 Z" className={styles.groundStation} />

                <g className={styles.orbiting}>
                    <circle cx={126} cy={190} r={7} className={styles.ping} />
                    <rect x={123} y={168} width={6} height={14} className={styles.satPanel} />
                    <rect x={123} y={198} width={6} height={14} className={styles.satPanel} />
                    <rect x={120.5} y={184.5} width={11} height={11} rx={1.5} className={styles.satBody} />
                </g>

                <text x={400} y={124} className={`${styles.svgLabel} ${styles.t_orbit}`}>ECLIPSE</text>
                <text x={250} y={58} textAnchor="middle" className={`${styles.svgLabel} ${styles.t_telemetry}`}>CONTACT</text>
            </svg>
            <Readouts
                items={[
                    { label: 'State', value: <Phase a="Sunlight" b="Eclipse" kind="sun" /> },
                    { label: 'Arrays', value: <Phase a="Generating" b="Battery" kind="sun" /> },
                    { label: 'Link', value: <Phase a="Stored" b="Downlink" kind="link" />, tone: 'telemetry' },
                    { label: 'Orbit', value: '≈ 95 min' },
                ]}
                note="Schematic, not to scale · one orbit shown in 24 s"
            />
        </Live>
    );
}

/* ---------- Satellite Engineering: EPS-centred power and telemetry schematic ---------- */

const LOADS = [
    { name: 'PAYLOAD', y: 24 },
    { name: 'COMMS', y: 92 },
    { name: 'OBC · ADCS', y: 160 },
];

const socSat = <Ticker values={['82 %', '81 %', '80 %', '81 %']} every={5000} />;
const payload = <Ticker values={['12.4 W', '12.6 W', '12.4 W', '12.2 W']} every={4600} />;

export function SatelliteSchematicVisual() {
    return (
        <Live label="Satellite power schematic: solar arrays feed the EPS, which charges the battery in sunlight, draws on it in eclipse and powers payload, communications and the onboard computer" className={styles.frame}>
            <svg viewBox="0 0 560 300" className={`${styles.svg} ${styles.wideOnly}`}>
                <g className={styles.sunlit}>
                    <line x1={28} y1={6} x2={46} y2={30} className={styles.rayLine} />
                    <line x1={58} y1={6} x2={76} y2={30} className={styles.rayLine} />
                    <line x1={88} y1={6} x2={106} y2={30} className={styles.rayLine} />
                </g>
                <rect x={16} y={40} width={124} height={56} className={styles.arrayBlock} />
                {[1, 2, 3, 4, 5].map((c) => (
                    <line key={c} x1={16 + c * 20.6} y1={40} x2={16 + c * 20.6} y2={96} className={styles.arrayGrid} />
                ))}
                <rect x={16} y={40} width={124} height={56} className={styles.arrayShade} />
                <text x={78} y={118} textAnchor="middle" className={styles.blockLabel}>ARRAYS</text>

                <path d="M 140 68 H 172 V 144 H 208" className={styles.wire} />
                <path d="M 140 68 H 172 V 144 H 208" className={`${styles.powerFlow} ${styles.sunlitFlow}`} />

                <rect x={208} y={112} width={128} height={64} rx={6} className={styles.block} />
                <text x={272} y={149} textAnchor="middle" className={styles.blockLabel}>EPS</text>

                <line x1={272} y1={176} x2={272} y2={220} className={styles.wire} />
                <line x1={272} y1={176} x2={272} y2={220} className={`${styles.powerFlow} ${styles.sunlitFlow}`} />
                <line x1={272} y1={220} x2={272} y2={176} className={`${styles.powerFlow} ${styles.eclipseFlow}`} />

                <rect x={208} y={220} width={128} height={56} rx={6} className={`${styles.block} ${styles.batteryBlock}`} />
                <text x={272} y={253} textAnchor="middle" className={styles.blockLabel}>BATTERY</text>

                <path d="M 336 144 H 376 V 48 H 412 M 376 116 H 412 M 376 144 V 184 H 412" className={styles.wire} />
                <path d="M 336 144 H 376 V 48 H 412" className={styles.powerFlow} />
                <path d="M 376 116 H 412" className={styles.powerFlow} />
                <path d="M 376 144 V 184 H 412" className={styles.powerFlow} />

                {LOADS.map((load, i) => (
                    <g key={load.name}>
                        <rect x={412} y={load.y} width={132} height={48} rx={6} className={styles.block} />
                        <text x={426} y={load.y + 29} className={styles.blockLabel}>{load.name}</text>
                        <circle cx={530} cy={load.y + 24} r={3.5} className={styles.activity} style={v(i)} />
                    </g>
                ))}

                <rect x={412} y={236} width={132} height={44} rx={6} className={`${styles.block} ${styles.groundBlock}`} />
                <text x={426} y={263} className={styles.blockLabel}>GROUND</text>
                <path d="M 544 116 H 556 V 258 H 544" className={styles.wireThin} />
                <path d="M 544 116 H 556 V 258 H 544" className={styles.telemetryFlow} />

                <rect x={16} y={40} width={124} height={56} className={styles.eclipseTint} />
            </svg>
            <div className={styles.wideOnly}>
                <Readouts
                    items={[
                        { label: 'SOC', value: socSat },
                        { label: 'EPS', value: 'Nominal', tone: 'nominal' },
                        { label: 'Downlink', value: 'Active', tone: 'telemetry' },
                        { label: 'Payload', value: payload },
                    ]}
                />
            </div>
            <FlowSteps
                className={styles.narrowOnly}
                steps={[
                    { name: 'Sun', detail: 'Sunlight · eclipse cycle', tone: 'solar' },
                    { name: 'Solar array', detail: 'Generating', tone: 'solar' },
                    { name: 'EPS', detail: 'Nominal', tone: 'nominal' },
                    { name: 'Battery', detail: <>SOC {socSat}</>, tone: 'nominal' },
                    { name: 'Payload', detail: payload, tone: 'telemetry' },
                    { name: 'Telemetry', detail: 'Downlink active', tone: 'telemetry' },
                ]}
            />
        </Live>
    );
}

/* ---------- CubeTwin: three orbits of SOC and load, with a fault and a safe-mode response ---------- */

const ORBIT_BANDS: [number, number, 'sun' | 'ecl'][] = [
    [40, 150, 'sun'],
    [150, 206, 'ecl'],
    [206, 316, 'sun'],
    [316, 372, 'ecl'],
    [372, 482, 'sun'],
    [482, 538, 'ecl'],
];

export function CubeTwinVisual() {
    return (
        <Live label="CubeTwin mission timeline: battery state of charge over three orbits of sunlight and eclipse, a load fault, a safe-mode response and recovery" className={`${styles.frame} ${styles.cubeFrame}`}>
            <svg viewBox="0 0 560 270" className={styles.svg}>
                {ORBIT_BANDS.map(([x1, x2, kind]) => (
                    <rect key={x1} x={x1} y={24} width={x2 - x1} height={10} className={kind === 'sun' ? styles.bandSun : styles.bandEcl} />
                ))}
                {[0, 1, 2].map((o) => (
                    <text key={o} x={44 + o * 166} y={16} className={styles.svgLabel}>{`ORBIT ${o + 1}`}</text>
                ))}

                {[80, 110, 140, 170, 200].map((y) => (
                    <line key={y} x1={40} y1={y} x2={538} y2={y} className={styles.gridLine} />
                ))}
                <text x={8} y={84} className={styles.svgLabel}>100</text>
                <text x={8} y={204} className={styles.svgLabel}>60</text>

                <rect x={262} y={52} width={110} height={196} className={styles.safeBand} />
                <line x1={250} y1={52} x2={250} y2={248} className={styles.faultLine} />
                <text x={246} y={64} textAnchor="end" className={`${styles.svgLabel} ${styles.t_fault} ${styles.faultMark}`}>FAULT</text>
                <text x={268} y={64} className={`${styles.svgLabel} ${styles.t_orbit} ${styles.safeMark}`}>SAFE MODE</text>

                <path d="M 40 146 L 150 95 L 206 134 L 250 116 L 262 140 L 316 110 L 372 128 L 482 89 L 538 125" pathLength={1} className={styles.socTrace} />
                <path d="M 40 232 H 250 V 216 H 262 V 242 H 372 V 232 H 538" pathLength={1} className={styles.loadTrace} />
                <text x={540} y={226} textAnchor="end" className={styles.svgLabel}>LOAD</text>
                <text x={540} y={80} textAnchor="end" className={`${styles.svgLabel} ${styles.t_nominal}`}>SOC</text>
            </svg>
            <Readouts
                items={[
                    { label: 'Battery SOC', value: <Ticker values={['84 %', '86 %', '83 %', '88 %']} every={3500} /> },
                    { label: 'Loads', value: <Ticker values={['4.2 W', '4.4 W', '2.1 W', '4.3 W']} every={3500} /> },
                    {
                        label: 'Mode',
                        value: (
                            <span className={styles.stack}>
                                <span className={styles.modeNominal}>Nominal</span>
                                <span className={styles.modeFault}>Fault</span>
                                <span className={styles.modeSafe}>Safe mode</span>
                                <span className={styles.modeRecovered}>Recovered</span>
                            </span>
                        ),
                    },
                    { label: 'Decision', value: 'Shed loads' },
                ]}
            />
        </Live>
    );
}

/* ---------- Rocket Engineering: instrumented propulsion schematic ---------- */

export function RocketVisual() {
    return (
        <Live label="Propulsion schematic: propellant tanks feed a turbopump, chamber and nozzle; pressure, temperature and flow sensors report to the engine controller" className={styles.frame}>
            <svg viewBox="0 0 560 400" className={styles.svg}>
                <RocketEngineDrawing detail />
            </svg>
            <Readouts
                items={[
                    { label: 'Chamber Pc', value: <Ticker values={['3.2 MPa', '3.3 MPa', '3.2 MPa']} /> },
                    { label: 'Wall Tw', value: <Ticker values={['612 K', '618 K', '615 K']} every={5200} /> },
                    { label: 'Flow ṁ', value: <Ticker values={['1.62 kg/s', '1.64 kg/s']} every={4800} /> },
                    { label: 'Controller', value: 'Mainstage', tone: 'nominal' },
                ]}
                note="Illustrative values from a simplified model"
            />
        </Live>
    );
}

/* ---------- Space Station: slow orbital infrastructure ---------- */

export function StationVisual() {
    return (
        <Live label="Space-station wireframe on its orbit, with articulating solar arrays and communication links to a relay satellite and a ground station" className={styles.frame}>
            <svg viewBox="0 0 560 300" className={styles.svg}>
                <path d="M -20 262 Q 280 178 580 262" className={styles.orbitLine} />

                <path d="M 300 92 L 500 38" className={styles.wireThin} />
                <path d="M 300 92 L 500 38" className={styles.telemetryFlow} />
                <path d="M 330 150 Q 380 230 420 286" className={styles.wireThin} />
                <path d="M 330 150 Q 380 230 420 286" className={`${styles.telemetryFlow} ${styles.reverse}`} />
                <rect x={494} y={30} width={12} height={12} rx={2} className={styles.satBody} />
                <line x1={482} y1={36} x2={518} y2={36} className={styles.wireStrongThin} />
                <path d="M 410 292 L 430 292 L 420 278 Z" className={styles.groundStation} />

                {[
                    [120, 60],
                    [120, 140],
                    [390, 60],
                    [390, 140],
                ].map(([x, y], i) => (
                    <g key={i} className={styles.stationArray} style={{ transformOrigin: `${x + 25}px 130px`, ...v(i) }}>
                        <rect x={x} y={y} width={50} height={60} className={styles.arrayBlock} />
                        <line x1={x + 25} y1={y} x2={x + 25} y2={y + 60} className={styles.arrayGrid} />
                        <line x1={x} y1={y + 30} x2={x + 50} y2={y + 30} className={styles.arrayGrid} />
                    </g>
                ))}

                <rect x={110} y={126} width={340} height={8} className={styles.truss} />
                {Array.from({ length: 17 }, (_, i) => (
                    <line key={i} x1={110 + i * 20} y1={126} x2={120 + i * 20} y2={134} className={styles.trussLine} />
                ))}

                <rect x={268} y={66} width={24} height={128} rx={8} className={styles.module} />
                <rect x={222} y={146} width={46} height={20} rx={8} className={styles.module} />
                <rect x={292} y={146} width={46} height={20} rx={8} className={styles.module} />
                <circle cx={280} cy={98} r={14} className={styles.module} />
                <rect x={234} y={92} width={20} height={30} className={styles.radiator} />
                <rect x={306} y={92} width={20} height={30} className={styles.radiator} />

                {[150, 220, 340, 410].map((x, i) => (
                    <circle key={x} cx={x} cy={130} r={3} className={styles.node} style={v(i)} />
                ))}

                <text x={500} y={22} textAnchor="middle" className={styles.svgLabel}>RELAY</text>
                <text x={440} y={290} className={styles.svgLabel}>GROUND</text>
            </svg>
            <Readouts
                items={[
                    { label: 'Arrays', value: 'Sun-tracking', tone: 'solar' },
                    { label: 'Power bus', value: <Ticker values={['84 kW', '86 kW', '85 kW']} every={5600} /> },
                    { label: 'Links', value: '2 active', tone: 'telemetry' },
                    { label: 'Status', value: 'Concept study' },
                ]}
                note="Concept visual · illustrative values"
            />
        </Live>
    );
}

/* ---------- Aerospace: eVTOL health and usage monitoring ---------- */

const HUMS = [
    { label: 'Propulsion health', value: 'Nominal', pct: 96 },
    { label: 'Battery health', value: 'SOH 94 %', pct: 94 },
    { label: 'Avionics', value: 'Nominal', pct: 99 },
    { label: 'Network', value: 'Secured', pct: 100 },
    { label: 'Telemetry', value: 'Linked', pct: 98 },
];

export function AerospaceVisual() {
    return (
        <Live label="eVTOL wireframe with rotor, battery and avionics sensor nodes, a monitored network boundary and a telemetry link, beside a health-monitoring summary" className={styles.frame}>
            <svg viewBox="0 0 560 400" className={styles.svg}>
                <EvtolDrawing detail />
            </svg>
            <div className={styles.readoutArea}>
                <ul className={styles.hums}>
                    {HUMS.map((h, i) => (
                        <li key={h.label}>
                            <span className="label">{h.label}</span>
                            <span className={styles.humsValue}>
                                <span className={`${styles.dot} state-nominal`} aria-hidden="true" />
                                {h.value}
                            </span>
                            <span className={styles.meter}>
                                <i style={{ width: `${h.pct}%`, ...v(i) }} />
                            </span>
                        </li>
                    ))}
                </ul>
                <p className={styles.note}>HUMS-style summary · simulated values</p>
            </div>
        </Live>
    );
}

/* ---------- Aerospace Quality Intelligence: drawing → evidence → acceptance ---------- */

const AQIP_STAGES = ['Drawing', 'Characteristic', 'Inspection', 'Measurement', 'Validation', 'Evidence', 'Acceptance'];

const CHARACTERISTICS = [
    ['1', 'Bore Ø', '8.00 ± 0.05', '8.02'],
    ['2', 'Length', '42.0 ± 0.1', '41.96'],
    ['3', 'Hole pitch', '24.0 ± 0.1', '24.04'],
    ['4', 'Flatness', '0.05', '0.03'],
] as const;

export function AqipVisual() {
    return (
        <Live label="Inspection workflow: an engineering drawing’s ballooned characteristics are extracted into an inspection record, measured, validated against tolerance and packaged as acceptance evidence" className={`${styles.frame} ${styles.aqip}`}>
            <ol className={styles.stages}>
                {AQIP_STAGES.map((stage, i) => (
                    <li key={stage} style={v(i)}>
                        <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                        {stage}
                    </li>
                ))}
            </ol>

            <div className={styles.aqipBody}>
                <svg viewBox="0 0 300 220" className={styles.svg}>
                    <path d="M 40 60 H 220 V 110 H 260 V 170 H 40 Z" className={styles.part} />
                    <circle cx={92} cy={115} r={14} className={styles.part} />
                    <circle cx={156} cy={115} r={14} className={styles.part} />
                    <line x1={40} y1={196} x2={260} y2={196} className={styles.dim} />
                    <line x1={40} y1={176} x2={40} y2={204} className={styles.dimThin} />
                    <line x1={260} y1={176} x2={260} y2={204} className={styles.dimThin} />
                    <line x1={92} y1={36} x2={156} y2={36} className={styles.dim} />
                    <line x1={92} y1={30} x2={92} y2={100} className={styles.dimThin} />
                    <line x1={156} y1={30} x2={156} y2={100} className={styles.dimThin} />
                    <line x1={106} y1={101} x2={122} y2={85} className={styles.dimThin} />
                    <line x1={220} y1={60} x2={278} y2={40} className={styles.dimThin} />
                    {[
                        [130, 76],
                        [150, 196],
                        [124, 36],
                        [282, 40],
                    ].map(([x, y], i) => (
                        <g key={i} className={styles.balloon} style={v(i)}>
                            <circle cx={x} cy={y} r={9} />
                            <text x={x} y={y + 3.5} textAnchor="middle">{i + 1}</text>
                        </g>
                    ))}
                </svg>

                <div className={styles.record}>
                    <table className={styles.recordTable}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Characteristic</th>
                                <th>Nominal</th>
                                <th>Measured</th>
                                <th>Result</th>
                            </tr>
                        </thead>
                        <tbody>
                            {CHARACTERISTICS.map(([n, name, nominal, measured], i) => (
                                <tr key={n} style={v(i)}>
                                    <td>{n}</td>
                                    <td>{name}</td>
                                    <td className="tabular">{nominal}</td>
                                    <td className={`tabular ${styles.measured}`}>{measured}</td>
                                    <td className={styles.result}>Pass</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className={styles.evidence}>
                        <span className="label">Evidence package</span>
                        <span className={styles.stamp}>Accepted</span>
                    </div>
                </div>
            </div>
            <p className={styles.note}>Illustrative part and values</p>
        </Live>
    );
}
