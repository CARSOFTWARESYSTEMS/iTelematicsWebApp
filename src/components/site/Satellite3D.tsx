"use client";
import { useState } from 'react';
import styles from './Satellite3D.module.css';

const BOARDS = ['Payload', 'Radio', 'ADCS', 'OBC', 'EPS'];

/**
 * Pseudo-3D 6U spacecraft built from CSS 3D transforms (no WebGL, no image assets).
 * "hero": rotating spacecraft cycling through sunlight and eclipse.
 * "open": exploded bus showing the internal subsystem stack, for the Interactive 3D promotion.
 * Motion pauses on demand and is disabled entirely under prefers-reduced-motion.
 */
export default function Satellite3D({ variant = 'hero', label }: { variant?: 'hero' | 'open'; label: string }) {
    const [paused, setPaused] = useState(false);

    return (
        <div className={`${styles.stage} ${styles[variant]} ${paused ? styles.paused : ''}`}>
            <div className={styles.scene} role="img" aria-label={label}>
                <div className={styles.sunGlow} aria-hidden="true" />
                <div className={styles.earth} aria-hidden="true" />
                <div className={styles.orbit} aria-hidden="true" />

                <div className={styles.sat} aria-hidden="true">
                    <div className={styles.bus}>
                        <div className={`${styles.face} ${styles.front}`}>
                            <span className={styles.aperture} />
                        </div>
                        <div className={`${styles.face} ${styles.back}`} />
                        <div className={`${styles.face} ${styles.side} ${styles.right}`} />
                        <div className={`${styles.face} ${styles.side} ${styles.left}`} />
                        <div className={`${styles.face} ${styles.cap} ${styles.top}`} />
                        <div className={`${styles.face} ${styles.cap} ${styles.bottom}`} />
                        {variant === 'open' &&
                            BOARDS.map((board, i) => (
                                <div key={board} className={`${styles.board} ${board === 'EPS' ? styles.boardEps : ''}`} style={{ ['--i' as string]: i }} />
                            ))}
                    </div>

                    <div className={styles.antenna} />

                    {(['left', 'right'] as const).map((side) => (
                        <div key={side} className={`${styles.wing} ${styles[`wing_${side}`]}`}>
                            <div className={styles.cells}>
                                <span className={styles.sheen} />
                            </div>
                            <div className={styles.wingBack} />
                            <span className={styles.hinge} />
                        </div>
                    ))}
                </div>

                <span className={styles.pulse} aria-hidden="true" />
                <div className={styles.shade} aria-hidden="true" />
            </div>

            <div className={styles.footer}>
                {variant === 'hero' ? (
                    <p className={styles.state}>
                        <span className={styles.stateSun}>Sunlight · arrays generating</span>
                        <span className={styles.stateEclipse}>Eclipse · battery supplying</span>
                    </p>
                ) : (
                    <p className={styles.state}>
                        <span className={styles.stateStatic}>{BOARDS.slice().reverse().join(' · ')}</span>
                    </p>
                )}
                <button
                    type="button"
                    className={styles.pause}
                    onClick={() => setPaused(!paused)}
                    aria-pressed={paused}
                    aria-label={paused ? 'Play animation' : 'Pause animation'}
                >
                    <span aria-hidden="true">{paused ? '▶' : '❚❚'}</span>
                </button>
            </div>
        </div>
    );
}
