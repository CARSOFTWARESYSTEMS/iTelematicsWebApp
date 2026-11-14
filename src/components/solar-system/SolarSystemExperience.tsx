"use client";
// Solar System — From Earth Launch to Deep Space Exploration: the sixth Space Digital Twin option.
// A guided mission, not a free simulator: the visitor starts the mission (or picks a stage or an
// action label) and the experience moves the camera, runs the modelled event, explains it and shows
// the readings of that moment. Everything shown derives from the flight simulation and spacecraft
// model in lib/solar-system. Phase A: from the launch pad to Earth departure and deployment.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useNoWebGL, usePageVisible, usePresence, useReducedMotion, useStageQuality } from '@/components/space-twin/device';
import { MissionClock } from '@/lib/solar-system/clock';
import { compression, DATA_LABEL, DESCRIPTION, formatMet, mission, reading, SIGNATURE, SUBTITLE, SUPPORT, TITLE, type Segment, type TKey } from '@/lib/solar-system/mission';
import styles from './SolarSystemExperience.module.css';

const SolarCanvas = dynamic(() => import('./SolarCanvas'), { ssr: false });
const POSTER = '/images/space-twin/poster-solar-system.jpg';

type Mode = { kind: 'intro' } | { kind: 'chapter'; c: number; guided: boolean } | { kind: 'label'; c: number; l: number };

const TONE: Record<string, string> = { nominal: 'state-nominal', solar: 'state-solar', fault: 'state-fault', telemetry: 'state-telemetry' };

const LABELS_3D = [
    { id: 'solar-vehicle', text: 'Upper stage, kick stage and spacecraft (marker enlarged)' },
    { id: 'deploy-craft', text: 'Spacecraft RSC-1' },
    { id: 'helio-sun', text: 'Sun (×25)' },
    { id: 'helio-earth', text: 'Earth at departure (×2,500)' },
    { id: 'helio-jupiter', text: 'Jupiter at departure (×250)' },
    { id: 'helio-arrival', text: 'Meets Jupiter’s orbit after 2.7 years' },
];

function scaleText(seg: Segment) {
    if (seg.scene === 'helio') return 'Scientific scale: orbits to scale · Sun ×25, Earth ×2,500, Jupiter ×250 to be visible';
    if (seg.scene === 'intro') return 'Cinematic Scale — Not to Scale';
    const c = compression(seg);
    const time = c === 0 ? 'Held moment' : c <= 1.25 ? 'Real time' : `Time ×${c < 20 ? c.toFixed(1) : Math.round(c).toLocaleString('en-GB')}`;
    if (seg.scene === 'orbit' || seg.scene === 'departure') return `${time} · Earth and orbits to scale`;
    return `${time} · vehicle and Earth to scale`;
}

