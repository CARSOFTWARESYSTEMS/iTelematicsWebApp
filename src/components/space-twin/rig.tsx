"use client";
// Camera and story drivers shared by every scene (from the "Learn to Protect Missions" showcase).
// The story flies the camera along its keyframed path, or to a picked part, until the visitor
// takes the camera (drag, pinch, Ctrl/⌘ + scroll); it never fights the visitor. Reset, Replay, a
// stage or an experience gives the camera back to the story.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/core/OrbitControls';
import { Spherical, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { fitDistance, type StoryClock, type View } from '@/lib/space-twin/story';

const DEG = Math.PI / 180;

export function viewPosition(view: View, distance: number) {
    return new Vector3(Math.cos(view.el * DEG) * Math.sin(view.az * DEG), Math.sin(view.el * DEG), Math.cos(view.el * DEG) * Math.cos(view.az * DEG))
        .multiplyScalar(distance * view.dist)
        .add(new Vector3(...view.target));
}

export interface ViewHandle {
    /** Back to the resting view, and give the camera back to the story. */
    reset: () => void;
    /** Give the camera back to the story without moving it. */
    release: () => void;
}

type Ref<T> = { current: T };

export function Controls({ controlsRef, userRef, viewRef, span }: { controlsRef: Ref<OrbitControlsImpl | null>; userRef: Ref<boolean>; viewRef: Ref<ViewHandle | null>; span: number }) {
    useEffect(() => {
        const c = controlsRef.current;
        if (!c) return;
        const el = c.domElement;
        // One finger scrolls the page; a sideways drag turns the view; two fingers zoom.
        if (el) el.style.touchAction = 'pan-y';
        const start = () => {
            userRef.current = true;
        };
        c.addEventListener('start', start);
        // A plain mouse wheel scrolls the page; Ctrl or ⌘ + wheel (and a trackpad pinch, which sends Ctrl) zooms.
        const wheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) e.stopImmediatePropagation();
        };
        el?.addEventListener('wheel', wheel, { capture: true });
        viewRef.current = {
            reset: () => {
                userRef.current = false;
                c.reset();
            },
            release: () => {
                userRef.current = false;
            },
        };
        return () => {
            c.removeEventListener('start', start);
            el?.removeEventListener('wheel', wheel, { capture: true });
        };
    }, [controlsRef, userRef, viewRef]);
    return (
        <OrbitControls
            ref={controlsRef}
            makeDefault
            enablePan={false}
            minDistance={span * 0.35}
            maxDistance={span * 4}
            rotateSpeed={0.6}
            zoomSpeed={0.6}
            enableDamping
            dampingFactor={0.1}
        />
    );
}

/** Flies the camera along the story's path (or to a picked part) until the visitor takes it. */
export function CameraRig({
    clock,
    viewAt,
    home,
    span,
    reducedMotion,
    controlsRef,
    userRef,
}: {
    clock: StoryClock;
    viewAt: (t: number) => View;
    home: View;
    span: number;
    reducedMotion: boolean;
    controlsRef: Ref<OrbitControlsImpl | null>;
    userRef: Ref<boolean>;
}) {
    const placed = useRef(false);
    const viewAtRef = useRef(viewAt);
    useEffect(() => {
        viewAtRef.current = viewAt;
    }, [viewAt]);
    const tmp = useMemo(() => ({ target: new Vector3(), offset: new Vector3(), now: new Spherical() }), []);
    useFrame((state, delta) => {
        const c = controlsRef.current;
        if (!c) return;
        const camera = state.camera;
        const fit = fitDistance(state.size.width / Math.max(1, state.size.height), span);
        if (!placed.current) {
            placed.current = true;
            c.target.set(...home.target);
            camera.position.copy(viewPosition(home, fit));
            c.update();
            c.saveState();
            if (!reducedMotion) {
                const v = viewAtRef.current(clock.time);
                c.target.set(...v.target);
                camera.position.copy(viewPosition(v, fit));
                c.update();
            }
            return;
        }
        if (userRef.current) return;
        // Reduced motion: hold the resting view (or the picked part) without travelling.
        const view = reducedMotion ? viewAtRef.current(-1) : viewAtRef.current(clock.time);
        const k = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 2.4);
        tmp.target.set(...view.target);
        const targetGap = c.target.distanceTo(tmp.target);
        c.target.lerp(tmp.target, k);
        tmp.offset.copy(camera.position).sub(c.target);
        tmp.now.setFromVector3(tmp.offset);
        let dTheta = view.az * DEG - tmp.now.theta;
        dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
        const dPhi = (90 - view.el) * DEG - tmp.now.phi;
        const dRadius = fit * view.dist - tmp.now.radius;
        tmp.now.set(tmp.now.radius + dRadius * k, tmp.now.phi + dPhi * k, tmp.now.theta + dTheta * k);
        camera.position.setFromSpherical(tmp.now).add(c.target);
        c.update();
        if (Math.abs(dTheta) + Math.abs(dPhi) > 1e-4 || Math.abs(dRadius) > span * 2e-4 || targetGap > span * 2e-4) state.invalidate();
    });
    return null;
}

/**
 * In portrait frames (phones) the telemetry card covers the lower part of the view, so the image
 * centre moves up: the model sits in the open space above the card. Labels follow automatically.
 */
export function PortraitFraming() {
    const camera = useThree((s) => s.camera);
    const width = useThree((s) => s.size.width);
    const height = useThree((s) => s.size.height);
    const invalidate = useThree((s) => s.invalidate);
    useEffect(() => {
        if (width / Math.max(1, height) < 0.95) camera.setViewOffset(width, height, 0, height * 0.12, width, height);
        else camera.clearViewOffset();
        invalidate();
        return () => camera.clearViewOffset();
    }, [camera, width, height, invalidate]);
    return null;
}

/** Advances the story clock while playing; large frame gaps (tab switches) are clamped. */
export function Director({ clock, playing }: { clock: StoryClock; playing: boolean }) {
    const invalidate = useThree((s) => s.invalidate);
    useEffect(() => clock.setFrameRequester(invalidate), [clock, invalidate]);
    useFrame((_, delta) => {
        if (playing) clock.advance(Math.min(delta, 0.1));
    });
    return null;
}
