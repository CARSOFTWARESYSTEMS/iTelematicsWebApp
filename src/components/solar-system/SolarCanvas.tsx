"use client";
// WebGL canvas of the Solar System experience. Loaded lazily, only when the sixth Space Digital Twin
// option is opened; renders continuously only while playing and visible, otherwise on demand.
// A logarithmic depth buffer lets one camera go from engine close-ups (metres) to the Sun-centred
// view (astronomical units); every custom shader in this experience writes logarithmic depth.
import { useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { SRGBColorSpace } from 'three';
import { AdaptiveDpr } from '@/components/space-twin/environment';
import { LabelContext, LabelOverlay, LabelProjector, useLabelRegistry } from '@/components/space-twin/labels';
import type { MissionClock } from '@/lib/solar-system/clock';
import type { Focus } from '@/lib/solar-system/mission';
import { GlobeTextures } from './environment';
import { SiteTextures } from './LaunchSite';
import SolarScene from './SolarScene';
import styles from './SolarSystemExperience.module.css';

/** Advances the mission clock while playing; long frame gaps (tab switches) are clamped. */
function ClockDriver({ clock, playing }: { clock: MissionClock; playing: boolean }) {
    const invalidate = useThree((s) => s.invalidate);
    useEffect(() => clock.setFrameRequester(invalidate), [clock, invalidate]);
    // Development only: ?solar-speed=N plays the story N times faster, for reviewing the whole mission.
    const speed = process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' ? Number(new URLSearchParams(window.location.search).get('solar-speed')) || 1 : 1;
    useFrame((_, delta) => {
        if (playing) clock.advance(Math.min(delta, 0.1) * speed);
    });
    return null;
}

/** Read-only renderer counters for checking resource cleanup (development, or ?solar-debug). */
function DebugInfo() {
    const gl = useThree((s) => s.gl);
    useEffect(() => {
        if (process.env.NODE_ENV === 'production' && !window.location.search.includes('solar-debug')) return;
        const w = window as Window & { __solarSystem?: { info: () => Record<string, number> } };
        w.__solarSystem = { info: () => ({ geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, calls: gl.info.render.calls, triangles: gl.info.render.triangles }) };
        return () => {
            delete w.__solarSystem;
        };
    }, [gl]);
    return null;
}

export default function SolarCanvas({
    clock,
    playing,
    reducedMotion,
    quality,
    focus,
    labels,
    onReady,
}: {
    clock: MissionClock;
    playing: boolean;
    reducedMotion: boolean;
    quality: 'high' | 'low';
    focus?: Focus;
    labels: { id: string; text: string }[];
    onReady: () => void;
}) {
    const registry = useLabelRegistry();
    const high = quality === 'high';
    return (
        <LabelContext.Provider value={registry}>
            <div className={styles.canvasInner}>
                <Canvas
                    frameloop={playing ? 'always' : 'demand'}
                    shadows={high ? 'percentage' : false}
                    dpr={high ? [1, 1.75] : 1}
                    gl={{ antialias: true, alpha: false, powerPreference: 'default', stencil: false, logarithmicDepthBuffer: true }}
                    camera={{ fov: 36, near: 0.1, far: 1e10, position: [0, 2e7, 2e7] }}
                    onCreated={({ gl }) => {
                        gl.setClearColor('#03050a', 1);
                        gl.outputColorSpace = SRGBColorSpace;
                        onReady();
                    }}
                    aria-hidden="true"
                >
                    <GlobeTextures>
                        <SiteTextures>
                            <SolarScene clock={clock} quality={quality} reducedMotion={reducedMotion} focusOverride={focus} />
                        </SiteTextures>
                    </GlobeTextures>
                    <ClockDriver clock={clock} playing={playing} />
                    {high && <AdaptiveDpr />}
                    <LabelProjector />
                    <DebugInfo />
                </Canvas>
                <LabelOverlay labels={labels} className={styles.chip} alertClassName={styles.chipAlert} />
            </div>
        </LabelContext.Provider>
    );
}
