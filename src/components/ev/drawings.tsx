import type { CSSProperties } from 'react';
import styles from './drawings.module.css';

/**
 * Wireframe engineering models drawn in a shared 560 × 400 space: rocket engine and eVTOL,
 * used with labels by the research sections. Motion is CSS-only and is held or removed by the surrounding <Live> frame.
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
