'use client';
// Solar System — From Earth Launch to Deep Space Exploration: the sixth Space Digital Twin option.
// A guided mission, not a free simulator: the visitor starts the mission (or picks a stage or a topic)
// and the experience moves the camera, runs the modelled event, explains it and shows the readings of
// that moment. Everything shown derives from the flight simulation and spacecraft model in
// lib/solar-system.
//
// Layout (visual recovery, round 2): the 3D scene is the hero and fills the frame. The default cinematic
// view shows only the stage title, the simulated-data indicator and mission time at the top, a compact
// caption (what happens, two readings, the chapter's guided action and Investigate) and, below the scene,
// the chapter timeline with the transport controls. The contextual card (why it matters, two to four
// readings, Learn more and the chapter's topics) opens only on Investigate or a topic. Returning from a
// topic resumes the mission at the moment it was left.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useMedia, useNoWebGL, usePageVisible, usePresence, useReducedMotion, useStageQuality } from '@/components/space-twin/device';
import { MissionClock } from '@/lib/solar-system/clock';
import { compression, DATA_LABEL, formatMet, SUBTITLE, SUPPORT, TITLE, type Segment, type TKey } from '@/lib/solar-system/mission';
import { dateOf, journey, readingAny } from '@/lib/solar-system/phaseB';
import { isoDate } from '@/lib/solar-system/ephemeris';
import { PHASE_B_LABELS } from './PlanetViews';
import styles from './SolarSystemExperience.module.css';
import { missionSound } from './sound';

const SolarCanvas = dynamic(() => import('./SolarCanvas'), { ssr: false });
// Posters: the scene's first frame, rendered from the live scene for each layout (wide, tablet, phone),
// so the still and the animation that replaces it are the same picture.
const POSTER = '/images/space-twin/poster-solar-system.jpg';
const POSTER_TABLET = '/images/space-twin/poster-solar-system-tablet.jpg';
const POSTER_PHONE = '/images/space-twin/poster-solar-system-phone.jpg';

type Mode = { kind: 'intro' } | { kind: 'chapter'; c: number; guided: boolean } | { kind: 'label'; c: number; l: number };

const TONE: Record<string, string> = { nominal: 'state-nominal', solar: 'state-solar', fault: 'state-fault', telemetry: 'state-telemetry' };

const LABELS_3D = [
    { id: 'solar-vehicle', text: 'Upper stage, kick stage and spacecraft (marker enlarged)' },
    { id: 'deploy-craft', text: 'Spacecraft RSC-1' },
    { id: 'deep-earth', text: 'Earth' },
    { id: 'deep-jupiter', text: 'Jupiter' },
    ...PHASE_B_LABELS,
    { id: 'pl-hga', text: 'High-gain antenna, 3.7 m' },
    { id: 'pl-rtg', text: 'RTGs (2), stowed' },
    { id: 'pl-mag', text: 'Magnetometer boom, stowed' },
    { id: 'pl-kick', text: 'Solid kick stage' },
    { id: 'pl-adapter', text: 'Payload adapter' },
    { id: 'pl-fairing', text: 'Fairing shell and acoustic lining' },
];

function scaleText(seg: Segment) {
    if (seg.scene === 'helio') return 'Orbits to scale · Sun ×25, Earth ×2,500, Jupiter ×250 so they can be seen';
    if (seg.scene === 'intro') return 'Cinematic Scale — Not to Scale';
    if (seg.scene === 'tour') return 'Cinematic Scale — Not to Scale · a guided tour, not a spacecraft trajectory';
    const c = compression(seg);
    const time = c === 0 ? 'Held moment' : c <= 1.25 ? 'Real time' : c < 20 ? `Time ×${c.toFixed(1)}` : c < 1e6 ? `Time ×${Math.round(c).toLocaleString('en-GB')}` : `Time ×${(c / 1e6).toFixed(1)} million`;
    if (seg.scene === 'cruise') return `${time} · orbits to scale · planets and spacecraft are markers`;
    if (seg.scene === 'deep') return `${time} · spacecraft to scale · Sun, Earth and Jupiter in their true directions and sizes`;
    if (seg.scene === 'jupiter') return `${time} · Jupiter, moon orbits and flyby path to scale · moon positions illustrative`;
    if (seg.scene === 'saturn') return 'Saturn and rings to scale · the spacecraft’s pass is placed for illustration';
    if (seg.scene === 'orbit' || seg.scene === 'departure') return `${time} · Earth and orbits to scale`;
    return `${time} · vehicle and Earth to scale`;
}

