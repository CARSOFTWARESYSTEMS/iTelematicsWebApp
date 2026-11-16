'use client';
// Solar System — From Earth Launch to Deep Space Exploration: the sixth Space Digital Twin option.
// A guided mission, not a free simulator: the visitor starts the mission (or picks a stage, a topic or the
// Discovery tour) and the experience moves the camera, runs the modelled event, explains it and shows
// the readings of that moment. Everything shown derives from the flight simulation, the trajectory and
// the spacecraft model in lib/solar-system.
//
// Layout: the 3D scene is the hero. The cinematic view shows the stage title, the simulated-data
// indicator and mission time at the top, a caption that narrates the modelled events as they happen
// (with the stage's two key readings, its guided action and Investigate) and, below the scene, a scrub
// bar with the events marked, the chapter timeline and the transport controls. Each stage has a
// scientific view one toggle away. The card (what it is, what happens, why it matters, readings, chart,
// Learn more, topics and fault scenarios) opens on Investigate or a topic. When a stage ends it offers a
// recap and a quick check; the mission ends with a summary. Progress is remembered on this device.
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useMedia, useNoWebGL, usePageVisible, usePresence, useReducedMotion, useStageQuality } from '@/components/space-twin/device';
import { MissionClock } from '@/lib/solar-system/clock';
import { flight, setFlightScenario } from '@/lib/solar-system/flight';
import { lessons, missionSummary } from '@/lib/solar-system/learning';
import { compression, DATA_LABEL, formatMet, storySeconds, SUBTITLE, SUPPORT, TITLE, type Label, type Segment, type TKey } from '@/lib/solar-system/mission';
import { dateOf, journey, readingAny } from '@/lib/solar-system/phaseB';
import { engineOutFlight } from '@/lib/solar-system/scenarios';
import { setPowerScenario } from '@/lib/solar-system/spacecraft';
import { isoDate } from '@/lib/solar-system/ephemeris';
import { AssistDiagram, Finale, Gloss, LessonChart, MiniMap, planTerms, Recap, WhatIfPanel, WindowChart } from './learn';
import { PHASE_B_LABELS } from './PlanetViews';
import styles from './SolarSystemExperience.module.css';
import { missionSound } from './sound';

const SolarCanvas = dynamic(() => import('./SolarCanvas'), { ssr: false });
// Posters: the scene's first frame, rendered from the live scene for each layout (wide, tablet, phone),
// shown only when 3D is not available.
const POSTER = '/images/space-twin/poster-solar-system.jpg';
const POSTER_TABLET = '/images/space-twin/poster-solar-system-tablet.jpg';
const POSTER_PHONE = '/images/space-twin/poster-solar-system-phone.jpg';

type View = 'cinematic' | 'scientific';
type Mode = { kind: 'intro' } | { kind: 'chapter'; c: number; guided: boolean; view: View } | { kind: 'label'; c: number; l: number; guided: boolean } | { kind: 'finale' };

const TONE: Record<string, string> = { nominal: 'state-nominal', solar: 'state-solar', fault: 'state-fault', telemetry: 'state-telemetry' };

const parking = flight().parking;
const LABELS_3D = [
    { id: 'solar-vehicle', text: 'Upper stage, kick stage and spacecraft (marker enlarged)' },
    { id: 'deploy-craft', text: 'Spacecraft RSC-1' },
    { id: 'deep-earth', text: 'Earth' },
    { id: 'deep-jupiter', text: 'Jupiter' },
    { id: 'orb-peri', text: `Perigee ${parking.perigeeKm.toFixed(0)} km` },
    { id: 'orb-apo', text: `Apogee ${parking.apogeeKm.toFixed(0)} km` },
    ...PHASE_B_LABELS,
    { id: 'pl-hga', text: 'High-gain antenna, 3.7 m' },
    { id: 'pl-rtg', text: 'RTGs (2), stowed' },
    { id: 'pl-mag', text: 'Magnetometer boom, stowed' },
    { id: 'pl-kick', text: 'Solid kick stage' },
    { id: 'pl-adapter', text: 'Payload adapter' },
    { id: 'pl-fairing', text: 'Fairing shell and acoustic lining' },
];

