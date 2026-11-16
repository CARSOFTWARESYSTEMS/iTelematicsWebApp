'use client';
// WebGL canvas of the Solar System experience. Loaded lazily, only when the sixth Space Digital Twin
// option is opened; renders continuously only while playing and visible, otherwise on demand.
// A logarithmic depth buffer lets one camera go from engine close-ups (metres) to the Sun-centred
// view (astronomical units); every custom shader in this experience writes logarithmic depth.
import { memo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { AdaptiveDpr } from '@/components/space-twin/environment';
import { LabelContext, LabelOverlay, LabelProjector, useLabelRegistry } from '@/components/space-twin/labels';
import type { MissionClock } from '@/lib/solar-system/clock';
import type { Focus } from '@/lib/solar-system/mission';
import { GlobeTextures } from './environment';
import { SiteTextures } from './LaunchSite';
import SolarScene from './SolarScene';
import styles from './SolarSystemExperience.module.css';

/** Advances the mission clock while playing (at the visitor's playback speed); long frame gaps (tab switches) are clamped. */
function ClockDriver({ clock, playing, rate }: { clock: MissionClock; playing: boolean; rate: number }) {
    const invalidate = useThree((s) => s.invalidate);
    useEffect(() => clock.setFrameRequester(invalidate), [clock, invalidate]);
    // A canvas mounted while the mission is paused (on-demand rendering) keeps drawing for its first few
    // seconds, so the frame appears once its textures have loaded (e.g. after scrolling back on a phone).
    useEffect(() => {
        const id = window.setInterval(invalidate, 250);
        const stop = window.setTimeout(() => window.clearInterval(id), 5000);
        return () => {
            window.clearInterval(id);
            window.clearTimeout(stop);
        };
    }, [invalidate]);
    // Development only: window.__solarSeek(storySeconds) jumps within the current programme (frame reviews).
    useEffect(() => {
        if (process.env.NODE_ENV === 'production') return;
        const w = window as Window & { __solarSeek?: (t: number) => void; __solarStory?: () => { t: number; total: number; met: number } };
        w.__solarSeek = (t: number) => clock.seek(t);
        w.__solarStory = () => ({ t: clock.time, total: clock.duration, met: clock.met });
        return () => {
            delete w.__solarSeek;
            delete w.__solarStory;
        };
    }, [clock]);
    // Development only: ?solar-speed=N plays the story N times faster, for reviewing the whole mission.
    const speed = process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' ? Number(new URLSearchParams(window.location.search).get('solar-speed')) || 1 : 1;
    useFrame((_, delta) => {
        if (playing) clock.advance(Math.min(delta, 0.1) * speed * rate);
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

function SolarCanvas({
    clock,
    playing,
    rate = 1,
    reducedMotion,
    quality,
    focus,
    labels,
    shift = 0,
    shiftY = 0,
    onReady,
}: {
    clock: MissionClock;
    playing: boolean;
    /** Playback speed (0.5, 1 or 2). */
    rate?: number;
    reducedMotion: boolean;
    quality: 'high' | 'low';
    focus?: Focus;
    labels: { id: string; text: string }[];
    /** Horizontal composition offset (fraction of the width) so the hardware clears the overlay card. */
    shift?: number;
    /** Vertical composition offset (fraction of the height): positive frames the subject higher. */
    shiftY?: number;
    onReady: () => void;
}) {
    const registry = useLabelRegistry();
    const high = quality === 'high';
    return (
        <LabelContext.Provider value={registry}>
            <div className={styles.canvasInner}>
                <Canvas
                    frameloop={playing ? 'always' : 'demand'}
                    shadows={high ? 'soft' : false}
                    dpr={high ? [1, 1.75] : 1}
                    gl={{ antialias: true, alpha: false, powerPreference: 'default', stencil: false, logarithmicDepthBuffer: true }}
                    camera={{ fov: 36, near: 0.1, far: 1e10, position: [0, 2e7, 2e7] }}
                    onCreated={({ gl }) => {
                        gl.setClearColor('#03050a', 1);
                        gl.outputColorSpace = SRGBColorSpace;
                        gl.toneMapping = ACESFilmicToneMapping;
                        gl.toneMappingExposure = 1.0;
                        // Engineering cutaways are section cuts through the vehicle (clipping planes).
                        gl.localClippingEnabled = true;
                    }}
                    aria-hidden="true"
                >
                    <GlobeTextures hd={high}>
                        <SiteTextures>
                            <SolarScene clock={clock} quality={quality} reducedMotion={reducedMotion} focusOverride={focus} shift={shift} shiftY={shiftY} onReady={onReady} />
                        </SiteTextures>
                    </GlobeTextures>
                    <ClockDriver clock={clock} playing={playing} rate={rate} />
                    {high && <AdaptiveDpr />}
                    <LabelProjector />
                    <DebugInfo />
                </Canvas>
                <LabelOverlay labels={labels} className={styles.chip} alertClassName={styles.chipAlert} />
            </div>
        </LabelContext.Provider>
    );
}

/** Memoised: the overlay re-renders on clock ticks, the 3D scene does not need to. */
export default memo(SolarCanvas);
