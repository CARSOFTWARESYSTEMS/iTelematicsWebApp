import type { CSSProperties } from 'react';
import styles from './drawings.module.css';

/**
 * Wireframe engineering models drawn in a shared 560 × 400 space: battery pack, satellite,
 * rocket engine and eVTOL. Used by the hero sequence and, with labels, by the research
 * sections. Motion is CSS-only and is held or removed by the surrounding <Live> frame.
 */

const v = (i: number) => ({ ['--i' as string]: i }) as CSSProperties;

function Label({ x, y, children, anchor = 'start', tone }: { x: number; y: number; children: string; anchor?: 'start' | 'middle' | 'end'; tone?: 'telemetry' | 'solar' | 'nominal' }) {
    return (
        <text x={x} y={y} textAnchor={anchor} className={`${styles.label} ${tone ? styles[`t_${tone}`] : ''}`}>
            {children}
        </text>
    );
}

function Sensor({ cx, cy, i, label, dx = 10, dy = -8, detail }: { cx: number; cy: number; i: number; label?: string; dx?: number; dy?: number; detail?: boolean }) {
    return (
        <g>
            <circle cx={cx} cy={cy} r={9} className={styles.sensorHalo} style={v(i)} />
            <circle cx={cx} cy={cy} r={3.5} className={styles.sensor} />
            {detail && label && <Label x={cx + dx} y={cy + dy} tone="telemetry">{label}</Label>}
        </g>
    );
}

/* ---------- Battery pack: cells → modules → pack → BMS ---------- */

const MODULES = Array.from({ length: 8 }, (_, i) => ({ i, x: 128 + (i % 4) * 80, y: i < 4 ? 112 : 200 }));

export function BatteryPackDrawing({ detail = false }: { detail?: boolean }) {
    return (
        <g>
            <rect x={110} y={96} width={340} height={196} rx={10} className={styles.enclosure} />
            {MODULES.map((m) => (
                <rect key={m.i} x={m.x} y={m.y} width={70} height={80} rx={4} className={styles.module} />
            ))}

            {/* Series current path through the modules */}
            <path d="M 102 152 H 444 V 240 H 102" className={styles.current} />

            {MODULES.map((m) =>
                Array.from({ length: 12 }, (_, c) => (
                    <circle key={`${m.i}-${c}`} cx={m.x + 17 + (c % 3) * 18} cy={m.y + 14 + Math.floor(c / 3) * 17.5} r={6.5} className={styles.cell} />
                )),
            )}

            {/* Thermal zones drifting across modules */}
            {MODULES.map((m) => (
                <rect key={`t${m.i}`} x={m.x} y={m.y} width={70} height={80} rx={4} className={styles.thermal} style={v(m.i)} />
            ))}

            {/* Anomaly scan sweeping the cell array */}
            <rect x={118} y={104} width={2} height={180} className={styles.scan} />

            {/* HV terminals */}
            <rect x={78} y={142} width={24} height={20} rx={3} className={styles.terminal} />
            <rect x={78} y={230} width={24} height={20} rx={3} className={styles.terminal} />

            {/* BMS with sense harness and cell-voltage bars */}
            {[170, 190, 210, 230].map((y, i) => (
                <g key={y}>
                    <line x1={450} y1={y} x2={474} y2={y} className={styles.harness} />
                    <line x1={450} y1={y} x2={474} y2={y} className={styles.packet} style={v(i)} />
                </g>
            ))}
            <rect x={474} y={146} width={64} height={104} rx={6} className={styles.box} />
            {Array.from({ length: 8 }, (_, i) => (
                <rect key={i} x={484 + i * 6} y={186} width={3.5} height={30} className={styles.bar} style={v(i)} />
            ))}
            <circle cx={490} cy={234} r={3.5} className={styles.ok} />

            <Label x={506} y={170} anchor="middle">BMS</Label>
            {detail && (
                <>
                    <Label x={110} y={84}>PACK · 8 MODULES · 96 CELLS</Label>
                    <Label x={74} y={134}>HV+</Label>
                    <Label x={74} y={268}>HV−</Label>
                    <Label x={500} y={238} tone="nominal">ONLINE</Label>
                    <Label x={450} y={316} anchor="end" tone="telemetry">ANOMALY SCAN</Label>
                </>
            )}
        </g>
    );
}

/* ---------- Satellite: sunlight → arrays → EPS → battery → payload → downlink ---------- */

const ARRAY_CELLS = Array.from({ length: 7 }, (_, i) => i + 1);

