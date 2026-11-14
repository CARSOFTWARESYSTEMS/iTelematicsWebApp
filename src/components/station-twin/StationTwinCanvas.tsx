"use client";
// The WebGL canvas behind the /space-station model, separate from the Space Digital Twin's canvas.
// Loaded lazily, in the browser only, when the section nears the screen; it renders only while the
// section is visible and playing (otherwise on demand), and three.js releases the renderer,
// geometry, materials and textures when the section unmounts.
import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { SRGBColorSpace } from 'three';
import { AdaptiveDpr, EarthTextures, StarField } from '@/components/space-twin/environment';
import { LabelContext, LabelOverlay, LabelProjector, useLabelRegistry } from '@/components/space-twin/labels';
import { Director, PortraitFraming } from '@/components/space-twin/rig';
import type { SceneProps } from '@/components/space-twin/scenes/shared';
import type { Chip } from '@/lib/space-twin/story';
import StationScene from './StationScene';
import styles from './StationTwin.module.css';

/** Read-only renderer counters for verifying resource cleanup (development, or ?station-debug). */
function DebugInfo() {
    const gl = useThree((s) => s.gl);
    useEffect(() => {
        if (process.env.NODE_ENV === 'production' && !window.location.search.includes('station-debug')) return;
        const w = window as Window & { __stationTwin?: { info: () => Record<string, number> } };
        w.__stationTwin = {
            info: () => ({ geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, programs: gl.info.programs?.length ?? 0, calls: gl.info.render.calls, triangles: gl.info.render.triangles }),
        };
        return () => {
            delete w.__stationTwin;
        };
    }, [gl]);
    return null;
}

export type StationCanvasProps = Omit<SceneProps, 'shadows' | 'lowQuality'> & {
    quality: 'high' | 'low';
    chips: Chip[];
    onReady: () => void;
};

export default function StationTwinCanvas({ quality, chips, onReady, ...scene }: StationCanvasProps) {
    const registry = useLabelRegistry();
    const high = quality === 'high';
    return (
        <LabelContext.Provider value={registry}>
            <div className={styles.canvasInner}>
                <Canvas
                    frameloop={scene.playing ? 'always' : 'demand'}
                    shadows={high ? 'percentage' : false}
                    dpr={high ? [1, scene.compact ? 1.5 : 1.75] : 1}
                    gl={{ antialias: true, alpha: false, powerPreference: 'default', stencil: false }}
                    camera={{ fov: 34, near: 1, far: 12000, position: [60, 30, 220] }}
                    onCreated={({ gl }) => {
                        gl.setClearColor('#03050a', 1);
                        gl.outputColorSpace = SRGBColorSpace;
                        onReady();
                    }}
                    aria-hidden="true"
                >
                    <StarField count={high ? 1800 : 900} />
                    <EarthTextures>
                        <StationScene {...scene} shadows={high} lowQuality={!high} />
                    </EarthTextures>
                    <Director clock={scene.clock} playing={scene.playing} />
                    <PortraitFraming />
                    {high && <AdaptiveDpr />}
                    <LabelProjector />
                    <DebugInfo />
                </Canvas>
                <LabelOverlay labels={chips} className={styles.chip} alertClassName={styles.chipAlert} />
            </div>
        </LabelContext.Provider>
    );
}
