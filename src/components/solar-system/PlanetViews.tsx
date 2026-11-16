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
    Matrix4,
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
import { LiveReflections } from './render';
import { SUN_IRRADIANCE } from './sun';

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
    // Pluto (IAU 2015: RA 132.993°, Dec −6.163°, the right-hand-rule pole used by the New Horizons maps).
    pluto: [-0.678, -0.3878, -0.6245],
    saturn: [0.0855, 0.8825, -0.4624],
};
export const poleOf = (id: BodyId) => (POLES[id] ? new Vector3(...POLES[id]!).normalize() : null);

/** A planet from its map, pole orientation and flattening (also used by the cinematic cruise view). */
export function DeepPlanet(props: { id: BodyId; radius: number; spin?: () => number; tint?: string; sun?: () => Vector3 }) {
    return <Planet {...props} />;
}

/** Atmospheric haze: colour and strength by planet (0: airless). Mars's air is thin, so its limb is faint. */
const HAZE: Partial<Record<BodyId, { color: string; strength: number }>> = {
    venus: { color: '#f2e3b8', strength: 0.75 },
    mars: { color: '#d8b9a0', strength: 0.16 },
    jupiter: { color: '#e3cfae', strength: 0.5 },
    saturn: { color: '#eedcb0', strength: 0.5 },
    uranus: { color: '#a6dcf2', strength: 0.55 },
    neptune: { color: '#8fb8ff', strength: 0.55 },
};

function Planet({ id, radius, spin = () => 0, tint, sun }: { id: BodyId; radius: number; spin?: () => number; tint?: string; sun?: () => Vector3 }) {
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
            {HAZE[id] && <Atmosphere radius={radius} flat={flat} color={HAZE[id]!.color} strength={HAZE[id]!.strength} sun={sun} />}
            {ringGeometry && ring && <mesh geometry={ringGeometry} material={ringMaterial} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3} />}
        </group>
    );
}

/**
 * A thin limb haze for planets with an atmosphere. The shell follows the planet's flattening and is only
 * a few per cent thicker than the planet; the glow is computed from where each view ray passes the planet
 * (its impact parameter), so it is brightest just outside the limb and fades to nothing at the shell's
 * edge (no visible rim), and only on the sunlit side.
 */
const HAZE_HEIGHT = 0.03;
function Atmosphere({ radius, flat, color, strength, sun }: { radius: number; flat: number; color: string; strength: number; sun?: () => Vector3 }) {
    const material = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: { uColor: { value: new Color(color) }, uStrength: { value: strength }, uCam: { value: new Vector3() }, uSun: { value: new Vector3() }, uK: { value: 1 / (1 + HAZE_HEIGHT) } },
                vertexShader: /* glsl */ `${LOGDEPTH.vPars} varying vec3 vLocal;
                    void main() { vLocal = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); ${LOGDEPTH.v} }`,
                fragmentShader: /* glsl */ `${LOGDEPTH.fPars} uniform vec3 uColor; uniform float uStrength; uniform vec3 uCam; uniform vec3 uSun; uniform float uK; varying vec3 vLocal;
                    void main() {
                        ${LOGDEPTH.f}
                        vec3 d = normalize(vLocal - uCam);
                        vec3 c = uCam + d * max(-dot(uCam, d), 0.0);
                        float b = length(c);
                        float x = clamp((b - uK) / (1.0 - uK), 0.0, 1.0);
                        float glow = pow(1.0 - x, 2.6) * smoothstep(uK * 0.985, uK, b);
                        float lit = length(uSun) > 0.5 ? smoothstep(-0.25, 0.45, dot(normalize(c), uSun)) : 1.0;
                        gl_FragColor = vec4(uColor * glow * lit * uStrength, 1.0);
                    }`,
                side: BackSide,
                blending: AdditiveBlending,
                transparent: true,
                depthWrite: false,
            }),
        [color, strength],
    );
    useEffect(() => () => material.dispose(), [material]);
    const ref = useRef<Mesh>(null);
    const sunRef = useRef(sun);
    sunRef.current = sun;
    useEffect(() => {
        const mesh = ref.current;
        if (!mesh) return;
        const inv = new Matrix4();
        // Camera and Sun in the shell's own (unit-sphere) frame, every time it is drawn.
        mesh.onBeforeRender = (_r, _s, cam) => {
            inv.copy(mesh.matrixWorld).invert();
            const u = material.uniforms;
            (u.uCam.value as Vector3).setFromMatrixPosition(cam.matrixWorld).applyMatrix4(inv);
            const sd = sunRef.current?.();
            if (sd) (u.uSun.value as Vector3).copy(sd).transformDirection(inv);
            else (u.uSun.value as Vector3).set(0, 0, 0);
        };
    }, [material]);
    const k = 1 + HAZE_HEIGHT;
    return (
        <mesh ref={ref} scale={[radius * k, radius * k * flat, radius * k]} material={material}>
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

export function CruiseView({ met, shot = () => 'cruiseWide' }: { met: () => number; shot?: () => string }) {
    const m = missionTrajectory();
    // Name only the planets that matter in each diagram, so the chips do not pile up around the Sun.
    const namesFor = (sh: string): PlanetId[] => (sh === 'cruiseOuter' ? ['jupiter', 'saturn'] : sh === 'cruiseWide' || sh === 'cruiseFollow' ? ['earth', 'jupiter', 'saturn'] : ['earth', 'mars', 'jupiter']);
    const [names, setNames] = useState<PlanetId[]>(() => namesFor(shot()));
    useFrame(() => {
        const n = namesFor(shot());
        if (n.join() !== names.join()) setNames(n);
    });
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
            <Orbits at={() => dateOf(met())} origin={() => zero} labelled={names} />
            <Path points={leg1} color="#22D3EE" opacity={0.5} dashed />
            <Path points={leg1} color="#22D3EE" opacity={0.95} count={flown(1)} />
            <Path points={leg2} color="#22D3EE" opacity={0.42} dashed />
            <Path points={leg2} color="#22D3EE" opacity={0.95} count={flown(2)} />
            <Marker position={() => toScene(spacecraftAt(dateOf(met())).r)} label="cr-sc" color="#22D3EE" size={0.012} />
        </>
    );
}

