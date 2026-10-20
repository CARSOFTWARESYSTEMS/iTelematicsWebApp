"use client";
import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import styles from './SocChart.module.css';
import { PERIOD_MIN, type Sample } from '@/lib/energy-model';

type Props = {
    samples: Sample[];
    reference?: Sample[];
    seriesLabel: string;
    description: string;
};

const pct = (soc: number) => `${(soc * 100).toFixed(1)} %`;

/**
 * Battery state of charge over three orbits. Single series (plus a grey nominal reference when a
 * fault is shown), eclipse bands, hairline grid, crosshair tooltip on pointer and arrow keys.
 */
export default function SocChart({ samples, reference, seriesLabel, description }: Props) {
    const [index, setIndex] = useState<number | null>(null);

    const { yMin, yMax, ticks, bands, line, refLine, tMax } = useMemo(() => {
        const all = [...samples, ...(reference ?? [])].map((s) => s.soc);
        const lo = Math.min(...all);
        const yMin = Math.max(0, Math.floor((lo * 100 - 4) / 5) * 5) / 100;
        const yMax = 1;
        const tMax = samples[samples.length - 1].tMin;
        const x = (t: number) => (t / tMax) * 1000;
        const y = (soc: number) => (1 - (soc - yMin) / (yMax - yMin)) * 1000;
        const toPoints = (list: Sample[]) => list.map((s) => `${x(s.tMin).toFixed(1)},${y(s.soc).toFixed(1)}`).join(' ');

        const bands: { from: number; to: number }[] = [];
        let start: number | null = null;
        samples.forEach((s, i) => {
            if (s.eclipse && start === null) start = s.tMin;
            if ((!s.eclipse || i === samples.length - 1) && start !== null) {
                bands.push({ from: x(start), to: x(s.tMin) });
                start = null;
            }
        });

        const ticks: number[] = [];
        for (let v = yMin; v <= yMax + 1e-9; v += 0.05) ticks.push(Math.round(v * 100) / 100);

        return { yMin, yMax, ticks, bands, line: toPoints(samples), refLine: reference ? toPoints(reference) : null, tMax };
    }, [samples, reference]);

    const left = (t: number) => `${(t / tMax) * 100}%`;
    const top = (soc: number) => `${(1 - (soc - yMin) / (yMax - yMin)) * 100}%`;
    const last = samples[samples.length - 1];

    const onPointer = (e: PointerEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        setIndex(Math.round(frac * (samples.length - 1)));
    };

    const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
        const step = e.shiftKey ? 20 : 4;
        if (e.key === 'ArrowRight') setIndex((i) => Math.min(samples.length - 1, (i ?? -step) + step));
        else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, (i ?? samples.length) - step));
        else if (e.key === 'Home') setIndex(0);
        else if (e.key === 'End') setIndex(samples.length - 1);
        else if (e.key === 'Escape') setIndex(null);
        else return;
        e.preventDefault();
    };

    const point = index !== null ? samples[index] : null;

    return (
        <figure className={styles.figure}>
            {reference && (
                <div className={styles.legend}>
                    <span><i className={styles.keyMain} aria-hidden="true" />{seriesLabel}</span>
                    <span><i className={styles.keyRef} aria-hidden="true" />Nominal</span>
                </div>
            )}
            <div className={styles.frame}>
                <div className={styles.yAxis} aria-hidden="true">
                    {ticks.map((t) => (
                        <span key={t} style={{ top: top(t) }}>{Math.round(t * 100)}%</span>
                    ))}
                </div>
                <div
                    className={styles.plot}
                    tabIndex={0}
                    role="img"
                    aria-label={description}
                    onPointerMove={onPointer}
                    onPointerDown={onPointer}
                    onPointerLeave={() => setIndex(null)}
                    onKeyDown={onKey}
                    onBlur={() => setIndex(null)}
                >
                    <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className={styles.svg} aria-hidden="true">
                        {bands.map((b) => (
                            <rect key={b.from} x={b.from} y="0" width={b.to - b.from} height="1000" className={styles.band} />
                        ))}
                        {ticks.map((t) => (
                            <line key={t} x1="0" x2="1000" y1={(1 - (t - yMin) / (yMax - yMin)) * 1000} y2={(1 - (t - yMin) / (yMax - yMin)) * 1000} className={styles.grid} />
                        ))}
                        {refLine && <polyline points={refLine} className={styles.refLine} />}
                        <polyline points={line} className={styles.line} />
                    </svg>

                    {bands.slice(0, 1).map((b) => (
                        <span key="label" className={styles.bandLabel} style={{ left: `${(b.from / 1000) * 100}%` }} aria-hidden="true">
                            Eclipse
                        </span>
                    ))}

                    <span className={styles.end} style={{ left: left(last.tMin), top: top(last.soc) }} aria-hidden="true" />
                    <span className={styles.endLabel} style={{ top: top(last.soc) }} aria-hidden="true">{pct(last.soc)}</span>

                    {point && (
                        <>
                            <span className={styles.crosshair} style={{ left: left(point.tMin) }} aria-hidden="true" />
                            <span className={styles.marker} style={{ left: left(point.tMin), top: top(point.soc) }} aria-hidden="true" />
                            <div
                                className={styles.tooltip}
                                style={{ left: left(point.tMin), transform: `translateX(${point.tMin / tMax > 0.6 ? '-105%' : '5%'})` }}
                                role="status"
                            >
                                <strong className="tabular">{pct(point.soc)}</strong>
                                <span>
                                    T+{point.tMin.toFixed(0)} min · {point.eclipse ? 'Eclipse' : 'Sunlight'}
                                </span>
                                {reference && index !== null && <span>Nominal {pct(reference[index].soc)}</span>}
                            </div>
                        </>
                    )}
                </div>
                <div className={styles.xAxis} aria-hidden="true">
                    {[0, 1, 2].map((o) => (
                        <span key={o} style={{ left: left(o * PERIOD_MIN + PERIOD_MIN / 2) }}>Orbit {o + 1}</span>
                    ))}
                </div>
            </div>
        </figure>
    );
}
