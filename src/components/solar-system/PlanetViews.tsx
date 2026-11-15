'use client';
// Phase B views of the Solar System experience.
// - CruiseView: Sun-centred, orbits to scale, planets where the ephemeris puts them on the date shown,
//   the designed trajectory (flown part solid) and the spacecraft. Bodies are markers, not to scale.
// - JupiterView: Jupiter-centred, to scale: Jupiter (oblate, rotating, lit from the Sun's true
//   direction), the Galilean moons on their orbits, the flyby hyperbola and RSC-1 on it.
// - SaturnView: Saturn and its rings to scale, with the spacecraft passing (cinematic placement).
// - TourView: the Discovery tour, with a floating origin at the destination so planets keep full
//   precision at true size while the overview spans 50 AU.
// Scene axes: ecliptic x → x, ecliptic north → y, ecliptic y → −z.
import { useContext, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
    AdditiveBlending,
    BackSide,
    BufferGeometry,
    Color,
    DoubleSide,
    Float32BufferAttribute,
    IcosahedronGeometry,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Points,
    RingGeometry,
    ShaderMaterial,
    SRGBColorSpace,
    TextureLoader,
    Quaternion,
    Vector3,
    type Group,
    type Mesh,
    type Texture,
} from 'three';
import { LabelContext, useLabelAnchor } from '@/components/space-twin/labels';
import { body, BODIES, type BodyId } from '@/lib/solar-system/bodies';
import { AU } from '@/lib/solar-system/constants';
import { positionAU, PLANETS, type PlanetId, type Vec } from '@/lib/solar-system/ephemeris';
import { dateOf, tourPosition, TOUR_EPOCH } from '@/lib/solar-system/phaseB';
import { flybyPosition, legPoints, missionTrajectory, planetAt, R_JUPITER, R_SATURN, spacecraftAt } from '@/lib/solar-system/trajectory';
import { Globe, LOGDEPTH } from './environment';
import type { VehicleState } from './LaunchVehicle';
import SpacecraftModel from './Spacecraft';
import { Marker, Path, Stars } from './views';

export const toScene = (v: Vec, out = new Vector3()) => out.set(v[0], v[2], -v[1]);

// ── Planet maps (Solar System Scope, CC BY 4.0), loaded when a Phase B view opens ──

