"use client";
// Space Station Electrical Power & Energy Management: the fifth Space Digital Twin option.
// A guided engineering investigation rather than a free simulator: the visitor picks a topic (or
// starts the guided walkthrough, or a fault investigation) and the experience positions the camera,
// highlights the hardware, animates the modelled behaviour and shows simulated telemetry, health and
// an engineering insight. Everything shown derives from one model (lib/station-eps/model.ts).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useMedia, useNoWebGL, usePageVisible, usePresence, useReducedMotion, useStageQuality } from '@/components/space-twin/device';
import { StoryClock } from '@/lib/space-twin/story';
import { useLinkStart, type LinkProps } from '@/components/space-twin/launch';
import type { Health } from '@/lib/station-eps/model';
import { DATA_LABEL, EPS_MESSAGE, EPS_SECONDARY, EPS_STORY, EPS_SUPPORT, EPS_TITLE, FAULTS, GUIDED, LABELS, OVERVIEW, OVERVIEW_STAGES, type Scene } from '@/lib/station-eps/scenes';
import { sampleNow } from './EpsScene';
import styles from './EpsExperience.module.css';

const EpsCanvas = dynamic(() => import('./EpsCanvas'), { ssr: false });
const POSTER = '/images/station-twin/poster-station-src1.jpg';

type Mode = { kind: 'overview' } | { kind: 'label'; i: number } | { kind: 'fault'; i: number } | { kind: 'guided'; i: number };
type Menu = 'subsystems' | 'faults' | null;

const HEALTH_TONE: Record<Health, string> = { Normal: 'state-nominal', Warning: 'state-solar', Critical: 'state-fault', Degraded: 'state-solar', 'Not Available': 'state-fault' };

function sceneOf(mode: Mode): Scene {
    if (mode.kind === 'label') return LABELS[mode.i];
    if (mode.kind === 'fault') return FAULTS[mode.i].scene;
    if (mode.kind === 'guided') return GUIDED[mode.i].scene;
    return OVERVIEW;
}

/** Labels and faults loop their window; the overview and the guided steps play once. */
const loops = (mode: Mode) => mode.kind === 'label' || mode.kind === 'fault';

