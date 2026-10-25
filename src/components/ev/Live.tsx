"use client";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import styles from './Live.module.css';

/* ---------- Page-wide motion switch (the Pause control in the local navigation) ---------- */

let pausedAll = false;
const listeners = new Set<() => void>();

export function setMotionPaused(next: boolean) {
    pausedAll = next;
    // Also lets page CSS hold animations that sit outside a <Live> frame.
    document.documentElement.toggleAttribute('data-motion-paused', next);
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useMotionPaused() {
    return useSyncExternalStore(subscribe, () => pausedAll, () => false);
}

/** Reduced-motion preference, resolved after mount and kept in sync with the OS setting. */
export function useReducedMotion() {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduced(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);
    return reduced;
}

/** True while the element is near the viewport, motion is allowed and the page-wide pause is off. */
export function useLiveState(ref: RefObject<HTMLElement | null>) {
    const [inView, setInView] = useState(false);
    const reduced = useReducedMotion();
    const paused = useMotionPaused();

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined' || !ref.current) return;
        const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '80px 0px' });
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [ref]);

    return inView && !reduced && !paused;
}

export const LiveContext = createContext(false);
export const useLive = () => useContext(LiveContext);

/**
 * Frame for an animated engineering visual. Its CSS animations and tickers run only while it is
 * on screen; until then, without JavaScript and under reduced motion it holds a static frame.
 * With a label it is one image to assistive technology; without one it is hidden as decoration.
 */
export default function Live({ children, label, className = '' }: { children: ReactNode; label?: string; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const live = useLiveState(ref);

    return (
        <LiveContext.Provider value={live}>
            <div
                ref={ref}
                className={`${styles.live} ${className}`}
                data-live={live ? 'on' : 'off'}
                role={label ? 'img' : undefined}
                aria-label={label}
                aria-hidden={label ? undefined : true}
            >
                {children}
            </div>
        </LiveContext.Provider>
    );
}

/** Cycles through illustrative readout values slowly, only while its visual is live. */
export function Ticker({ values, every = 4200 }: { values: readonly string[]; every?: number }) {
    const live = useLive();
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (!live || values.length < 2) return;
        const timer = setInterval(() => setIndex((i) => (i + 1) % values.length), every);
        return () => clearInterval(timer);
    }, [live, every, values.length]);

    return <>{values[index % values.length]}</>;
}