/** Readings for the card: mission time is already in the status line, and at most four are shown. */
const cardKeys = (keys: readonly TKey[]) => keys.filter((k) => k !== 'met').slice(0, 4);

export default function SolarSystemExperience() {
    const reducedMotion = useReducedMotion();
    const quality = useStageQuality();
    const noWebGL = useNoWebGL();
    const pageVisible = usePageVisible();
    const wide = useMedia('(min-width: 900px)');
    const frameRef = useRef<HTMLDivElement>(null);
    const { near, onScreen } = usePresence(frameRef);
    const { chapters, intro } = journey();

    const [mode, setMode] = useState<Mode>({ kind: 'intro' });
    const [stagesOpen, setStagesOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const [investigate, setInvestigate] = useState(false);
    // Where to resume the chapter when the visitor returns from a topic (story time).
    const resume = useRef<{ c: number; t: number } | null>(null);
    const [paused, setPaused] = useState<boolean | null>(null);
    const [ready, setReady] = useState(false);
    const markReady = useCallback(() => setReady(true), []);
    const [, setTick] = useState(0);

    const chapterIndex = mode.kind === 'intro' ? 0 : mode.c;
    const chapter = mode.kind === 'intro' ? null : chapters[mode.c];
    const label = mode.kind === 'label' ? chapters[mode.c].labels[mode.l] : null;
    const program = mode.kind === 'intro' ? intro : label ? label.segments : chapter!.segments;
    const programKey = mode.kind === 'intro' ? 'intro' : mode.kind === 'label' ? `l-${mode.c}-${mode.l}` : `c-${mode.c}`;
    const clock = useMemo(() => new MissionClock(program), [programKey]);
    useEffect(() => {
        const r = resume.current;
        if (r && mode.kind === 'chapter' && mode.c === r.c) {
            resume.current = null;
            clock.seek(r.t);
        }
    }, [clock, mode]);

    const autoplay = !(paused ?? reducedMotion);
    const playing = near && onScreen && pageVisible && autoplay && ready;

    // Sound (synthesised, see sound.ts): starts with Start Mission (browsers need a click), can be muted,
    // and the choice is remembered. It fades out whenever the mission is paused or out of view.
    const [soundOn, setSoundOn] = useState(false);
    useEffect(() => missionSound.onChange(() => setSoundOn(missionSound.on)), []);
    useEffect(() => {
        missionSound.setActive(playing);
    }, [playing]);
    useEffect(() => () => missionSound.setActive(false), []);
    const soundWanted = () => {
        try {
            return window.localStorage.getItem('solar-sound') !== 'off';
        } catch {
            return true;
        }
    };
    const toggleSound = () => {
        const next = !missionSound.on;
        if (next) missionSound.enable();
        else missionSound.disable();
        try {
            window.localStorage.setItem('solar-sound', next ? 'on' : 'off');
        } catch {
            /* storage unavailable: the choice lasts for this visit */
        }
    };

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
        setMoreOpen(false);
        setInvestigate(false);
        if (paused) setPaused(null);
    };
    const start = () => {
        if (soundWanted()) missionSound.enable();
        setStagesOpen(false);
        go({ kind: 'chapter', c: 0, guided: true });
    };
    const openChapter = (c: number) => {
        setStagesOpen(false);
        go({ kind: 'chapter', c, guided: false });
    };
    const openLabel = (c: number, l: number) => {
        if (mode.kind === 'chapter' && mode.c === c) resume.current = { c, t: clock.time };
        go({ kind: 'label', c, l });
    };
    const returnToMission = (c: number) => {
        setStagesOpen(false);
        go({ kind: 'chapter', c, guided: false });
    };
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
        if (mode.kind === 'label') return returnToMission(mode.c);
        setStagesOpen(false);
        go({ kind: 'intro' });
    };

    const loc = clock.location;
    const met = loc.met;
    const keys = cardKeys(label ? label.telemetry : chapter ? chapter.telemetry : []);
    const tourBody = loc.segment.body ?? (label ? label.segments.find((s) => s.body)?.body : undefined);
    const readings = keys.map((k) => readingAny(k, met, tourBody));
    // Mission time: T±hh:mm:ss near Earth; the calendar date and day count once in interplanetary space.
    const metText = met > 2.5 * 86400 ? `${isoDate(dateOf(met))} · day ${Math.floor(met / 86400).toLocaleString('en-GB')}` : formatMet(met);
    const inTour = loc.segment.scene === 'tour';
    const live = near && quality !== null && !noWebGL;
    const title = label ? label.title : chapter ? chapter.title : TITLE;
    const atReady = mode.kind === 'intro' && (loc.segment.shot === 'ready' || clock.done);
    const mainTopics = chapter ? chapter.labels.map((l, i) => ({ l, i })).filter(({ l }) => !l.more) : [];
    const moreTopics = chapter ? chapter.labels.map((l, i) => ({ l, i })).filter(({ l }) => l.more) : [];
    const chosenMore = label?.more === true;
    // The card opens on Investigate or a topic; otherwise a compact caption keeps the scene clear.
    const cardShown = mode.kind === 'label' || (mode.kind === 'chapter' && investigate);
    const captionShown = mode.kind === 'chapter' && !investigate;
    const primaryIndex = chapter?.primary ? chapter.labels.findIndex((l) => l.id === chapter.primary!.label) : -1;
    // Wide layouts frame the hardware right of centre, clear of the card or the opening title.
    const shift = !wide ? 0 : cardShown ? 0.13 : mode.kind === 'intro' ? 0.15 : 0.04;
    // Phones: the opening title sits over the lower part of the scene, so frame the vehicle higher.
    const shiftY = !wide && mode.kind === 'intro' ? 0.2 : 0;

    return (
        <div className={styles.solar} data-mode={mode.kind}>
            <div className={styles.stageWrap}>
                <div ref={frameRef} className={styles.viewport} data-ready={ready || undefined} role="img" aria-label={`${TITLE}: ${SUBTITLE}. ${title}. ${label ? label.does : chapter ? chapter.summary : SUPPORT} ${DATA_LABEL}.`}>
                    {/* With 3D available the opening fades in from black, straight into the live scene (no still to
                        swap out); the posters are the fallback when 3D is not available. */}
                    {!live && (
                        <>
                            <Image className={`${styles.poster} ${styles.posterWide}`} src={POSTER} alt="" fill sizes="(min-width: 1320px) 1240px, 100vw" />
                            <Image className={`${styles.poster} ${styles.posterTablet}`} src={POSTER_TABLET} alt="" fill sizes="100vw" />
                            <Image className={`${styles.poster} ${styles.posterPhone}`} src={POSTER_PHONE} alt="" fill sizes="100vw" />
                        </>
                    )}
                    {live && !ready && (
                        <p className={styles.loading} aria-hidden="true">
                            Preparing the launch site
                        </p>
                    )}
                    {live && (
                        <div className={styles.canvas} aria-hidden="true">
                            <SolarCanvas clock={clock} playing={playing} reducedMotion={reducedMotion} quality={quality} focus={label?.focus} labels={LABELS_3D} shift={shift} shiftY={shiftY} onReady={markReady} />
                        </div>
                    )}
                    <div className={styles.shade} aria-hidden="true" />

                    {/* Top: where we are, and that the data are simulated. */}
                    <div className={styles.topBar} aria-hidden="true">
                        <div className={styles.where}>
                            <span className={styles.whereNum}>{mode.kind === 'intro' ? '06 · Space Digital Twin' : `Stage ${chapter!.number} of ${String(chapters.length).padStart(2, '0')}`}</span>
                            {mode.kind !== 'intro' && <span className={styles.whereTitle}>{chapter!.title}</span>}
                        </div>
                        <div className={styles.status}>
                            {mode.kind !== 'intro' && !inTour && <span className={styles.met}>{metText}</span>}
                            <span className={styles.sim}>
                                <span className={styles.simDot} /> Simulated · SOL-1
                            </span>
                        </div>
                    </div>

                    {mode.kind === 'intro' && (
                        <div className={styles.hero}>
                            <p className={styles.heroKicker}>From Earth Launch to Deep Space Exploration</p>
                            <h3 className={styles.heroTitle}>{TITLE}</h3>
                            <p className={styles.heroLine}>{SUPPORT}</p>
                            <div className={styles.heroActions} data-ready={atReady || undefined}>
                                <button type="button" className={styles.startBtn} onClick={start} data-track="station_model_interaction" data-track-name="Solar System: start mission">
                                    <span className={styles.startIcon} aria-hidden="true">
                                        <svg viewBox="0 0 16 16" width="14" height="14">
                                            <path d="M5 3.2v9.6l7.8-4.8z" fill="currentColor" />
                                        </svg>
                                    </span>
                                    Start Mission
                                </button>
                                <button
                                    type="button"
                                    className={styles.stagesBtn}
                                    aria-expanded={stagesOpen}
                                    aria-controls="solar-stages"
                                    onClick={() => setStagesOpen(!stagesOpen)}
                                    data-track="station_model_interaction"
                                    data-track-name="Solar System: mission stages"
                                >
                                    Explore Mission Stages <span aria-hidden="true">→</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {stagesOpen && (
                        <nav id="solar-stages" className={styles.stages} aria-label="Mission stages">
                            <ol>
                                {chapters.map((c, i) => (
                                    <li key={c.id}>
                                        <button type="button" onClick={() => openChapter(i)} aria-current={mode.kind !== 'intro' && mode.c === i ? 'step' : undefined} data-track="station_model_interaction" data-track-name={`Solar System stage: ${c.title}`}>
                                            <span className={styles.stageNum} aria-hidden="true">
                                                {c.number}
                                            </span>
                                            {c.title}
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    )}

                    <span className={styles.scale} aria-hidden="true">
                        {scaleText(loc.segment)}
                    </span>
                    {live === false && near && noWebGL && <p className={styles.fallback}>3D isn&rsquo;t available on this device, so a still image is shown; the mission controls work as normal.</p>}
                </div>

                {/* Default cinematic view: one compact caption with the guided action. */}
                {chapter && captionShown && (
                    <section className={styles.caption} aria-live="polite" aria-labelledby="solar-caption-title">
                        <h3 id="solar-caption-title" className="visually-hidden">
                            {chapter.title}
                        </h3>
                        <p className={styles.captionText}>{chapter.summary}</p>
                        {readings.length > 0 && (
                            <p className={styles.captionData} aria-label="Engineering measurements, simulated">
                                {readings.slice(0, 2).map((r, i) => (
                                    <span key={r.label}>
                                        {i > 0 && <span aria-hidden="true"> · </span>}
                                        {r.label} <strong className={r.tone ? TONE[r.tone] : undefined}>{r.value}</strong>
                                    </span>
                                ))}
                            </p>
                        )}
                        <div className={styles.captionActions}>
                            {primaryIndex >= 0 && (
                                <button
                                    type="button"
                                    className={styles.primaryBtn}
                                    onClick={() => openLabel(chapterIndex, primaryIndex)}
                                    data-track="station_model_interaction"
                                    data-track-name={`Solar System guided action: ${chapter.primary!.text}`}
                                >
                                    {chapter.primary!.text}
                                </button>
                            )}
                            <button type="button" className={styles.investigateBtn} aria-expanded={false} onClick={() => setInvestigate(true)} data-track="station_model_interaction" data-track-name={`Solar System investigate: ${chapter.title}`}>
                                Investigate ({chapter.labels.length})
                            </button>
                        </div>
                    </section>
                )}

                {/* Contextual card (on request): over the scene on wide screens, a sheet under it on phones. */}
                {chapter && cardShown && (
                    <section className={styles.card} aria-live="polite" aria-labelledby="solar-card-title">
                        {!label && (
                            <button type="button" className={styles.cardClose} aria-label="Hide details" onClick={() => setInvestigate(false)}>
                                <span aria-hidden="true">×</span>
                            </button>
                        )}
                        <p className={styles.cardKicker}>{label ? chapter.title : `Stage ${chapter.number}`}</p>
                        <h3 id="solar-card-title" className={styles.cardTitle}>
                            {title}
                        </h3>
                        <dl className={styles.facts}>
                            <div>
                                <dt>What happens</dt>
                                <dd>{label ? label.does : chapter.summary}</dd>
                            </div>
                            <div>
                                <dt>Why it matters</dt>
                                <dd>{label ? label.why : chapter.why}</dd>
                            </div>
                        </dl>
                        {readings.length > 0 && (
                            <dl className={styles.readings} aria-label="Engineering measurements, simulated">
                                {readings.map((r) => (
                                    <div key={r.label}>
                                        <dt>{r.label}</dt>
                                        <dd className={r.tone ? TONE[r.tone] : undefined}>{r.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                        {label && (
                            <details className={`disclosure ${styles.learn}`}>
                                <summary>Learn more</summary>
                                <div className={styles.learnBody}>
                                    <p>
                                        <strong>What it is.</strong> {label.what}
                                    </p>
                                    <p>{label.learn}</p>
                                    <p className={styles.inScene}>
                                        <strong>In the scene.</strong> {label.happening}
                                    </p>
                                </div>
                            </details>
                        )}
                        <div className={styles.topics} role="group" aria-label={`${chapter.title}: topics`}>
                            {mainTopics.map(({ l, i }) => (
                                <button
                                    key={l.id}
                                    type="button"
                                    className={styles.topic}
                                    aria-pressed={mode.kind === 'label' && mode.l === i}
                                    onClick={() => openLabel(chapterIndex, i)}
                                    data-track="station_model_interaction"
                                    data-track-name={`Solar System label: ${l.title}`}
                                >
                                    {l.title}
                                </button>
                            ))}
                            {moreTopics.length > 0 && (
                                <button type="button" className={`${styles.topic} ${styles.moreBtn}`} aria-expanded={moreOpen || chosenMore} onClick={() => setMoreOpen(!moreOpen)}>
                                    More topics ({moreTopics.length})
                                </button>
                            )}
                        </div>
                        {(moreOpen || chosenMore) && moreTopics.length > 0 && (
                            <div className={styles.topics} role="group" aria-label={`${chapter.title}: more topics`}>
                                {moreTopics.map(({ l, i }) => (
                                    <button
                                        key={l.id}
                                        type="button"
                                        className={styles.topic}
                                        aria-pressed={mode.kind === 'label' && mode.l === i}
                                        onClick={() => openLabel(chapterIndex, i)}
                                        data-track="station_model_interaction"
                                        data-track-name={`Solar System label: ${l.title}`}
                                    >
                                        {l.title}
                                    </button>
                                ))}
                            </div>
                        )}
                        {label && (
                            <button type="button" className={styles.returnBtn} onClick={() => returnToMission(chapterIndex)}>
                                ← Return to mission view
                            </button>
                        )}
                    </section>
                )}
            </div>

            {/* Bottom: the chapter timeline and the transport controls. */}
            <div className={styles.dock} role="group" aria-label="Mission navigation">
                <div className={styles.transport}>
                    <button type="button" className={styles.tool} onClick={() => step(-1)} aria-label="Previous" disabled={mode.kind === 'intro'} data-track="station_model_interaction" data-track-name="Solar System control: previous">
                        <span aria-hidden="true">‹</span>
                    </button>
                    <button
                        type="button"
                        className={styles.tool}
                        onClick={() => setPaused(autoplay)}
                        aria-pressed={!autoplay}
                        aria-label={autoplay ? 'Pause' : 'Play'}
                        data-track="station_model_interaction"
                        data-track-name={autoplay ? 'Solar System control: pause' : 'Solar System control: play'}
                    >
                        <span aria-hidden="true">{autoplay ? '❚❚' : '▶'}</span>
                    </button>
                    <button
                        type="button"
                        className={styles.tool}
                        onClick={() => step(1)}
                        aria-label="Next"
                        disabled={mode.kind === 'chapter' && mode.c === chapters.length - 1}
                        data-track="station_model_interaction"
                        data-track-name="Solar System control: next"
                    >
                        <span aria-hidden="true">›</span>
                    </button>
                    <button type="button" className={styles.tool} onClick={() => clock.replay()} aria-label="Replay" data-track="station_model_interaction" data-track-name="Solar System control: replay">
                        <span aria-hidden="true">↺</span>
                    </button>
                    <button
                        type="button"
                        className={styles.tool}
                        onClick={toggleSound}
                        aria-pressed={soundOn}
                        aria-label={soundOn ? 'Sound on' : 'Sound off'}
                        title={soundOn ? 'Sound on' : 'Sound off'}
                        data-track="station_model_interaction"
                        data-track-name={soundOn ? 'Solar System control: sound off' : 'Solar System control: sound on'}
                    >
                        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                            <path d="M3 8v4h3l4 3.5v-11L6 8H3z" fill="currentColor" />
                            {soundOn ? (
                                <path d="M13 7.2a4 4 0 0 1 0 5.6M15.2 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            ) : (
                                <path d="M13.5 7.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            )}
                        </svg>
                    </button>
                </div>
                <ol className={styles.timeline} aria-label="Mission timeline">
                    {chapters.map((c, i) => {
                        const current = mode.kind !== 'intro' && mode.c === i;
                        const done = mode.kind !== 'intro' && i < mode.c;
                        return (
                            <li key={c.id} data-current={current || undefined} data-done={done || undefined}>
                                <button type="button" onClick={() => openChapter(i)} aria-label={`Stage ${c.number}: ${c.title}`} aria-current={current ? 'step' : undefined} title={c.title}>
                                    <span className={styles.tlNum}>{c.number}</span>
                                    <span className={styles.tlName}>{c.short}</span>
                                    <span className={styles.tlBar}>
                                        <span className={styles.tlFill} style={{ transform: `scaleX(${current ? (mode.kind === 'chapter' ? clock.progress : 1) : done ? 1 : 0})` }} />
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ol>
                <button type="button" className={styles.backBtn} onClick={back} disabled={mode.kind === 'intro'} data-track="station_model_interaction" data-track-name="Solar System control: back">
                    Back
                </button>
            </div>
        </div>
    );
}