export default function EpsExperience(linkProps: LinkProps = {}) {
    // A shareable link (docs/SPACE_DIGITAL_TWIN_LINKS.md) starts the guided investigation, held until the viewer starts it.
    const { link } = linkProps;
    const reducedMotion = useReducedMotion();
    const quality = useStageQuality();
    const noWebGL = useNoWebGL();
    const compact = useMedia('(max-width: 1024px)');
    const pageVisible = usePageVisible();
    const frameRef = useRef<HTMLDivElement>(null);
    const { near, onScreen } = usePresence(frameRef);

    const [mode, setMode] = useState<Mode>({ kind: 'overview' });
    const [menu, setMenu] = useState<Menu>(null);
    const [paused, setPaused] = useState<boolean | null>(link ? true : null);
    const [overlay, setOverlay] = useState(true);
    const [ready, setReady] = useState(false);
    const [, setTick] = useState(0);

    const scene = sceneOf(mode);
    const sceneKey = `${mode.kind}-${'i' in mode ? mode.i : 0}`;
    const clock = useMemo(
        () =>
            new StoryClock(
                { stages: [{ id: 'scene', label: scene.title, title: scene.title, start: 0, seconds: scene.seconds }], phases: [{ id: 'scene', stage: 0, start: 0 }], loopSeconds: loops(mode) ? scene.seconds : 1e6 },
                0.25,
            ),
        // A new clock per scene: every scene starts at its own beginning.
        [sceneKey],
    );

    const autoplay = !(paused ?? reducedMotion);
    const playing = near && onScreen && pageVisible && autoplay && ready;

    const advanceGuided = useCallback(() => {
        setMode((m) => (m.kind === 'guided' ? (m.i + 1 < GUIDED.length ? { kind: 'guided', i: m.i + 1 } : { kind: 'overview' }) : m));
    }, []);

    useEffect(() => {
        const off = clock.onTick(() => {
            setTick((n) => n + 1);
            // A link with autonext=0 holds the end of the step instead of moving on.
            if (mode.kind === 'guided' && clock.time >= scene.seconds && link?.autonext !== false) advanceGuided();
        });
        return off;
    }, [clock, mode.kind, scene.seconds, advanceGuided, link]);

    const sample = sampleNow(scene, clock);
    const tonesKey = JSON.stringify(scene.tones(sample));
    // Only a change of highlight re-renders the station model, not every telemetry tick.
    const tones = useMemo(() => JSON.parse(tonesKey), [tonesKey]);
    const chips = mode.kind === 'overview' ? [] : scene.chips(sample, compact);
    const telemetry = mode.kind === 'overview' ? [] : scene.telemetry(sample);
    const health = mode.kind === 'overview' ? null : scene.health(sample);
    const insight = mode.kind === 'overview' ? null : scene.insight(sample);
    const fault = mode.kind === 'fault' ? FAULTS[mode.i] : mode.kind === 'guided' && scene.id.startsWith('fault-') ? FAULTS.find((f) => f.scene.id === scene.id) ?? null : null;
    const overviewStage = Math.min(OVERVIEW_STAGES.length - 1, Math.floor((reducedMotion ? 99 : clock.time) / 3.5));
    const progress = Math.min(1, clock.time / scene.seconds);

    const go = (next: Mode) => {
        setMode(next);
        if (paused) setPaused(null);
    };
    const start = () => {
        setMenu(null);
        go({ kind: 'guided', i: 0 });
    };
    useLinkStart(linkProps, () => {
        start();
        setPaused(link ? !link.autoplay : null);
    });
    const step = (delta: 1 | -1) => {
        if (mode.kind === 'overview') return go({ kind: 'label', i: delta > 0 ? 0 : LABELS.length - 1 });
        const n = mode.kind === 'label' ? LABELS.length : mode.kind === 'fault' ? FAULTS.length : GUIDED.length;
        const i = (mode.i + delta + n) % n;
        go({ ...mode, i } as Mode);
    };
    const back = () => {
        setMenu(null);
        go({ kind: 'overview' });
    };

    const title = mode.kind === 'overview' ? OVERVIEW_STAGES[overviewStage] : scene.title;
    const caption = mode.kind === 'guided' ? `${mode.i + 1} / ${GUIDED.length} · ${GUIDED[mode.i].caption}` : mode.kind === 'label' ? `${String(mode.i + 1).padStart(2, '0')} / ${LABELS.length}` : mode.kind === 'fault' ? 'Fault investigation' : 'Overview';
    const live = near && quality !== null && !noWebGL;
    // The highlighted button follows the visitor's choice: an open list first, otherwise what is showing.
    // In the overview nothing is chosen yet, so no button is highlighted.
    const chosen = menu ?? (mode.kind === 'guided' ? 'guided' : mode.kind === 'label' ? 'subsystems' : mode.kind === 'fault' ? 'faults' : null);

    return (
        <div className={styles.eps}>
            <div className={styles.stage}>
                <div
                    ref={frameRef}
                    className={styles.viewport}
                    data-ready={ready || undefined}
                    role="img"
                    aria-label={`${EPS_TITLE}. ${title}. ${mode.kind === 'overview' ? EPS_SUPPORT : scene.what} ${DATA_LABEL}.`}
                >
                    <Image className={styles.poster} src={POSTER} alt="" fill sizes="(min-width: 1320px) 900px, 100vw" />
                    {live && (
                        <div className={styles.canvas} aria-hidden="true">
                            <EpsCanvas scene={scene} clock={clock} overview={mode.kind === 'overview'} playing={playing} reducedMotion={reducedMotion} overlay={overlay} quality={quality} tones={tones} chips={chips} onReady={() => setReady(true)} />
                        </div>
                    )}
                    <div className={styles.hud} aria-hidden="true">
                        <div className={styles.titleChip}>
                            <span className={styles.titleNum}>{caption}</span>
                            <span className={styles.titleText}>{title}</span>
                            {!reducedMotion && (
                                <span className={styles.bar}>
                                    <span className={styles.fill} style={{ transform: `scaleX(${loops(mode) ? progress : Math.min(1, progress)})` }} />
                                </span>
                            )}
                        </div>
                        <span className={styles.dataLabel}>{DATA_LABEL}</span>
                        {mode.kind === 'overview' && overviewStage === OVERVIEW_STAGES.length - 1 && (
                            <div className={styles.message}>
                                <p className={styles.messageTitle}>{EPS_MESSAGE}</p>
                                <p className={styles.messageText}>{EPS_SUPPORT}</p>
                                <p className={styles.messageSecondary}>{EPS_SECONDARY}</p>
                            </div>
                        )}
                    </div>
                    {live === false && near && noWebGL && <p className={styles.fallback}>3D isn&rsquo;t available on this device, so a still image is shown; the investigation panel works as normal.</p>}
                </div>

                <div className={styles.controls} role="group" aria-label="Investigation navigation">
                    <button type="button" className={styles.tool} onClick={() => step(-1)} aria-label="Previous" data-track="station_model_interaction" data-track-name="EPS control: previous">
                        <span aria-hidden="true">‹</span>
                    </button>
                    <button type="button" className={styles.tool} onClick={() => setPaused(autoplay)} aria-pressed={!autoplay} aria-label={autoplay ? 'Pause' : 'Play'} data-track="station_model_interaction" data-track-name={autoplay ? 'EPS control: pause' : 'EPS control: play'}>
                        <span aria-hidden="true">{autoplay ? '❚❚' : '▶'}</span>
                    </button>
                    <button type="button" className={styles.tool} onClick={() => clock.replay()} aria-label="Replay" data-track="station_model_interaction" data-track-name="EPS control: replay">
                        <span aria-hidden="true">⏮</span>
                    </button>
                    <button type="button" className={styles.tool} onClick={() => step(1)} aria-label="Next" data-track="station_model_interaction" data-track-name="EPS control: next">
                        <span aria-hidden="true">›</span>
                    </button>
                    <button type="button" className={styles.toolWide} onClick={back} disabled={mode.kind === 'overview'} data-track="station_model_interaction" data-track-name="EPS control: back">
                        Back
                    </button>
                    <button type="button" className={styles.toolWide} onClick={() => setOverlay(!overlay)} aria-pressed={overlay} data-track="station_model_interaction" data-track-name={overlay ? 'EPS control: hide overlay' : 'EPS control: show overlay'}>
                        {overlay ? 'Hide overlay' : 'Show overlay'}
                    </button>
                </div>
            </div>

            <aside className={styles.side} aria-label="Investigation">
                <div className={styles.sideScroll}>
                <div className={styles.primary}>
                    <button type="button" className={`btn ${chosen === 'guided' ? 'btn-primary' : 'btn-secondary'} ${styles.primaryBtn}`} aria-current={chosen === 'guided' || undefined} onClick={start} data-track="station_model_interaction" data-track-name="EPS: start investigation">
                        Start Investigation
                    </button>
                    <button type="button" className={`btn ${chosen === 'subsystems' ? 'btn-primary' : 'btn-secondary'} ${styles.primaryBtn}`} aria-current={chosen === 'subsystems' || undefined} aria-expanded={menu === 'subsystems'} onClick={() => setMenu(menu === 'subsystems' ? null : 'subsystems')} data-track="station_model_interaction" data-track-name="EPS: subsystems">
                        Subsystems
                    </button>
                    <button type="button" className={`btn ${chosen === 'faults' ? 'btn-primary' : 'btn-secondary'} ${styles.primaryBtn}`} aria-current={chosen === 'faults' || undefined} aria-expanded={menu === 'faults'} onClick={() => setMenu(menu === 'faults' ? null : 'faults')} data-track="station_model_interaction" data-track-name="EPS: fault investigation">
                        Fault Investigation
                    </button>
                </div>

                {menu === 'subsystems' && (
                    <ol className={styles.list} aria-label="Subsystem investigations">
                        {LABELS.map((l, i) => (
                            <li key={l.id}>
                                <button type="button" className={styles.item} aria-pressed={mode.kind === 'label' && mode.i === i} onClick={() => go({ kind: 'label', i })} data-track="station_model_interaction" data-track-name={`EPS label: ${l.title}`}>
                                    <span className={styles.itemNum} aria-hidden="true">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    {l.title}
                                </button>
                            </li>
                        ))}
                    </ol>
                )}
                {menu === 'faults' && (
                    <ul className={styles.list} aria-label="Fault investigations">
                        {FAULTS.map((f, i) => (
                            <li key={f.id}>
                                <button type="button" className={styles.item} aria-pressed={mode.kind === 'fault' && mode.i === i} onClick={() => go({ kind: 'fault', i })} data-track="station_model_interaction" data-track-name={`EPS fault: ${f.title}`}>
                                    {f.title}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <section className={styles.info} aria-live="polite" aria-labelledby="eps-info-title">
                    {mode.kind === 'overview' ? (
                        <>
                            <p className={styles.kicker}>05 · Space Digital Twin</p>
                            <h3 id="eps-info-title" className={styles.infoTitle}>
                                {EPS_TITLE}
                            </h3>
                            <p className={styles.text}>{EPS_SUPPORT}</p>
                            <ol className={styles.story} aria-label="The engineering story">
                                {EPS_STORY.map((s) => (
                                    <li key={s}>{s}</li>
                                ))}
                            </ol>
                            <p className={styles.note}>
                                A conceptual station (SRC-1) and its modelled power system. Values are simulated, not flight or live data; recovery actions are simulated, not spacecraft commands.
                            </p>
                        </>
                    ) : (
                        <>
                            <p className={styles.kicker}>{caption}</p>
                            <h3 id="eps-info-title" className={styles.infoTitle}>
                                {scene.title}
                            </h3>
                            <dl className={styles.facts}>
                                <div>
                                    <dt>What it does</dt>
                                    <dd>{scene.what}</dd>
                                </div>
                                <div>
                                    <dt>Why it matters</dt>
                                    <dd>{scene.why}</dd>
                                </div>
                            </dl>
                            <div className={styles.telemetry}>
                                <p className={styles.telemetryHead}>
                                    <span className={styles.dot} aria-hidden="true" /> Engineering telemetry · simulated
                                </p>
                                <dl>
                                    {telemetry.map((r) => (
                                        <div key={r.label}>
                                            <dt>{r.label}</dt>
                                            <dd className={r.tone ? `state-${r.tone}` : undefined}>{r.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                            {health && (
                                <p className={styles.health}>
                                    Health <span className={`badge ${HEALTH_TONE[health]}`}>{health}</span>
                                </p>
                            )}
                            <p className={styles.insight}>
                                <strong>Engineering insight.</strong> {insight}
                            </p>
                            {fault && (
                                <div className={styles.outcome}>
                                    <p className={styles.telemetryHead}>Investigation</p>
                                    <dl>
                                        <div>
                                            <dt>Fault</dt>
                                            <dd>{fault.diagnostic.name}</dd>
                                        </div>
                                        <div>
                                            <dt>Affected component</dt>
                                            <dd>{fault.diagnostic.component}</dd>
                                        </div>
                                        <div>
                                            <dt>Expected</dt>
                                            <dd>{fault.diagnostic.expected}</dd>
                                        </div>
                                        <div>
                                            <dt>Observed (simulated)</dt>
                                            <dd>{fault.diagnostic.observed}</dd>
                                        </div>
                                        <div>
                                            <dt>Detection condition</dt>
                                            <dd>{fault.diagnostic.detection}</dd>
                                        </div>
                                        <div>
                                            <dt>Severity</dt>
                                            <dd>{fault.diagnostic.severity}</dd>
                                        </div>
                                        <div>
                                            <dt>Effect on power</dt>
                                            <dd>{fault.diagnostic.effect}</dd>
                                        </div>
                                        <div>
                                            <dt>Protective response</dt>
                                            <dd>{fault.diagnostic.response}</dd>
                                        </div>
                                        <div>
                                            <dt>Outcome</dt>
                                            <dd className={sample.recovery === 'Recovered' ? 'state-nominal' : sample.recovery ? 'state-solar' : undefined}>{sample.recovery ?? 'Evaluating'}</dd>
                                        </div>
                                    </dl>
                                </div>
                            )}
                            <p className={styles.question}>{scene.question}</p>
                            <details className={`disclosure ${styles.more}`}>
                                <summary>Learn more</summary>
                                <div>
                                    <ul className={styles.formulas}>
                                        {scene.learnMore.formulas.map((f) => (
                                            <li key={f}>
                                                <code>{f}</code>
                                            </li>
                                        ))}
                                    </ul>
                                    <ul className={styles.notes}>
                                        {scene.learnMore.notes.map((n) => (
                                            <li key={n}>{n}</li>
                                        ))}
                                    </ul>
                                </div>
                            </details>
                        </>
                    )}
                </section>
                </div>
            </aside>
        </div>
    );
}
