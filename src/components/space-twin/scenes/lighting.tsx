"use client";
// Sunlight, eclipse and the Earth backdrop shared by the Satellite, Spacecraft and Space Station
// scenes. The simulation's shadow factor dims the Sun and its reflection to almost nothing in
// Earth's shadow and turns Earth's visible face to night, as seen from the spacecraft.
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, type DirectionalLight } from 'three';
import type { View } from '@/lib/space-twin/story';
import type { StoryClock } from '@/lib/space-twin/story';
import { Earth } from '../environment';

const DEG = Math.PI / 180;

/**
 * Earth large and far (not to scale), placed so its limb crosses the lower part of the resting
 * view: `reach` is the distance along the view and `drop` how far below it the Earth sits.
 */
export function earthBehind(home: View, cameraDistance: number, reach: number, drop = 40, side = -8): [number, number, number] {
    const camera = new Vector3(Math.cos(home.el * DEG) * Math.sin(home.az * DEG), Math.sin(home.el * DEG), Math.cos(home.el * DEG) * Math.cos(home.az * DEG))
        .multiplyScalar(cameraDistance)
        .add(new Vector3(...home.target));
    const forward = new Vector3(...home.target).sub(camera).normalize();
    const right = new Vector3().crossVectors(forward, new Vector3(0, 1, 0)).normalize();
    const up = new Vector3().crossVectors(right, forward);
    const toEarth = forward.applyAxisAngle(right, -drop * DEG).applyAxisAngle(up, side * DEG);
    return camera.add(toEarth.multiplyScalar(reach)).toArray() as [number, number, number];
}

export function OrbitLighting({
    clock,
    shadowAt,
    sun,
    earth,
    earthRadius,
    shadows,
    shadowBox,
    playing,
    keyIntensity = 3.1,
    exposure = 0.62,
}: {
    clock: StoryClock;
    shadowAt: (t: number) => number;
    sun: [number, number, number];
    earth: [number, number, number];
    earthRadius: number;
    shadows: boolean;
    /** Half-size and depth of the shadow camera around the model. */
    shadowBox: [number, number];
    playing: boolean;
    keyIntensity?: number;
    exposure?: number;
}) {
    const key = useRef<DirectionalLight>(null);
    const fill = useRef<DirectionalLight>(null);
    const scene = useThree((s) => s.scene);
    const sunUnit = useRef(new Vector3(...sun).normalize());
    const behind = useRef(new Vector3(...earth).normalize());
    const sunDir = useRef(sunUnit.current.clone());
    useEffect(
        () => () => {
            scene.environmentIntensity = 1;
        },
        [scene],
    );
    useFrame(() => {
        const f = shadowAt(clock.time);
        if (key.current) key.current.intensity = keyIntensity * (1 - 0.94 * f);
        if (fill.current) fill.current.intensity = 0.55 * (1 - 0.8 * f);
        scene.environmentIntensity = 1 - 0.8 * f;
        sunDir.current.copy(sunUnit.current).lerp(behind.current, f).normalize();
    });
    const [half, depth] = shadowBox;
    const [sx, sy, sz] = sun;
    const k = (depth * 0.5) / Math.hypot(sx, sy, sz);
    return (
        <>
            <hemisphereLight args={['#9fb4d8', '#0b1430', 0.35]} />
            <directionalLight
                ref={key}
                position={[sx * k, sy * k, sz * k]}
                intensity={keyIntensity}
                color="#fff2df"
                castShadow={shadows}
                shadow-mapSize={[2048, 2048]}
                shadow-bias={-0.0004}
                shadow-normalBias={0.03}
                shadow-camera-left={-half}
                shadow-camera-right={half}
                shadow-camera-top={half}
                shadow-camera-bottom={-half}
                shadow-camera-near={1}
                shadow-camera-far={depth}
            />
            <directionalLight position={[70, 30, -90]} intensity={1.3} color="#9db7e0" />
            <directionalLight ref={fill} position={[10, -90, 40]} intensity={0.55} color="#60a5fa" />
            <Earth radius={earthRadius} position={earth} sun={sunDir} playing={playing} exposure={exposure} />
        </>
    );
}