const maps = new Map<string, Promise<Texture>>();
function loadMap(file: string) {
    let p = maps.get(file);
    if (!p) {
        p = new TextureLoader().loadAsync('/images/solar-system/' + file).then((t) => {
            t.colorSpace = SRGBColorSpace;
            t.anisotropy = 8;
            return t;
        });
        maps.set(file, p);
    }
    return p;
}
/** Releases the planet maps (when the experience closes). */
export function disposePlanetMaps() {
    for (const p of maps.values()) p.then((t) => t.dispose()).catch(() => {});
    maps.clear();
}
function useMap(file?: string) {
    const [t, set] = useState<Texture | null>(null);
    const invalidate = useThree((s) => s.invalidate);
    useEffect(() => {
        if (!file) return;
        let alive = true;
        loadMap(file)
            .then((x) => {
                if (alive) {
                    set(x);
                    invalidate();
                }
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [file, invalidate]);
    return t;
}

/** A deployed spacecraft state for the cruise and encounter views (booms out, nothing highlighted). */
function useDeployedState(): MutableRefObject<VehicleState> {
    return useRef<VehicleState>({
        firing1: 0,
        igniter: 0,
        firing2: false,
        firingKick: false,
        pressure: 0,
        stage1Away: null,
        stage1Tumble: 0,
        fairingOpen: 0,
        fairingAway: 0,
        fairingAttached: false,
        upperAway: null,
        spin: 0,
        cut: { part: null, amount: 0, azimuth: 0 },
        frost: 0,
        booms: { rtgBoom: 1, magnetometerBoom: 1, scienceBoom: 1 },
        time: 0,
    });
}

/** A bright, camera-facing glow (the Sun as a camera records it). */
function SunGlow({ size, at }: { size: () => number; at?: () => Vector3 }) {
    const ref = useRef<Mesh>(null);
    const camera = useThree((s) => s.camera);
    const material = useMemo(
        () =>
            new ShaderMaterial({
                vertexShader: /* glsl */ `${LOGDEPTH.vPars} varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); ${LOGDEPTH.v} }`,
                fragmentShader: /* glsl */ `${LOGDEPTH.fPars} varying vec2 vUv;
                    void main() { ${LOGDEPTH.f} float d = length(vUv - 0.5) * 2.0; float a = exp(-d * d * 18.0) + pow(max(0.0, 1.0 - d), 3.0) * 0.35; gl_FragColor = vec4(vec3(1.0, 0.9, 0.72) * a, a); }`,
                transparent: true,
                depthWrite: false,
                blending: AdditiveBlending,
            }),
        [],
    );
    useEffect(() => () => material.dispose(), [material]);
    useFrame(() => {
        if (!ref.current) return;
        if (at) ref.current.position.copy(at());
        ref.current.quaternion.copy(camera.quaternion);
        ref.current.scale.setScalar(size());
    });
    return (
        <mesh ref={ref} material={material} renderOrder={9}>
            <planeGeometry args={[1, 1]} />
        </mesh>
    );
}

/** A planet at true size: textured, oblate, tilted and turning, lit by the Sun. */
/**
 * North-pole directions (IAU, J2000), converted to the ecliptic and to scene axes, for the planets
 * whose orientation matters on screen (Jupiter's moons and Saturn's rings lie in their equators).
 */
const POLES: Partial<Record<BodyId, [number, number, number]>> = {
    jupiter: [-0.0146, 0.99925, 0.03576],
    saturn: [0.0855, 0.8825, -0.4624],
};
export const poleOf = (id: BodyId) => (POLES[id] ? new Vector3(...POLES[id]!).normalize() : null);

function Planet({ id, radius, spin = () => 0, tint }: { id: BodyId; radius: number; spin?: () => number; tint?: string }) {
    const b = body(id);
    const file = b.imagery.file && b.imagery.file !== 'earth' ? b.imagery.file : undefined;
    const map = useMap(file);
    const ring = useMap(b.rings ? 'saturn-ring.png' : undefined);
    const spinRef = useRef<Mesh>(null);
    const material = useMemo(() => new MeshStandardMaterial({ color: map ? '#ffffff' : (tint ?? '#b9a88f'), map, roughness: 0.95, metalness: 0 }), [map, tint]);
    useEffect(() => () => material.dispose(), [material]);
    const ringGeometry = useMemo(() => {
        if (!b.rings) return null;
        const g = new RingGeometry(b.rings.innerKm * 1e3, b.rings.outerKm * 1e3, 256, 1);
        // Map the ring texture radially: u from the inner to the outer edge.
        const pos = g.getAttribute('position');
        const uv = g.getAttribute('uv');
        const v = new Vector3();
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);
            uv.setXY(i, (v.length() - b.rings.innerKm * 1e3) / ((b.rings.outerKm - b.rings.innerKm) * 1e3), 0.5);
        }
        return g;
    }, [b.rings]);
    useEffect(() => () => ringGeometry?.dispose(), [ringGeometry]);
    // Ring particles scatter sunlight forwards and backwards, so both faces read bright: unlit material.
    const ringMaterial = useMemo(() => new MeshBasicMaterial({ map: ring, transparent: true, side: DoubleSide, depthWrite: false, color: '#d9d2c4' }), [ring]);
    useEffect(() => () => ringMaterial.dispose(), [ringMaterial]);
    useFrame(() => {
        if (spinRef.current) spinRef.current.rotation.y = spin();
    });
    const tilt = ((b.tiltDeg ?? 0) * Math.PI) / 180;
    const flat = 1 - (b.flattening ?? 0);
    const pole = poleOf(id);
    const orient = useMemo(() => (pole ? new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), pole) : new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), tilt)), [pole?.x, tilt]);
    return (
        <group quaternion={orient}>
            <mesh ref={spinRef} scale={[radius, radius * flat, radius]} material={material}>
                <sphereGeometry args={[1, 128, 96]} />
            </mesh>
            <Atmosphere
                radius={radius * 1.012}
                color={id === 'jupiter' ? '#d8c3a5' : id === 'saturn' ? '#e8d5a8' : id === 'uranus' || id === 'neptune' ? '#8fd3ff' : id === 'venus' ? '#f2e3b8' : '#9cc8ff'}
                strength={id === 'mercury' || id === 'moon' || id === 'pluto' ? 0 : 0.6}
            />
            {ringGeometry && ring && <mesh geometry={ringGeometry} material={ringMaterial} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3} />}
        </group>
    );
}

