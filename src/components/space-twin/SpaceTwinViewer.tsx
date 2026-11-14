"use client";
// The Space Digital Twin viewer: four experiences behind one selector and one shared 3D
// canvas. A still poster is always there (and is the fallback without WebGL); the canvas mounts
// when the section nears the screen and animates only while it is visible, the tab is shown and
// the visitor has not paused it. Reduced motion: nothing moves until the visitor presses Play.
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { EXPERIENCES, type ExperienceId } from '@/lib/space-twin/experiences';
import { StoryClock, type Hud, type Tone } from '@/lib/space-twin/story';
import { MaturityBadge } from '@/components/site/blocks';
import { useMedia, useNoWebGL, usePageVisible, usePresence, useReducedMotion, useStageQuality } from './device';
import type { ViewHandle } from './rig';
import styles from './SpaceTwin.module.css';

const SpaceTwinCanvas = dynamic(() => import('./SpaceTwinCanvas'), { ssr: false });
// Fifth option (added 2026-11-14): Space Station Electrical Power & Energy Management, a separate experience
// loaded only when its tab is chosen. The four experiences above are unchanged.
const StationPowerExperience = dynamic(() => import('@/components/station-eps/EpsExperience'), { ssr: false });
const EPS_TAB = { number: '05', label: 'Station Power & Energy', title: 'Space Station Electrical Power & Energy Management Digital Twin' } as const;

const POSTER = (id: ExperienceId) => `/images/space-twin/poster-${id}.jpg`;
const SWITCH_MS = 320;

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
    const [eps, setEps] = useState(false);

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
    const playing = near && onScreen && pageVisible && autoplay && ready && !switching;

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

    const switchTo = (id: ExperienceId, i: number) => {
        tabRefs.current[i]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        if (eps) setEps(false);
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

    const openEps = () => {
        tabRefs.current[EXPERIENCES.length]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        setEps(true);
        // The shared canvas unmounts; show the poster again until it is recreated on return.
        setReady(false);
    };

    const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
        const count = EXPERIENCES.length + 1; // the four experiences and Station Power & Energy
        const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        const jump = e.key === 'Home' ? 0 : e.key === 'End' ? count - 1 : null;
        if (!delta && jump === null) return;
        e.preventDefault();
        const next = jump ?? (i + delta + count) % count;
        if (next === EXPERIENCES.length) openEps();
        else switchTo(EXPERIENCES[next].id, next);
        tabRefs.current[next]?.focus();
    };

    const goToStage = (i: number) => {
        setSelected(null);
        viewRef.current?.release();
        clock.jumpToStage(i);
        setRun((r) => r + 1);
    };

    const togglePlay = () => {
        if (!autoplay) {
            setSelected(null);
            viewRef.current?.release();
        }
        setPaused(autoplay);
    };

    const resetView = () => {
        setSelected(null);
        viewRef.current?.reset();
    };

    const replay = () => {
        setSelected(null);
        viewRef.current?.reset();
        clock.replay();
        setRun((r) => r + 1);
        if (paused) setPaused(false);
    };

    const fallback = noWebGL && near;

    return (
        <figure className={styles.viewer} aria-labelledby="space-twin-caption">
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
                        aria-selected={e.id === experienceId && !eps}
                        aria-controls="twin-stage"
                        tabIndex={e.id === experienceId && !eps ? 0 : -1}
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
                <button
                    ref={(el) => {
                        tabRefs.current[EXPERIENCES.length] = el;
                    }}
                    type="button"
                    role="tab"
                    id="twin-tab-eps"
                    aria-selected={eps}
                    aria-controls="twin-stage"
                    title={EPS_TAB.title}
                    tabIndex={eps ? 0 : -1}
                    className={styles.tab}
                    onClick={openEps}
                    onKeyDown={(ev) => onTabKey(ev, EXPERIENCES.length)}
                    data-track="station_model_interaction"
                    data-track-name={`Space Digital Twin: ${EPS_TAB.number} ${EPS_TAB.label}`}
                >
                    <span className={styles.tabNum} aria-hidden="true">
                        {EPS_TAB.number}
                    </span>
                    {EPS_TAB.label}
                </button>
            </div>

            <div id="twin-stage" role="tabpanel" aria-labelledby={eps ? 'twin-tab-eps' : `twin-tab-${experienceId}`} className={styles.stagePanel}>
                {eps && <StationPowerExperience />}
                {/* Hidden (not unmounted) while the fifth option is open, so the presence observer keeps
                    tracking the frame: it reports it off-screen, which releases the 3D canvas. */}
                <div style={{ display: eps ? 'none' : 'contents' }}>
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
                        <button type="button" className={styles.tool} aria-pressed={!autoplay} onClick={togglePlay} aria-label={autoplay ? 'Pause the animation' : 'Play the animation'}>
                            <span aria-hidden="true">{autoplay ? '❚❚' : '▶'}</span>
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

            {!eps && (
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
