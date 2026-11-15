'use client';
// Supporting views of the Solar System experience: the star field, trajectory lines, the vehicle
// marker for wide shots, and the Sun-centred (heliocentric) view. Orbits in the heliocentric view are
// to scale; the Sun and planets are enlarged so they can be seen, and the view says so.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Line, LineBasicMaterial, LineDashedMaterial, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector3, type Group, type Mesh, type Points, type Texture } from 'three';
import { useLabelAnchor } from '@/components/space-twin/labels';
import { AU, ORBIT_AU } from '@/lib/solar-system/constants';
import { EARTH_JUPITER } from '@/lib/solar-system/orbit';
import { LOGDEPTH, useEarthMaps } from './environment';

/** Fixed stars that follow the camera (log-depth aware), dimmed by `brightness` (0 in daylight). */
export function Stars({ count, brightness }: { count: number; brightness: () => number }) {
    const ref = useRef<Points>(null);
    const camera = useThree((s) => s.camera);
    const dpr = useThree((s) => s.viewport.dpr);
    const geometry = useMemo(() => {
        let seed = 91;
        const rnd = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        const pos: number[] = [];
        const size: number[] = [];
        const col: number[] = [];
        for (let i = 0; i < count; i++) {
            const z = rnd() * 2 - 1;
            const a = rnd() * Math.PI * 2;
            const r = Math.sqrt(1 - z * z);
            pos.push(r * Math.cos(a), z, r * Math.sin(a));
            size.push(0.9 + Math.pow(rnd(), 7) * 2.6);
            const b = 0.35 + 0.65 * rnd() * rnd();
            const tint = rnd();
            col.push(b * (0.86 + 0.14 * tint), b * (0.9 + 0.08 * tint), b);
        }
        const g = new BufferGeometry();
        g.setAttribute('position', new Float32BufferAttribute(pos, 3));
        g.setAttribute('aSize', new Float32BufferAttribute(size, 1));
        g.setAttribute('aColor', new Float32BufferAttribute(col, 3));
        return g;
    }, [count]);
    const material = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: { uPx: { value: dpr }, uBright: { value: 1 } },
                vertexShader: /* glsl */ `${LOGDEPTH.vPars}
                    attribute float aSize; attribute vec3 aColor; uniform float uPx; varying vec3 vColor;
                    void main() { vColor = aColor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uPx; ${LOGDEPTH.v} }`,
                fragmentShader: /* glsl */ `${LOGDEPTH.fPars}
                    uniform float uBright; varying vec3 vColor;
                    void main() { ${LOGDEPTH.f} float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d) * uBright; gl_FragColor = vec4(vColor * a, a); }`,
                transparent: true,
                depthWrite: false,
                blending: AdditiveBlending,
            }),
        [dpr],
    );
    useEffect(() => () => geometry.dispose(), [geometry]);
    useEffect(() => () => material.dispose(), [material]);
    useFrame(() => {
        const b = brightness();
        material.uniforms.uBright.value = b;
        if (ref.current) {
            ref.current.visible = b > 0.01;
            ref.current.position.copy(camera.position);
            ref.current.scale.setScalar(1e12);
        }
    });
    return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={-9} />;
}

/** A polyline; `count()` (optional) limits how much of it is drawn (a path revealed as it is flown). */
export function Path({ points, color, opacity = 1, dashed = false, count }: { points: Vector3[]; color: string; opacity?: number; dashed?: boolean; count?: () => number }) {
    const line = useMemo(() => {
        const g = new BufferGeometry().setFromPoints(points);
        const m = dashed ? new LineDashedMaterial({ color: new Color(color), transparent: true, opacity, dashSize: 1, gapSize: 1, depthWrite: false }) : new LineBasicMaterial({ color: new Color(color), transparent: opacity < 1, opacity, depthWrite: false });
        const l = new Line(g, m);
        if (dashed) {
            l.computeLineDistances();
            const total = (g.getAttribute('lineDistance').array as Float32Array).at(-1) ?? 1;
            (m as LineDashedMaterial).dashSize = total / 120;
            (m as LineDashedMaterial).gapSize = total / 160;
        }
        l.frustumCulled = false;
        return l;
    }, [points, color, opacity, dashed]);
    useEffect(
        () => () => {
            line.geometry.dispose();
            (line.material as LineBasicMaterial).dispose();
        },
        [line],
    );
    useFrame(() => {
        if (count) line.geometry.setDrawRange(0, Math.max(0, Math.min(points.length, Math.floor(count()))));
    });
    return <primitive object={line} />;
}

