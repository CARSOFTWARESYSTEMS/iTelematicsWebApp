"use client";
// WebGL canvas for the homepage hero station. Loaded lazily in the browser only; it animates only
// while the hero is visible and playing, renders on demand otherwise, and three.js releases the
// renderer, geometry, materials and textures when it unmounts.
import { Canvas } from '@react-three/fiber';
import { SRGBColorSpace } from 'three';
import { AdaptiveDpr, EarthTextures, StarField } from '@/components/space-twin/environment';
import { Director } from '@/components/space-twin/rig';
import type { StoryClock } from '@/lib/space-twin/story';
import { StationHeroScene } from './StationScene';

export default function StationHeroCanvas({ clock, playing, quality, onReady }: { clock: StoryClock; playing: boolean; quality: 'high' | 'low'; onReady: () => void }) {
    const high = quality === 'high';
    return (
        <Canvas
            frameloop={playing ? 'always' : 'demand'}
            shadows={high ? 'percentage' : false}
            dpr={high ? [1, 1.75] : 1}
            gl={{ antialias: true, alpha: false, powerPreference: 'default', stencil: false }}
            camera={{ fov: 34, near: 1, far: 12000, position: [120, 60, 160] }}
            onCreated={({ gl }) => {
                gl.setClearColor('#050a10', 1);
                gl.outputColorSpace = SRGBColorSpace;
                onReady();
            }}
            aria-hidden="true"
        >
            <StarField count={high ? 1400 : 700} />
            <EarthTextures>
                <StationHeroScene clock={clock} playing={playing} shadows={high} />
            </EarthTextures>
            <Director clock={clock} playing={playing} />
            {high && <AdaptiveDpr />}
        </Canvas>
    );
}
