import type { CSSProperties, ReactNode } from 'react';
import styles from './FlowSteps.module.css';

export type FlowStep = { name: string; detail?: ReactNode; tone?: 'solar' | 'telemetry' | 'nominal' };

/**
 * Simplified vertical system flow for phones: one step per row on a single line, with a slow pulse
 * travelling down it and each step lighting in turn. Used instead of shrinking a desktop diagram.
 */
export default function FlowSteps({ steps, className = '' }: { steps: FlowStep[]; className?: string }) {
    return (
        <ol className={`${styles.flow} ${className}`} style={{ ['--n' as string]: steps.length } as CSSProperties}>
            {steps.map((step, i) => (
                <li key={step.name} className={step.tone ? styles[step.tone] : undefined} style={{ ['--i' as string]: i } as CSSProperties}>
                    <span className={styles.marker} aria-hidden="true" />
                    <span className={styles.name}>{step.name}</span>
                    {step.detail && <span className={styles.detail}>{step.detail}</span>}
                </li>
            ))}
        </ol>
    );
}