/** A small glowing dot of constant screen size for wide shots, with a label anchor. */
export function Marker({ position, label, color = '#22D3EE', size = 0.012 }: { position: () => Vector3; label: string | null; color?: string; size?: number }) {
    const ref = useRef<Group>(null);
    const camera = useThree((s) => s.camera);
    useLabelAnchor(label, ref, [0, 0, 0]);
    const material = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: { uColor: { value: new Color(color) } },
                vertexShader: /* glsl */ `${LOGDEPTH.vPars} varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); ${LOGDEPTH.v} }`,
                fragmentShader: /* glsl */ `${LOGDEPTH.fPars} uniform vec3 uColor; varying vec2 vUv;
                    void main() { ${LOGDEPTH.f} float d = length(vUv - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uColor * a * 1.4, a); }`,
                transparent: true,
                depthWrite: false,
                blending: AdditiveBlending,
            }),
        [color],
    );
    useEffect(() => () => material.dispose(), [material]);
    const mesh = useRef<Mesh>(null);
    const world = useMemo(() => new Vector3(), []);
    useFrame(() => {
        const p = position();
        if (ref.current) ref.current.position.copy(p);
        if (mesh.current) {
            // Distance to where the marker really is (its parent may be offset, e.g. a floating origin).
            mesh.current.getWorldPosition(world);
            const d = camera.position.distanceTo(world);
            mesh.current.scale.setScalar(d * size);
            mesh.current.quaternion.copy(camera.quaternion);
        }
    });
    return (
        <group ref={ref}>
            <mesh ref={mesh} material={material} renderOrder={8}>
                <planeGeometry args={[1, 1]} />
            </mesh>
        </group>
    );
}

// ── Heliocentric view ────────────────────────────────────────────────────

/** Enlargement factors for the heliocentric view (orbits to scale, bodies not). */
export const HELIO_SCALE = { sun: 25, earth: 2500, jupiter: 250 } as const;

const orbitPoints = (rAU: number, n = 256) => Array.from({ length: n + 1 }, (_, i) => new Vector3(Math.cos((i / n) * Math.PI * 2) * rAU * AU, 0, -Math.sin((i / n) * Math.PI * 2) * rAU * AU));

/** Transfer ellipse from Earth (perihelion, θ = 0) to Jupiter's orbit (aphelion, θ = π). */
export function transferPoint(theta: number) {
    const r1 = ORBIT_AU.earth * AU;
    const r2 = ORBIT_AU.jupiter * AU;
    const a = (r1 + r2) / 2;
    const e = (r2 - r1) / (r2 + r1);
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
    return new Vector3(r * Math.cos(theta), 0, -r * Math.sin(theta));
}

/** Jupiter's angle at departure for a Hohmann arrival at θ = π (mean motion × transfer time). */
export const JUPITER_AT_DEPARTURE = Math.PI - ((2 * Math.PI) / 11.862) * EARTH_JUPITER.tofYears;

