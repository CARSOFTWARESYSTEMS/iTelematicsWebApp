import styles from './StepFlow.module.css';

type Step = { name: string; tone?: 'orbit' | 'solar' | 'telemetry' | 'nominal' };

/**
 * Animated step visual. "path": a vertical journey with a travelling light (Internships).
 * "ladder": ascending steps toward evidence (About). CSS-only motion; static under reduced motion.
 */
export default function StepFlow({ steps, variant, label }: { steps: Step[]; variant: 'path' | 'ladder'; label: string }) {
    return (
        <ol className={`${styles.flow} ${styles[variant]}`} aria-label={label} style={{ ['--n' as string]: steps.length }}>
            {steps.map((step, i) => (
                <li
                    key={step.name}
                    className={`${styles.step} ${step.tone ? styles[step.tone] : ''}`}
                    style={{ ['--i' as string]: i }}
                >
                    <span className={styles.marker} aria-hidden="true" />
                    <span className={`mono ${styles.index}`}>{String(i + 1).padStart(2, '0')}</span>
                    <span className={styles.name}>{step.name}</span>
                </li>
            ))}
        </ol>
    );
}
