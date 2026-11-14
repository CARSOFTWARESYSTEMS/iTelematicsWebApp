"use client";
// The /space-station interactive model: one station, four stages (Reveal, Explore, Health,
// Recovery), selectable subsystems and compact simulated telemetry from Station Reference Case
// SRC-1. A still poster is always there (and is the fallback without WebGL); the canvas mounts when
// the section nears the screen and animates only while it is visible, the tab is shown and the
// visitor has not paused it. Reduced motion: nothing moves until the visitor presses Play.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { MaturityBadge } from '@/components/site/blocks';
import { useMedia, useNoWebGL, usePageVisible, usePresence, useReducedMotion, useStageQuality } from '@/components/space-twin/device';
import type { ViewHandle } from '@/components/space-twin/rig';
import { track } from '@/lib/analytics/client';
import { StoryClock, type Hud, type Tone } from '@/lib/space-twin/story';
import {
    SRC_ASSUMPTIONS,
    SRC_NAME,
    SRC_PARTS,
    SRC_RATES,
    SRC_RECOVERY_STEPS,
    SRC_STORY,
    SRC_SUMMARY,
    srcChips,
    srcHud,
    srcTones,
} from '@/lib/station-twin/model';
import styles from './StationTwin.module.css';

const StationTwinCanvas = dynamic(() => import('./StationTwinCanvas'), { ssr: false });

const POSTER = '/images/station-twin/poster-station-src1.jpg';
const PICK_HINT = 'Select a subsystem, or click the model, to inspect it. Drag sideways to turn the station.';