/** A thin limb glow for planets with an atmosphere. */
function Atmosphere({ radius, color, strength }: { radius: number; color: string; strength: number }) {
    const material = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: { uColor: { value: new Color(color) }, uStrength: { value: strength } },
                vertexShader: /* glsl */ `${LOGDEPTH.vPars} varying vec3 vN; varying vec3 vPos;
                    void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; ${LOGDEPTH.v} }`,
                fragmentShader: /* glsl */ `${LOGDEPTH.fPars} uniform vec3 uColor; uniform float uStrength; varying vec3 vN; varying vec3 vPos;
                    void main() { ${LOGDEPTH.f} vec3 v = normalize(cameraPosition - vPos); float edge = pow(max(0.0, 1.0 - abs(dot(normalize(vN), v))), 4.0); gl_FragColor = vec4(uColor * edge * uStrength, 1.0); }`,
                side: BackSide,
                blending: AdditiveBlending,
                transparent: true,
                depthWrite: false,
            }),
        [color, strength],
    );
    useEffect(() => () => material.dispose(), [material]);
    if (strength <= 0) return null;
    return (
        <mesh scale={radius} material={material}>
            <sphereGeometry args={[1, 64, 48]} />
        </mesh>
    );
}

/** Orbit of a planet for drawing (one period sampled from the ephemeris), scene coordinates. */
function orbitLine(id: PlanetId, center: number, n = 360) {
    const periodDays: Record<PlanetId, number> = { mercury: 88, venus: 224.7, earth: 365.25, mars: 687, jupiter: 4332.6, saturn: 10759, uranus: 30687, neptune: 60190, pluto: 90560 };
    return Array.from({ length: n + 1 }, (_, i) => toScene(positionAU(id, center + (periodDays[id] * i) / n)).multiplyScalar(AU));
}

const ORBIT_COLOR: Partial<Record<PlanetId, string>> = { earth: '#5b8fd6', mars: '#c9775a', jupiter: '#c9a978', saturn: '#d8c08a' };