/** The end-of-mission scene: the Solar System from above while the summary is read. */
const FINALE: Segment[] = [{ met: [0, 0], seconds: 45, scene: 'tour', shot: 'tourOverview' }];
/** Seconds a stage's recap waits before the guided mission moves on (paused while the visitor engages). */
const RECAP_SECONDS = 12;
const SPEEDS = [1, 0.5, 2] as const;

/** A topic plays at least as long as its card takes to read (slower, never faster; at most 3×). */
function topicProgram(l: Label): Segment[] {
    const words = `${l.what} ${l.does} ${l.why}`.split(/\s+/).length;
    const total = storySeconds(l.segments);
    const k = Math.min(3, Math.max(1, (words / 3.3 + 3) / total));
    return k === 1 ? [...l.segments] : l.segments.map((s) => ({ ...s, seconds: s.seconds * k }));
}

function scaleText(seg: Segment, rate: number) {
    if (seg.scene === 'helio') return 'Orbits to scale · Sun ×25, Earth ×2,500, Jupiter ×250 so they can be seen';
    if (seg.scene === 'intro') return 'Cinematic Scale — Not to Scale';
    if (seg.shot === 'tourScale') return 'Sizes to scale · distances between them are not';
    if (seg.scene === 'tour') return 'Cinematic Scale — Not to Scale · a guided tour, not a spacecraft trajectory';
    const c = compression(seg) * rate;
    const time = c === 0 ? 'Held moment' : c < 0.8 ? `Slow motion ×${c.toFixed(2)}` : c <= 1.25 ? 'Real time' : c < 20 ? `Time ×${c.toFixed(1)}` : c < 1e6 ? `Time ×${Math.round(c).toLocaleString('en-GB')}` : `Time ×${(c / 1e6).toFixed(1)} million`;
    if (seg.scene === 'cruise') return `${time} · orbits to scale · planets and spacecraft are markers`;
    if (seg.scene === 'deep') return `${time} · spacecraft to scale · Sun, Earth and Jupiter in their true directions and sizes`;
    if (seg.scene === 'jupiter') return `${time} · Jupiter, moon orbits and flyby path to scale · moon positions illustrative`;
    if (seg.scene === 'saturn') return 'Saturn and rings to scale · the spacecraft’s pass is placed for illustration';
    if (seg.scene === 'orbit' || seg.scene === 'departure') return `${time} · Earth and orbits to scale`;
    return `${time} · vehicle and Earth to scale`;
}

const inTourScene = (s: Segment) => s.scene === 'tour';
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Progress kept on this device: stages watched, quick-check answers, the last stage. */
interface Progress {
    done: string[];
    checks: Record<string, number>;
    last: number;
}
const EMPTY: Progress = { done: [], checks: {}, last: -1 };
function readProgress(): Progress {
    try {
        const p = JSON.parse(window.localStorage.getItem('solar-progress') ?? 'null') as Progress | null;
        return p && Array.isArray(p.done) && typeof p.checks === 'object' ? { done: p.done, checks: p.checks, last: typeof p.last === 'number' ? p.last : -1 } : EMPTY;
    } catch {
        return EMPTY;
    }
}
function writeProgress(p: Progress) {
    try {
        window.localStorage.setItem('solar-progress', JSON.stringify(p));
    } catch {
        /* storage unavailable: progress lasts for this visit */
    }
}

