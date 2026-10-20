import styles from './OrbitVisual.module.css';

// Schematic geometry (not to scale): orbit r = 160, Earth r = 122 around (230, 200).
// The eclipse arc spans ±49.6° about the anti-sun direction, where the orbit enters Earth's shadow.
const CX = 230;
const CY = 200;
const R_ORBIT = 160;
const R_EARTH = 122;
const ARC_X = 333.7;
const ARC_TOP = 78.1;
const ARC_BOTTOM = 321.9;

export default function OrbitVisual() {
    return (
        <figure className={styles.figure}>
            <svg viewBox="0 0 440 400" className={styles.svg} role="img" aria-labelledby="orbit-title">
                <title id="orbit-title">Schematic of a satellite orbit with a sunlit segment and an eclipse segment in Earth’s shadow</title>
                <defs>
                    <marker id="ray" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                        <path d="M0,0 L8,4 L0,8 z" fill="#FBBF24" />
                    </marker>
                    <linearGradient id="shadow" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0" stopColor="#A5B4FC" stopOpacity="0.16" />
                        <stop offset="1" stopColor="#A5B4FC" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {[150, 200, 250].map((y) => (
                    <line key={y} x1="10" y1={y} x2="62" y2={y} stroke="#FBBF24" strokeOpacity="0.8" strokeWidth="1.4" markerEnd="url(#ray)" />
                ))}
                <text x="10" y="132" className={styles.label} fill="#FBBF24">SUN</text>

                <rect x={CX} y={CY - R_EARTH} width={440 - CX} height={R_EARTH * 2} fill="url(#shadow)" />

                <circle cx={CX} cy={CY} r={R_ORBIT} fill="none" stroke="#22D3EE" strokeOpacity="0.55" strokeWidth="1.4" strokeDasharray="2 6" />
                <path d={`M ${ARC_X} ${ARC_TOP} A ${R_ORBIT} ${R_ORBIT} 0 0 1 ${ARC_X} ${ARC_BOTTOM}`} fill="none" stroke="#A5B4FC" strokeWidth="2.5" />

                <circle cx={CX} cy={CY} r={R_EARTH} fill="#0B1A2A" stroke="rgba(148,163,184,0.35)" />
                <ellipse cx={CX} cy={CY} rx={R_EARTH} ry="38" fill="none" stroke="rgba(148,163,184,0.12)" />
                <ellipse cx={CX} cy={CY} rx="46" ry={R_EARTH} fill="none" stroke="rgba(148,163,184,0.12)" />

                <g transform="translate(116.9 86.9) rotate(-45)">
                    <rect x="-16" y="-3" width="10" height="6" fill="rgba(59,130,246,0.35)" stroke="#3B82F6" />
                    <rect x="6" y="-3" width="10" height="6" fill="rgba(59,130,246,0.35)" stroke="#3B82F6" />
                    <rect x="-5" y="-5" width="10" height="10" rx="1.5" fill="#0B1520" stroke="#22D3EE" strokeWidth="1.4" />
                </g>

                <text x="40" y="42" className={styles.label} fill="#22D3EE">SUNLIGHT ≈ 61 min</text>
                <text x="436" y="40" textAnchor="end" className={styles.label} fill="#A5B4FC">ECLIPSE ≈ 35 min</text>
                <text x={CX} y={CY + 5} textAnchor="middle" className={styles.label} fill="#94A3B8">EARTH</text>
            </svg>

            <figcaption className={styles.readout}>
                <span className={styles.readoutTitle}>Reference case · simulated</span>
                <span className="mono"><span className="state-charging" aria-hidden="true">●</span> SOC 91 % · charging</span>
                <span className="mono"><span className="state-nominal" aria-hidden="true">●</span> Bus 5.01 V · nominal</span>
                <span className="mono"><span className="state-nominal" aria-hidden="true">●</span> Margin +20 % / orbit</span>
            </figcaption>
        </figure>
    );
}
