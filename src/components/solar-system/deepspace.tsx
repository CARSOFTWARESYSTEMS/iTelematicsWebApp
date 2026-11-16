'use client';
// Cinematic interplanetary cruise (visual recovery, round 2). The default view of the cruise follows the
// spacecraft itself instead of an orbit diagram. The scene is centred on RSC-1 (floating origin): the
// spacecraft is drawn at full scale, and the Sun, the Earth and Jupiter are drawn on a sphere of radius
// SKY around it, each in its true direction and at its true angular size for that date, from the same
// ephemeris and transfer trajectory the scientific view uses (trajectory.ts). Only their distance is
// compressed, which a camera cannot see: what is on screen is what the spacecraft's camera would see.
//
// Attitude: during cruise the high-gain antenna (spacecraft +Y) points at the Earth, as a deep-space
// probe's normally does; the Sun lights it from the side. Nothing fires: the spacecraft coasts.
import { useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, Quaternion, ShaderMaterial, Vector3, type Group, type Mesh } from 'three';
import { R_EARTH } from '@/lib/solar-system/constants';
import { dateOf } from '@/lib/solar-system/phaseB';
import { planetAt, R_JUPITER, spacecraftAt } from '@/lib/solar-system/trajectory';
import type { VehicleState } from './LaunchVehicle';
import SpacecraftModel from './Spacecraft';
import { Globe, LOGDEPTH } from './environment';
import { DeepPlanet, toScene } from './PlanetViews';
import { LiveReflections } from './render';
import { SUN_IRRADIANCE } from './sun';
import { Stars } from './views';
import { useLabelAnchor } from '@/components/space-twin/labels';

/** Radius (m) of the sphere on which the Sun and planets are drawn around the spacecraft. */
export const SKY = 2e6;
const R_SUN = 6.957e8;
const Y = new Vector3(0, 1, 0);

/** Directions and distances (scene frame, m) from the spacecraft to the Sun, the Earth and Jupiter. */
export function deepGeometry(met: number) {
    const jd = dateOf(met);
    const sc = toScene(spacecraftAt(jd).r);
    const sun = sc.clone().negate();
    const earth = toScene(planetAt('earth', jd)).sub(sc);
    const jupiter = toScene(planetAt('jupiter', jd)).sub(sc);
    return { sun, earth, jupiter };
}

/** Spacecraft attitude in cruise: the dish (+Y) on the Earth. */
export function cruiseAttitude(earth: Vector3, out = new Quaternion()) {
    return out.setFromUnitVectors(Y, earth.clone().normalize());
}

/** The Sun seen from the spacecraft: a saturating disc and the glare a camera records around it. */
function SunDisc({ at }: { at: () => { dir: Vector3; radius: number } }) {
    const disc = useRef<Mesh>(null);
    const glare = useRef<Mesh>(null);
    const glareMat = useMemo(
        () =>
            new ShaderMaterial({
                transparent: true,
                depthWrite: false,
                blending: AdditiveBlending,
                uniforms: { uColor: { value: new Color(1, 0.93, 0.82) } },
                vertexShader: /* glsl */ `${LOGDEPTH.vPars} varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); ${LOGDEPTH.v} }`,
                fragmentShader: /* glsl */ `${LOGDEPTH.fPars} uniform vec3 uColor; varying vec2 vUv;
                    void main() { ${LOGDEPTH.f} float d = length(vUv - 0.5) * 2.0; float g = exp(-d * 9.0) * 1.6 + exp(-d * 3.2) * 0.12; gl_FragColor = vec4(uColor * g * smoothstep(1.0, 0.8, d), 1.0); }`,
            }),
        [],
    );
    useFrame(({ camera }) => {
        const { dir, radius } = at();
        disc.current?.position.copy(dir).multiplyScalar(SKY);
        disc.current?.scale.setScalar(radius);
        if (glare.current) {
            glare.current.position.copy(dir).multiplyScalar(SKY * 0.98);
            glare.current.scale.setScalar(radius * 40);
            glare.current.quaternion.copy(camera.quaternion);
        }
    });
    return (
        <>
            <mesh ref={disc}>
                <sphereGeometry args={[1, 32, 16]} />
                <meshBasicMaterial color={new Color(60, 56, 48)} />
            </mesh>
            <mesh ref={glare} material={glareMat} renderOrder={2}>
                <planeGeometry args={[1, 1]} />
            </mesh>
        </>
    );
}

