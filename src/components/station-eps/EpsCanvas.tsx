"use client";
// WebGL canvas of the Station Power & Energy experience. Loaded lazily, only when the fifth Space
// Digital Twin option is opened; renders continuously only while playing and visible, otherwise on
// demand, and three.js releases every resource when it unmounts.
import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { SRGBColorSpace } from 'three';
import { AdaptiveDpr, EarthTextures, StarField } from '@/components/space-twin/environment';
import { LabelContext, LabelOverlay, LabelProjector, useLabelRegistry } from '@/components/space-twin/labels';
import { Director } from '@/components/space-twin/rig';
import type { StoryClock } from '@/lib/space-twin/story';
import type { Highlight, Scene, Tone } from '@/lib/station-eps/scenes';
import EpsScene from './EpsScene';
import styles from './EpsExperience.module.css';

/** Read-only renderer counters for verifying resource cleanup (development, or ?eps-debug). */
function DebugInfo() {
    const gl = useThree((s) => s.gl);
    useEffect(() => {
        if (process.env.NODE_ENV === 'production' && !window.location.search.includes('eps-debug')) return;
        const w = window as Window & { __stationEps?: { info: () => Record<string, number> } };
        w.__stationEps = { info: () => ({ geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, calls: gl.info.render.calls, triangles: gl.info.render.triangles }) };
        return () => {
            delete w.__stationEps;
        };
    }, [gl]);
    return null;
}

export default function EpsCanvas({
    scene,
    clock,
    overview,
    playing,
    reducedMotion,
    overlay,
    quality,
    tones,
    chips,
    onReady,
}: {
    scene: Scene;
    clock: StoryClock;
    overview: boolean;
    playing: boolean;
    reducedMotion: boolean;
    overlay: boolean;
    quality: 'high' | 'low';
    tones: Partial<Record<Highlight, Tone>>;
    chips: { id: string; text: string; alert?: boolean }[];
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
                    gl={{ antialias: true, alpha: false, powerPreference: 'default', stencil: false }}
                    camera={{ fov: 34, near: 1, far: 12000, position: [200, 90, 260] }}
                    onCreated={({ gl }) => {
                        gl.setClearColor('#03050a', 1);
                        gl.outputColorSpace = SRGBColorSpace;
                        onReady();
                    }}
                    aria-hidden="true"
                >
                    <StarField count={high ? 1800 : 900} />
                    <EarthTextures>
                        <EpsScene scene={scene} clock={clock} overview={overview} playing={playing} reducedMotion={reducedMotion} overlay={overlay} shadows={high} tones={tones} />
                    </EarthTextures>
                    <Director clock={clock} playing={playing} />
                    {high && <AdaptiveDpr />}
                    <LabelProjector />
                    <DebugInfo />
                </Canvas>
                {overlay && <LabelOverlay labels={chips} className={styles.chip} alertClassName={styles.chipAlert} />}
            </div>
        </LabelContext.Provider>
    );
}