export function SatelliteDrawing({ detail = false }: { detail?: boolean }) {
    return (
        <g className={styles.satCycle}>
            <path d="M -20 412 Q 280 300 580 412" className={styles.limb} />

            <g className={styles.sunlit}>
                {[48, 68, 88].map((y) => (
                    <g key={y} className={styles.ray}>
                        <line x1={22} y1={y} x2={66} y2={y + 14} />
                        <path d={`M 66 ${y + 9} L 74 ${y + 16.5} L 63 ${y + 18} Z`} />
                    </g>
                ))}
            </g>

            {[96, 328].map((x) => (
                <g key={x}>
                    <rect x={x} y={150} width={136} height={64} className={styles.panel} />
                    {ARRAY_CELLS.map((c) => (
                        <line key={c} x1={x + c * 17} y1={150} x2={x + c * 17} y2={214} className={styles.panelGrid} />
                    ))}
                    <line x1={x} y1={182} x2={x + 136} y2={182} className={styles.panelGrid} />
                    <rect x={x} y={150} width={136} height={64} className={`${styles.sheen} ${styles.sunlit}`} />
                </g>
            ))}
            <line x1={232} y1={182} x2={250} y2={182} className={styles.wireStrong} />
            <line x1={310} y1={182} x2={328} y2={182} className={styles.wireStrong} />

            {/* Generated power flowing to the bus */}
            <path d="M 170 182 H 250" className={`${styles.power} ${styles.sunlit}`} />
            <path d="M 390 182 H 310" className={`${styles.power} ${styles.sunlit}`} />

            <rect x={250} y={134} width={60} height={96} rx={4} className={styles.body} />
            {[158, 182, 206].map((y) => (
                <line key={y} x1={256} y1={y} x2={304} y2={y} className={styles.slot} />
            ))}
            <rect x={256} y={186} width={48} height={16} rx={2} className={styles.batterySlot} />

            <line x1={280} y1={230} x2={280} y2={252} className={styles.wireStrong} />
            <path d="M 270 258 Q 280 248 290 258" className={styles.wireStrong} />

            <path d="M 284 262 Q 400 300 470 336" className={styles.link} />
            <path d="M 284 262 Q 400 300 470 336" className={styles.linkPackets} />
            <path d="M 470 352 L 490 352 L 480 336 Z" className={styles.station} />

            <rect x={0} y={0} width={560} height={400} className={styles.eclipseTint} />

            {detail && (
                <>
                    <Label x={22} y={36} tone="solar">SUN</Label>
                    <Label x={164} y={234} anchor="middle">SOLAR ARRAY</Label>
                    <Label x={396} y={234} anchor="middle">SOLAR ARRAY</Label>
                    <Label x={280} y={124} anchor="middle">EPS · BATTERY · OBC</Label>
                    <Label x={430} y={300} tone="telemetry">DOWNLINK</Label>
                    <Label x={500} y={350}>GROUND</Label>
                </>
            )}
        </g>
    );
}

/* ---------- Rocket engine: tanks → feed → turbopump → chamber → nozzle, instrumented ---------- */

const ENGINE = 'M 248 234 H 312 V 278 C 312 292 300 298 294 306 C 304 330 330 356 346 384 H 214 C 230 356 256 330 266 306 C 260 298 248 292 248 278 Z';

