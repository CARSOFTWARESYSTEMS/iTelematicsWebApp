"use client";
// Homepage hero visual: the conceptual research station (Station Reference Case SRC-1) in orbit,
// passing between sunlight and eclipse as the SRC-1 energy model says. A still image paints first
// (and stays as the fallback without WebGL or under reduced motion); the 3D scene fades in once
// loaded, animates only while on screen and playing, and can be paused.
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useNoWebGL, usePageVisible, usePresence, useReducedMotion, useStageQuality } from '@/components/space-twin/device';
import { StoryClock } from '@/lib/space-twin/story';
import { srcSampleAt } from '@/lib/station-twin/model';
import styles from './StationHero.module.css';

const StationHeroCanvas = dynamic(() => import('./StationHeroCanvas'), { ssr: false });

const POSTER = '/images/station-twin/hero-station-src1.jpg';
/** Nominal operations only: the first 28 story seconds of SRC-1 (sunlight, a full eclipse, sunrise). */
const HERO_STORY = {
    stages: [{ id: 'orbit', label: 'Orbit', title: 'Station in orbit', start: 0, seconds: 28 }],
    phases: [{ id: 'health', stage: 0, start: 0 }],
    loopSeconds: 28,
} as const;

export default function StationHero({ label }: { label: string }) {
    const reducedMotion = useReducedMotion();
    const quality = useStageQuality();
    const noWebGL = useNoWebGL();
    const pageVisible = usePageVisible();
    const frameRef = useRef<HTMLDivElement>(null);
    const { near, onScreen } = usePresence(frameRef);
    const clock = useMemo(() => new StoryClock(HERO_STORY, 0.5), []);
    const [paused, setPaused] = useState(false);
    const [ready, setReady] = useState(false);
    const [eclipse, setEclipse] = useState(false);

    useEffect(() => clock.onTick(() => setEclipse(srcSampleAt(clock.time).eclipse)), [clock]);

    // Reduced motion or no WebGL: the still image only.
    const live = near && quality !== null && !reducedMotion && !noWebGL;
    const playing = live && onScreen && pageVisible && !paused && ready;

    return (
        <div className={styles.stage}>
            <div ref={frameRef} className={styles.scene} data-ready={ready || undefined} role="img" aria-label={label}>
                <Image className={styles.poster} src={POSTER} alt="" fill priority sizes="(min-width: 1024px) 55vw, 100vw" />
                {live && (
                    <div className={styles.canvas} aria-hidden="true">
                        <StationHeroCanvas clock={clock} playing={playing} quality={quality} onReady={() => setReady(true)} />
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                <p className={styles.state}>
                    {eclipse ? <span className={styles.stateEclipse}>Eclipse · batteries supplying</span> : <span className={styles.stateSun}>Sunlight · arrays generating</span>}
                </p>
                {live && (
                    <button
                        type="button"
                        className={styles.pause}
                        onClick={() => setPaused(!paused)}
                        aria-pressed={paused}
                        aria-label={paused ? 'Play animation' : 'Pause animation'}
                        data-track="station_model_interaction"
                        data-track-name={paused ? 'Hero animation: play' : 'Hero animation: pause'}
                    >
                        <span aria-hidden="true">{paused ? '▶' : '❚❚'}</span>
                    </button>
                )}
            </div>
        </div>
    );
}
