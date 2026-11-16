'use client';
// Learning components of the Solar System experience (see lib/solar-system/learning.ts): glossary terms
// in the text, charts of the modelled readings, the trajectory mini-map, the gravity-assist vector
// diagram, the launch-window chart, the fault-scenario panels, the end-of-stage recap with its quick
// check, and the end-of-mission summary. All drawn as inline SVG from the same models as the scene.
import { Fragment, useId, useMemo, useState, type ReactNode } from 'react';
import { AU, MU_SUN } from '@/lib/solar-system/constants';
import { DAY, isoDate, jd, norm, positionAU, state, sub, type Vec } from '@/lib/solar-system/ephemeris';
import { flight, sampleAt } from '@/lib/solar-system/flight';
import { lambert } from '@/lib/solar-system/lambert';
import { GLOSSARY, sampleSeries, type ChartSpec, type Check, type Term } from '@/lib/solar-system/learning';
import { dateOf, metOf } from '@/lib/solar-system/phaseB';
import { ENGINE_OUT, engineOutFlight } from '@/lib/solar-system/scenarios';
import { rtgFaultScenario } from '@/lib/solar-system/spacecraft';
import { CONJUNCTION_LIMIT_DEG, conjunctions, LAUNCH_WINDOW, legPoints, missionTrajectory, planetAt, spacecraftAt, sunEarthProbeAngle } from '@/lib/solar-system/trajectory';
import styles from './SolarSystemExperience.module.css';

// ── Glossary ──────────────────────────────────────────────────────────────

function TermButton({ term, children }: { term: Term; children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const id = useId();
    return (
        <span className={styles.termWrap}>
            <button
                type="button"
                className={styles.term}
                aria-expanded={open}
                aria-describedby={open ? id : undefined}
                onClick={() => setOpen(!open)}
                onBlur={() => setOpen(false)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        e.stopPropagation();
                        setOpen(false);
                    }
                }}
            >
                {children}
            </button>
            {open && (
                <span role="tooltip" id={id} className={styles.termTip}>
                    <strong>{term.term}.</strong> {term.text}
                </span>
            )}
        </span>
    );
}

/** First occurrence of each glossary term in a text, in order: [term, index, length]. */
function findTerms(text: string) {
    const out: { term: Term; index: number; length: number }[] = [];
    for (const term of GLOSSARY) {
        const m = term.match.exec(text);
        if (m) out.push({ term, index: m.index, length: m[0].length });
    }
    return out.sort((a, b) => a.index - b.index);
}

/**
 * Which terms each text block of a card explains: a term is marked only where it first appears in the
 * card (pure, so double rendering cannot change it).
 */
export function planTerms(texts: string[]): Set<string>[] {
    const seen = new Set<string>();
    return texts.map((t) => {
        const own = new Set<string>();
        for (const f of findTerms(t)) {
            if (seen.has(f.term.id)) continue;
            seen.add(f.term.id);
            own.add(f.term.id);
        }
        return own;
    });
}

/** Text with its technical terms explained on tap (those in `allow`). */
export function Gloss({ text, allow }: { text: string; allow: Set<string> }) {
    const out: ReactNode[] = [];
    let pos = 0;
    let key = 0;
    for (const f of findTerms(text)) {
        if (!allow.has(f.term.id) || f.index < pos) continue;
        out.push(<Fragment key={key++}>{text.slice(pos, f.index)}</Fragment>);
        out.push(
            <TermButton key={key++} term={f.term}>
                {text.slice(f.index, f.index + f.length)}
            </TermButton>,
        );
        pos = f.index + f.length;
    }
    out.push(<Fragment key={key++}>{text.slice(pos)}</Fragment>);
    return <>{out}</>;
}

// ── Charts ────────────────────────────────────────────────────────────────

interface Series {
    label: string;
    points: { x: number; v: number }[];
    tone?: 'a' | 'b' | 'c';
}