function HudCard({ hud, steps }: { hud: Hud; steps?: string[] }) {
    return (
        <div className={styles.hudCard} data-alert={hud.alert || undefined}>
            <p className={styles.hudHead}>
                <span className={styles.hudDot} aria-hidden="true" /> Simulated telemetry · SRC-1
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

export default function StationTwinViewer() {
    const reducedMotion = useReducedMotion();
    const quality = useStageQuality();
    const noWebGL = useNoWebGL();
    const compact = useMedia('(max-width: 1024px)');
    const pageVisible = usePageVisible();
    const frameRef = useRef<HTMLDivElement>(null);
    const { near, onScreen } = usePresence(frameRef);

    const clock = useMemo(() => new StoryClock(SRC_STORY), []);
    const viewRef = useRef<ViewHandle | null>(null);
    const [phaseIndex, setPhaseIndex] = useState(0);
    const [, setTick] = useState(0);
    // null: follow the visitor's motion preference.
    const [paused, setPaused] = useState<boolean | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [ready, setReady] = useState(false);
    // Restarts the stage progress bar when the visitor jumps to a stage.
    const [run, setRun] = useState(0);

    useEffect(() => {
        setPhaseIndex(clock.phase);
        const offPhase = clock.onPhase(setPhaseIndex);
        const offTick = clock.onTick(() => setTick((n) => n + 1));
        return () => {
            offPhase();
            offTick();
        };
    }, [clock]);

    const phase = SRC_STORY.phases[phaseIndex];
    const stageIndex = phase.stage;
    const stage = SRC_STORY.stages[stageIndex];
    const autoplay = !(paused ?? reducedMotion);
    const playing = near && onScreen && pageVisible && autoplay && ready;

    const tones = srcTones(phase.id, selected);
    const chips = srcChips(clock.time, phase.id, selected, compact);
    const hud = srcHud(clock.time, phase.id, selected);
    const part = SRC_PARTS.find((p) => p.id === selected) ?? null;

    const select = useCallback((id: string) => {
        setSelected((s) => (s === id ? null : id));
        setPaused(true);
        viewRef.current?.release();
    }, []);

    // A part picked in the 3D scene: not a DOM click, so it is reported here (button clicks use data-track).
    const pick = useCallback(
        (id: string) => {
            const name = SRC_PARTS.find((p) => p.id === id)?.name ?? id;
            track('station_model_interaction', { section: 'station-model', cta_location: 'station-model-3d', cta_name: `Subsystem (3D): ${name}` });
            select(id);
        },
        [select],
    );

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
    const loading = near && quality !== null && !ready;

    return (
        <figure className={styles.viewer} aria-labelledby="station-twin-caption">
            <div className={styles.stagePanel}>
                <div className={styles.frameWrap}>
                    <div
                        ref={frameRef}
                        className={styles.frame}
                        data-ready={ready || undefined}
                        role="img"
                        aria-label={`${SRC_NAME}: ${SRC_SUMMARY} Stage ${stageIndex + 1} of 4: ${stage.title}.${part ? ` Selected: ${part.name}.` : ''}`}
                    >
                        <Image className={styles.poster} src={POSTER} alt="" fill sizes="(min-width: 1320px) 1240px, 100vw" />
                        {near && quality !== null && (
                            <div className={styles.canvas} aria-hidden="true">
                                <StationTwinCanvas
                                    clock={clock}
                                    phase={phase.id}
                                    playing={playing}
                                    reducedMotion={reducedMotion}
                                    quality={quality}
                                    compact={compact}
                                    selected={selected}
                                    onSelect={pick}
                                    tones={tones}
                                    chips={chips}
                                    viewRef={viewRef}
                                    onReady={() => setReady(true)}
                                />
                            </div>
                        )}
                        {loading && <p className={styles.loading} aria-hidden="true">Loading 3D model…</p>}

                        <div className={styles.hud} aria-hidden="true">
                            <div className={styles.stageChip}>
                                <span className={styles.stageNum}>{part ? 'Selected' : `0${stageIndex + 1} / 04`}</span>
                                <span className={styles.stageTitle}>{part?.name ?? stage.title}</span>
                                {!reducedMotion && !selected && (
                                    <span className={styles.stageBar}>
                                        <span key={`${stageIndex}-${run}`} className={styles.stageFill} style={{ animationDuration: `${stage.seconds}s`, animationPlayState: playing ? 'running' : 'paused' }} />
                                    </span>
                                )}
                            </div>
                            {hud && <HudCard hud={hud} steps={reducedMotion && !playing && stage.id === 'recovery' ? SRC_RECOVERY_STEPS : undefined} />}
                        </div>
                        {fallback && <p className={styles.fallback}>3D isn&rsquo;t available on this device, so a still image is shown.</p>}
                    </div>

                    <div className={styles.tools}>
                        <button type="button" className={styles.tool} aria-pressed={!autoplay} onClick={togglePlay} aria-label={autoplay ? 'Pause the animation' : 'Play the animation'} data-track="station_model_interaction" data-track-name={autoplay ? 'Control: pause' : 'Control: play'}>
                            <span aria-hidden="true">{autoplay ? '❚❚' : '▶'}</span>
                        </button>
                        <button type="button" className={styles.tool} onClick={resetView} aria-label="Reset the camera view" data-track="station_model_interaction" data-track-name="Control: reset view">
                            <span aria-hidden="true">⟲</span>
                        </button>
                        <button type="button" className={styles.tool} onClick={replay} aria-label="Replay from the start" data-track="station_model_interaction" data-track-name="Control: replay">
                            <span aria-hidden="true">⏮</span>
                        </button>
                    </div>
                </div>

                <div className={styles.panel}>
                    <div className={styles.stages} role="group" aria-label="Station model stages">
                        {SRC_STORY.stages.map((s, i) => (
                            <button key={s.id} type="button" className={styles.stageBtn} aria-pressed={stageIndex === i && !selected} onClick={() => goToStage(i)} data-track="station_model_interaction" data-track-name={`Stage: ${s.label}`}>
                                <span className={styles.stageBtnNum} aria-hidden="true">
                                    {i + 1}
                                </span>
                                {s.label}
                            </button>
                        ))}
                    </div>
                    <div className={styles.parts} role="group" aria-label="Station subsystems">
                        {SRC_PARTS.map((p) => (
                            <button key={p.id} type="button" className={styles.partBtn} aria-pressed={selected === p.id} onClick={() => select(p.id)} data-track="station_model_interaction" data-track-name={`Subsystem: ${p.name}`}>
                                {p.short}
                            </button>
                        ))}
                    </div>
                    <div aria-live="polite" className={styles.explainArea}>
                        {part ? (
                            <p className={styles.explain}>
                                <strong>{part.name}:</strong> {part.line}
                                <a href={`#system-${part.system}`} className="inline-link" data-track="station_model_interaction" data-track-name={`Subsystem details: ${part.name}`}>
                                    Subsystem details
                                </a>
                            </p>
                        ) : (
                            <p className={styles.hint}>{PICK_HINT}</p>
                        )}
                    </div>
                    <p className="visually-hidden" aria-live="polite">
                        {`Station model, stage ${stageIndex + 1} of 4: ${stage.title}`}
                    </p>
                </div>
            </div>

            <figcaption id="station-twin-caption" className={styles.caption}>
                <span className={styles.captionHead}>
                    <MaturityBadge level="Concept" />
                    <MaturityBadge level="Simulation" />
                    <span>{SRC_NAME}: a conceptual station driven by a deterministic energy and health simulation. Not an operational digital twin.</span>
                </span>
                <span>
                    Simulated values, not flight data · Time compressed: 1 s ≈ {SRC_RATES.overview} min, slowed to 1 s ≈ {SRC_RATES.recovery} min during Recovery · Drag sideways to turn; pinch, or Ctrl/⌘ + scroll, to zoom.
                </span>
            </figcaption>

            <details className={`disclosure ${styles.assumptions}`}>
                <summary>Model assumptions and limits</summary>
                <div>
                    <ul>
                        {SRC_ASSUMPTIONS.map((a) => (
                            <li key={a}>{a}</li>
                        ))}
                    </ul>
                    <p>
                        Fault detection and the protective response are deterministic engineering rules, not trained AI. The fault is injected into
                        the simulation only; nothing here connects to any real control system.
                    </p>
                </div>
            </details>
        </figure>
    );
}
