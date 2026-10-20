import styles from './SignalWave.module.css';

/** Ground station ↔ spacecraft link with telemetry packets in flight. Decorative; CSS-only motion. */
export default function SignalWave() {
    return (
        <figure className={styles.figure} aria-hidden="true">
            <svg viewBox="0 0 520 320" className={styles.svg}>
                <path d="M 0 300 Q 260 250 520 300" className={styles.horizon} />

                {/* Ground station */}
                <path d="M 78 286 L 98 286 L 88 268 Z" className={styles.station} />
                <path d="M 72 262 Q 88 240 104 262" className={styles.dish} />

                {/* Link: dashed arc with packets travelling both ways */}
                <path id="sw-link" d="M 92 252 Q 230 80 420 92" className={styles.track} />
                <path d="M 92 252 Q 230 80 420 92" className={`${styles.packets} ${styles.up}`} />
                <path d="M 92 252 Q 230 80 420 92" className={`${styles.packets} ${styles.down}`} />

                {/* Telemetry wave near the spacecraft */}
                <path d="M 300 150 q 10 -16 20 0 t 20 0 t 20 0 t 20 0 t 20 0" className={styles.wave} />

                {/* Spacecraft */}
                <g transform="translate(436 84) rotate(-18)">
                    <rect x="-46" y="-8" width="30" height="16" className={styles.panel} />
                    <rect x="16" y="-8" width="30" height="16" className={styles.panel} />
                    <rect x="-12" y="-14" width="24" height="28" rx="3" className={styles.body} />
                </g>
            </svg>
            <figcaption className={styles.caption}>
                <span className={styles.dot} />
                Link · nominal
            </figcaption>
        </figure>
    );
}