/** Loads the Sun and Jupiter maps (Solar System Scope, CC BY 4.0) when the Sun-centred view opens. */
function usePlanetMaps() {
    const [maps, setMaps] = useState<{ sun: Texture; jupiter: Texture } | null>(null);
    const invalidate = useThree((s) => s.invalidate);
    useEffect(() => {
        let alive = true;
        const loader = new TextureLoader();
        const load = (f: string) =>
            loader.loadAsync('/images/solar-system/' + f).then((t) => {
                t.colorSpace = SRGBColorSpace;
                return t;
            });
        Promise.all([load('sun-2k.jpg'), load('jupiter-2k.jpg')])
            .then(([sun, jupiter]) => {
                if (!alive) return [sun, jupiter].forEach((t) => t.dispose());
                setMaps({ sun, jupiter });
                invalidate();
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [invalidate]);
    useEffect(
        () => () => {
            maps?.sun.dispose();
            maps?.jupiter.dispose();
        },
        [maps],
    );
    return maps;
}

export function HelioView({ sunLight }: { sunLight: boolean }) {
    const planets = usePlanetMaps();
    const earthMaps = useEarthMaps();
    const earthOrbit = useMemo(() => orbitPoints(ORBIT_AU.earth), []);
    const jupiterOrbit = useMemo(() => orbitPoints(ORBIT_AU.jupiter), []);
    const transfer = useMemo(() => Array.from({ length: 181 }, (_, i) => transferPoint((i / 180) * Math.PI)), []);
    const sun = useRef<Group>(null);
    const earth = useRef<Group>(null);
    const jupiter = useRef<Group>(null);
    const arrival = useRef<Group>(null);
    useLabelAnchor('helio-sun', sun, [0, 0, 0]);
    useLabelAnchor('helio-earth', earth, [0, 0, 0]);
    useLabelAnchor('helio-jupiter', jupiter, [0, 0, 0]);
    useLabelAnchor('helio-arrival', arrival, [0, 0, 0]);
    const glow = useMemo(
        () =>
            new ShaderMaterial({
                vertexShader: /* glsl */ `${LOGDEPTH.vPars} varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); ${LOGDEPTH.v} }`,
                fragmentShader: /* glsl */ `${LOGDEPTH.fPars} varying vec2 vUv;
                    void main() { ${LOGDEPTH.f} float d = length(vUv - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - d), 2.4); gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * a, a); }`,
                transparent: true,
                depthWrite: false,
                blending: AdditiveBlending,
            }),
        [],
    );
    useEffect(() => () => glow.dispose(), [glow]);
    const camera = useThree((s) => s.camera);
    const glowMesh = useRef<Mesh>(null);
    useFrame(() => glowMesh.current?.quaternion.copy(camera.quaternion));
    const jAngle = JUPITER_AT_DEPARTURE;
    return (
        <group>
            {sunLight && <pointLight position={[0, 0, 0]} intensity={4} decay={0} color="#fff3dd" />}
            <ambientLight intensity={0.05} />
            <group ref={sun}>
                <mesh>
                    <sphereGeometry args={[6.957e8 * HELIO_SCALE.sun, 64, 48]} />
                    <meshBasicMaterial color={planets ? '#ffffff' : '#fff1cf'} map={planets?.sun ?? null} toneMapped={false} />
                </mesh>
                <mesh ref={glowMesh} material={glow} scale={6.957e8 * HELIO_SCALE.sun * 7}>
                    <planeGeometry args={[1, 1]} />
                </mesh>
            </group>
            <Path points={earthOrbit} color="#5b8fd6" opacity={0.6} />
            <Path points={jupiterOrbit} color="#c9a978" opacity={0.5} />
            <Path points={transfer} color="#22D3EE" opacity={0.9} dashed />
            <group ref={earth} position={[ORBIT_AU.earth * AU, 0, 0]}>
                <mesh rotation={[0, 0, (23.4 * Math.PI) / 180]}>
                    <sphereGeometry args={[6.371e6 * HELIO_SCALE.earth, 64, 48]} />
                    <meshStandardMaterial color={earthMaps ? '#ffffff' : '#3d6fb6'} map={earthMaps?.day ?? null} roughness={0.85} />
                </mesh>
            </group>
            <group ref={jupiter} position={[Math.cos(jAngle) * ORBIT_AU.jupiter * AU, 0, -Math.sin(jAngle) * ORBIT_AU.jupiter * AU]}>
                <mesh rotation={[0, 0, (3.1 * Math.PI) / 180]}>
                    <sphereGeometry args={[7.1492e7 * HELIO_SCALE.jupiter, 64, 48]} />
                    <meshStandardMaterial color={planets ? '#ffffff' : '#c8ae86'} map={planets?.jupiter ?? null} roughness={0.9} />
                </mesh>
            </group>
            <group ref={arrival} position={transferPoint(Math.PI)} />
        </group>
    );
}
