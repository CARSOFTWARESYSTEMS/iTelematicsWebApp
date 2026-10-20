import type { AnchorHTMLAttributes, ReactNode } from 'react';

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
    /** Clean CTA name for analytics; defaults to the link text when it is a plain string. */
    trackName?: string;
};

/** Opens in a new tab and says so to screen readers, without polluting the analytics CTA name. */
export default function ExternalLink({ href, children, trackName, ...rest }: Props) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            data-track-name={trackName ?? (typeof children === 'string' ? children : undefined)}
            {...rest}
        >
            {children}
            <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
    );
}