export default function SolarSystemExperience() {
    const reducedMotion = useReducedMotion();
    const quality = useStageQuality();
    const noWebGL = useNoWebGL();
    const pageVisible = usePageVisible();
    const frameRef = useRef<HTMLDivElement>(null);
    const { near, onScreen } = usePresence(frameRef);
    const { chapters, intro } = mission();

    const [mode, setMode] = useState<Mode>({ kind: 'intro' });
    const [stagesOpen, setStagesOpen] = useState(false);
    const [paused, setPaused] = useState<boolean | null>(null);
    const [ready, setReady] = useState(false);
    const [, setTick] = useState(0);

    const chapter = mode.kind === 'intro' ? null : chapters[mode.c];
    const label = mode.kind === 'label' ? chapters[mode.c].labels[mode.l] : null;
    const program = mode.kind === 'intro' ? intro : label ? label.segments : chapter!.segments;
    const programKey = mode.kind === 'intro' ? 'intro' : mode.kind === 'label' ? `l-${mode.c}-${mode.l}` : `c-${mode.c}`;
    const clock = useMemo(() => new MissionClock(program), [programKey]);

    const autoplay = !(paused ?? reducedMotion);
    const playing = near && onScreen && pageVisible && autoplay && ready;

    // The guided mission moves on to the next chapter a moment after each one ends.
    const advance = useCallback(() => {
        setMode((m) => (m.kind === 'chapter' && m.guided && m.c + 1 < chapters.length ? { kind: 'chapter', c: m.c + 1, guided: true } : m));
    }, [chapters.length]);
    useEffect(() => {
        let timer: number | undefined;
        const off = clock.onTick(() => {
            setTick((n) => n + 1);
            if (clock.done && timer === undefined && mode.kind === 'chapter' && mode.guided) timer = window.setTimeout(advance, 1500);
        });
        return () => {
            off();
            if (timer !== undefined) window.clearTimeout(timer);
        };
    }, [clock, mode, advance]);

    const go = (next: Mode) => {
        setMode(next);
        if (paused) setPaused(null);
    };
    const start = () => {
        setStagesOpen(false);
        go({ kind: 'chapter', c: 0, guided: true });
    };
    const openChapter = (c: number) => go({ kind: 'chapter', c, guided: false });
    const openLabel = (c: number, l: number) => go({ kind: 'label', c, l });
    const step = (delta: 1 | -1) => {
        if (mode.kind === 'intro') return delta > 0 ? openChapter(0) : undefined;
        if (mode.kind === 'label') {
            const n = chapters[mode.c].labels.length;
            return openLabel(mode.c, (mode.l + delta + n) % n);
        }
        const c = mode.c + delta;
        if (c < 0) return go({ kind: 'intro' });
        if (c < chapters.length) go({ kind: 'chapter', c, guided: mode.guided });
    };
    const back = () => {
        if (mode.kind === 'label') return openChapter(mode.c);
        setStagesOpen(false);
        go({ kind: 'intro' });
    };

    const loc = clock.location;
    const met = loc.met;
    const telemetryKeys: readonly TKey[] = label ? label.telemetry : chapter ? chapter.telemetry : [];
    const readings = telemetryKeys.map((k) => reading(k, met));
    const chosen = stagesOpen ? 'stages' : mode.kind === 'chapter' && mode.guided ? 'start' : mode.kind === 'intro' ? null : 'stages';
    const live = near && quality !== null && !noWebGL;
    const caption = mode.kind === 'intro' ? 'Opening' : `${chapter!.number} / ${String(chapters.length).padStart(2, '0')}${label ? ` · ${chapter!.short}` : ''}`;
    const title = label ? label.title : chapter ? chapter.title : TITLE;
    const nextLabel = mode.kind === 'label' ? chapters[mode.c].labels[(mode.l + 1) % chapters[mode.c].labels.length] : null;
    const nextChapter = mode.kind !== 'intro' && mode.c + 1 < chapters.length ? chapters[mode.c + 1] : null;

    return (
        <div className={styles.solar}>
            <div className={styles.stage}>
                <div
                    ref={frameRef}
                    className={styles.viewport}
                    data-ready={ready || undefined}
                    role="img"
                    aria-label={`${TITLE}: ${SUBTITLE}. ${title}. ${label ? label.happening : chapter ? chapter.summary : SUPPORT} ${DATA_LABEL}.`}
                >
                    <Image className={styles.poster} src={POSTER} alt="" fill sizes="(min-width: 1320px) 900px, 100vw" />
                    {live && (
                        <div className={styles.canvas} aria-hidden="true">
                            <SolarCanvas clock={clock} playing={playing} reducedMotion={reducedMotion} quality={quality} focus={label?.focus} labels={LABELS_3D} onReady={() => setReady(true)} />
                        </div>
                    )}
                    <div className={styles.hud} aria-hidden="true">
                        <div className={styles.titleChip}>
                            <span className={styles.titleNum}>{caption}</span>
                            <span className={styles.titleText}>{title}</span>
                            {!reducedMotion && (
                                <span className={styles.bar}>
                                    <span className={styles.fill} style={{ transform: `scaleX(${clock.progress})` }} />
                                </span>
                            )}
                        </div>
                        <span className={styles.dataLabel}>{DATA_LABEL}</span>
                        {mode.kind !== 'intro' && <span className={styles.metChip}>{formatMet(met)}</span>}
                        <span className={styles.scaleLabel}>{scaleText(loc.segment)} · Drag to turn; pinch or Ctrl/⌘ + scroll to zoom</span>
                        {mode.kind === 'intro' && (
                            <div className={styles.hero}>
                                <p className={styles.heroTitle}>{TITLE}</p>
                                <p className={styles.heroSubtitle}>{SUBTITLE}</p>
                                <p className={styles.heroLine}>{SUPPORT}</p>
                            </div>
                        )}
                    </div>
                    {live === false && near && noWebGL && <p className={styles.fallback}>3D isn&rsquo;t available on this device, so a still image is shown; the mission panel works as normal.</p>}
                </div>

                <div className={styles.controls} role="group" aria-label="Mission navigation">
                    <button type="button" className={styles.tool} onClick={() => step(-1)} aria-label="Previous" disabled={mode.kind === 'intro'} data-track="station_model_interaction" data-track-name="Solar System control: previous">
                        <span aria-hidden="true">‹</span>
                    </button>
                    <button type="button" className={styles.tool} onClick={() => setPaused(autoplay)} aria-pressed={!autoplay} aria-label={autoplay ? 'Pause' : 'Play'} data-track="station_model_interaction" data-track-name={autoplay ? 'Solar System control: pause' : 'Solar System control: play'}>
                        <span aria-hidden="true">{autoplay ? '❚❚' : '▶'}</span>
                    </button>
                    <button type="button" className={styles.tool} onClick={() => clock.replay()} aria-label="Replay" data-track="station_model_interaction" data-track-name="Solar System control: replay">
                        <span aria-hidden="true">⏮</span>
                    </button>
                    <button type="button" className={styles.tool} onClick={() => step(1)} aria-label="Next" disabled={mode.kind === 'chapter' && mode.c === chapters.length - 1} data-track="station_model_interaction" data-track-name="Solar System control: next">
                        <span aria-hidden="true">›</span>
                    </button>
                    <button type="button" className={styles.toolWide} onClick={back} disabled={mode.kind === 'intro'} data-track="station_model_interaction" data-track-name="Solar System control: back">
                        Back
                    </button>
                </div>
            </div>

            <aside className={styles.side} aria-label="Mission">
                <div className={styles.sideScroll}>
                    <div className={styles.primary}>
                        <button type="button" className={`btn ${chosen === 'start' ? 'btn-primary' : 'btn-secondary'} ${styles.primaryBtn}`} aria-current={chosen === 'start' || undefined} onClick={start} data-track="station_model_interaction" data-track-name="Solar System: start mission">
                            Start Mission
                        </button>
                        <button type="button" className={`btn ${chosen === 'stages' ? 'btn-primary' : 'btn-secondary'} ${styles.primaryBtn}`} aria-current={chosen === 'stages' || undefined} aria-expanded={stagesOpen} onClick={() => setStagesOpen(!stagesOpen)} data-track="station_model_interaction" data-track-name="Solar System: mission stages">
                            Explore Mission Stages
                        </button>
                    </div>

                    {stagesOpen && (
                        <ol className={`${styles.list} ${styles.chapters}`} aria-label="Mission stages">
                            {chapters.map((c, i) => (
                                <li key={c.id}>
                                    <button type="button" className={styles.item} aria-pressed={mode.kind !== 'intro' && mode.c === i} onClick={() => openChapter(i)} data-track="station_model_interaction" data-track-name={`Solar System stage: ${c.title}`}>
                                        <span className={styles.itemNum} aria-hidden="true">
                                            {c.number}
                                        </span>
                                        {c.title}
                                    </button>
                                </li>
                            ))}
                        </ol>
                    )}

                    <section className={styles.info} aria-live="polite" aria-labelledby="solar-info-title">
                        {mode.kind === 'intro' ? (
                            <>
                                <p className={styles.kicker}>06 · Space Digital Twin</p>
                                <h3 id="solar-info-title" className={styles.infoTitle}>
                                    {TITLE}: {SUBTITLE}
                                </h3>
                                <p className={styles.text}>{DESCRIPTION}</p>
                                <p className={styles.question}>{SIGNATURE}</p>
                                <p className={styles.note}>
                                    A conceptual reference mission (launch vehicle RLV-1, spacecraft RSC-1) modelled from engine ignition to Earth departure. Values are simulated, not flight or live data. The cruise and the planets are being added next.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className={styles.kicker}>
                                    Chapter {chapter!.number} · {chapter!.title}
                                </p>
                                <h3 id="solar-info-title" className={styles.infoTitle}>
                                    {title}
                                </h3>
                                {!label && <p className={styles.text}>{chapter!.summary}</p>}
                                <div className={styles.labels} role="group" aria-label={`${chapter!.title}: engineering actions`}>
                                    {chapter!.labels.map((l, i) => (
                                        <button key={l.id} type="button" className={styles.label} aria-pressed={mode.kind === 'label' && mode.l === i} onClick={() => openLabel(mode.c, i)} data-track="station_model_interaction" data-track-name={`Solar System label: ${l.title}`}>
                                            {l.title}
                                        </button>
                                    ))}
                                </div>
                                {label && (
                                    <dl className={styles.answers}>
                                        <div>
                                            <dt>What is it?</dt>
                                            <dd>{label.what}</dd>
                                        </div>
                                        <div>
                                            <dt>What does it do?</dt>
                                            <dd>{label.does}</dd>
                                        </div>
                                        <div>
                                            <dt>Why is it important?</dt>
                                            <dd>{label.why}</dd>
                                        </div>
                                        <div>
                                            <dt>What is happening?</dt>
                                            <dd>{label.happening}</dd>
                                        </div>
                                    </dl>
                                )}
                                <div className={styles.telemetry}>
                                    <p className={styles.telemetryHead}>
                                        <span className={styles.dot} aria-hidden="true" /> Engineering readings · simulated
                                    </p>
                                    <dl>
                                        {readings.map((r) => (
                                            <div key={r.label}>
                                                <dt>{r.label}</dt>
                                                <dd className={r.tone ? TONE[r.tone] : undefined}>{r.value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                                {label && (
                                    <details className={`disclosure ${styles.more}`}>
                                        <summary>Learn more</summary>
                                        <div>
                                            <p className={styles.text}>{label.learn}</p>
                                        </div>
                                    </details>
                                )}
                                <p className={styles.next}>
                                    {label && nextLabel ? (
                                        <>
                                            Next:{' '}
                                            <button type="button" onClick={() => step(1)}>
                                                {nextLabel.title}
                                            </button>
                                        </>
                                    ) : nextChapter ? (
                                        <>
                                            Next stage:{' '}
                                            <button type="button" onClick={() => openChapter(mode.c + 1)}>
                                                {nextChapter.title}
                                            </button>
                                        </>
                                    ) : (
                                        'Next phase: interplanetary cruise and the planets (in development).'
                                    )}
                                </p>
                            </>
                        )}
                    </section>
                </div>
            </aside>
        </div>
    );
}
