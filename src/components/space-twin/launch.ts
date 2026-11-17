import { useEffect, useRef } from 'react';
import type { LaunchSettings } from '@/lib/space-twin/launch';

/** What the viewer passes to the fifth and sixth experiences when a shareable link opened them. */
export interface LinkProps {
    /** The link's options (absent on a normal visit: the experience behaves exactly as before). */
    link?: LaunchSettings;
    /** Receives the experience's start action once, when it has loaded. */
    onLinkReady?: (start: () => void) => void;
}

/**
 * Registers `start` with the viewer, which calls it inside the visitor's click (browsers allow sound and
 * full screen only there) or straight away when nothing needs a click. Always the latest `start`.
 */
export function useLinkStart({ link, onLinkReady }: LinkProps, start: () => void) {
    const latest = useRef(start);
    useEffect(() => {
        latest.current = start;
    });
    useEffect(() => {
        if (link) onLinkReady?.(() => latest.current());
        // Registered once: the link and the viewer's callback do not change while the experience is open.
    }, []);
}
