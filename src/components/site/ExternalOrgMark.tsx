import styles from './ExternalOrgMark.module.css';

/** Marks an organisation that is independent of the iTelematics® group (EcosystemOrg.external). */
export function ExternalOrgIcon() {
    return (
        <svg className={styles.icon} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6.5 1.5h4v4M10.5 1.5 5.5 6.5M9 7.5v2.25a.75.75 0 0 1-.75.75h-6a.75.75 0 0 1-.75-.75v-6a.75.75 0 0 1 .75-.75H4.5" />
        </svg>
    );
}

/** Icon and the word "External", as a small badge beside an organisation's name. */
export default function ExternalOrgMark({ compact = false }: { compact?: boolean }) {
    return (
        <span className={`${styles.mark} ${compact ? styles.compact : ''}`} title="External organisation, independent of iTelematics®">
            <ExternalOrgIcon />
            {compact ? <span className="visually-hidden">External organisation</span> : <span>External</span>}
        </span>
    );
}