// ── Jupiter encounter (Jupiter-centred, to scale) ─────────────────────────

// Surface maps: USGS Astrogeology global mosaics from Galileo and Voyager images (public domain),
// downsampled; the greyscale mosaics are tinted to each moon's overall colour (docs/ASSET_SOURCES.md).
const GALILEAN = [
    { id: 'io', name: 'Io', a: 4.217e8, r: 1.8216e6, days: 1.769, color: '#d9c26a', phase: 0.3, file: 'io-1k.jpg' },
    { id: 'europa', name: 'Europa', a: 6.71e8, r: 1.5608e6, days: 3.551, color: '#cdbfa6', phase: 2.1, file: 'europa-1k.jpg' },
    { id: 'ganymede', name: 'Ganymede', a: 1.0704e9, r: 2.6341e6, days: 7.155, color: '#8f8577', phase: 4.0, file: 'ganymede-1k.jpg' },
    { id: 'callisto', name: 'Callisto', a: 1.8827e9, r: 2.4103e6, days: 16.689, color: '#5d564e', phase: 5.3, file: 'callisto-1k.jpg' },
];

export function JupiterView({ met, scientific = () => true }: { met: () => number; scientific?: () => boolean }) {
    const m = missionTrajectory();
    const [sci, setSci] = useState(scientific);
    // Labels on the far side of Jupiter are hidden by the planet.
    const registry = useContext(LabelContext);
    useEffect(() => {
        registry?.setOccluder({ centre: new Vector3(0, 0, 0), radius: R_JUPITER });
        return () => registry?.setOccluder(null);
    }, [registry]);
    const state = useDeployedState();
    const craft = useRef<Group>(null);
    // Named in the diagram; in the close cinematic shots the spacecraft is unmistakable (and a chip that
    // close to the camera drifts away from it).
    useLabelAnchor(sci ? 'jup-craft' : null, craft, [0, 1.6, 0]);
    const sunDir = useMemo(() => toScene(planetAt('jupiter', m.jupiter)).normalize().negate(), [m.jupiter]);
    const path = useMemo(() => {
        const out: Vector3[] = [];
        for (let i = -200; i <= 200; i++) {
            const s = Math.sign(i) * Math.pow(Math.abs(i) / 200, 2.2) * 30 * 86400;
            out.push(toScene(flybyPosition(s)));
        }
        return out;
    }, []);
    // Incoming and outgoing asymptotes of the hyperbola, drawn to where they cross: the turn angle.
    const asym = useMemo(() => assistAsymptotes(), []);
    const turnAt = useRef<Group>(null);
    useLabelAnchor(sci ? 'jup-turn' : null, turnAt, [0, 0, 0]);
    const moonOrbits = useMemo(() => GALILEAN.map((g) => Array.from({ length: 257 }, (_, i) => new Vector3(Math.cos((i / 256) * Math.PI * 2) * g.a, 0, Math.sin((i / 256) * Math.PI * 2) * g.a))), []);
    const moons = useRef<(Group | null)[]>([]);
    const ends = useRef<Group>(null);
    const endOut = useRef<Group>(null);
    useLabelAnchor(sci ? 'jup-in' : null, ends, [0, 0, 0]);
    useLabelAnchor(sci ? 'jup-out' : null, endOut, [0, 0, 0]);
    const q = useMemo(() => new Vector3(), []);
    // Cinematic shots show Jupiter, its moons and the spacecraft; the orbit lines, the flyby path and the
    // moon names belong to the scientific (gravity-assist) view.
    const overlays = useRef<Group>(null);
    useFrame(() => {
        const now = scientific();
        if (now !== sci) setSci(now);
        if (overlays.current) overlays.current.visible = now;
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
            <directionalLight position={sunDir.clone().multiplyScalar(1e10).toArray()} intensity={SUN_IRRADIANCE} color="#fff4e2" />
            <ambientLight intensity={0.02} />
            {/* Jupiter-shine: light reflected from the planet onto the spacecraft's night side. */}
            <hemisphereLight args={['#1a2233', '#6b5a44', 0.18]} />
            <LiveReflections at={() => craft.current?.position ?? new Vector3()} hide={craft} interval={0.6} />
            <Planet id="jupiter" radius={R_JUPITER} spin={() => ((dateOf(met()) - m.jupiter) * 24 * 2 * Math.PI) / 9.925} sun={() => sunDir} />
            {GALILEAN.map((g, i) => (
                <group key={g.id} ref={(el) => void (moons.current[i] = el)}>
                    <MoonBall radius={g.r} color={g.color} file={g.file} label={sci ? `jup-${g.id}` : null} />
                </group>
            ))}
            <group ref={overlays}>
                {moonOrbits.map((pts, i) => (
                    <Path key={i} points={pts} color="#8fa3bf" opacity={0.3} />
                ))}
                <Path points={path} color="#22D3EE" opacity={0.85} />
                <Path points={asym.inLine} color="#FBBF24" opacity={0.55} dashed />
                <Path points={asym.outLine} color="#FBBF24" opacity={0.55} dashed />
                <group ref={turnAt} position={asym.C} />
                <Marker position={() => toScene(flybyPosition((dateOf(met()) - m.jupiter) * 86400))} label={null} color="#22D3EE" size={0.006} />
            </group>
            <group ref={ends} position={path[0]} />
            <group ref={endOut} position={path[path.length - 1]} />
            <group ref={craft}>
                <group scale={1}>
                    <SpacecraftModel state={state} />
                </group>
            </group>
        </>
    );
}

/** The flyby hyperbola's incoming and outgoing asymptotes, as segments ending where they cross (scene metres). */
let asymCache: { inLine: Vector3[]; outLine: Vector3[]; C: Vector3 } | null = null;
export function assistAsymptotes() {
    if (asymCache) return asymCache;
    const far = 30 * 86400;
    const a0 = toScene(flybyPosition(-far));
    const dIn = toScene(flybyPosition(-far + 3600))
        .sub(a0)
        .normalize();
    const b0 = toScene(flybyPosition(far));
    const dOut = b0
        .clone()
        .sub(toScene(flybyPosition(far - 3600)))
        .normalize();
    const w0 = a0.clone().sub(b0);
    const a = dIn.dot(dIn);
    const b = dIn.dot(dOut);
    const c = dOut.dot(dOut);
    const d = dIn.dot(w0);
    const e = dOut.dot(w0);
    const den = a * c - b * b;
    const s = (b * e - c * d) / den;
    const t = (a * e - b * d) / den;
    const C = a0.clone().addScaledVector(dIn, s).add(b0.clone().addScaledVector(dOut, t)).multiplyScalar(0.5);
    const L = 60 * R_JUPITER;
    return (asymCache = { inLine: [C.clone().addScaledVector(dIn, -L), C], outLine: [C, C.clone().addScaledVector(dOut, L)], C });
}

function MoonBall({ radius, color, file, label }: { radius: number; color: string; file?: string; label: string | null }) {
    const ref = useRef<Group>(null);
    const map = useMap(file);
    useLabelAnchor(label, ref, [0, 0, 0]);
    return (
        <group ref={ref}>
            <mesh scale={radius}>
                <sphereGeometry args={[1, 48, 32]} />
                <meshStandardMaterial key={map ? 'map' : 'plain'} color={map ? '#ffffff' : color} map={map} roughness={0.95} />
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
            <Planet id="saturn" radius={R_SATURN} spin={() => progress() * 0.4} sun={() => sunDir} />
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

/** Close-up camera distance for a destination, metres. */
export function tourDistance(id: BodyId) {
    const b = body(id);
    if (b.orbit === 'belt') return beltView(id);
    if (id === 'sun') return 4.2 * b.radiusKm! * 1e3;
    if (b.rings) return 5.6 * b.radiusKm! * 1e3;
    return 3.1 * b.radiusKm! * 1e3;
}

/**
 * The belts are not places but regions: they are shown Sun-centred from above, far enough out for the
 * whole belt and its neighbouring orbits to fit (a close-up "rock field" would suggest a density they do
 * not have: neighbouring asteroids are typically about a million kilometres apart).
 */
export function beltView(id: BodyId) {
    return id === 'asteroids' ? 8.5 * AU : id === 'kuiper' ? 120 * AU : 0;
}

/** Planets in order for the size line-up, with the Sun's limb at x = 0 (true radii, small gaps). */
const LINEUP: BodyId[] = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
export function lineupLayout() {
    const gap = 9e6;
    let x = 0;
    return LINEUP.map((id) => {
        const b = body(id);
        const r = b.radiusKm! * 1e3;
        const ext = b.rings ? b.rings.outerKm * 1e3 : r;
        x += gap + ext;
        const at = x;
        x += ext;
        return { id, r, x: at };
    });
}

export function TourView({
    dest,
    origin,
    sunLit,
    orbits,
    lineup,
}: {
    dest: () => BodyId | undefined;
    origin: () => Vector3;
    sunLit: () => Vector3;
    /** Orbit lines and markers: shown from afar only (close to a planet they would streak across the frame). */
    orbits: () => boolean;
    /** The size line-up (scientific view of the Discovery chapter). */
    lineup: () => boolean;
}) {
    const zeroed = () => origin();
    const sunAnchor = useRef<Group>(null);
    const [shown, setShown] = useState<BodyId | undefined>(undefined);
    const [line, setLine] = useState(false);
    const [orbitsOn, setOrbitsOn] = useState(true);
    useLabelAnchor(orbitsOn && shown !== 'sun' && !line ? 'tour-sun' : null, sunAnchor, [0, 0, 0]);
    const orbitGroup = useRef<Group>(null);
    const glowAt = useMemo(() => new Vector3(), []);
    useFrame(() => {
        const d = dest();
        if (d !== shown) setShown(d);
        const l = lineup();
        if (l !== line) setLine(l);
        if (sunAnchor.current) sunAnchor.current.position.copy(origin()).negate();
        const o = orbits();
        if (orbitGroup.current) orbitGroup.current.visible = o;
        if (o !== orbitsOn) setOrbitsOn(o);
    });
    const b = shown ? body(shown) : null;
    const belt = b?.orbit === 'belt';
    const lightDir = sunLit();
    const sunDir = useMemo(() => new Vector3(), []);
    sunDir.copy(lightDir);
    // Planet names only where their orbits are drawn (labels do not follow hidden objects).
    const labelled: PlanetId[] | undefined = !orbitsOn || line ? [] : !shown ? undefined : shown === 'asteroids' ? ['mars', 'jupiter'] : shown === 'kuiper' ? ['neptune', 'pluto'] : [];
    return (
        <>
            <Stars count={3000} brightness={() => 1} />
            {!line && <SunGlow size={() => (shown === 'sun' ? 7e9 : belt ? (shown === 'kuiper' ? 2.5 * AU : 0.35 * AU) : 0.5 * AU)} at={() => glowAt.copy(origin()).negate()} />}
            <group ref={sunAnchor}>{shown === 'sun' && !line && <SunSphere />}</group>
            {!line && <directionalLight position={lightDir.clone().multiplyScalar(1e10).toArray()} intensity={2.6} color="#fff4e2" />}
            <ambientLight intensity={0.03} />
            <hemisphereLight args={['#283246', '#000000', 0.22]} />
            <group ref={orbitGroup}>
                <Orbits at={() => TOUR_EPOCH} origin={zeroed} planets={PLANETS} labelled={labelled} />
            </group>
            <Belt inner={2.2} outer={3.2} count={2600} thick={0.08} color="#a99a86" seed={11} origin={zeroed} />
            <Belt inner={30} outer={50} count={3200} thick={0.12} color="#8fb0d0" seed={23} origin={zeroed} />
            {b && !belt && !line && b.id !== 'sun' && b.id !== 'earth' && (
                <Planet key={b.id} id={b.id} radius={b.radiusKm! * 1e3} spin={() => performance.now() * 0.00003} tint={b.id === 'pluto' && !b.imagery.file ? '#cdb79c' : undefined} sun={() => sunDir} />
            )}
            {b && b.id === 'earth' && !line && <EarthAt />}
            {line && <LineUp />}
        </>
    );
}

/** All planets and Pluto side by side at their true sizes, next to the Sun's limb. */
function LineUp() {
    const layout = useMemo(() => lineupLayout(), []);
    const lit = useMemo(() => new Vector3(-1, 0.2, 0.75).normalize(), []);
    return (
        <>
            <directionalLight position={lit.clone().multiplyScalar(1e10).toArray()} intensity={2.8} color="#fff4e2" />
            <group position={[-6.957e8, 0, 0]}>
                <SunSphere />
            </group>
            {layout.map((p) => (
                <LineUpBody key={p.id} id={p.id} r={p.r} x={p.x} lit={lit} />
            ))}
        </>
    );
}

function LineUpBody({ id, r, x, lit }: { id: BodyId; r: number; x: number; lit: Vector3 }) {
    const ref = useRef<Group>(null);
    useLabelAnchor(`lu-${id}`, ref, [0, -r * 1.25 - 4e6, 0]);
    return (
        <group ref={ref} position={[x, 0, 0]}>
            {id === 'earth' ? <EarthLineUp r={r} lit={lit} /> : <Planet id={id} radius={r} sun={() => lit} />}
        </group>
    );
}

function EarthLineUp({ r, lit }: { r: number; lit: Vector3 }) {
    const sun = useRef(lit.clone());
    const orientation = useMemo(() => new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (23.44 * Math.PI) / 180), []);
    return <Globe radius={r} orientation={orientation} sun={sun} />;
}

/** The Sun's photosphere: the mission-data map with limb darkening, kept below the tone curve's shoulder so its granulation stays visible. */
function SunSphere() {
    const map = useMap('sun-2k.jpg');
    const material = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: { uMap: { value: null }, uHas: { value: 0 } },
                vertexShader: /* glsl */ `${LOGDEPTH.vPars} varying vec2 vUv; varying vec3 vN; varying vec3 vW;
                    void main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; ${LOGDEPTH.v} }`,
                fragmentShader: /* glsl */ `${LOGDEPTH.fPars} uniform sampler2D uMap; uniform float uHas; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
                    void main() {
                        ${LOGDEPTH.f}
                        float mu = clamp(dot(normalize(vN), normalize(cameraPosition - vW)), 0.0, 1.0);
                        // Limb darkening (I(μ)/I(1) = 1 − u(1 − μ), u ≈ 0.6 in visible light), redder towards the limb.
                        float ld = 1.0 - 0.6 * (1.0 - mu);
                        vec3 tex = uHas > 0.5 ? texture2D(uMap, vUv).rgb : vec3(0.8, 0.6, 0.3);
                        float lum = dot(tex, vec3(0.299, 0.587, 0.114));
                        vec3 base = mix(vec3(1.0, 0.55, 0.22), vec3(1.0, 0.9, 0.74), smoothstep(0.25, 0.9, lum));
                        vec3 col = base * (0.45 + 1.1 * lum) * ld * mix(vec3(1.0, 0.7, 0.45), vec3(1.0), sqrt(mu)) * 1.5;
                        gl_FragColor = vec4(col, 1.0);
                    }`,
            }),
        [],
    );
    useEffect(() => {
        material.uniforms.uMap.value = map;
        material.uniforms.uHas.value = map ? 1 : 0;
    }, [map, material]);
    useEffect(() => () => material.dispose(), [material]);
    return (
        <mesh scale={6.957e8} material={material}>
            <sphereGeometry args={[1, 96, 64]} />
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
    { id: 'jup-turn', text: `Path turned ${((missionTrajectory().flyby.turn * 180) / Math.PI).toFixed(0)}°` },
    ...LINEUP.map((id) => ({ id: `lu-${id}`, text: body(id).name })),
];

export { BODIES };
