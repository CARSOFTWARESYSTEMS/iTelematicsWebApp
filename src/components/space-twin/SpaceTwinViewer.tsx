"use client";
// The Space Digital Twin viewer: four experiences behind one selector and one shared 3D
// canvas. A still poster is always there (and is the fallback without WebGL); the canvas mounts
// when the section nears the screen and animates only while it is visible, the tab is shown and
// the visitor has not paused it. Reduced motion: nothing moves until the visitor presses Play.
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { EXPERIENCES, type ExperienceId } from '@/lib/space-twin/experiences';
import { EXTRA_TABS, NARRATED, parseSpaceLaunch, type Extra, type LaunchSettings } from '@/lib/space-twin/launch';
import { StoryClock, type Hud, type Tone } from '@/lib/space-twin/story';
import { MaturityBadge } from '@/components/site/blocks';
import { useMedia, useNoWebGL, usePageVisible, usePresence, useReducedMotion, useStageQuality } from './device';
import type { ViewHandle } from './rig';
import ShareLink from './ShareLink';
import styles from './SpaceTwin.module.css';

const SpaceTwinCanvas = dynamic(() => import('./SpaceTwinCanvas'), { ssr: false });
// Fifth option (added 2026-11-14): Space Station Electrical Power & Energy Management, a separate experience
// loaded only when its tab is chosen. The four experiences above are unchanged.
const StationPowerExperience = dynamic(() => import('@/components/station-eps/EpsExperience'), { ssr: false });
// Sixth option (added 2026-11-14): Solar System — From Earth Launch to Deep Space Exploration, also a
// separate experience with its own scene, state and resources, loaded only when its tab is chosen.
const SolarSystemExperience = dynamic(() => import('@/components/solar-system/SolarSystemExperience'), { ssr: false });

// Shareable links (added 2026-11-17): /?space_digital_twin=1…6 opens that option, numbered as on the tabs.
// Docs: docs/SPACE_DIGITAL_TWIN_LINKS.md.
const OPTIONS = [...EXPERIENCES, ...EXTRA_TABS];
type Link = LaunchSettings & { id: ExperienceId | Extra };
const isExtra = (id: ExperienceId | Extra): id is Extra => EXTRA_TABS.some((t) => t.id === id);

function launchLabel(link: Link) {
    if (link.autoplay) return link.fullscreen ? 'Enter Full Screen & Start Mission' : 'Start Mission';
    return link.fullscreen ? 'Enter Full Screen' : 'Open Mission';
}

/** One line on what the click starts, true to the link's options and to what the experience has. */
function launchLine(link: Link) {
    const plays = !link.autoplay ? 'Opens at the first stage, paused' : link.autonext ? 'Every stage plays in order' : 'Plays the first stage';
    const audio = NARRATED.includes(link.id) && link.sound ? ['sound', ...(link.voice ? ['voice narration'] : []), ...(link.captions ? ['subtitles'] : [])] : [];
    const withAudio = audio.length ? `, with ${audio.length > 1 ? `${audio.slice(0, -1).join(', ')} and ${audio[audio.length - 1]}` : audio[0]}` : '';
    return `${plays}${withAudio}.`;
}

const POSTER = (id: ExperienceId) => `/images/space-twin/poster-${id}.jpg`;
const SWITCH_MS = 320;

// Full screen (added 2026-11-14, for presenting): the whole viewer covers the screen with the 3D on top and
// only the predefined controls in a bar along the bottom. It uses the browser's Fullscreen API where it
// exists; elsewhere (iPhone Safari) the viewer simply fills the browser window. Esc or Exit leaves.
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => void };
type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
const fullscreenElement = () => document.fullscreenElement ?? (document as FullscreenDocument).webkitFullscreenElement ?? null;

function FullscreenIcon({ exit }: { exit: boolean }) {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            {exit ? <path d="M6 1.5V6H1.5M10 1.5V6h4.5M6 14.5V10H1.5M10 14.5V10h4.5" /> : <path d="M1.5 5.5v-4h4M10.5 1.5h4v4M1.5 10.5v4h4M14.5 10.5v4h-4" />}
        </svg>
    );
}

