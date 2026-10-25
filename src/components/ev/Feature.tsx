import type { ReactNode } from 'react';
import styles from './Feature.module.css';
import ExternalLink from '@/components/site/ExternalLink';
import { MaturityBadge, type Maturity } from '@/components/site/blocks';
import type { ClickEvent } from '@/lib/analytics/taxonomy';

export type Cta = { label: string; href: string; event: ClickEvent };

const TRAILING_ARROW = /\s*([→↗])$/;

/**
 * External CTA tagged for analytics: event, clean item name and where on the card it sits. A trailing
 * arrow is split off so it can move on hover and stays out of the accessible name.
 */
export function EvLink({ cta, className, location }: { cta: Cta; className: string; location?: string }) {
    const arrow = cta.label.match(TRAILING_ARROW);
    const text = arrow ? cta.label.slice(0, arrow.index) : cta.label;
    return (
        <ExternalLink href={cta.href} className={className} data-track={cta.event} data-analytics-location={location} trackName={text}>
            {text}
            {arrow && (
                <>
                    {' '}
                    <span className={`${styles.arrow} ${arrow[1] === '↗' ? styles.arrowOut : ''}`} aria-hidden="true">
                        {arrow[1]}
                    </span>
                </>
            )}
        </ExternalLink>
    );
}

type FeatureProps = {
    id?: string;
    section: string;
    label: string;
    maturity?: Maturity;
    title: ReactNode;
    heading?: 'h2' | 'h3';
    description: ReactNode;
    visual: ReactNode;
    chips?: readonly string[];
    primary: Cta;
    secondary?: Cta;
    related?: Cta[];
    meta?: [string, string][];
    /** split: copy beside the visual (reverse flips sides); wide: copy above a full-width visual; card: visual above copy */
    layout?: 'split' | 'wide' | 'card';
    reverse?: boolean;
};

/** One research area: label, title, description, animated visual, topics, CTAs and technical metadata. */
export default function Feature({
    id,
    section,
    label,
    maturity,
    title,
    heading: Heading = 'h2',
    description,
    visual,
    chips,
    primary,
    secondary,
    related,
    meta,
    layout = 'split',
    reverse = false,
}: FeatureProps) {
    return (
        <article id={id} className={`${styles.feature} ${styles[layout]} ${reverse ? styles.reverse : ''}`} data-analytics-section={section}>
            <div className={styles.copy} data-reveal>
                <div className={styles.labelRow}>
                    <p className={styles.label}>{label}</p>
                    {maturity && <MaturityBadge level={maturity} />}
                </div>
                <Heading className={styles.title}>{title}</Heading>
                <div className={styles.description}>{description}</div>

                {chips && (
                    <ul className={styles.chips} aria-label="Key topics">
                        {chips.map((chip) => (
                            <li key={chip}>{chip}</li>
                        ))}
                    </ul>
                )}

                <div className={`actions ${styles.actions}`}>
                    <EvLink cta={primary} className={layout === 'card' ? 'btn btn-secondary' : 'btn btn-primary'} location="primary-cta" />
                    {secondary && <EvLink cta={secondary} className="text-link" location="secondary-cta" />}
                </div>

                {related && related.length > 0 && (
                    <ul className={styles.related} aria-label="Related destinations">
                        {related.map((link) => (
                            <li key={link.href}>
                                <EvLink cta={link} className={styles.relatedLink} location="related-links" />
                            </li>
                        ))}
                    </ul>
                )}

                {meta && (
                    <dl className={styles.meta}>
                        {meta.map(([k, v]) => (
                            <div key={k}>
                                <dt>{k}</dt>
                                <dd>{v}</dd>
                            </div>
                        ))}
                    </dl>
                )}
            </div>
            <div className={styles.visual}>{visual}</div>
        </article>
    );
}