export default function SolarSystemExperience() {
    const reducedMotion = useReducedMotion();
    const quality = useStageQuality();
    const noWebGL = useNoWebGL();
    const pageVisible = usePageVisible();
    const wide = useMedia('(min-width: 900px)');
    const frameRef = useRef<HTMLDivElement>(null);
    const { near, onScreen } = usePresence(frameRef);
    const { chapters, intro } = journey();
    const L = lessons();

    const [mode, setMode] = useState<Mode>({ kind: 'intro' });
    const history = useRef<Mode[]>([]);
    const [stagesOpen, setStagesOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [moreOpen, setMoreOpen] = useState(false);
    const [investigate, setInvestigate] = useState(false);
    const [depth, setDepth] = useState<'explorer' | 'engineer'>('explorer');
    const [rate, setRate] = useState<(typeof SPEEDS)[number]>(1);
    const [progress, setProgress] = useState<Progress>(EMPTY);
    const [recapHold, setRecapHold] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    // Where to resume a stage when the visitor returns from a topic (story time, guided, view).
    const resume = useRef<{ c: number; t: number; guided: boolean; view: View } | null>(null);
    const seekFraction = useRef<number | null>(null);
    const [paused, setPaused] = useState<boolean | null>(null);
    const [ready, setReady] = useState(false);
    const markReady = useCallback(() => setReady(true), []);
    const [, setTick] = useState(0);

    useEffect(() => {
        setProgress(readProgress());
        try {
            if (window.localStorage.getItem('solar-depth') === 'engineer') setDepth('engineer');
        } catch {
            /* default depth */
        }
    }, []);
    const saveProgress = useCallback((f: (p: Progress) => Progress) => {
        setProgress((p) => {
            const next = f(p);
            writeProgress(next);
            return next;
        });
    }, []);

    const chapterIndex = mode.kind === 'chapter' || mode.kind === 'label' ? mode.c : 0;
    const chapter = mode.kind === 'chapter' || mode.kind === 'label' ? chapters[mode.c] : null;
    const lesson = chapter ? L[chapter.id] : null;
    const label = mode.kind === 'label' ? chapters[mode.c].labels[mode.l] : null;
    const scientific = mode.kind === 'chapter' && mode.view === 'scientific' && !!lesson?.science;
    const program = useMemo(() => {
        if (mode.kind === 'intro') return intro;
        if (mode.kind === 'finale') return FINALE;
        if (mode.kind === 'label') return topicProgram(chapters[mode.c].labels[mode.l]);
        const l = L[chapters[mode.c].id];
        return mode.view === 'scientific' && l?.science ? l.science.segments : chapters[mode.c].segments;
    }, [mode, intro, chapters, L]);
    const programKey = mode.kind === 'intro' ? 'intro' : mode.kind === 'finale' ? 'finale' : mode.kind === 'label' ? `l-${mode.c}-${mode.l}` : `c-${mode.c}-${mode.view}`;
    // One clock per programme (the key names it; the segments follow from the mode).
    const clock = useMemo(() => new MissionClock(program), [programKey]);
    useEffect(() => {
        const r = resume.current;
        if (r && mode.kind === 'chapter' && mode.c === r.c && mode.view === r.view) {
            resume.current = null;
            clock.seek(r.t);
        } else if (seekFraction.current !== null) {
            clock.seek(seekFraction.current * clock.duration);
            seekFraction.current = null;
        }
        setRecapHold(false);
    }, [clock, mode]);

    // Fault scenarios: the scene and readings follow the computed failure while its topic is open.
    const whatIf = label?.whatIf;
    useEffect(() => {
        setFlightScenario(whatIf === 'engine' ? engineOutFlight() : null);
        setPowerScenario(whatIf === 'rtg');
        return () => {
            setFlightScenario(null);
            setPowerScenario(false);
        };
    }, [whatIf]);

    const autoplay = !(paused ?? reducedMotion);
    const visible = near && onScreen && pageVisible;
    const playing = visible && autoplay && ready;

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

    useEffect(() => clock.onTick(() => setTick((n) => n + 1)), [clock]);

    /** Moves to another view; `push` records where the visitor came from, for Back. */
    const go = (next: Mode, push = true) => {
        if (push) history.current.push(mode);
        if (history.current.length > 30) history.current.shift();
        setMode(next);
        setMoreOpen(false);
        setInvestigate(false);
        setCountdown(null);
        if (paused) setPaused(null);
        if (next.kind === 'chapter' || next.kind === 'label') saveProgress((p) => ({ ...p, last: next.c }));
    };
    const start = () => {
        if (soundWanted()) missionSound.enable();
        setStagesOpen(false);
        go({ kind: 'chapter', c: 0, guided: true, view: 'cinematic' });
    };
    const discover = () => {
        if (soundWanted()) missionSound.enable();
        setStagesOpen(false);
        go({ kind: 'chapter', c: chapters.length - 1, guided: true, view: 'cinematic' });
    };
    const openChapter = (c: number) => {
        setStagesOpen(false);
        go({ kind: 'chapter', c, guided: false, view: 'cinematic' });
    };
    const openLabel = (c: number, l: number) => {
        const guided = mode.kind === 'chapter' || mode.kind === 'label' ? mode.guided : false;
        if (mode.kind === 'chapter' && mode.c === c) resume.current = { c, t: clock.time, guided: mode.guided, view: mode.view };
        setStagesOpen(false);
        go({ kind: 'label', c, l, guided });
    };
    const returnToMission = (c: number) => {
        setStagesOpen(false);
        const r = resume.current && resume.current.c === c ? resume.current : null;
        go({ kind: 'chapter', c, guided: r?.guided ?? (mode.kind === 'label' ? mode.guided : false), view: r?.view ?? 'cinematic' }, false);
    };
    const setView = (v: View) => {
        if (mode.kind !== 'chapter' || mode.view === v) return;
        seekFraction.current = clock.progress < 0.999 ? clock.progress : 0;
        go({ ...mode, view: v }, false);
    };
    /** The next stage, or the mission summary after the last one. */
    const nextStage = () => {
        if (mode.kind !== 'chapter') return;
        if (mode.c + 1 < chapters.length) go({ kind: 'chapter', c: mode.c + 1, guided: mode.guided, view: 'cinematic' }, false);
        else go({ kind: 'finale' });
    };
    const step = (delta: 1 | -1) => {
        if (mode.kind === 'intro') return delta > 0 ? openChapter(0) : undefined;
        if (mode.kind === 'finale') return delta < 0 ? go({ kind: 'chapter', c: chapters.length - 1, guided: false, view: 'cinematic' }, false) : undefined;
        if (mode.kind === 'label') {
            const n = chapters[mode.c].labels.length;
            return go({ kind: 'label', c: mode.c, l: (mode.l + delta + n) % n, guided: mode.guided }, false);
        }
        const c = mode.c + delta;
        if (c < 0) return go({ kind: 'intro' }, false);
        if (c < chapters.length) go({ kind: 'chapter', c, guided: mode.guided, view: 'cinematic' }, false);
        else go({ kind: 'finale' });
    };
    const back = () => {
        if (mode.kind === 'label') return returnToMission(mode.c);
        setStagesOpen(false);
        const prev = history.current.pop();
        setMode(prev ?? { kind: 'intro' });
        setInvestigate(false);
        setCountdown(null);
    };
    const togglePlay = () => setPaused(autoplay);
    const cycleRate = () => setRate(SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length]);
    const setDepthSaved = (d: 'explorer' | 'engineer') => {
        setDepth(d);
        try {
            window.localStorage.setItem('solar-depth', d);
        } catch {
            /* default next visit */
        }
    };

    const loc = clock.location;
    const met = loc.met;
    const ended = mode.kind === 'chapter' && clock.done;
    const cardShown = mode.kind === 'label' || (mode.kind === 'chapter' && investigate);
    const recapShown = ended && !cardShown && !!lesson;

    // A finished stage counts as watched.
    const chapterId = chapter?.id;
    useEffect(() => {
        if (ended && chapterId) saveProgress((p) => (p.done.includes(chapterId) ? p : { ...p, done: [...p.done, chapterId] }));
    }, [ended, chapterId, saveProgress]);

    // The guided mission moves on after the recap, unless the visitor is engaging with it.
    const guided = mode.kind === 'chapter' && mode.guided;
    useEffect(() => {
        if (!(recapShown && guided && !recapHold && visible && autoplay)) {
            setCountdown(null);
            return;
        }
        const t0 = performance.now();
        setCountdown(RECAP_SECONDS);
        const id = window.setInterval(() => {
            const left = RECAP_SECONDS - (performance.now() - t0) / 1000;
            setCountdown(Math.max(0, left));
            if (left <= 0) {
                window.clearInterval(id);
                nextStage();
            }
        }, 250);
        return () => window.clearInterval(id);
        // nextStage reads the current mode; the effect restarts whenever the stage changes.
    }, [recapShown, guided, recapHold, visible, autoplay, programKey]);

    const tourBody = loc.segment.body ?? (label ? label.segments.find((s) => s.body)?.body : undefined);
    const readingsFor = (list: readonly TKey[]) => list.filter((k) => k !== 'met').map((k) => readingAny(k, met, tourBody));
    // In the tour, body readings only at a destination (not over the overview or the size line-up).
    const bodyReadings = !inTourScene(loc.segment) || !!loc.segment.body;
    const heroReadings = bodyReadings ? readingsFor(lesson?.hero ?? []).slice(0, 2) : [];
    const chapterKeys = chapter ? [...new Set([...(lesson?.hero ?? []), ...chapter.telemetry])] : [];
    const cardReadings = bodyReadings || label ? readingsFor(label ? label.telemetry : chapterKeys).slice(0, depth === 'engineer' ? 4 : 2) : [];
    // Mission time: T±hh:mm:ss near Earth; the calendar date and day count once in interplanetary space.
    const metText = met > 2.5 * 86400 ? `${isoDate(dateOf(met))} · day ${Math.floor(met / 86400).toLocaleString('en-GB')}` : formatMet(met);
    const inTour = loc.segment.scene === 'tour';
    const live = near && quality !== null && !noWebGL;
    const title = label ? label.title : chapter ? chapter.title : TITLE;
    const atReady = mode.kind === 'intro' && (loc.segment.shot === 'ready' || clock.done);
    const indexed = chapter ? chapter.labels.map((l, i) => ({ l, i })) : [];
    const mainTopics = indexed.filter(({ l }) => !l.more && !l.whatIf);
    const whatIfTopics = indexed.filter(({ l }) => l.whatIf);
    const moreTopics = indexed.filter(({ l }) => l.more && !l.whatIf);
    const chosenMore = label?.more === true && !label.whatIf;
    const captionShown = mode.kind === 'chapter' && !investigate && !recapShown;
    const primaryIndex = chapter?.primary ? chapter.labels.findIndex((l) => l.id === chapter.primary!.label) : -1;
    // Narration: the latest beat reached in the cinematic programme (the scientific view names its diagram).
    const beats = useMemo(() => (lesson && !scientific && mode.kind === 'chapter' ? lesson.beats : []), [lesson, scientific, mode.kind]);
    const beat = beats.filter((b) => b.t <= clock.time + 0.05).pop();
    const beatText = scientific ? lesson!.science!.text : (beat?.text ?? chapter?.summary ?? '');
    const captionAllow = useMemo(() => planTerms([beatText]), [beatText]);
    const cardTexts = label ? [label.what, label.does, label.why, label.learn, label.happening] : chapter ? [chapter.summary, chapter.why] : [];
    const cardAllow = planTerms(cardTexts);
    // Wide layouts frame the hardware right of centre, clear of the card or the opening title.
    const shift = !wide ? 0 : cardShown || mode.kind === 'finale' ? 0.13 : mode.kind === 'intro' ? 0.15 : 0.04;
    // Phones: the opening title sits over the lower part of the scene, so frame the vehicle higher.
    const shiftY = !wide && mode.kind === 'intro' ? 0.2 : 0;
    const focus = label?.focus ?? (scientific ? loc.segment.focus : undefined);
    const showMap = live && (mode.kind === 'chapter' || mode.kind === 'label') && !scientific && ['deep', 'jupiter', 'saturn'].includes(loc.segment.scene);
    const chart = lesson?.chart && (!label || depth === 'engineer') && met >= lesson.chart.range[0] - 1 && met <= lesson.chart.range[1] + 1 ? lesson.chart : undefined;
    const allChecks = chapters.filter((c) => L[c.id]);
    const score = allChecks.filter((c) => progress.checks[c.id] === L[c.id].check.answer).length;
    const whatIfs = chapters.flatMap((c, ci) => c.labels.map((l, li) => ({ l, ci, li })).filter(({ l }) => l.whatIf));
    const searchHits = query.trim().length > 1 ? chapters.flatMap((c, ci) => c.labels.map((l, li) => ({ c, l, ci, li })).filter(({ l }) => `${l.title} ${l.what}`.toLowerCase().includes(query.trim().toLowerCase()))).slice(0, 12) : [];
    const resumeAt = mode.kind === 'intro' && progress.last > 0 && progress.last < chapters.length ? progress.last : -1;

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const t = e.target as HTMLElement;
        if (t.closest('input, textarea, select')) return;
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            step(1);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            step(-1);
        } else if (e.key === 'k' || e.key === 'K' || (e.key === ' ' && !t.closest('button, summary, a'))) {
            e.preventDefault();
            togglePlay();
        } else if (e.key === 'Escape') {
            if (stagesOpen) setStagesOpen(false);
            else if (mode.kind === 'label') returnToMission(mode.c);
            else if (investigate) setInvestigate(false);
        }
    };

    return (
        <div className={styles.solar} data-mode={mode.kind} onKeyDown={onKeyDown} tabIndex={-1}>
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
                            <SolarCanvas clock={clock} playing={playing} rate={rate} reducedMotion={reducedMotion} quality={quality} focus={focus} labels={LABELS_3D} shift={shift} shiftY={shiftY} onReady={markReady} />
                        </div>
                    )}
                    <div className={styles.shade} aria-hidden="true" />

                    {/* Top: where we are, and that the data are simulated. */}
                    <div className={styles.topBar}>
                        <div className={styles.where}>
                            <span className={styles.whereNum}>{chapter ? `Stage ${chapter.number} of ${String(chapters.length).padStart(2, '0')}` : mode.kind === 'finale' ? 'Mission complete' : '06 · Space Digital Twin'}</span>
                            {chapter && <span className={styles.whereTitle}>{chapter.title}</span>}
                        </div>
                        <div className={styles.status}>
                            {chapter && !inTour && (
                                <span className={styles.met} aria-hidden="true">
                                    {metText}
                                </span>
                            )}
                            <span className={styles.sim}>
                                <span className={styles.simDot} aria-hidden="true" /> Simulated · SOL-1
                            </span>
                        </div>
                    </div>

                    {/* Cinematic and scientific views of the stage. */}
                    {mode.kind === 'chapter' && lesson?.science && (
                        <div className={styles.viewSwitch} role="group" aria-label="View">
                            <button type="button" aria-pressed={!scientific} onClick={() => setView('cinematic')} data-track="station_model_interaction" data-track-name="Solar System view: cinematic">
                                Cinematic
                            </button>
                            <button type="button" aria-pressed={scientific} onClick={() => setView('scientific')} title={lesson.science.label} data-track="station_model_interaction" data-track-name={`Solar System view: ${lesson.science.label}`}>
                                Scientific
                            </button>
                        </div>
                    )}

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
                            <div className={styles.heroMore}>
                                <button type="button" className={styles.linkBtn} onClick={discover} data-track="station_model_interaction" data-track-name="Solar System: explore the Solar System">
                                    Explore the Solar System
                                </button>
                                {resumeAt > 0 && (
                                    <button type="button" className={styles.linkBtn} onClick={() => go({ kind: 'chapter', c: resumeAt, guided: true, view: 'cinematic' })} data-track="station_model_interaction" data-track-name="Solar System: resume">
                                        Resume at Stage {chapters[resumeAt].number}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {stagesOpen && (
                        <nav id="solar-stages" className={styles.stages} aria-label="Mission stages">
                            <label className={styles.search}>
                                <span className="visually-hidden">Search topics</span>
                                <input type="search" placeholder="Search 81 topics" value={query} onChange={(e) => setQuery(e.target.value)} />
                            </label>
                            {searchHits.length > 0 ? (
                                <ul aria-label="Matching topics">
                                    {searchHits.map(({ c, l, ci, li }) => (
                                        <li key={l.id}>
                                            <button type="button" onClick={() => openLabel(ci, li)}>
                                                <span className={styles.stageNum} aria-hidden="true">
                                                    {c.number}
                                                </span>
                                                {l.title}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <ol>
                                    {chapters.map((c, i) => (
                                        <li key={c.id}>
                                            <button
                                                type="button"
                                                onClick={() => openChapter(i)}
                                                aria-current={chapter && mode.kind !== 'finale' && chapterIndex === i ? 'step' : undefined}
                                                data-track="station_model_interaction"
                                                data-track-name={`Solar System stage: ${c.title}`}
                                            >
                                                <span className={styles.stageNum} aria-hidden="true">
                                                    {c.number}
                                                </span>
                                                {c.title}
                                                {progress.done.includes(c.id) && (
                                                    <span className={styles.doneMark} aria-label="watched">
                                                        ✓
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </nav>
                    )}

                    {showMap && <MiniMap met={met} />}
                    <span className={styles.scale} aria-hidden="true">
                        {scaleText(loc.segment, rate)}
                    </span>
                    {live === false && near && noWebGL && <p className={styles.fallback}>3D isn&rsquo;t available on this device, so a still image is shown; the mission controls work as normal.</p>}
                </div>

                {/* Default cinematic view: the narration of the moment, with the guided action. */}
                {chapter && captionShown && (
                    <section className={styles.caption} aria-labelledby="solar-caption-title">
                        <h3 id="solar-caption-title" className="visually-hidden">
                            {chapter.title}
                        </h3>
                        <p className={styles.captionText} aria-live="polite">
                            <Gloss text={beatText} allow={captionAllow[0]} />
                        </p>
                        {heroReadings.length > 0 && (
                            <p className={styles.captionData} aria-label="Engineering measurements, simulated">
                                {heroReadings.map((r, i) => (
                                    <span key={r.label}>
                                        {i > 0 && <span aria-hidden="true"> · </span>}
                                        {r.label} <strong className={r.tone ? TONE[r.tone] : undefined}>{r.value}</strong>
                                    </span>
                                ))}
                            </p>
                        )}
                        <div className={styles.captionActions}>
                            {primaryIndex >= 0 && (
                                <button type="button" className={styles.primaryBtn} onClick={() => openLabel(chapterIndex, primaryIndex)} data-track="station_model_interaction" data-track-name={`Solar System guided action: ${chapter.primary!.text}`}>
                                    {chapter.primary!.text}
                                </button>
                            )}
                            <button type="button" className={styles.investigateBtn} aria-expanded={false} onClick={() => setInvestigate(true)} data-track="station_model_interaction" data-track-name={`Solar System investigate: ${chapter.title}`}>
                                Investigate ({chapter.labels.length})
                            </button>
                        </div>
                    </section>
                )}

                {/* End of a stage: recap, quick check and the way on. */}
                {chapter && lesson && recapShown && (
                    <Recap
                        number={chapter.number}
                        title={chapter.title}
                        points={lesson.recap}
                        check={lesson.check}
                        answered={progress.checks[chapter.id]}
                        onAnswer={(i) => {
                            setRecapHold(true);
                            saveProgress((p) => ({ ...p, checks: { ...p.checks, [chapter.id]: i } }));
                        }}
                        countdown={countdown}
                        onNext={nextStage}
                        nextText={mode.kind === 'chapter' && mode.c + 1 < chapters.length ? `Stage ${chapters[mode.c + 1].number}: ${chapters[mode.c + 1].short}` : 'Mission summary'}
                        onReplay={() => clock.replay()}
                        onHold={() => setRecapHold(true)}
                    />
                )}

                {mode.kind === 'finale' && (
                    <Finale
                        summary={missionSummary()}
                        score={score}
                        total={allChecks.length}
                        onReplay={start}
                        onDiscover={discover}
                        onStages={() => setStagesOpen(true)}
                        whatIfs={whatIfs.map(({ l, ci, li }) => ({ title: l.title, open: () => openLabel(ci, li) }))}
                    />
                )}

                {/* Contextual card (on request): over the scene on wide screens, a sheet under it on phones. */}
                {chapter && cardShown && (
                    <section key={programKey} className={styles.card} aria-live="polite" aria-labelledby="solar-card-title">
                        {!label && (
                            <button type="button" className={styles.cardClose} aria-label="Hide details" onClick={() => setInvestigate(false)}>
                                <span aria-hidden="true">×</span>
                            </button>
                        )}
                        <p className={styles.cardKicker}>{label ? (label.whatIf ? `What if? · ${chapter.title}` : chapter.title) : `Stage ${chapter.number}`}</p>
                        <h3 id="solar-card-title" className={styles.cardTitle}>
                            {title}
                        </h3>
                        <div className={styles.depth} role="group" aria-label="Depth">
                            <button type="button" aria-pressed={depth === 'explorer'} onClick={() => setDepthSaved('explorer')}>
                                Explorer
                            </button>
                            <button type="button" aria-pressed={depth === 'engineer'} onClick={() => setDepthSaved('engineer')}>
                                Engineer
                            </button>
                        </div>
                        <dl className={styles.facts}>
                            {label && (
                                <div>
                                    <dt>What it is</dt>
                                    <dd>
                                        <Gloss text={label.what} allow={cardAllow[0]} />
                                    </dd>
                                </div>
                            )}
                            <div>
                                <dt>What happens</dt>
                                <dd>
                                    <Gloss text={label ? label.does : chapter.summary} allow={cardAllow[label ? 1 : 0]} />
                                </dd>
                            </div>
                            <div>
                                <dt>Why it matters</dt>
                                <dd>
                                    <Gloss text={label ? label.why : chapter.why} allow={cardAllow[label ? 2 : 1]} />
                                </dd>
                            </div>
                        </dl>
                        {cardReadings.length > 0 && (
                            <dl className={styles.readings} aria-label="Engineering measurements, simulated">
                                {cardReadings.map((r) => (
                                    <div key={r.label}>
                                        <dt>{r.label}</dt>
                                        <dd className={r.tone ? TONE[r.tone] : undefined}>{r.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                        {label?.whatIf && <WhatIfPanel kind={label.whatIf} met={met} />}
                        {(label?.id === 'j-assist' || (!label && chapter.id === 'jupiter' && scientific)) && <AssistDiagram />}
                        {label?.id === 'b-window' && <WindowChart />}
                        {chart && !label?.whatIf && <LessonChart spec={chart} met={met} />}
                        {label && (
                            <details key={`${label.id}-${depth}`} className={`disclosure ${styles.learn}`} open={depth === 'engineer'}>
                                <summary>Learn more</summary>
                                <div className={styles.learnBody}>
                                    <p>
                                        <Gloss text={label.learn} allow={cardAllow[3]} />
                                    </p>
                                    <p className={styles.inScene}>
                                        <strong>In the scene.</strong> <Gloss text={label.happening} allow={cardAllow[4]} />
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
                        {whatIfTopics.length > 0 && (
                            <div className={styles.topics} role="group" aria-label={`${chapter.title}: what if`}>
                                <span className={styles.groupLabel}>What if?</span>
                                {whatIfTopics.map(({ l, i }) => (
                                    <button
                                        key={l.id}
                                        type="button"
                                        className={`${styles.topic} ${styles.whatIfBtn}`}
                                        aria-pressed={mode.kind === 'label' && mode.l === i}
                                        onClick={() => openLabel(chapterIndex, i)}
                                        data-track="station_model_interaction"
                                        data-track-name={`Solar System what if: ${l.title}`}
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

            {/* Scrub bar: the programme's time, with the narrated events marked. */}
            {mode.kind !== 'intro' && (
                <div className={styles.scrub}>
                    <span className={styles.scrubTime} aria-hidden="true">
                        {mmss(clock.time)}
                    </span>
                    <div className={styles.scrubTrack}>
                        <input
                            type="range"
                            min={0}
                            max={clock.duration}
                            step={0.1}
                            value={clock.time}
                            onChange={(e) => clock.seek(Number(e.target.value))}
                            aria-label={`Position in ${title}`}
                            aria-valuetext={`${mmss(clock.time)} of ${mmss(clock.duration)}${beat ? `: ${beat.text}` : ''}`}
                        />
                        {beats.map((b) => (
                            <span key={b.t} className={styles.tick} style={{ left: `${(b.t / clock.duration) * 100}%` }} aria-hidden="true" />
                        ))}
                    </div>
                    <span className={styles.scrubTime} aria-hidden="true">
                        {mmss(clock.duration)}
                    </span>
                    <button type="button" className={styles.speedBtn} onClick={cycleRate} aria-label={`Playback speed ${rate}×`} data-track="station_model_interaction" data-track-name={`Solar System control: speed ${rate}`}>
                        {rate}×
                    </button>
                </div>
            )}

            {/* Bottom: the chapter timeline and the transport controls. */}
            <div className={styles.dock} role="group" aria-label="Mission navigation">
                <div className={styles.transport}>
                    <button type="button" className={styles.tool} onClick={() => step(-1)} aria-label="Previous" disabled={mode.kind === 'intro'} data-track="station_model_interaction" data-track-name="Solar System control: previous">
                        <span aria-hidden="true">‹</span>
                    </button>
                    <button
                        type="button"
                        className={styles.tool}
                        onClick={togglePlay}
                        aria-pressed={!autoplay}
                        aria-label={autoplay ? 'Pause' : 'Play'}
                        aria-keyshortcuts="K"
                        data-track="station_model_interaction"
                        data-track-name={autoplay ? 'Solar System control: pause' : 'Solar System control: play'}
                    >
                        <span aria-hidden="true">{autoplay ? '❚❚' : '▶'}</span>
                    </button>
                    <button type="button" className={styles.tool} onClick={() => step(1)} aria-label="Next" disabled={mode.kind === 'finale'} data-track="station_model_interaction" data-track-name="Solar System control: next">
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
                        const current = !!chapter && chapterIndex === i;
                        const done = progress.done.includes(c.id) || (!!chapter && i < chapterIndex) || mode.kind === 'finale';
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
