"use client";
import { useState } from 'react';
import styles from './MissionStateExplorer.module.css';
import {
    FLOW_START,
    POWER_FLOW,
    REFERENCE_CASE,
    STATE_SUMMARY,
    TELEMETRY,
    type MissionState,
    type Reading,
} from '@/lib/reference-case';

const STATES: { id: MissionState; label: string }[] = [
    { id: 'sunlight', label: 'Sunlight' },
    { id: 'eclipse', label: 'Eclipse' },
];

function Value({ reading }: { reading: Reading }) {
    return (
        <span className={`mono ${reading.tone ? `${styles.toned} state-${reading.tone}` : ''}`}>
            {reading.value}
        </span>
    );
}

/**
 * Sunlight ↔ Eclipse explorer: a power-flow diagram plus the full telemetry table.
 * Both states' values are always in the HTML (table columns); the toggle highlights one.
 */
export default function MissionStateExplorer({ idPrefix = 'mse' }: { idPrefix?: string }) {
    const [state, setState] = useState<MissionState>('sunlight');
    const start = FLOW_START[state];

    return (
        <div className={styles.explorer} data-state={state}>
            <fieldset className={styles.toggle}>
                <legend className={styles.legend}>Mission state</legend>
                {STATES.map((s) => (
                    <label key={s.id} className={styles.option}>
                        <input
                            type="radio"
                            name={`${idPrefix}-state`}
                            value={s.id}
                            checked={state === s.id}
                            onChange={() => setState(s.id)}
                        />
                        <span>{s.label}</span>
                    </label>
                ))}
            </fieldset>

            <ol className={styles.flow} aria-label={`Power flow in ${state}`}>
                {POWER_FLOW.map((node, i) => {
                    const active = i >= start;
                    const reading = node[state];
                    return (
                        <li key={node.name} className={`${styles.node} ${active ? styles.active : styles.idle}`}>
                            <span className={styles.nodeName}>{node.name}</span>
                            <Value reading={reading} />
                            {i < POWER_FLOW.length - 1 && (
                                <span className={`${styles.arrow} ${i >= start ? styles.arrowOn : ''}`} aria-hidden="true" />
                            )}
                        </li>
                    );
                })}
            </ol>

            <p className={styles.summary} aria-live="polite">
                <strong>{state === 'sunlight' ? 'Sunlight' : 'Eclipse'}:</strong> {STATE_SUMMARY[state]}
            </p>

            <div className="table-wrap">
                <table className={`data-table ${styles.table}`}>
                    <caption className={styles.caption}>
                        Telemetry for the {REFERENCE_CASE.spacecraft}, {REFERENCE_CASE.orbit}. {REFERENCE_CASE.note}
                    </caption>
                    <thead>
                        <tr>
                            <th scope="col">Parameter</th>
                            <th scope="col" className={state === 'sunlight' ? styles.current : ''}>
                                Sunlight{state === 'sunlight' && <span className="visually-hidden"> (selected)</span>}
                            </th>
                            <th scope="col" className={state === 'eclipse' ? styles.current : ''}>
                                Eclipse{state === 'eclipse' && <span className="visually-hidden"> (selected)</span>}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {TELEMETRY.map((p) => (
                            <tr key={p.label}>
                                <th scope="row">{p.label}</th>
                                <td className={state === 'sunlight' ? styles.current : styles.dim}>
                                    <Value reading={p.sunlight} />
                                </td>
                                <td className={state === 'eclipse' ? styles.current : styles.dim}>
                                    <Value reading={p.eclipse} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
