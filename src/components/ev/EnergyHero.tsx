import type { CSSProperties } from 'react';
import styles from './EnergyHero.module.css';
import vs from './visuals.module.css';
import Live, { Ticker } from './Live';
import FlowSteps from './FlowSteps';
import { Readouts } from './space-visuals';

/**
 * Hero: an energy intelligence system, energy source → battery pack → BMS → telemetry →
 * diagnostics → decision, drawn as a two-row loop. Phones get a three-step vertical flow instead
 * of the shrunken diagram. Values are simulated and change slowly.
 */

const W = 160;
const H = 112;

const NODES = [
    { x: 16, y: 24, label: 'ENERGY SOURCE' },
    { x: 240, y: 24, label: 'BATTERY PACK' },
    { x: 464, y: 24, label: 'BMS' },
    { x: 464, y: 224, label: 'TELEMETRY' },
    { x: 240, y: 224, label: 'DIAGNOSTICS' },
    { x: 16, y: 224, label: 'DECISION' },
];

// Energy path along the top row, information path back along the bottom row.
const LINKS = [
    { d: 'M 176 80 H 236', head: 'M 236 75 L 242 80 L 236 85 Z', kind: 'energy' },
    { d: 'M 400 80 H 460', head: 'M 460 75 L 466 80 L 460 85 Z', kind: 'energy' },
    { d: 'M 544 136 V 220', head: 'M 539 220 L 544 226 L 549 220 Z', kind: 'data' },
    { d: 'M 464 280 H 404', head: 'M 404 275 L 398 280 L 404 285 Z', kind: 'data' },
    { d: 'M 240 280 H 180', head: 'M 180 275 L 174 280 L 180 285 Z', kind: 'data' },
] as const;

const BARS = [22, 30, 18, 34, 26, 20, 28];

const v = (i: number) => ({ ['--i' as string]: i }) as CSSProperties;

const pack = <Ticker values={['386.4 V', '386.5 V', '386.6 V', '386.5 V']} every={5200} />;
const soc = <Ticker values={['78.4 %', '78.5 %', '78.6 %', '78.7 %']} every={6000} />;
const temp = <Ticker values={['31.6 °C', '31.7 °C', '31.7 °C', '31.6 °C']} every={5600} />;

export default function EnergyHero() {
    return (
        <Live
            label="Energy intelligence system: energy from a charger flows into the battery pack and BMS; telemetry feeds diagnostics, which decide the pack's risk is low. Simulated values."
            className={styles.stage}
        >
            <div className={styles.hud}>
                <span>Energy intelligence system</span>
                <span>Simulated</span>
            </div>

            <svg viewBox="0 0 640 360" className={`${styles.svg} ${vs.wideOnly}`}>
                {LINKS.map((link) => (
                    <g key={link.d} className={link.kind === 'energy' ? styles.energy : styles.data}>
                        <path d={link.d} className={styles.track} />
                        <path d={link.d} className={styles.flow} />
                        <path d={link.head} className={styles.head} />
                    </g>
                ))}

                {NODES.map((node, i) => (
                    <g key={node.label}>
                        <rect x={node.x} y={node.y} width={W} height={H} rx={10} className={styles.node} style={v(i)} />
                        <text x={node.x + 14} y={node.y + 24} className={styles.nodeLabel}>{node.label}</text>
                        <text x={node.x + W - 14} y={node.y + 24} textAnchor="end" className={styles.nodeIndex}>{String(i + 1).padStart(2, '0')}</text>
                    </g>
                ))}

                {/* 01 Energy source */}
                <path d="M 46 68 L 36 94 H 46 L 40 116 L 58 86 H 48 L 54 68 Z" className={styles.bolt} />
                <text x={74} y={88} className={styles.small}>AC CHARGING</text>
                <text x={74} y={110} className={styles.value}>11.0 kW</text>

                {/* 02 Battery pack: modules with a drifting thermal tint, SOC bar */}
                {Array.from({ length: 8 }, (_, m) => (
                    <g key={m}>
                        <rect x={256 + (m % 4) * 33} y={66 + Math.floor(m / 4) * 24} width={28} height={18} rx={2} className={styles.module} />
                        <rect x={256 + (m % 4) * 33} y={66 + Math.floor(m / 4) * 24} width={28} height={18} rx={2} className={styles.thermal} style={v(m)} />
                    </g>
                ))}
                <rect x={256} y={118} width={128} height={5} rx={2.5} className={styles.socTrack} />
                <rect x={256} y={118} width={100.4} height={5} rx={2.5} className={styles.socFill} />

                {/* 03 BMS */}
                <rect x={482} y={70} width={34} height={34} rx={4} className={styles.chip} />
                <rect x={492} y={80} width={14} height={14} rx={2} className={styles.chipCore} />
                {[78, 87, 96].map((y) => (
                    <path key={y} d={`M 476 ${y} H 482 M 516 ${y} H 522`} className={styles.pin} />
                ))}
                <circle cx={534} cy={83} r={3.5} className={styles.ok} />
                <text x={542} y={87} className={`${styles.small} ${styles.t_nominal}`}>ONLINE</text>
                <text x={530} y={107} className={styles.small}>BALANCING</text>

                {/* 04 Telemetry */}
                <path d="M 478 294 q 10 -18 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 12 0" pathLength={1} className={styles.wave} />
                <text x={478} y={324} className={styles.small}>CAN · 500 kbit/s</text>

                {/* 05 Diagnostics */}
                {BARS.map((h, j) => (
                    <rect key={j} x={256 + j * 18} y={314 - h} width={10} height={h} className={styles.bar} style={v(j)} />
                ))}
                <text x={256} y={328} className={styles.small}>ANOMALY SCAN</text>

                {/* 06 Decision */}
                <text x={32} y={280} className={styles.small}>RISK</text>
                <text x={32} y={308} className={styles.decision}>LOW</text>
                <text x={32} y={326} className={styles.small}>CONTINUE CHARGING</text>
            </svg>

            <FlowSteps
                className={vs.narrowOnly}
                steps={[
                    { name: 'Battery pack', detail: <>PACK {pack} · SOC {soc}</>, tone: 'solar' },
                    { name: 'BMS', detail: <>TEMP {temp} · Balancing</>, tone: 'telemetry' },
                    { name: 'Health', detail: 'Risk low', tone: 'nominal' },
                ]}
            />

            <div className={vs.wideOnly}>
                <Readouts
                    note=""
                    items={[
                        { label: 'Pack', value: pack },
                        { label: 'SOC', value: soc },
                        { label: 'SOH', value: '94.2 %' },
                        { label: 'Temp', value: temp },
                        { label: 'CAN', value: 'Healthy', tone: 'nominal' },
                        { label: 'Risk', value: 'Low', tone: 'nominal' },
                        { label: 'Telemetry', value: 'Active', tone: 'telemetry' },
                    ]}
                />
            </div>
        </Live>
    );
}