/** A small line chart: one or two series, "now", a marked moment and a reference line. */
export function Chart({
    title,
    unit,
    series,
    now,
    mark,
    line,
    log,
    xLabels,
}: {
    title: string;
    unit: string;
    series: Series[];
    now?: number;
    mark?: { x: number; text: string };
    line?: { value: number; text: string };
    log?: boolean;
    xLabels: [string, string];
}) {
    const W = 300;
    const H = 96;
    const pad = { l: 6, r: 6, t: 8, b: 16 };
    const xs = series[0].points.map((p) => p.x);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const f = (v: number) => (log ? Math.log10(Math.max(1e-6, v)) : v);
    const all = series.flatMap((s) => s.points.map((p) => f(p.v)));
    if (line) all.push(f(line.value));
    let y0 = Math.min(...all);
    let y1 = Math.max(...all);
    if (y1 - y0 < 1e-9) {
        y0 -= 1;
        y1 += 1;
    }
    const X = (x: number) => pad.l + ((x - x0) / (x1 - x0 || 1)) * (W - pad.l - pad.r);
    const Yv = (v: number) => pad.t + (1 - (f(v) - y0) / (y1 - y0)) * (H - pad.t - pad.b);
    const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));
    const lo = log ? Math.pow(10, y0) : y0;
    const hi = log ? Math.pow(10, y1) : y1;
    const nowSeries = now !== undefined ? series.map((s) => s.points.reduce((a, p) => (Math.abs(p.x - now) < Math.abs(a.x - now) ? p : a), s.points[0])) : [];
    return (
        <figure className={styles.chart}>
            <figcaption className={styles.chartTitle}>
                <span>
                    {title}, {unit}
                </span>
                {nowSeries[0] && <strong>{fmt(nowSeries[0].v)}</strong>}
            </figcaption>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} chart, from ${fmt(lo)} to ${fmt(hi)} ${unit}${mark ? `; ${mark.text} marked` : ''}`}>
                <text x={W - pad.r} y={pad.t + 2} className={styles.chartAxis} textAnchor="end">
                    {fmt(hi)}
                </text>
                <text x={W - pad.r} y={H - pad.b - 2} className={styles.chartAxis} textAnchor="end">
                    {fmt(lo)}
                </text>
                {line && (
                    <g>
                        <line x1={pad.l} x2={W - pad.r} y1={Yv(line.value)} y2={Yv(line.value)} className={styles.chartRef} />
                        <text x={pad.l + 2} y={Yv(line.value) - 3} className={styles.chartAxis}>
                            {line.text}
                        </text>
                    </g>
                )}
                {mark && (
                    <g>
                        <line x1={X(mark.x)} x2={X(mark.x)} y1={pad.t} y2={H - pad.b} className={styles.chartMark} />
                        <text x={X(mark.x) + 3} y={H - pad.b - 4} className={styles.chartAxis}>
                            {mark.text}
                        </text>
                    </g>
                )}
                {series.map((s, i) => (
                    <polyline key={s.label} points={s.points.map((p) => `${X(p.x).toFixed(1)},${Yv(p.v).toFixed(1)}`).join(' ')} className={styles.chartLine} data-tone={s.tone ?? (i === 0 ? 'a' : 'b')} />
                ))}
                {now !== undefined && now >= x0 && now <= x1 && (
                    <g>
                        <line x1={X(now)} x2={X(now)} y1={pad.t} y2={H - pad.b} className={styles.chartNow} />
                        {nowSeries.map((p, i) => (
                            <circle key={i} cx={X(p.x)} cy={Yv(p.v)} r={3} className={styles.chartDot} />
                        ))}
                    </g>
                )}
                <text x={pad.l} y={H - 3} className={styles.chartAxis}>
                    {xLabels[0]}
                </text>
                <text x={W - pad.r} y={H - 3} className={styles.chartAxis} textAnchor="end">
                    {xLabels[1]}
                </text>
            </svg>
            {series.length > 1 && (
                <p className={styles.chartLegend}>
                    {series.map((s, i) => (
                        <span key={s.label} data-tone={s.tone ?? (i === 0 ? 'a' : 'b')}>
                            {s.label}
                        </span>
                    ))}
                </p>
            )}
        </figure>
    );
}

const metText = (met: number) => (Math.abs(met) < 2.5 * 86400 ? (met < 3600 ? `T+${Math.round(met)} s` : `T+${(met / 3600).toFixed(1)} h`) : isoDate(dateOf(met)));

/** A chapter chart (learning.ts) with the current mission time marked. */
export function LessonChart({ spec, met }: { spec: ChartSpec; met: number }) {
    const series = useMemo(() => spec.series.map((s, i) => ({ label: s.label, tone: (i === 0 ? 'a' : 'b') as 'a' | 'b', points: sampleSeries(s.key, spec.range).map((p) => ({ x: p.met, v: p.v })) })), [spec]);
    return <Chart title={spec.title} unit={spec.unit} series={series} now={met} mark={spec.mark ? { x: spec.mark.met, text: spec.mark.text } : undefined} line={spec.line} log={spec.log} xLabels={[metText(spec.range[0]), metText(spec.range[1])]} />;
}

// ── Mini-map: where RSC-1 is (cinematic cruise and encounters) ────────────

const orbitAU = (id: 'earth' | 'jupiter' | 'saturn', days: number, t0: number) => Array.from({ length: 121 }, (_, i) => positionAU(id, t0 + (days * i) / 120));

export function MiniMap({ met }: { met: number }) {
    const m = missionTrajectory();
    const geo = useMemo(
        () => ({
            earth: orbitAU('earth', 365.25, m.launch),
            jupiter: orbitAU('jupiter', 4332.6, m.launch),
            saturn: orbitAU('saturn', 10759, m.launch),
            leg1: legPoints(1, 120).map((v) => [v[0] / AU, v[1] / AU, v[2] / AU] as Vec),
            leg2: legPoints(2, 120).map((v) => [v[0] / AU, v[1] / AU, v[2] / AU] as Vec),
        }),
        [m.launch],
    );
    const t = dateOf(met);
    const outer = t > m.jupiter + 30;
    const R = outer ? 10.4 : 5.9;
    const S = 64;
    const P = (v: Vec) => `${(S + (v[0] / R) * S).toFixed(1)},${(S - (v[1] / R) * S).toFixed(1)}`;
    const pt = (v: Vec) => ({ x: S + (v[0] / R) * S, y: S - (v[1] / R) * S });
    const sc = pt(spacecraftAt(t).r.map((x) => x / AU) as Vec);
    const earth = pt(planetAt('earth', t).map((x) => x / AU) as Vec);
    const jup = pt(planetAt('jupiter', t).map((x) => x / AU) as Vec);
    const sat = pt(planetAt('saturn', t).map((x) => x / AU) as Vec);
    const flown = (leg: Vec[], t0: number, t1: number) => leg.slice(0, Math.max(1, Math.round(Math.max(0, Math.min(1, (t - t0) / (t1 - t0))) * 120) + 1));
    return (
        <figure className={styles.miniMap} aria-label={`Where RSC-1 is on ${isoDate(t)}: ${(norm(spacecraftAt(t).r) / AU).toFixed(2)} AU from the Sun, on its path from Earth to ${t < m.jupiter ? 'Jupiter' : 'Saturn'}. Orbits to scale.`}>
            <svg viewBox={`0 0 ${2 * S} ${2 * S}`} aria-hidden="true">
                <polyline points={geo.earth.map(P).join(' ')} className={styles.mmOrbit} data-body="earth" />
                <polyline points={geo.jupiter.map(P).join(' ')} className={styles.mmOrbit} data-body="jupiter" />
                {outer && <polyline points={geo.saturn.map(P).join(' ')} className={styles.mmOrbit} data-body="saturn" />}
                <polyline points={geo.leg1.map(P).join(' ')} className={styles.mmPlan} />
                <polyline points={geo.leg2.map(P).join(' ')} className={styles.mmPlan} />
                <polyline points={flown(geo.leg1, m.launch, m.jupiter).map(P).join(' ')} className={styles.mmFlown} />
                {t > m.jupiter && <polyline points={flown(geo.leg2, m.jupiter, m.saturn).map(P).join(' ')} className={styles.mmFlown} />}
                <circle cx={S} cy={S} r={3.2} className={styles.mmSun} />
                <circle cx={earth.x} cy={earth.y} r={2.2} className={styles.mmEarth} />
                <circle cx={jup.x} cy={jup.y} r={2.8} className={styles.mmJupiter} />
                {outer && <circle cx={sat.x} cy={sat.y} r={2.6} className={styles.mmSaturn} />}
                <circle cx={sc.x} cy={sc.y} r={3} className={styles.mmCraft} />
            </svg>
            <figcaption>Where RSC-1 is · orbits to scale</figcaption>
        </figure>
    );
}

// ── Gravity assist: the velocity vectors ──────────────────────────────────

export function AssistDiagram() {
    const m = missionTrajectory();
    const vJ = state('jupiter', m.jupiter).v;
    // Drawn in the flyby's own frame: Jupiter's motion to the right (to scale, km/s, ecliptic projection).
    const u = [vJ[0] / norm(vJ), vJ[1] / norm(vJ)];
    const nrm = [-u[1], u[0]];
    const rot = (v: Vec) => [(v[0] * u[0] + v[1] * u[1]) / 1000, (v[0] * nrm[0] + v[1] * nrm[1]) / 1000] as [number, number];
    const J = rot(vJ);
    const iIn = rot(m.vInfIn);
    const iOut = rot(m.vInfOut);
    const vIn: [number, number] = [J[0] + iIn[0], J[1] + iIn[1]];
    const vOut: [number, number] = [J[0] + iOut[0], J[1] + iOut[1]];
    const r = Math.hypot(...iIn);
    const minX = -1.5;
    const maxX = Math.max(vOut[0], J[0] + r) + 1.5;
    const minY = -r - 1.2;
    const maxY = r + 1.2;
    const W = 300;
    const sc = W / (maxX - minX);
    const H = (maxY - minY) * sc;
    const X = (x: number) => (x - minX) * sc;
    const Y = (y: number) => (maxY - y) * sc;
    const mag = (v: [number, number]) => Math.hypot(...v).toFixed(1);
    const line = (a: [number, number], b: [number, number], cls: string) => <line x1={X(a[0])} y1={Y(a[1])} x2={X(b[0])} y2={Y(b[1])} className={cls} markerEnd="url(#solar-arrow)" />;
    const label = (at: [number, number], text: string, dx: number, dy: number, anchor: 'start' | 'middle' | 'end' = 'start') => (
        <text x={X(at[0]) + dx} y={Y(at[1]) + dy} className={styles.vecText} textAnchor={anchor}>
            {text}
        </text>
    );
    const helioIn = norm(m.leg1.v2) / 1000;
    const helioOut = norm(m.leg2.v1) / 1000;
    const turn = ((m.flyby.turn * 180) / Math.PI).toFixed(0);
    return (
        <figure className={styles.assist}>
            <figcaption className={styles.chartTitle}>
                <span>Velocities at the flyby, km/s (to scale)</span>
            </figcaption>
            <svg
                viewBox={`0 0 ${W} ${H.toFixed(0)}`}
                role="img"
                aria-label={`Jupiter moves at ${(norm(vJ) / 1000).toFixed(1)} km/s. Relative to Jupiter, RSC-1 arrives and leaves at ${(m.flyby.vInfIn / 1000).toFixed(2)} km/s, turned by ${turn} degrees. Relative to the Sun its speed goes from ${helioIn.toFixed(1)} to ${helioOut.toFixed(1)} km/s.`}
            >
                <defs>
                    <marker id="solar-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M0,0 L8,4 L0,8 z" fill="context-stroke" />
                    </marker>
                </defs>
                {/* Every velocity relative to Jupiter with this speed ends on this circle. */}
                <circle cx={X(J[0])} cy={Y(J[1])} r={r * sc} className={styles.vecCircle} />
                {line([0, 0], J, styles.vecJ)}
                {line(J, vIn, styles.vecInf)}
                {line(J, vOut, styles.vecInf2)}
                {line([0, 0], vIn, styles.vecIn)}
                {line([0, 0], vOut, styles.vecOut)}
                {label([J[0] / 2, 0], `Jupiter ${mag(J)}`, 0, 12, 'middle')}
                {label(vIn, `before ${mag(vIn)}`, -4, -6, 'end')}
                {label(vOut, `after ${mag(vOut)}`, 4, -6, 'start')}
                {label([J[0], J[1] - r], `v∞ ${r.toFixed(1)} in and out, turned ${turn}°`, 0, 12, 'middle')}
            </svg>
            <p className={styles.figNote}>
                Relative to Jupiter the spacecraft arrives and leaves at the same speed ({(m.flyby.vInfIn / 1000).toFixed(2)} → {(m.flyby.vInfOut / 1000).toFixed(2)} km/s): its velocity only swings round the circle, by {turn}°. Added to Jupiter’s own
                motion, that swing takes its speed around the Sun from {helioIn.toFixed(1)} to {helioOut.toFixed(1)} km/s.
            </p>
        </figure>
    );
}

// ── Launch window: departure energy against launch date ───────────────────

export function WindowChart() {
    const m = missionTrajectory();
    const data = useMemo(() => {
        const iso = (s: string) => {
            const [y, mo, d] = s.split('-').map(Number);
            return jd(y, mo, d);
        };
        const open = iso(LAUNCH_WINDOW.opens);
        const close = iso(LAUNCH_WINDOW.closes);
        const j = state('jupiter', m.jupiter);
        const pts: { x: number; v: number }[] = [];
        for (let L = open - 30; L <= close + 30; L += 2) {
            const e = state('earth', L);
            const sol = lambert(e.r, j.r, (m.jupiter - L) * DAY, MU_SUN);
            if (!sol) continue;
            const v = sub(sol.v1, e.v);
            pts.push({ x: L, v: (v[0] ** 2 + v[1] ** 2 + v[2] ** 2) / 1e6 });
        }
        return { pts, open, close };
    }, [m.jupiter]);
    return (
        <div>
            <Chart
                title="Departure energy needed, by launch date"
                unit="km²/s²"
                series={[{ label: 'C3', points: data.pts }]}
                now={m.launch}
                mark={{ x: m.launch, text: 'SOL-1' }}
                line={{ value: 113.6, text: 'Vehicle capability 113.6' }}
                xLabels={[isoDate(data.pts[0].x), isoDate(data.pts[data.pts.length - 1].x)]}
            />
            <p className={styles.figNote}>
                Arriving at Jupiter on {isoDate(m.jupiter)}. Launch earlier or later and the energy needed climbs. The full Earth–Jupiter–Saturn design works from {LAUNCH_WINDOW.opens} to {LAUNCH_WINDOW.closes}; SOL-1 launches on {isoDate(m.launch)}{' '}
                at C3 = {m.c3.toFixed(1)}.
            </p>
        </div>
    );
}

// ── Fault scenarios ───────────────────────────────────────────────────────

export function WhatIfPanel({ kind, met }: { kind: 'engine' | 'rtg' | 'link'; met: number }) {
    if (kind === 'engine') return <EngineOutPanel met={met} />;
    if (kind === 'rtg') return <RtgPanel met={met} />;
    return <LinkPanel met={met} />;
}

function EngineOutPanel({ met }: { met: number }) {
    const series = useMemo(() => {
        const nominal = flight();
        const fault = engineOutFlight();
        const xs = Array.from({ length: 91 }, (_, i) => i * 2);
        return [
            { label: 'Nominal', tone: 'b' as const, points: xs.map((x) => ({ x, v: Math.max(0, sampleAt(x, nominal).altitude) / 1000 })) },
            { label: `Engine lost at T+${ENGINE_OUT.at} s`, tone: 'c' as const, points: xs.map((x) => ({ x, v: Math.max(0, sampleAt(x, fault).altitude) / 1000 })) },
        ];
    }, []);
    const impact = engineOutFlight().events.find((e) => e.id === 'impact');
    return (
        <div className={styles.whatIf}>
            <Chart title="Altitude" unit="km" series={series} now={met} mark={{ x: ENGINE_OUT.at, text: 'Failure' }} xLabels={['T+0 s', 'T+180 s']} />
            <table className={styles.outcomes}>
                <caption>Computed outcomes (simulated)</caption>
                <thead>
                    <tr>
                        <th scope="col">Engine lost at</th>
                        <th scope="col">Outcome</th>
                    </tr>
                </thead>
                <tbody>
                    {ENGINE_OUT.cases.map((c) => (
                        <tr key={c.at} data-current={c.at === ENGINE_OUT.at || undefined}>
                            <td>T+{c.at} s</td>
                            <td>
                                Falls back at T+{c.impact} s, {c.downrangeKm} km downrange
                            </td>
                        </tr>
                    ))}
                    <tr>
                        <td>After T+{ENGINE_OUT.orbitAfter} s</td>
                        <td>Still reaches the parking orbit</td>
                    </tr>
                    <tr>
                        <td>After T+{ENGINE_OUT.jupiterAfter} s</td>
                        <td>Still reaches Jupiter, using the energy margin</td>
                    </tr>
                </tbody>
            </table>
            {impact && <p className={styles.figNote}>In this run the vehicle falls back at T+{Math.round(impact.t)} s. Range safety would end such a flight earlier; that is not modelled.</p>}
        </div>
    );
}

function RtgPanel({ met }: { met: number }) {
    const f = rtgFaultScenario();
    const scSep = flight().events.find((e) => e.id === 'scSep')!.t;
    const series = useMemo(
        () => [
            {
                label: 'Battery charge',
                tone: 'a' as const,
                points: f.table.filter((_, i) => i % 120 === 0).map((p, i) => ({ x: (i * 120) / 3600, v: p.soc * 100 })),
            },
        ],
        [f],
    );
    const h = Math.max(0, met - scSep) / 3600;
    return (
        <div className={styles.whatIf}>
            <Chart
                title="Battery state of charge, one generator"
                unit="%"
                series={series}
                now={h}
                mark={{ x: f.safeModeAt / 3600, text: 'Safe Mode' }}
                line={{ value: 30, text: '30 %: fault protection' }}
                xLabels={['separation', `+${(f.table.length / 3600).toFixed(0)} h`]}
            />
            <dl className={styles.facts2}>
                <div>
                    <dt>One generator</dt>
                    <dd>{f.rtg.toFixed(0)} W</dd>
                </div>
                <div>
                    <dt>Loads, full / shed</dt>
                    <dd>
                        {f.loadsFull.toFixed(0)} / {f.loadsShed.toFixed(0)} W
                    </dd>
                </div>
                <div>
                    <dt>Safe Mode after</dt>
                    <dd>{(f.safeModeAt / 3600).toFixed(1)} h</dd>
                </div>
            </dl>
        </div>
    );
}

function LinkPanel({ met }: { met: number }) {
    const m = missionTrajectory();
    const c = conjunctions().find((x) => x.end >= m.jupiter - 2 && x.start <= m.jupiter) ?? conjunctions()[0];
    const series = useMemo(() => {
        const pts = [];
        for (let t = c.start - 25; t <= m.jupiter + 12; t += 0.5) pts.push({ x: metOf(t), v: sunEarthProbeAngle(t) });
        return [{ label: 'Angle', tone: 'a' as const, points: pts }];
    }, [c.start, m.jupiter]);
    return (
        <div className={styles.whatIf}>
            <Chart
                title="RSC-1’s angle from the Sun, seen from Earth"
                unit="°"
                series={series}
                now={met}
                mark={{ x: metOf(m.jupiter), text: 'Flyby' }}
                line={{ value: CONJUNCTION_LIMIT_DEG, text: `${CONJUNCTION_LIMIT_DEG}°: link unreliable` }}
                xLabels={[isoDate(c.start - 25), isoDate(m.jupiter + 12)]}
            />
            <p className={styles.figNote}>
                Conjunction {isoDate(c.start)} to {isoDate(c.end)}; closest {c.min.toFixed(2)}° on {isoDate(c.minAt)}. Computed from the ephemeris and the designed trajectory.
            </p>
        </div>
    );
}

// ── End of a stage: recap and quick check ─────────────────────────────────

export function Recap({
    number,
    title,
    points,
    check,
    answered,
    onAnswer,
    countdown,
    onNext,
    nextText,
    onReplay,
    onHold,
}: {
    number: string;
    title: string;
    points: string[];
    check: Check;
    answered: number | undefined;
    onAnswer: (i: number) => void;
    countdown: number | null;
    onNext: () => void;
    nextText: string;
    onReplay: () => void;
    onHold: () => void;
}) {
    const allow = useMemo(() => planTerms(points), [points]);
    return (
        <section className={styles.recap} aria-labelledby="solar-recap-title" onPointerEnter={onHold} onFocusCapture={onHold}>
            <p className={styles.cardKicker}>Stage {number} recap</p>
            <h3 id="solar-recap-title" className={styles.recapTitle}>
                {title}
            </h3>
            <ul className={styles.recapList}>
                {points.map((p, i) => (
                    <li key={p}>
                        <Gloss text={p} allow={allow[i]} />
                    </li>
                ))}
            </ul>
            <div className={styles.check} role="group" aria-labelledby="solar-check-q">
                <p id="solar-check-q" className={styles.checkQ}>
                    <span className={styles.checkTag}>Quick check</span> {check.question}
                </p>
                <div className={styles.checkOptions}>
                    {check.options.map((o, i) => (
                        <button
                            key={o}
                            type="button"
                            className={styles.checkOption}
                            aria-pressed={answered === i}
                            data-result={answered === undefined ? undefined : i === check.answer ? 'right' : answered === i ? 'wrong' : undefined}
                            disabled={answered !== undefined}
                            onClick={() => onAnswer(i)}
                        >
                            {o}
                        </button>
                    ))}
                </div>
                {answered !== undefined && (
                    <p className={styles.checkExplain} aria-live="polite">
                        <strong>{answered === check.answer ? 'Right.' : 'Not quite.'}</strong> {check.explain}
                    </p>
                )}
            </div>
            <div className={styles.captionActions}>
                <button type="button" className={styles.primaryBtn} onClick={onNext}>
                    {nextText} <span aria-hidden="true">→</span>
                </button>
                <button type="button" className={styles.investigateBtn} onClick={onReplay}>
                    Watch again
                </button>
                {countdown !== null && (
                    <span className={styles.countdown} aria-hidden="true">
                        continues in {Math.ceil(countdown)} s
                    </span>
                )}
            </div>
        </section>
    );
}

// ── End of the mission ────────────────────────────────────────────────────

export function Finale({
    summary,
    score,
    total,
    onReplay,
    onDiscover,
    onStages,
    whatIfs,
}: {
    summary: { launch: string; jupiter: string; saturn: string; years: number; distanceAU: number; distanceKm: number; c3: number; assist: number; lightMin: number; rtgSaturn: number };
    score: number;
    total: number;
    onReplay: () => void;
    onDiscover: () => void;
    onStages: () => void;
    whatIfs: { title: string; open: () => void }[];
}) {
    return (
        <section className={styles.finale} aria-labelledby="solar-finale-title">
            <p className={styles.cardKicker}>SOL-1 · simulated reference mission</p>
            <h3 id="solar-finale-title" className={styles.finaleTitle}>
                Mission complete
            </h3>
            <p className={styles.finaleLine}>
                From the launch pad to Saturn in {summary.years.toFixed(1)} years: {summary.distanceAU.toFixed(1)} AU around the Sun ({(summary.distanceKm / 1e9).toFixed(2)} billion km), with one engine-free push from Jupiter.
            </p>
            <dl className={styles.finaleStats}>
                <div>
                    <dt>Launch</dt>
                    <dd>{summary.launch}</dd>
                </div>
                <div>
                    <dt>Jupiter flyby</dt>
                    <dd>{summary.jupiter}</dd>
                </div>
                <div>
                    <dt>Saturn</dt>
                    <dd>{summary.saturn}</dd>
                </div>
                <div>
                    <dt>Departure energy C3</dt>
                    <dd>{summary.c3.toFixed(1)} km²/s²</dd>
                </div>
                <div>
                    <dt>Gained at Jupiter</dt>
                    <dd>{summary.assist.toFixed(1)} km/s</dd>
                </div>
                <div>
                    <dt>Signal delay at Saturn</dt>
                    <dd>{summary.lightMin.toFixed(0)} min</dd>
                </div>
            </dl>
            <p className={styles.finaleScore}>
                Quick checks: <strong>{score}</strong> of {total} answered correctly
            </p>
            <div className={styles.captionActions}>
                <button type="button" className={styles.primaryBtn} onClick={onDiscover}>
                    Explore the Solar System
                </button>
                <button type="button" className={styles.investigateBtn} onClick={onReplay}>
                    Replay the mission
                </button>
                <button type="button" className={styles.investigateBtn} onClick={onStages}>
                    Choose a stage
                </button>
            </div>
            <div className={styles.topics} role="group" aria-label="What if? Fault scenarios">
                <span className={styles.groupLabel}>What if?</span>
                {whatIfs.map((w) => (
                    <button key={w.title} type="button" className={styles.topic} onClick={w.open}>
                        {w.title}
                    </button>
                ))}
            </div>
        </section>
    );
}