function HudCard({ hud, steps }: { hud: Hud; steps?: string[] }) {
    return (
        <div className={styles.hudCard} data-alert={hud.alert || undefined}>
            <p className={styles.hudHead}>
                <span className={styles.hudDot} aria-hidden="true" /> Simulated telemetry
            </p>
            <dl className={styles.readings}>
                {hud.mode && (
                    <div>
                        <dt>Mode</dt>
                        <dd>
                            <span className={`${styles.mode} state-${hud.mode.tone}`}>
                                <span className={styles.modeDot} aria-hidden="true" />
                                {hud.mode.label}
                            </span>
                        </dd>
                    </div>
                )}
                {hud.rows.map((r) => (
                    <div key={r.label}>
                        <dt>{r.label}</dt>
                        <dd>
                            <span className={r.tone ? `state-${r.tone as Tone}` : undefined}>{r.value}</span>
                            {r.note && <span className={styles.readingNote}>{r.note}</span>}
                        </dd>
                    </div>
                ))}
            </dl>
            {steps ? (
                <ol className={styles.steps}>
                    {steps.map((s) => (
                        <li key={s}>{s}</li>
                    ))}
                </ol>
            ) : (
                hud.note && <p className={styles.hudNote}>{hud.note}</p>
            )}
            {hud.health && (
                <ul className={styles.health}>
                    {hud.health.map((h) => (
                        <li key={h.name} data-state={h.state}>
                            {h.name}
                            <span className={styles.healthState}>{h.state === 'NOMINAL' ? 'OK' : h.state}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function SpaceTwinViewer() {
    const reducedMotion = useReducedMotion();
    const quality = useStageQuality();
    const noWebGL = useNoWebGL();
    const compact = useMedia('(max-width: 1024px)');
    const pageVisible = usePageVisible();
    const frameRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<HTMLElement>(null);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const { near, onScreen } = usePresence(frameRef);

    const [experienceId, setExperienceId] = useState<ExperienceId>('satellite');
    const [switching, setSwitching] = useState(false);
    const exp = EXPERIENCES.find((e) => e.id === experienceId)!;
    const clock = useMemo(() => new StoryClock(exp.story), [exp]);
    const viewRef = useRef<ViewHandle | null>(null);
    const [phaseIndex, setPhaseIndex] = useState(0);
    const [, setTick] = useState(0);
    // null: follow the visitor's motion preference.
    const [paused, setPaused] = useState<boolean | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [ready, setReady] = useState(false);
    // Restarts the stage progress bar when the visitor jumps to a stage.
    const [run, setRun] = useState(0);
    // The fifth or sixth option, when one is open (they replace the standard frame).
    const [extra, setExtra] = useState<Extra | null>(null);
    const extraOpen = extra !== null;
    const [present, setPresent] = useState(false);

    // A shareable link: the option it opened (until the visitor picks another), whether it waits for the
    // visitor's click (full screen and sound need one) and whether it has started.
    const [link, setLink] = useState<Link | null>(null);
    const [linkWaiting, setLinkWaiting] = useState(false);
    const [linkStarted, setLinkStarted] = useState(false);
    // The fifth and sixth options register their start action once they have loaded.
    const extraStart = useRef<(() => void) | null>(null);
    const [extraReady, setExtraReady] = useState(false);
    const onLinkReady = useCallback((start: () => void) => {
        extraStart.current = start;
        setExtraReady(true);
    }, []);

    // Read once, after hydration (the server never sees the query). The URL is left as it is.
    useEffect(() => {
        const parsed = parseSpaceLaunch(window.location.search, OPTIONS);
        if (!parsed) return;
        setLink(parsed);
        if (isExtra(parsed.id)) setExtra(parsed.id);
        else {
            setExperienceId(parsed.id);
            // Held at the start until the mission starts.
            setPaused(true);
        }
        // A click is needed for full screen and for sound; with reduced motion, the click is the choice to play.
        const audible = NARRATED.includes(parsed.id) && parsed.sound;
        const still = parsed.autoplay && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setLinkWaiting(parsed.fullscreen || audible || still);
        viewerRef.current?.scrollIntoView({ block: 'start' });
        // On narrow screens the tabs scroll sideways: show the chosen one, as a click on it does.
        tabRefs.current[OPTIONS.findIndex((o) => o.id === parsed.id)]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, []);

    useEffect(() => {
        setPhaseIndex(clock.phase);
        const offPhase = clock.onPhase(setPhaseIndex);
        const offTick = clock.onTick(() => setTick((n) => n + 1));
        return () => {
            offPhase();
            offTick();
        };
    }, [clock]);

    const phase = exp.story.phases[phaseIndex];
    const stageIndex = phase.stage;
    const stage = exp.story.stages[stageIndex];
    const autoplay = !(paused ?? reducedMotion);
    // A link plays the story once (all stages, or one with autonext=0) and holds the last frame.
    const storyLink = link && !isExtra(link.id) ? link : null;
    const ended = clock.ended;
    const running = autoplay && !ended;
    const playing = near && onScreen && pageVisible && running && ready && !switching;
    const stageEnd = (i: number) => exp.story.stages[i].start + exp.story.stages[i].seconds;

    const tones = exp.tones(phase.id, selected);
    const chips = exp.chips(clock.time, phase.id, selected, compact);
    const hud = exp.hud(clock.time, clock.elapsed, phase.id, selected);
    const part = exp.parts.find((p) => p.id === selected) ?? null;
    const selectedLabel = part?.name ?? (selected ? chips.find((c) => c.id === selected)?.text : null);

    const select = useCallback((id: string) => {
        setSelected((s) => (s === id ? null : id));
        setPaused(true);
        viewRef.current?.release();
    }, []);

    /** The visitor picked another option: the link no longer applies, everything behaves as normal. */
    const leaveLink = () => {
        if (!link) return;
        if (storyLink) {
            clock.setEnd(null);
            if (!linkStarted) setPaused(null);
        }
        setLink(null);
        setLinkWaiting(false);
        setLinkStarted(false);
        extraStart.current = null;
        setExtraReady(false);
    };

    const switchTo = (id: ExperienceId, i: number) => {
        if (extra || id !== experienceId) leaveLink();
        tabRefs.current[i]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        if (extra) setExtra(null);
        if (id === experienceId) return;
        const apply = () => {
            setExperienceId(id);
            setSelected(null);
            setPhaseIndex(0);
            setRun((r) => r + 1);
            if (paused) setPaused(null);
        };
        if (reducedMotion || !ready) {
            apply();
            return;
        }
        setSwitching(true);
        window.setTimeout(() => {
            apply();
            window.setTimeout(() => setSwitching(false), 60);
        }, SWITCH_MS);
    };

    const openExtra = (id: Extra) => {
        if (id !== link?.id) leaveLink();
        tabRefs.current[EXPERIENCES.length + EXTRA_TABS.findIndex((t) => t.id === id)]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        setExtra(id);
        // The shared canvas unmounts; show the poster again until it is recreated on return.
        setReady(false);
    };

    const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
        const count = EXPERIENCES.length + EXTRA_TABS.length; // the four experiences, Station Power & Energy and Solar System
        const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        const jump = e.key === 'Home' ? 0 : e.key === 'End' ? count - 1 : null;
        if (!delta && jump === null) return;
        e.preventDefault();
        const next = jump ?? (i + delta + count) % count;
        if (next >= EXPERIENCES.length) openExtra(EXTRA_TABS[next - EXPERIENCES.length].id);
        else switchTo(EXPERIENCES[next].id, next);
        tabRefs.current[next]?.focus();
    };

    const goToStage = (i: number) => {
        setSelected(null);
        viewRef.current?.release();
        // With autonext=0 a link plays only the stage the visitor picks.
        if (storyLink && !storyLink.autonext) clock.setEnd(stageEnd(i));
        clock.jumpToStage(i);
        setRun((r) => r + 1);
    };

    const togglePlay = () => {
        if (!running) {
            setSelected(null);
            viewRef.current?.release();
            // A link's story that has played to its end plays again: every stage, or the stage it held.
            if (ended) {
                if (storyLink?.autonext) clock.replay();
                else clock.jumpToStage(stageIndex);
                setRun((r) => r + 1);
            }
        }
        setPaused(running);
    };

    const resetView = () => {
        setSelected(null);
        viewRef.current?.reset();
    };

    const replay = () => {
        setSelected(null);
        viewRef.current?.reset();
        if (storyLink && !storyLink.autonext) clock.setEnd(stageEnd(0));
        clock.replay();
        setRun((r) => r + 1);
        if (paused) setPaused(false);
    };

    const fallback = noWebGL && near;

    // Where the page was: leaving full screen returns there (otherwise scroll anchoring can leave the viewer
    // off-screen when it rejoins the page, and an off-screen scene pauses).
    const presentScroll = useRef<number | null>(null);
    useEffect(() => {
        if (present || presentScroll.current === null) return;
        const y = presentScroll.current;
        presentScroll.current = null;
        if (!fullscreenElement()) {
            window.scrollTo(0, y);
            return;
        }
        // Still leaving the browser's full screen, which moves the page as it goes: restore once it has left.
        const onChange = () => {
            if (fullscreenElement()) return;
            window.scrollTo(0, y);
            off();
        };
        const off = () => {
            document.removeEventListener('fullscreenchange', onChange);
            document.removeEventListener('webkitfullscreenchange', onChange);
        };
        document.addEventListener('fullscreenchange', onChange);
        document.addEventListener('webkitfullscreenchange', onChange);
        return off;
    }, [present]);

    const enterPresent = () => {
        presentScroll.current = window.scrollY;
        setPresent(true);
        const el = viewerRef.current as FullscreenElement | null;
        try {
            if (el?.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
            else el?.webkitRequestFullscreen?.();
        } catch {
            // No Fullscreen API: the viewer still fills the browser window.
        }
    };

    const exitPresent = useCallback(() => {
        setPresent(false);
        const doc = document as FullscreenDocument;
        if (!fullscreenElement()) return;
        try {
            if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
            else doc.webkitExitFullscreen?.();
        } catch {
            // Already left.
        }
    }, []);

    useEffect(() => {
        if (!present) return;
        // Leaving the browser's full screen (Esc, or the system gesture) also leaves presentation.
        let entered = false;
        const onChange = () => {
            if (fullscreenElement()) entered = true;
            else if (entered) setPresent(false);
        };
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Escape') exitPresent();
        };
        document.addEventListener('fullscreenchange', onChange);
        document.addEventListener('webkitfullscreenchange', onChange);
        document.addEventListener('keydown', onKey);
        const overflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('fullscreenchange', onChange);
            document.removeEventListener('webkitfullscreenchange', onChange);
            document.removeEventListener('keydown', onKey);
            document.documentElement.style.overflow = overflow;
        };
    }, [present, exitPresent]);

    /** Starts what a link opened. On a click it runs inside it: sound first, then full screen. */
    const startLink = () => {
        if (!link || linkStarted) return;
        if (isExtra(link.id)) {
            if (!extraStart.current) return;
            extraStart.current();
        } else {
            clock.setEnd(link.autonext ? exp.story.loopSeconds : stageEnd(0));
            setSelected(null);
            viewRef.current?.reset();
            clock.replay();
            setRun((r) => r + 1);
            setPaused(!link.autoplay);
        }
        if (link.fullscreen && !present) enterPresent();
        setLinkWaiting(false);
        setLinkStarted(true);
    };

    // Nothing needs a click (no full screen, no sound): the link starts as soon as the experience is there.
    const canStart = !!link && (!isExtra(link.id) || extraReady);
    const linkOption = link ? OPTIONS.find((o) => o.id === link.id) : undefined;
    // The option on screen, for Share.
    const shown = OPTIONS.find((o) => o.id === (extra ?? experienceId))!;
    useEffect(() => {
        if (canStart && !linkWaiting && !linkStarted) startLink();
        // startLink reads the current render; it runs once, when the link can start.
    }, [canStart, linkWaiting, linkStarted]);

    return (
        <figure ref={viewerRef} className={styles.viewer} aria-labelledby="space-twin-caption" data-present={present || undefined}>
            <div className={styles.selectorRow}>
            <div role="tablist" aria-label="Space experiences" className={styles.selector}>
                {EXPERIENCES.map((e, i) => (
                    <button
                        key={e.id}
                        ref={(el) => {
                            tabRefs.current[i] = el;
                        }}
                        type="button"
                        role="tab"
                        id={`twin-tab-${e.id}`}
                        aria-selected={e.id === experienceId && !extraOpen}
                        aria-controls="twin-stage"
                        tabIndex={e.id === experienceId && !extraOpen ? 0 : -1}
                        className={styles.tab}
                        onClick={() => switchTo(e.id, i)}
                        onKeyDown={(ev) => onTabKey(ev, i)}
                    >
                        <span className={styles.tabNum} aria-hidden="true">
                            {e.number}
                        </span>
                        {e.label}
                    </button>
                ))}
                {EXTRA_TABS.map((t, k) => (
                    <button
                        key={t.id}
                        ref={(el) => {
                            tabRefs.current[EXPERIENCES.length + k] = el;
                        }}
                        type="button"
                        role="tab"
                        id={`twin-tab-${t.id}`}
                        aria-selected={extra === t.id}
                        aria-controls="twin-stage"
                        title={t.title}
                        tabIndex={extra === t.id ? 0 : -1}
                        className={styles.tab}
                        onClick={() => openExtra(t.id)}
                        onKeyDown={(ev) => onTabKey(ev, EXPERIENCES.length + k)}
                        data-track="station_model_interaction"
                        data-track-name={`Space Digital Twin: ${t.number} ${t.label}`}
                    >
                        <span className={styles.tabNum} aria-hidden="true">
                            {t.number}
                        </span>
                        {t.label}
                    </button>
                ))}
            </div>
            <ShareLink number={shown.number} label={shown.label} narrated={NARRATED.includes(shown.id)} />
            <button
                type="button"
                className={styles.presentBtn}
                onClick={present ? exitPresent : enterPresent}
                aria-label={present ? 'Exit full screen' : 'Full screen'}
                title={present ? 'Exit full screen (Esc)' : 'Full screen, for presenting'}
                data-track="station_model_interaction"
                data-track-name={present ? 'Space Digital Twin: exit full screen' : 'Space Digital Twin: full screen'}
            >
                <FullscreenIcon exit={present} />
                <span className={styles.presentLabel}>{present ? 'Exit full screen' : 'Full screen'}</span>
            </button>
            </div>

            <div id="twin-stage" role="tabpanel" aria-labelledby={extra ? `twin-tab-${extra}` : `twin-tab-${experienceId}`} className={styles.stagePanel}>
                {/* A shareable link that needs a click: one action over the scene, which waits behind it. */}
                {linkWaiting && link && linkOption && (
                    <div className={styles.launch} role="group" aria-labelledby="twin-launch-title" aria-describedby="twin-launch-line">
                        <div className={styles.launchInner}>
                            <p className={styles.launchKicker}>Space Digital Twin · {linkOption.number}</p>
                            <p id="twin-launch-title" className={styles.launchTitle}>
                                {linkOption.label}
                            </p>
                            <p id="twin-launch-line" className={styles.launchLine}>
                                {launchLine(link)}
                            </p>
                            <button
                                type="button"
                                className={styles.launchBtn}
                                onClick={startLink}
                                disabled={!canStart}
                                aria-busy={!canStart || undefined}
                                data-track="station_model_interaction"
                                data-track-name={`Space Digital Twin link: start ${linkOption.number}`}
                            >
                                <span className={styles.launchIcon} aria-hidden="true">
                                    <svg viewBox="0 0 16 16" width="14" height="14">
                                        <path d="M5 3.2v9.6l7.8-4.8z" fill="currentColor" />
                                    </svg>
                                </span>
                                {canStart ? launchLabel(link) : 'Preparing the mission…'}
                            </button>
                        </div>
                    </div>
                )}
                {/* Not interactive while the link waits for its click; always present, so nothing remounts. */}
                <div className={styles.stageContent} inert={linkWaiting || undefined}>
                {extra === 'eps' && <StationPowerExperience link={link?.id === 'eps' ? link : undefined} onLinkReady={onLinkReady} />}
                {extra === 'solar' && <SolarSystemExperience link={link?.id === 'solar' ? link : undefined} onLinkReady={onLinkReady} />}
                {/* Hidden (not unmounted) while the fifth or sixth option is open, so the presence observer keeps
                    tracking the frame: it reports it off-screen, which releases the 3D canvas. */}
                <div style={{ display: extraOpen ? 'none' : 'contents' }}>
                <div className={styles.frameWrap}>
                    <div
                        ref={frameRef}
                        className={styles.frame}
                        data-ready={ready || undefined}
                        role="img"
                        aria-label={`${exp.label}: ${exp.summary} Stage ${stageIndex + 1} of 4: ${stage.title}.${selectedLabel ? ` Selected: ${selectedLabel}.` : ''}`}
                    >
                        <Image key={experienceId} className={styles.poster} src={POSTER(experienceId)} alt="" fill sizes="(min-width: 1320px) 1240px, 100vw" />
                        {near && quality !== null && (
                            <div className={styles.canvas} aria-hidden="true">
                                <SpaceTwinCanvas
                                    experience={experienceId}
                                    clock={clock}
                                    phase={phase.id}
                                    playing={playing}
                                    reducedMotion={reducedMotion}
                                    quality={quality}
                                    compact={compact}
                                    selected={selected}
                                    onSelect={select}
                                    tones={tones}
                                    chips={chips}
                                    viewRef={viewRef}
                                    onReady={() => setReady(true)}
                                />
                            </div>
                        )}
                        <div className={styles.veil} data-on={switching || undefined} aria-hidden="true" />

                        <div className={styles.hud} aria-hidden="true">
                            <div className={styles.stageChip}>
                                <span className={styles.stageNum}>{part ? 'Selected' : `0${stageIndex + 1} / 04`}</span>
                                <span className={styles.stageTitle}>{selectedLabel ?? stage.title}</span>
                                {!reducedMotion && !selected && (
                                    <span className={styles.stageBar}>
                                        <span key={`${experienceId}-${stageIndex}-${run}`} className={styles.stageFill} style={{ animationDuration: `${stage.seconds}s`, animationPlayState: playing ? 'running' : 'paused' }} />
                                    </span>
                                )}
                            </div>
                            {hud && <HudCard hud={hud} steps={reducedMotion && !playing && stage.id === 'recovery' ? exp.steps : undefined} />}
                        </div>
                        {fallback && <p className={styles.fallback}>3D isn&rsquo;t available on this device, so a still image is shown.</p>}
                    </div>

                    <div className={styles.tools}>
                        <button type="button" className={styles.tool} aria-pressed={!running} onClick={togglePlay} aria-label={running ? 'Pause the animation' : 'Play the animation'}>
                            <span aria-hidden="true">{running ? '❚❚' : '▶'}</span>
                        </button>
                        <button type="button" className={styles.tool} onClick={resetView} aria-label="Reset the camera view">
                            <span aria-hidden="true">⟲</span>
                        </button>
                        <button type="button" className={styles.tool} onClick={replay} aria-label="Replay from the start">
                            <span aria-hidden="true">⏮</span>
                        </button>
                    </div>
                </div>

                <div className={styles.panel}>
                    <div className={styles.stages} role="group" aria-label={`${exp.label} stages`}>
                        {exp.story.stages.map((s, i) => (
                            <button key={s.id} type="button" className={styles.stageBtn} aria-pressed={stageIndex === i && !selected} onClick={() => goToStage(i)}>
                                <span className={styles.stageBtnNum} aria-hidden="true">
                                    {i + 1}
                                </span>
                                {s.label}
                            </button>
                        ))}
                    </div>
                    {exp.parts.length > 0 && (
                        <div className={styles.parts} role="group" aria-label={`${exp.label} parts`}>
                            {exp.parts.map((p) => (
                                <button key={p.id} type="button" className={styles.partBtn} aria-pressed={selected === p.id} onClick={() => select(p.id)}>
                                    {p.short}
                                </button>
                            ))}
                        </div>
                    )}
                    <div aria-live="polite" className={styles.explainArea}>
                        {part ? (
                            <p className={styles.explain}>
                                <strong>{part.name}:</strong> {part.line}
                            </p>
                        ) : selected ? (
                            <p className={styles.explain}>
                                <strong>{selectedLabel}</strong> selected. Click it again to clear.
                            </p>
                        ) : (
                            <p className={styles.hint}>{exp.pickHint}</p>
                        )}
                    </div>
                    <p className="visually-hidden" aria-live="polite">
                        {`${exp.label}, stage ${stageIndex + 1} of 4: ${stage.title}`}
                    </p>
                </div>
                </div>
                </div>
            </div>

            {!extraOpen && (
            <>
            <figcaption id="space-twin-caption" className={styles.caption}>
                <span className={styles.captionHead}>
                    <MaturityBadge level={exp.maturity} />
                    <span>{exp.model}</span>
                </span>
                <span>
                    Simulated values, not flight data · {exp.timeScale} · Drag sideways to turn; pinch, or Ctrl/⌘ + scroll, to zoom.
                </span>
            </figcaption>

            <details className={`disclosure ${styles.assumptions}`}>
                <summary>Model assumptions and limits</summary>
                <div>
                    <ul>
                        {exp.assumptions.map((a) => (
                            <li key={a}>{a}</li>
                        ))}
                    </ul>
                    <p>
                        Fault detection and protective actions here are deterministic engineering rules, not trained AI. AI-based anomaly detection, battery-health estimation and quantum-inspired scheduling are planned research.
                    </p>
                </div>
            </details>
            </>
            )}
        </figure>
    );
}
