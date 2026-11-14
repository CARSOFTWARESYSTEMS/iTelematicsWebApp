"use client";
import { useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { StoryClock, View } from '@/lib/space-twin/story';
import type { Glow } from '../primitives';
import { CameraRig, Controls, type ViewHandle } from '../rig';

/** What every scene receives from the shared viewer. */
export interface SceneProps {
    clock: StoryClock;
    /** Current phase id (changes a few times per loop, never per frame). */
    phase: string;
    playing: boolean;
    reducedMotion: boolean;
    compact: boolean;
    lowQuality: boolean;
    shadows: boolean;
    selected: string | null;
    onSelect: (id: string) => void;
    tones: Partial<Record<string, Glow>>;
    viewRef: { current: ViewHandle | null };
}

/** Orbit controls plus the story's camera path, sized to the scene. */
export function StoryCamera({ clock, viewAt, home, span, reducedMotion, viewRef }: { clock: StoryClock; viewAt: (t: number) => View; home: View; span: number; reducedMotion: boolean; viewRef: SceneProps['viewRef'] }) {
    const controlsRef = useRef<OrbitControlsImpl>(null);
    const userRef = useRef(false);
    return (
        <>
            <Controls controlsRef={controlsRef} userRef={userRef} viewRef={viewRef} span={span} />
            <CameraRig clock={clock} viewAt={viewAt} home={home} span={span} reducedMotion={reducedMotion} controlsRef={controlsRef} userRef={userRef} />
        </>
    );
}