/** Planet orbits and markers, relative to `origin` (scene metres). */
function Orbits({ at, origin, planets = PLANETS, labelled = ['earth', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'] }: { at: () => number; origin: () => Vector3; planets?: readonly PlanetId[]; labelled?: readonly PlanetId[] }) {
    const lines = useMemo(() => planets.map((p) => ({ p, pts: orbitLine(p, TOUR_EPOCH) })), [planets]);
    const group = useRef<Group>(null);
    useFrame(() => {
        if (group.current) group.current.position.copy(origin()).negate();
    });
    return (
        <group ref={group}>
            {lines.map(({ p, pts }) => (
                <Path key={p} points={pts} color={ORBIT_COLOR[p] ?? '#7d8aa0'} opacity={0.45} />
            ))}
            {planets.map((p) => (
                <Marker key={p} position={() => toScene(planetAt(p, at()))} label={labelled.includes(p) ? `pl-${p}` : null} color={ORBIT_COLOR[p] ?? '#c7d2e3'} size={0.006} />
            ))}
        </group>
    );
}

// ── Cruise (Sun-centred) ──────────────────────────────────────────────────

export function CruiseView({ met }: { met: () => number }) {
    const m = missionTrajectory();
    const leg1 = useMemo(() => legPoints(1, 300).map((v) => toScene(v)), []);
    const leg2 = useMemo(() => legPoints(2, 300).map((v) => toScene(v)), []);
    const flown = (leg: 1 | 2) => () => {
        const t = dateOf(met());
        const [t0, t1] = leg === 1 ? [m.launch, m.jupiter] : [m.jupiter, m.saturn];
        return Math.max(0, Math.min(1, (t - t0) / (t1 - t0))) * 300 + 1;
    };
    const zero = useMemo(() => new Vector3(), []);
    return (
        <>
            <Stars count={2600} brightness={() => 1} />
            <SunGlow size={() => 0.55 * AU} />
            <Marker position={() => zero} label="cr-sun" color="#ffd27a" size={0.004} />
            <Orbits at={() => dateOf(met())} origin={() => zero} labelled={['earth', 'mars', 'jupiter', 'saturn']} />
            <Path points={leg1} color="#22D3EE" opacity={0.28} dashed />
            <Path points={leg1} color="#22D3EE" opacity={0.95} count={flown(1)} />
            <Path points={leg2} color="#22D3EE" opacity={0.28} dashed />
            <Path points={leg2} color="#22D3EE" opacity={0.95} count={flown(2)} />
            <Marker position={() => toScene(spacecraftAt(dateOf(met())).r)} label="cr-sc" color="#22D3EE" size={0.012} />
        </>
    );
}

// ── Jupiter encounter (Jupiter-centred, to scale) ─────────────────────────

const GALILEAN = [
    { id: 'io', name: 'Io', a: 4.217e8, r: 1.8216e6, days: 1.769, color: '#d9c26a', phase: 0.3 },
    { id: 'europa', name: 'Europa', a: 6.71e8, r: 1.5608e6, days: 3.551, color: '#cdbfa6', phase: 2.1 },
    { id: 'ganymede', name: 'Ganymede', a: 1.0704e9, r: 2.6341e6, days: 7.155, color: '#8f8577', phase: 4.0 },
    { id: 'callisto', name: 'Callisto', a: 1.8827e9, r: 2.4103e6, days: 16.689, color: '#5d564e', phase: 5.3 },
] as const;

export function JupiterView({ met }: { met: () => number }) {
    const m = missionTrajectory();
    // Labels on the far side of Jupiter are hidden by the planet.
    const registry = useContext(LabelContext);
    useEffect(() => {
        registry?.setOccluder({ centre: new Vector3(0, 0, 0), radius: R_JUPITER });
        return () => registry?.setOccluder(null);
    }, [registry]);
    const state = useDeployedState();
    const craft = useRef<Group>(null);
    useLabelAnchor('jup-craft', craft, [0, 3, 0]);
    const sunDir = useMemo(() => toScene(planetAt('jupiter', m.jupiter)).normalize().negate(), [m.jupiter]);
    const path = useMemo(() => {
        const out: Vector3[] = [];
        for (let i = -200; i <= 200; i++) {
            const s = Math.sign(i) * Math.pow(Math.abs(i) / 200, 2.2) * 30 * 86400;
            out.push(toScene(flybyPosition(s)));
        }
        return out;
    }, []);
    const moonOrbits = useMemo(() => GALILEAN.map((g) => Array.from({ length: 257 }, (_, i) => new Vector3(Math.cos((i / 256) * Math.PI * 2) * g.a, 0, Math.sin((i / 256) * Math.PI * 2) * g.a))), []);
    const moons = useRef<(Group | null)[]>([]);
    const ends = useRef<Group>(null);
    const endOut = useRef<Group>(null);
    useLabelAnchor('jup-in', ends, [0, 0, 0]);
    useLabelAnchor('jup-out', endOut, [0, 0, 0]);
    const q = useMemo(() => new Vector3(), []);
    useFrame(() => {
        const dt = (dateOf(met()) - m.jupiter) * 86400;
        const p = toScene(flybyPosition(dt), q);
        if (craft.current) {
            craft.current.position.copy(p);
            // Dish (+Y) towards the Sun, which from Jupiter is within about 11° of the Earth.
            craft.current.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), sunDir);
        }
        const days = dateOf(met()) - m.jupiter;
        GALILEAN.forEach((g, i) => {
            const a = g.phase + (2 * Math.PI * days) / g.days;
            moons.current[i]?.position.set(Math.cos(a) * g.a, 0, Math.sin(a) * g.a);
        });
    });
    return (
        <>
            <Stars count={2600} brightness={() => 1} />
            <directionalLight position={sunDir.clone().multiplyScalar(1e10).toArray()} intensity={2.6} color="#fff4e2" />
            <ambientLight intensity={0.035} />
            <hemisphereLight args={['#283246', '#000000', 0.25]} />
            <Planet id="jupiter" radius={R_JUPITER} spin={() => ((dateOf(met()) - m.jupiter) * 24 * 2 * Math.PI) / 9.925} />
            {moonOrbits.map((pts, i) => (
                <Path key={i} points={pts} color="#8fa3bf" opacity={0.3} />
            ))}
            {GALILEAN.map((g, i) => (
                <group key={g.id} ref={(el) => void (moons.current[i] = el)}>
                    <MoonBall radius={g.r} color={g.color} label={`jup-${g.id}`} />
                </group>
            ))}
            <Path points={path} color="#22D3EE" opacity={0.85} />
            <group ref={ends} position={path[0]} />
            <group ref={endOut} position={path[path.length - 1]} />
            <group ref={craft}>
                <group scale={1}>
                    <SpacecraftModel state={state} />
                </group>
            </group>
            <Marker position={() => toScene(flybyPosition((dateOf(met()) - m.jupiter) * 86400))} label={null} color="#22D3EE" size={0.006} />
        </>
    );
}

