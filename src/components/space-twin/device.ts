"use client";
// Device preferences, rendering quality and viewport presence for the Space Digital Twin
// viewer. Decisions use measured capabilities and media queries, never the user-agent string.
import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react';

export function useMedia(query: string) {
    return useSyncExternalStore(
        (notify) => {
            const mql = window.matchMedia(query);
            mql.addEventListener('change', notify);
            return () => mql.removeEventListener('change', notify);
        },
        () => window.matchMedia(query).matches,
        () => false,
    );
}

export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');

export interface WebGLSupport {
    supported: boolean;
    webgl2: boolean;
    /** True when the browser renders WebGL on the CPU. */
    software: boolean;
}

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|software|basic render/i;

function detectWebGL(): WebGLSupport {
    if (typeof document === 'undefined') return { supported: false, webgl2: false, software: false };
    try {
        const canvas = document.createElement('canvas');
        const gl2 = canvas.getContext('webgl2');
        const gl = gl2 ?? canvas.getContext('webgl');
        if (!gl) return { supported: false, webgl2: false, software: false };
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return { supported: true, webgl2: Boolean(gl2), software: SOFTWARE_RENDERER.test(renderer) };
    } catch {
        return { supported: false, webgl2: false, software: false };
    }
}

let cachedSupport: WebGLSupport | null = null;
/** WebGL is probed once per page, and only when the viewer asks. */
export const getWebGLSupport = (): WebGLSupport => (cachedSupport ??= detectWebGL());

export type Quality = 'high' | 'low';

/** "low" on software rendering, little memory or few cores. Null on the server and where WebGL is missing. */
export function useStageQuality(): Quality | null {
    return useSyncExternalStore(
        () => () => {},
        () => {
            const gl = getWebGLSupport();
            if (!gl.supported) return null;
            const nav = navigator as Navigator & { deviceMemory?: number };
            return gl.software || (nav.deviceMemory ?? 8) <= 2 || (nav.hardwareConcurrency ?? 8) <= 2 ? 'low' : 'high';
        },
        () => null,
    );
}

/** Whether WebGL was probed and found missing (false on the server, before probing). */
export function useNoWebGL(): boolean {
    return useSyncExternalStore(
        () => () => {},
        () => !getWebGLSupport().supported,
        () => false,
    );
}

/** near: within a screen of the viewport (mount the scene); onScreen: actually visible (animate it). */
export function usePresence(ref: RefObject<HTMLElement | null>) {
    const [near, setNear] = useState(false);
    const [onScreen, setOnScreen] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === 'undefined') return;
        const nearIo = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '400px 0px' });
        const seenIo = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.15 });
        nearIo.observe(el);
        seenIo.observe(el);
        return () => {
            nearIo.disconnect();
            seenIo.disconnect();
        };
    }, [ref]);
    return { near, onScreen };
}

/** False while the browser tab is hidden: nothing should animate then. */
export function usePageVisible() {
    return useSyncExternalStore(
        (notify) => {
            document.addEventListener('visibilitychange', notify);
            return () => document.removeEventListener('visibilitychange', notify);
        },
        () => document.visibilityState !== 'hidden',
        () => true,
    );
}