export function RocketEngineDrawing({ detail = false }: { detail?: boolean }) {
    return (
        <g>
            <rect x={150} y={36} width={96} height={112} rx={44} className={styles.tank} />
            <rect x={314} y={36} width={96} height={112} rx={44} className={styles.tank} />
            <line x1={160} y1={74} x2={236} y2={74} className={styles.level} />
            <line x1={324} y1={80} x2={400} y2={80} className={styles.level} />

            <path d="M 198 148 V 176 H 258" className={styles.line} />
            <path d="M 362 148 V 176 H 302" className={styles.line} />
            <path d="M 198 148 V 176 H 258" className={styles.flow} />
            <path d="M 362 148 V 176 H 302" className={styles.flow} />

            <circle cx={280} cy={184} r={22} className={styles.box} />
            <g className={styles.impeller}>
                {[0, 90, 180, 270].map((a) => (
                    <path key={a} d="M 280 184 q 7 -9 2 -17" transform={`rotate(${a} 280 184)`} className={styles.blade} />
                ))}
            </g>
            <path d="M 280 206 V 232" className={styles.line} />
            <path d="M 280 206 V 232" className={styles.flow} />

            <line x1={244} y1={234} x2={316} y2={234} className={styles.wireStrong} />
            <path d={ENGINE} className={styles.engine} />
            <ellipse cx={280} cy={262} rx={24} ry={18} className={styles.combustion} />
            {['M 280 312 V 376', 'M 274 312 L 254 376', 'M 286 312 L 306 376'].map((d) => (
                <path key={d} d={d} className={styles.exhaust} />
            ))}

            <rect x={440} y={212} width={96} height={72} rx={6} className={styles.box} />
            <path d="M 334 176 H 420 V 230 H 440" className={styles.harness} />
            <path d="M 312 256 H 440" className={styles.harness} />
            <path d="M 330 352 H 420 V 268 H 440" className={styles.harness} />
            <path d="M 312 256 H 440" className={styles.packetLong} />
            <path d="M 334 176 H 420 V 230 H 440" className={styles.packetLong} style={v(1)} />

            <Sensor cx={226} cy={176} i={0} label="F1" dy={-10} detail={detail} />
            <Sensor cx={334} cy={176} i={1} label="F2" dy={20} detail={detail} />
            <Sensor cx={302} cy={184} i={2} label="N" dx={8} dy={-12} detail={detail} />
            <Sensor cx={312} cy={256} i={3} label="Pc" dy={-10} detail={detail} />
            <Sensor cx={330} cy={352} i={4} label="Tw" dy={20} detail={detail} />

            <Label x={488} y={244} anchor="middle">CTRL</Label>
            <Label x={488} y={262} anchor="middle" tone="nominal">MAINSTAGE</Label>
            {detail && (
                <>
                    <Label x={198} y={98} anchor="middle">OX</Label>
                    <Label x={362} y={98} anchor="middle">FUEL</Label>
                    <Label x={232} y={196} anchor="end">TURBOPUMP</Label>
                    <Label x={240} y={262} anchor="end">CHAMBER</Label>
                    <Label x={210} y={378} anchor="end">NOZZLE</Label>
                </>
            )}
        </g>
    );
}

/* ---------- eVTOL: rotors, battery, avionics and a monitored network boundary ---------- */

const ROTORS = [
    [206, 118],
    [414, 118],
    [206, 282],
    [414, 282],
] as const;

export function EvtolDrawing({ detail = false }: { detail?: boolean }) {
    return (
        <g>
            <rect x={108} y={52} width={364} height={298} rx={18} className={styles.boundary} />

            <path d="M 290 64 H 322 L 326 336 H 286 Z" className={styles.wing} />
            <line x1={196} y1={118} x2={424} y2={118} className={styles.wireStrong} />
            <line x1={196} y1={282} x2={424} y2={282} className={styles.wireStrong} />
            <path
                d="M 132 200 C 150 182 250 176 360 180 C 410 182 440 192 448 200 C 440 208 410 218 360 220 C 250 224 150 218 132 200 Z"
                className={styles.fuselage}
            />
            <path d="M 152 196 L 118 168 M 152 204 L 118 232" className={styles.wireStrong} />
            <rect x={262} y={191} width={56} height={18} rx={3} className={styles.batterySlot} />

            {ROTORS.map(([x, y], i) => (
                <g key={i}>
                    <circle cx={x} cy={y} r={30} className={styles.rotorDisc} />
                    <g className={styles.rotor} style={{ transformOrigin: `${x}px ${y}px`, ...v(i) }}>
                        <line x1={x - 26} y1={y} x2={x + 26} y2={y} />
                        <line x1={x} y1={y - 26} x2={x} y2={y + 26} />
                    </g>
                    <Sensor cx={x} cy={y} i={i} />
                </g>
            ))}

            <Sensor cx={420} cy={200} i={4} />
            <path d="M 432 206 Q 494 262 498 336" className={styles.link} />
            <path d="M 432 206 Q 494 262 498 336" className={styles.linkPackets} />
            <path d="M 488 352 L 508 352 L 498 336 Z" className={styles.station} />

            {detail && (
                <>
                    <Label x={108} y={40}>MONITORED NETWORK BOUNDARY</Label>
                    <Label x={290} y={184} anchor="middle" tone="solar">BATTERY</Label>
                    <Label x={420} y={232} anchor="middle" tone="telemetry">AVIONICS</Label>
                    <Label x={206} y={164} anchor="middle">PROPULSION</Label>
                    <Label x={520} y={376} anchor="end">GROUND · TELEMETRY</Label>
                </>
            )}
        </g>
    );
}