function MoonBall({ radius, color, label }: { radius: number; color: string; label: string }) {
    const ref = useRef<Group>(null);
    useLabelAnchor(label, ref, [0, 0, 0]);
    return (
        <group ref={ref}>
            <mesh scale={radius}>
                <sphereGeometry args={[1, 48, 32]} />
                <meshStandardMaterial color={color} roughness={0.95} />
            </mesh>
        </group>
    );
}

// ── Saturn (Saturn-centred, to scale; the spacecraft's pass is a cinematic placement) ──

export function saturnCraft(progress: number) {
    const m = missionTrajectory();
    // A cinematic placement (the Saturn flyby is not designed in this phase): 3.6 Saturn radii from the
    // centre, 20° above the ring plane, on the sunlit side, drifting slowly.
    const n = poleOf('saturn')!;
    const sun = toScene(planetAt('saturn', m.saturn)).normalize().negate();
    const u = sun.clone().addScaledVector(n, -sun.dot(n)).normalize();
    const w = n.clone().cross(u);
    const phi = ((62 + 10 * progress) * Math.PI) / 180;
    const lat = (20 * Math.PI) / 180;
    return u
        .multiplyScalar(Math.cos(phi) * Math.cos(lat))
        .addScaledVector(w, Math.sin(phi) * Math.cos(lat))
        .addScaledVector(n, Math.sin(lat))
        .multiplyScalar(3.6 * R_SATURN);
}

export function SaturnView({ progress }: { progress: () => number }) {
    const state = useDeployedState();
    const craft = useRef<Group>(null);
    useLabelAnchor('sat-craft', craft, [0, 3, 0]);
    const sunDir = useMemo(() => toScene(planetAt('saturn', missionTrajectory().saturn)).normalize().negate(), []);
    useFrame(() => {
        if (craft.current) {
            craft.current.position.copy(saturnCraft(progress()));
            craft.current.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), sunDir);
        }
    });
    return (
        <>
            <Stars count={2600} brightness={() => 1} />
            <directionalLight position={sunDir.clone().multiplyScalar(1e10).toArray()} intensity={2.4} color="#fff4e2" />
            <ambientLight intensity={0.03} />
            <hemisphereLight args={['#283246', '#000000', 0.25]} />
            <Planet id="saturn" radius={R_SATURN} spin={() => progress() * 0.4} />
            <group ref={craft}>
                <SpacecraftModel state={state} />
            </group>
        </>
    );
}