/** A planet too small to resolve still shows as a point of light (a few pixels, like a star). */
function PointOfLight({ at, color, label }: { at: () => Vector3; color: string; label?: string }) {
    const ref = useRef<Group>(null);
    useLabelAnchor(label ?? null, ref, [0, 0, 0]);
    useFrame(() => ref.current?.position.copy(at()).multiplyScalar(SKY * 0.999));
    return (
        <group ref={ref}>
            <points>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[new Float32Array([0, 0, 0]), 3]} />
                </bufferGeometry>
                <pointsMaterial color={color} size={3.2} sizeAttenuation={false} transparent opacity={0.95} />
            </points>
        </group>
    );
}

export function DeepSpaceView({ met, state, quality, shot = () => '' }: { met: () => number; state: MutableRefObject<VehicleState>; quality: 'high' | 'low'; shot?: () => string }) {
    // Name chips only where they tell the story: the Earth left behind, Jupiter ahead.
    const [named, setNamed] = useState<'earth' | 'jupiter' | null>(null);
    const craft = useRef<Group>(null);
    const light = useRef<Group>(null);
    const geo = useRef(deepGeometry(met()));
    const earthSun = useRef(new Vector3(1, 0, 0));
    const jupSun = useRef(new Vector3(1, 0, 0));
    const q = useMemo(() => new Quaternion(), []);
    const earthAt = useRef<Group>(null);
    const jupAt = useRef<Group>(null);
    useFrame(() => {
        const sh = shot();
        const want = sh === 'deepDepart' || sh === 'deepComms' ? 'earth' : sh === 'deepApproach' ? 'jupiter' : null;
        if (want !== named) setNamed(want);
        const g = deepGeometry(met());
        geo.current = g;
        if (craft.current) craft.current.quaternion.copy(cruiseAttitude(g.earth, q));
        light.current?.position.copy(g.sun).normalize().multiplyScalar(1e7);
        // The Earth and Jupiter at their true angular size on the sky sphere.
        const place = (grp: Group | null, v: Vector3, r: number) => {
            if (!grp) return;
            grp.position.copy(v).normalize().multiplyScalar(SKY);
            grp.scale.setScalar((SKY * r) / v.length());
        };
        place(earthAt.current, g.earth, 1);
        place(jupAt.current, g.jupiter, 1);
        earthSun.current.copy(g.sun).sub(g.earth).normalize();
        jupSun.current.copy(g.sun).sub(g.jupiter).normalize();
        // Runs before the children (priority −1), so the points of light and labels use this frame's geometry.
    }, -1);
    const sunDisc = () => ({ dir: geo.current.sun.clone().normalize(), radius: (SKY * R_SUN) / geo.current.sun.length() });
    return (
        <>
            <Stars count={quality === 'high' ? 3000 : 1400} brightness={() => 1} />
            <group ref={light}>
                <directionalLight intensity={SUN_IRRADIANCE} color="#fff6ea" />
            </group>
            <ambientLight intensity={0.015} />
            <LiveReflections at={() => new Vector3()} hide={craft} interval={0.5} />
            <SunDisc at={sunDisc} />
            <group ref={earthAt}>
                <Globe radius={R_EARTH} orientation={new Quaternion()} sun={earthSun} detail="low" />
            </group>
            <PointOfLight at={() => geo.current.earth.clone().normalize()} color="#9cc8ff" label={named === 'earth' ? 'deep-earth' : undefined} />
            <group ref={jupAt}>
                <DeepPlanet id="jupiter" radius={R_JUPITER} sun={() => jupSun.current} />
            </group>
            <PointOfLight at={() => geo.current.jupiter.clone().normalize()} color="#f3e2c4" label={named === 'jupiter' ? 'deep-jupiter' : undefined} />
            <group ref={craft}>
                <SpacecraftModel state={state} />
            </group>
        </>
    );
}
