"use client";
// The one WebGL canvas behind the four experiences. Only the active scene is mounted: switching
// unmounts the previous scene, and three.js releases its geometry, materials and textures. Earth
// imagery is loaded once and shared. Loaded lazily, in the browser only, when the section nears
// the screen; the renderer is released when the section unmounts.
import { useEffect, type ComponentType } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { SRGBColorSpace } from 'three';
import type { ExperienceId } from '@/lib/space-twin/experiences';
import type { Chip } from '@/lib/space-twin/story';
import { AdaptiveDpr, EarthTextures, StarField } from './environment';
import { LabelContext, LabelOverlay, LabelProjector, useLabelRegistry } from './labels';
import { Director, PortraitFraming } from './rig';
import ConstellationScene from './scenes/ConstellationScene';
import SatelliteScene from './scenes/SatelliteScene';
import type { SceneProps } from './scenes/shared';
import SpacecraftScene from './scenes/SpacecraftScene';
import StationScene from './scenes/StationScene';
import styles from './SpaceTwin.module.css';

const SCENES: Record<ExperienceId, ComponentType<SceneProps>> = {
    satellite: SatelliteScene,
    constellation: ConstellationScene,
    spacecraft: SpacecraftScene,
    station: StationScene,
};

/** Read-only renderer counters for verifying resource cleanup (development, or ?twin-debug). */
function DebugInfo() {
    const gl = useThree((s) => s.gl);
    useEffect(() => {
        if (process.env.NODE_ENV === 'production' && !window.location.search.includes('twin-debug')) return;
        const w = window as Window & { __spaceTwin?: { info: () => Record<string, number> } };
        w.__spaceTwin = {
            info: () => ({ geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, programs: gl.info.programs?.length ?? 0, calls: gl.info.render.calls, triangles: gl.info.render.triangles }),
        };
        return () => {
            delete w.__spaceTwin;
        };
    }, [gl]);
    return null;
}

export type CanvasProps = Omit<SceneProps, 'shadows' | 'lowQuality'> & {
    experience: ExperienceId;
    quality: 'high' | 'low';
    chips: Chip[];
    onReady: () => void;
};

export default function SpaceTwinCanvas({ experience, quality, chips, onReady, ...scene }: CanvasProps) {
    const registry = useLabelRegistry();
    const Scene = SCENES[experience];
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
                        <Scene key={experience} {...scene} shadows={high} lowQuality={!high} />
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