// ── Discovery tour ────────────────────────────────────────────────────────

/** Scattered points for a belt (illustrative distribution), heliocentric metres. */
function beltPoints(inner: number, outer: number, count: number, thick: number, seed: number) {
    let s = seed;
    const rnd = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
    const pos: number[] = [];
    for (let i = 0; i < count; i++) {
        const r = (inner + (outer - inner) * Math.sqrt(rnd())) * AU;
        const a = rnd() * Math.PI * 2;
        pos.push(Math.cos(a) * r, (rnd() - 0.5) * thick * r, -Math.sin(a) * r);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    return g;
}

function Belt({ inner, outer, count, thick, color, seed, origin }: { inner: number; outer: number; count: number; thick: number; color: string; seed: number; origin: () => Vector3 }) {
    const geometry = useMemo(() => beltPoints(inner, outer, count, thick, seed), [inner, outer, count, thick, seed]);
    const dpr = useThree((s) => s.viewport.dpr);
    const material = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: { uColor: { value: new Color(color) }, uPx: { value: dpr } },
                vertexShader: /* glsl */ `${LOGDEPTH.vPars} uniform float uPx; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = 1.6 * uPx; ${LOGDEPTH.v} }`,
                fragmentShader: /* glsl */ `${LOGDEPTH.fPars} uniform vec3 uColor; void main() { ${LOGDEPTH.f} float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uColor, smoothstep(0.5, 0.2, d) * 0.8); }`,
                transparent: true,
                depthWrite: false,
            }),
        [color, dpr],
    );
    useEffect(
        () => () => {
            geometry.dispose();
            material.dispose();
        },
        [geometry, material],
    );
    const ref = useRef<Points>(null);
    useFrame(() => ref.current?.position.copy(origin()).negate());
    return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />;
}

/** A small field of rocky or icy bodies around a point (belt close-ups; illustrative shapes). */
function Rocks({ color, scale: s }: { color: string; scale: number }) {
    const geometry = useMemo(() => {
        const g = new IcosahedronGeometry(1, 3);
        const p = g.getAttribute('position');
        const v = new Vector3();
        for (let i = 0; i < p.count; i++) {
            v.fromBufferAttribute(p, i);
            const k = 1 + 0.22 * Math.sin(v.x * 3.1 + v.y * 1.7) * Math.cos(v.z * 2.3) + 0.1 * Math.sin(v.y * 7.1);
            p.setXYZ(i, v.x * k, v.y * k * 0.8, v.z * k);
        }
        g.computeVertexNormals();
        return g;
    }, []);
    useEffect(() => () => geometry.dispose(), [geometry]);
    const rocks = useMemo(() => {
        let seed = 5;
        const rnd = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        return Array.from({ length: 14 }, () => ({ p: [(rnd() - 0.5) * 40 * s, (rnd() - 0.5) * 10 * s, (rnd() - 0.5) * 40 * s] as [number, number, number], r: s * (0.4 + rnd() * 2.2), rot: [rnd() * 3, rnd() * 3, 0] as [number, number, number] }));
    }, [s]);
    return (
        <group>
            {rocks.map((k, i) => (
                <mesh key={i} geometry={geometry} position={k.p} rotation={k.rot} scale={k.r}>
                    <meshStandardMaterial color={color} roughness={0.95} />
                </mesh>
            ))}
        </group>
    );
}

/** Close-up camera distance for a destination, metres. */
export function tourDistance(id: BodyId) {
    const b = body(id);
    if (b.orbit === 'belt') return 60e3 * 40;
    if (id === 'sun') return 4.2 * b.radiusKm! * 1e3;
    if (b.rings) return 5.6 * b.radiusKm! * 1e3;
    return 3.1 * b.radiusKm! * 1e3;
}

export function TourView({ dest, origin, sunLit }: { dest: () => BodyId | undefined; origin: () => Vector3; sunLit: () => Vector3 }) {
    const zeroed = () => origin();
    const sunAnchor = useRef<Group>(null);
    useLabelAnchor('tour-sun', sunAnchor, [0, 0, 0]);
    const [shown, setShown] = useState<BodyId | undefined>(undefined);
    const glowAt = useMemo(() => new Vector3(), []);
    useFrame(() => {
        const d = dest();
        if (d !== shown) setShown(d);
        if (sunAnchor.current) sunAnchor.current.position.copy(origin()).negate();
    });
    const b = shown ? body(shown) : null;
    const lightPos = sunLit();
    return (
        <>
            <Stars count={3000} brightness={() => 1} />
            <SunGlow size={() => (shown === 'sun' ? 7e9 : 0.5 * AU)} at={() => glowAt.copy(origin()).negate()} />
            <group ref={sunAnchor}>{shown === 'sun' && <SunSphere />}</group>
            <directionalLight position={lightPos.clone().multiplyScalar(1e10).toArray()} intensity={2.6} color="#fff4e2" />
            <ambientLight intensity={0.03} />
            <hemisphereLight args={['#283246', '#000000', 0.22]} />
            <Orbits at={() => TOUR_EPOCH} origin={zeroed} planets={PLANETS} labelled={shown ? [] : undefined} />
            <Belt inner={2.2} outer={3.2} count={2600} thick={0.08} color="#a99a86" seed={11} origin={zeroed} />
            <Belt inner={30} outer={50} count={3200} thick={0.12} color="#8fb0d0" seed={23} origin={zeroed} />
            {b && b.orbit !== 'belt' && b.id !== 'sun' && b.id !== 'earth' && <Planet key={b.id} id={b.id} radius={b.radiusKm! * 1e3} spin={() => performance.now() * 0.00003} tint={b.id === 'pluto' ? '#cdb79c' : undefined} />}
            {b && b.id === 'earth' && <EarthAt />}
            {b && b.id === 'asteroids' && <Rocks color="#8a7f72" scale={30e3} />}
            {b && b.id === 'kuiper' && <Rocks color="#b9c6d4" scale={30e3} />}
        </>
    );
}

function SunSphere() {
    const map = useMap('sun-2k.jpg');
    return (
        <mesh scale={6.957e8}>
            <sphereGeometry args={[1, 96, 64]} />
            <meshBasicMaterial color={map ? '#ffffff' : '#fff1cf'} map={map} toneMapped={false} />
        </mesh>
    );
}

function EarthAt() {
    const sun = useRef(toScene(tourPosition('earth')).normalize().negate());
    const orientation = useMemo(() => new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (23.44 * Math.PI) / 180), []);
    return <Globe radius={6.371e6} orientation={orientation} sun={sun} spin={() => performance.now() * 0.00002} />;
}

/** Labels for the Phase B views. */
export const PHASE_B_LABELS = [
    { id: 'cr-sun', text: 'Sun' },
    { id: 'cr-sc', text: 'RSC-1 (marker)' },
    ...PLANETS.map((p) => ({ id: `pl-${p}`, text: p === 'earth' ? 'Earth' : (body(p as BodyId)?.name ?? p) })),
    { id: 'jup-craft', text: 'RSC-1' },
    { id: 'jup-in', text: 'Incoming' },
    { id: 'jup-out', text: 'Outgoing, towards Saturn' },
    ...GALILEAN.map((g) => ({ id: `jup-${g.id}`, text: g.name })),
    { id: 'sat-craft', text: 'RSC-1' },
    { id: 'tour-sun', text: 'Sun' },
];

export { BODIES };
