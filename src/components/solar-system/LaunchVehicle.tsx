'use client';
// Reference Launch Vehicle RLV-1 in 3D, to the dimensions of lib/solar-system/vehicle.ts (61.4 m):
// first stage (3.8 m, two kerosene/oxygen engines), carbon interstage with separation motors,
// foam-insulated hydrogen/oxygen upper stage (3.05 m, two long-nozzle engines), a clam-shell fairing
// (4.2 m, acoustic lining inside) over the payload adapter, solid kick stage and spacecraft.
//
// Built in code from physically based materials with procedural detail maps (textures.ts): weld lands
// and panel joints on the tank barrels, stringers on the interstage, cooling tubes on the nozzles,
// foam insulation, a roll-tracking pattern and the vehicle name. Every component has an engineering
// purpose. Every movement is driven by mission time: plume size from ambient pressure, first-stage drift
// after separation, fairing halves hinging away. Cutaways for the topic views are real section cuts
// (clipping planes through the axis, opening towards the camera), not translucent skins.
// Origin: centre of the first-stage base; +Y along the vehicle axis.
import { useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import {
    AdditiveBlending,
    BackSide,
    CanvasTexture,
    Color,
    DoubleSide,
    InstancedMesh,
    LatheGeometry,
    MeshStandardMaterial,
    NormalBlending,
    Object3D,
    Plane,
    ShaderMaterial,
    SRGBColorSpace,
    Vector2,
    Vector3,
    type Group,
    type Mesh,
    type Texture,
} from 'three';
import { useLabelAnchor } from '@/components/space-twin/labels';
import type { Focus } from '@/lib/solar-system/mission';
import SpacecraftModel from './Spacecraft';
import { LOGDEPTH } from './environment';
import { carbonShell, foamInsulation, lettering, nozzleSkin, paintedBarrel, repeated, rollPattern, sprayFoam, type SurfaceSet } from './textures';
import { VolumePlume } from './exhaust';
import { perfOff } from './render';

export type CutPart = 'fairing' | 'interstage' | 'tanks';

export interface VehicleState {
    /** First-stage engines: 0 off … 1 full thrust. */
    firing1: number;
    /** Ignition flash of the first-stage engines (the green of the TEA–TEB igniter), 0…1. */
    igniter: number;
    firing2: boolean;
    firingKick: boolean;
    /** Ambient pressure / sea-level pressure, for the plume shape. */
    pressure: number;
    /** Metres the first stage has drifted back since separation (null: attached). */
    stage1Away: number | null;
    stage1Tumble: number;
    /** Fairing: hinge opening 0 … 1 (fully open) and distance drifted away, m. */
    fairingOpen: number;
    fairingAway: number;
    fairingAttached: boolean;
    /** Upper stage drifting back from the kick stage after their separation, m (null: attached). */
    upperAway: number | null;
    /** Kick-stage spin angle (radians). */
    spin: number;
    focus?: Focus;
    /** Engineering cutaway: which part is opened, how far (0…1) and towards which azimuth (radians, vehicle frame). */
    cut: { part: CutPart | null; amount: number; azimuth: number };
    /** Frost on the liquid-oxygen tank: 1 on the pad, shedding to 0 after liftoff. */
    frost: number;
    /** Boom deployment 0…1 (spacecraft). */
    booms: { rtgBoom: number; magnetometerBoom: number; scienceBoom: number };
    time: number;
    /** Fault scenarios: one first-stage engine out; one RTG failed (marked). */
    engineOut?: boolean;
    rtgFault?: boolean;
    /** Attitude-thruster pulse brightness 0…1 (rate damping after separation). */
    pulse?: number;
}

export const STACK = {
    stage1Top: 32.5,
    interstageTop: 37,
    upperTop: 47.5,
    adapterTop: 48.5,
    fairingCylTop: 56,
    top: 61.4,
    r1: 1.9,
    rUpper: 1.525,
    rFairing: 2.1,
    kickBase: 48.55,
    spacecraftBase: 50.55,
} as const;

/** Azimuth (radians, CylinderGeometry convention: 0 = +Z) of the side facing the opening camera. */
const FRONT = -0.38;
/** The tower side, where the umbilical plates are. */
const TOWER_SIDE = -Math.PI / 2;

// ── Materials ─────────────────────────────────────────────────────────────

function useMaterial(params: ConstructorParameters<typeof MeshStandardMaterial>[0], deps: unknown[] = []) {
    const m = useMemo(() => new MeshStandardMaterial(params), deps);
    useEffect(() => () => m.dispose(), [m]);
    return m;
}

/** A surface set with its own repeat, released with the component. */
function useSurface(make: () => SurfaceSet | null, x = 1, y = 1) {
    const set = useMemo(() => {
        if (typeof document === 'undefined') return null;
        const base = make();
        return base ? repeated(base, x, y) : null;
    }, [x, y]);
    useEffect(
        () => () => {
            set?.map.dispose();
            set?.normalMap.dispose();
            set?.roughnessMap.dispose();
        },
        [set],
    );
    return set;
}

const surf = (s: SurfaceSet | null, normal = 0.6) => (s ? { map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, normalScale: new Vector2(normal, normal) } : {});

/** Emissive highlight for the chosen topic, applied every frame from the shared state. */
function useHighlight(state: MutableRefObject<VehicleState>, materials: MeshStandardMaterial[], part: Focus | Focus[]) {
    const parts = Array.isArray(part) ? part : [part];
    const cyan = useMemo(() => new Color('#22D3EE'), []);
    useFrame(() => {
        const s = state.current;
        const on = s.focus !== undefined && parts.includes(s.focus);
        const pulse = on ? 0.06 + 0.045 * Math.sin(s.time * 3) : 0;
        for (const m of materials) {
            m.emissive.copy(cyan);
            m.emissiveIntensity = pulse;
        }
    });
}

/**
 * Section cut: two planes through the vehicle axis remove a wedge facing the camera. Shared by every
 * material of the part (clipIntersection: only points behind both planes are removed).
 */
function useCut(state: MutableRefObject<VehicleState>, part: CutPart, group: MutableRefObject<Group | null>, materials: MeshStandardMaterial[]) {
    const planes = useMemo(() => [new Plane(), new Plane()], []);
    useEffect(() => {
        for (const m of materials) {
            m.clippingPlanes = planes;
            m.clipIntersection = true;
            m.clipShadows = true;
            m.needsUpdate = true;
        }
    }, [materials, planes]);
    const n = useMemo(() => new Vector3(), []);
    useFrame(() => {
        const s = state.current;
        const g = group.current;
        const amount = s.cut.part === part ? s.cut.amount : 0;
        if (!g || amount <= 0.001) {
            planes[0].set(new Vector3(0, 1, 0), 1e9);
            planes[1].set(new Vector3(0, 1, 0), 1e9);
            return;
        }
        const half = amount * (Math.PI * 0.36);
        const a = s.cut.azimuth + half;
        const b = s.cut.azimuth - half;
        // Local azimuth φ = atan2(x, z) (CylinderGeometry convention). Plane A clips sin(φ − a) < 0 and
        // plane B clips sin(b − φ) < 0; together they remove b < φ < a, a wedge centred on the camera.
        planes[0].set(n.set(Math.cos(a), 0, -Math.sin(a)), 0);
        planes[1].set(n.set(-Math.cos(b), 0, Math.sin(b)), 0);
        g.updateWorldMatrix(true, false);
        planes[0].applyMatrix4(g.matrixWorld);
        planes[1].applyMatrix4(g.matrixWorld);
    });
}

// ── Geometry helpers ──────────────────────────────────────────────────────

/** A bell nozzle: throat radius rt at the top, exit radius re at the bottom, length L (top at y = 0). */
function bellGeometry(rt: number, re: number, L: number, segments = 48) {
    const pts: Vector2[] = [];
    pts.push(new Vector2(rt * 1.5, 0));
    for (let i = 0; i <= 20; i++) {
        const f = i / 20;
        // Parabolic (Rao-like) contour from throat to exit.
        const r = rt + (re - rt) * Math.pow(f, 0.6);
        pts.push(new Vector2(r, -f * L));
    }
    return new LatheGeometry(pts, segments);
}

/**
 * Tangent-ogive nose cone of the fairing over [0, h]: radius R at the base (y = 0), narrowing to a
 * blunted tip. With ρ = (R² + h²)/2R, the radius at height y is √(ρ² − y²) + R − ρ.
 */
function ogiveGeometry(R: number, h: number, phiStart: number, phiLength: number) {
    const rho = (R * R + h * h) / (2 * R);
    const radius = (y: number) => Math.sqrt(Math.max(0, rho * rho - y * y)) + R - rho;
    const tip = 0.24; // blunting radius
    const pts: Vector2[] = [];
    let yCut = h;
    for (let i = 0; i <= 48; i++) {
        const y = (i / 48) * h;
        if (radius(y) < tip) {
            yCut = y;
            break;
        }
        pts.push(new Vector2(radius(y), y));
    }
    const last = pts[pts.length - 1];
    for (let k = 1; k <= 10; k++) {
        const a = (k / 10) * (Math.PI / 2);
        pts.push(new Vector2(Math.max(0.001, last.x * Math.cos(a)), last.y + (yCut - last.y + last.x * 0.6) * Math.sin(a)));
    }
    return new LatheGeometry(pts, 64, phiStart, phiLength);
}

function Tube({
    r,
    top,
    h,
    y,
    mat,
    segments = 64,
    open = false,
    thetaStart,
    thetaLength,
    children,
}: {
    r: number;
    top?: number;
    h: number;
    y: number;
    mat: MeshStandardMaterial;
    segments?: number;
    open?: boolean;
    thetaStart?: number;
    thetaLength?: number;
    children?: ReactNode;
}) {
    return (
        <mesh position={[0, y + h / 2, 0]} material={mat} castShadow receiveShadow>
            <cylinderGeometry args={[top ?? r, r, h, segments, 1, open, thetaStart, thetaLength]} />
            {children}
        </mesh>
    );
}

/** A decal on a cylinder: a strip of `width` radians centred on `azimuth`, slightly proud of the skin. */
function Decal({ r, y, h, azimuth, width, map }: { r: number; y: number; h: number; azimuth: number; width: number; map: Texture | null }) {
    const material = useMemo(() => new MeshStandardMaterial({ map, transparent: true, roughness: 0.5, metalness: 0.05, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), [map]);
    useEffect(() => () => material.dispose(), [material]);
    if (!map) return null;
    return (
        <mesh position={[0, y + h / 2, 0]} material={material} renderOrder={2}>
            <cylinderGeometry args={[r + 0.006, r + 0.006, h, 24, 1, true, azimuth - width / 2, width]} />
        </mesh>
    );
}

/** Position on a cylinder of radius r at azimuth θ (CylinderGeometry convention). */
const onRadius = (r: number, theta: number, y: number): [number, number, number] => [r * Math.sin(theta), y, r * Math.cos(theta)];

// ── Plume ─────────────────────────────────────────────────────────────────

const PLUME_VERT = /* glsl */ `${LOGDEPTH.vPars}
    varying vec2 vUv; varying vec3 vN; varying vec3 vPos;
    void main() { vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; ${LOGDEPTH.v} }`;
const PLUME_FRAG = /* glsl */ `${LOGDEPTH.fPars}
    uniform float uTime; uniform float uPower; uniform vec3 uCore; uniform vec3 uEdge; uniform float uDiamonds; uniform float uHot; uniform float uSoot;
    varying vec2 vUv; varying vec3 vN; varying vec3 vPos;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
    float fbm(vec2 p) { return 0.55 * noise(p) + 0.3 * noise(p * 2.1) + 0.15 * noise(p * 4.3); }
    void main() {
        ${LOGDEPTH.f}
        float along = 1.0 - vUv.y; // 0 at the nozzle, 1 at the tail
        vec3 v = normalize(cameraPosition - vPos);
        float facing = abs(dot(normalize(vN), v));
        float soft = smoothstep(0.0, 0.8, facing);
        // Turbulent structure travelling downstream.
        float turb = fbm(vec2(vUv.x * 9.0, along * 6.0 - uTime * 7.0));
        float flicker = 0.78 + 0.32 * turb;
        float fade = pow(1.0 - along, 1.25) * smoothstep(0.0, 0.03, along);
        float diamonds = uDiamonds * (0.5 + 0.5 * cos(along * 44.0)) * smoothstep(0.32, 0.0, along);
        float hot = pow(1.0 - along, 4.0);
        vec3 col = mix(uEdge, uCore, hot) * (1.0 + diamonds) * (1.0 + uHot);
        // Kerosene exhaust carries soot: darker, smoky edges in dense air.
        col = mix(col, col * vec3(0.55, 0.42, 0.34), uSoot * (1.0 - facing) * smoothstep(0.15, 0.6, along));
        float a = clamp(fade * soft * flicker * uPower, 0.0, 1.0);
        gl_FragColor = vec4(col, a);
    }`;

/**
 * An exhaust plume: an outer flame (normal blending, so it reads against a bright sky) and, when
 * `additive` is set, a narrower glowing core. Length and radius follow the ambient pressure.
 */
export function Plume({
    length,
    radius,
    core,
    edge,
    power,
    diamonds = 0,
    additive = false,
    soot = 0,
}: {
    length: () => number;
    radius: () => number;
    core: string;
    edge: string;
    power: () => number;
    diamonds?: number;
    additive?: boolean;
    soot?: number;
}) {
    const ref = useRef<Mesh>(null);
    const material = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: { uTime: { value: 0 }, uPower: { value: 0 }, uCore: { value: new Color(core) }, uEdge: { value: new Color(edge) }, uDiamonds: { value: diamonds }, uHot: { value: additive ? 0.6 : 0 }, uSoot: { value: soot } },
                vertexShader: PLUME_VERT,
                fragmentShader: PLUME_FRAG,
                transparent: true,
                depthWrite: false,
                blending: additive ? AdditiveBlending : NormalBlending,
                side: DoubleSide,
            }),
        [core, edge, diamonds, additive, soot],
    );
    useEffect(() => () => material.dispose(), [material]);
    useFrame((st) => {
        const p = power();
        material.uniforms.uPower.value = p;
        material.uniforms.uTime.value = st.clock.elapsedTime;
        if (ref.current) {
            ref.current.visible = p > 0.01;
            const L = length();
            const r = radius();
            ref.current.scale.set(r, L, r);
            ref.current.position.y = -L / 2;
        }
    });
    return (
        <mesh ref={ref} material={material} renderOrder={additive ? 6 : 5} frustumCulled={false}>
            {/* Unit plume: radius 1 at the tail, 0.35 at the nozzle, length 1. */}
            <cylinderGeometry args={[0.35, 1, 1, 40, 1, true]} />
        </mesh>
    );
}

/**
 * The bright bloom a camera records around a rocket engine's exhaust: a soft, camera-facing glow at
 * the nozzle exit, largest and brightest in dense air, fading to a small hot spot in vacuum.
 */
export function EngineGlow({ power, size, color = '#ffd9a0' }: { power: () => number; size: () => number; color?: string | (() => Color) }) {
    const ref = useRef<Mesh>(null);
    const material = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: { uPower: { value: 0 }, uColor: { value: new Color(typeof color === 'string' ? color : '#ffd9a0') } },
                vertexShader: /* glsl */ `${LOGDEPTH.vPars}
                    varying vec2 vUv;
                    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); ${LOGDEPTH.v} }`,
                fragmentShader: /* glsl */ `${LOGDEPTH.fPars}
                    uniform float uPower; uniform vec3 uColor; varying vec2 vUv;
                    void main() {
                        ${LOGDEPTH.f}
                        float d = length(vUv - 0.5) * 2.0;
                        float core = exp(-d * d * 14.0);
                        float halo = exp(-d * 3.2) * 0.35;
                        float a = (core + halo) * uPower * smoothstep(1.0, 0.7, d);
                        gl_FragColor = vec4(mix(uColor, vec3(1.0, 0.98, 0.94), core) * a, a);
                    }`,
                transparent: true,
                depthWrite: false,
                blending: AdditiveBlending,
            }),
        [typeof color === 'string' ? color : 'fn'],
    );
    useEffect(() => () => material.dispose(), [material]);
    useFrame(({ camera }) => {
        const p = power();
        material.uniforms.uPower.value = p;
        if (typeof color === 'function') (material.uniforms.uColor.value as Color).copy(color());
        if (ref.current) {
            ref.current.visible = p > 0.01;
            ref.current.scale.setScalar(size());
            // Face the camera in world space (the vehicle group is rotated).
            ref.current.parent?.getWorldQuaternion(ref.current.quaternion);
            ref.current.quaternion.invert().multiply(camera.quaternion);
        }
    });
    return (
        <mesh ref={ref} material={material} renderOrder={7} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
        </mesh>
    );
}

// ── Engines ───────────────────────────────────────────────────────────────

/**
 * A first-stage gas-generator engine as seen from below and from the side: regeneratively cooled bell
 * with a reinforced exit lip, sooty interior, combustion chamber and turbopump above the throat, the
 * turbine exhaust duct beside the bell and two gimbal actuators.
 */
function MainEngine({ bell, skin, soot, metal, dark, x }: { bell: LatheGeometry; skin: MeshStandardMaterial; soot: MeshStandardMaterial; metal: MeshStandardMaterial; dark: MeshStandardMaterial; x: number }) {
    const out = Math.sign(x);
    return (
        <group position={[x, 0.2, 0]}>
            <mesh position={[0, 0.35, 0]} material={metal} castShadow>
                <cylinderGeometry args={[0.3, 0.26, 0.7, 24]} />
            </mesh>
            {/* Turbopump beside the chamber */}
            <mesh position={[out * 0.42, 0.55, 0.1]} rotation={[0, 0, Math.PI / 2]} material={metal}>
                <cylinderGeometry args={[0.16, 0.16, 0.42, 18]} />
            </mesh>
            <mesh geometry={bell} material={skin} castShadow />
            <mesh geometry={bell} material={soot} scale={[0.985, 1, 0.985]} />
            <mesh position={[0, -2.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={metal}>
                <torusGeometry args={[0.68, 0.03, 8, 48]} />
            </mesh>
            {/* Turbine exhaust duct */}
            <mesh position={[out * 0.55, -0.55, 0.32]} rotation={[0.05, 0, -out * 0.08]} material={dark} castShadow>
                <cylinderGeometry args={[0.085, 0.1, 1.5, 12]} />
            </mesh>
            {/* Gimbal actuators */}
            {[0.5, -0.5].map((z) => (
                <mesh key={z} position={[out * 0.2, 0.0, z]} rotation={[z > 0 ? 0.55 : -0.55, 0, 0]} material={metal}>
                    <cylinderGeometry args={[0.035, 0.035, 0.9, 8]} />
                </mesh>
            ))}
        </group>
    );
}

// ── The vehicle ───────────────────────────────────────────────────────────

export default function LaunchVehicle({
    state,
    showStage1 = true,
    showFairing = true,
    payloadLabels = false,
    quality = 'high',
    children,
}: {
    state: MutableRefObject<VehicleState>;
    showStage1?: boolean;
    showFairing?: boolean;
    payloadLabels?: boolean;
    quality?: 'high' | 'low';
    children?: ReactNode;
}) {
    // Surfaces (procedural, shared): kerosene and oxygen tank barrels, fairing, foam, carbon, nozzles.
    // First stage: orange spray-on foam insulation over both tanks (the liquid oxygen is at −183 °C).
    const fuelSkin = useSurface(() => sprayFoam(3, 43));
    const loxSkin = useSurface(() => sprayFoam(5, 47));
    const fwdSkin = useSurface(() => sprayFoam(1, 53));
    const adapterSkin = useSurface(() => paintedBarrel(1, 4, 7));
    const fairingSkin = useSurface(() => paintedBarrel(3, 2, 9));
    const foam = useSurface(() => foamInsulation(21, 'white'), 3, 2);
    const carbon = useSurface(() => carbonShell(48));
    const carbonAft = useSurface(() => carbonShell(36, 12));
    const copper = useSurface(() => nozzleSkin('copper'));
    const niobium = useSurface(() => nozzleSkin('niobium'));
    const name = useMemo(() => (typeof document === 'undefined' ? null : lettering('RLV-1', 2048, { size: 190 })), []);
    const roll = useMemo(() => (typeof document === 'undefined' ? null : rollPattern(8)), []);

    const paintFuel = useMaterial({ color: '#ffffff', roughness: 1, metalness: 0, ...surf(fuelSkin, 0.45) }, [fuelSkin]);
    const paintLox = useMaterial({ color: '#ffffff', roughness: 1, metalness: 0, ...surf(loxSkin, 0.45) }, [loxSkin]);
    const paintFwd = useMaterial({ color: '#ffffff', roughness: 1, metalness: 0, ...surf(fwdSkin, 0.45) }, [fwdSkin]);
    const paintAdapter = useMaterial({ color: '#ffffff', roughness: 1, metalness: 0.05, ...surf(adapterSkin, 0.5) }, [adapterSkin]);
    const fairingPaint = useMaterial({ color: '#ffffff', roughness: 1, metalness: 0.03, side: DoubleSide, ...surf(fairingSkin, 0.35) }, [fairingSkin]);
    const lining = useMaterial({ color: '#b9bec5', roughness: 0.9, metalness: 0.0, side: BackSide });
    const upperFoam = useMaterial({ color: '#ffffff', roughness: 1, metalness: 0, ...surf(foam, 0.8) }, [foam]);
    const interstage = useMaterial({ color: '#ffffff', roughness: 1, metalness: 0.2, ...surf(carbon, 0.9) }, [carbon]);
    const aftSkirt = useMaterial({ color: '#c8ccd2', roughness: 1, metalness: 0.35, ...surf(carbonAft, 0.9) }, [carbonAft]);
    const intertank = useMaterial({ color: '#d5d9de', roughness: 1, metalness: 0.4, ...surf(carbon, 1.0) }, [carbon]);
    const heatShield = useMaterial({ color: '#d8d0c0', roughness: 0.95, metalness: 0 });
    const nozzle1 = useMaterial({ color: '#ffffff', roughness: 1, metalness: 0.85, side: DoubleSide, ...surf(copper, 1) }, [copper]);
    const nozzle2 = useMaterial({ color: '#ffffff', roughness: 1, metalness: 0.9, side: DoubleSide, ...surf(niobium, 0.6) }, [niobium]);
    const soot = useMaterial({ color: '#15120f', roughness: 0.92, metalness: 0.2, side: BackSide });
    const metal = useMaterial({ color: '#9ea4ab', roughness: 0.35, metalness: 0.85 });
    const dark = useMaterial({ color: '#2a2d32', roughness: 0.55, metalness: 0.6 });
    const ring = useMaterial({ color: '#b4b9c0', roughness: 0.3, metalness: 0.9 });
    const seam = useMaterial({ color: '#2a2d32', roughness: 0.55, metalness: 0.6 });
    const raceway = useMaterial({ color: '#d9dce0', roughness: 0.55, metalness: 0.2 });
    const tankFuel = useMaterial({ color: '#b98745', roughness: 0.3, metalness: 0.1 });
    const tankLox = useMaterial({ color: '#8fb5e2', roughness: 0.2, metalness: 0.1 });
    const tankWall = useMaterial({ color: '#c9cdd3', roughness: 0.45, metalness: 0.7, side: DoubleSide });
    const rollMat = useMaterial({ color: '#ffffff', roughness: 0.55, metalness: 0.05, map: roll, polygonOffset: true, polygonOffsetFactor: -2 }, [roll]);

    useHighlight(state, [paintFuel, paintLox, paintFwd, intertank, aftSkirt], 'stage1');
    useHighlight(state, [nozzle1, aftSkirt], 'engines');
    useHighlight(state, [interstage], ['stage1', 'upper']);
    useHighlight(state, [upperFoam, nozzle2], 'upper');
    useHighlight(state, [fairingPaint], 'fairing');
    useHighlight(state, [tankFuel, tankLox], 'tanks');

    const stageGroup = useRef<Group>(null);
    const vehicleGroup = useRef<Group>(null);
    useCut(
        state,
        'tanks',
        vehicleGroup,
        useMemo(() => [paintFuel, paintLox, intertank, rollMat], [paintFuel, paintLox, intertank, rollMat]),
    );
    useCut(
        state,
        'interstage',
        vehicleGroup,
        useMemo(() => [interstage], [interstage]),
    );
    useCut(
        state,
        'fairing',
        vehicleGroup,
        useMemo(() => [fairingPaint, lining, seam], [fairingPaint, lining, seam]),
    );

    const bell1 = useMemo(() => bellGeometry(0.24, 0.68, 2.25), []);
    const bell2 = useMemo(() => bellGeometry(0.12, 0.62, 2.2), []);
    const noseA = useMemo(() => ogiveGeometry(STACK.rFairing, STACK.top - STACK.fairingCylTop, 0, Math.PI), []);
    const noseB = useMemo(() => ogiveGeometry(STACK.rFairing, STACK.top - STACK.fairingCylTop, Math.PI, Math.PI), []);
    const noseLiningA = useMemo(() => ogiveGeometry(STACK.rFairing - 0.04, STACK.top - STACK.fairingCylTop - 0.1, 0, Math.PI), []);
    const noseLiningB = useMemo(() => ogiveGeometry(STACK.rFairing - 0.04, STACK.top - STACK.fairingCylTop - 0.1, Math.PI, Math.PI), []);
    useEffect(
        () => () => {
            [bell1, bell2, noseA, noseB, noseLiningA, noseLiningB].forEach((g) => g.dispose());
        },
        [bell1, bell2, noseA, noseB, noseLiningA, noseLiningB],
    );

    const upperGroup = useRef<Group>(null);
    const halfA = useRef<Group>(null);
    const halfB = useRef<Group>(null);
    const kickSpin = useRef<Group>(null);
    const tanks = useRef<Group>(null);

    // Label anchors for the payload cutaway (registered only while the cutaway is open).
    const aHga = useRef<Group>(null);
    const aRtg = useRef<Group>(null);
    const aMag = useRef<Group>(null);
    const aKick = useRef<Group>(null);
    const aAdapter = useRef<Group>(null);
    const aFairing = useRef<Group>(null);
    useLabelAnchor(payloadLabels ? 'pl-hga' : null, aHga, [0, 0, 0]);
    useLabelAnchor(payloadLabels ? 'pl-rtg' : null, aRtg, [0, 0, 0]);
    useLabelAnchor(payloadLabels ? 'pl-mag' : null, aMag, [0, 0, 0]);
    useLabelAnchor(payloadLabels ? 'pl-kick' : null, aKick, [0, 0, 0]);
    useLabelAnchor(payloadLabels ? 'pl-adapter' : null, aAdapter, [0, 0, 0]);
    useLabelAnchor(payloadLabels ? 'pl-fairing' : null, aFairing, [0, 0, 0]);

    useFrame(() => {
        const s = state.current;
        if (stageGroup.current) {
            const away = s.stage1Away;
            stageGroup.current.visible = showStage1 && (away === null || away < 6000);
            // The spent stage tumbles slowly about its centre of mass (about 13 m up the empty stage).
            const th = away === null ? 0 : s.stage1Tumble;
            const cg = 13;
            stageGroup.current.rotation.z = th;
            stageGroup.current.position.set(cg * Math.sin(th), cg - cg * Math.cos(th) - (away ?? 0), 0);
        }
        const hinge = Math.min(1, s.fairingOpen) * (Math.PI / 2.4);
        const drift = s.fairingAway;
        if (halfA.current && halfB.current) {
            const vis = showFairing && (s.fairingAttached || drift < 4000);
            halfA.current.visible = halfB.current.visible = vis;
            halfA.current.rotation.z = -hinge;
            halfB.current.rotation.z = hinge;
            halfA.current.position.set(STACK.rFairing + drift * 0.35, STACK.adapterTop - drift, 0);
            halfB.current.position.set(-STACK.rFairing - drift * 0.35, STACK.adapterTop - drift, 0);
        }
        if (upperGroup.current) upperGroup.current.position.y = s.upperAway === null ? 0 : -s.upperAway;
        if (kickSpin.current) kickSpin.current.rotation.y = s.spin;
        const tanksOpen = s.cut.part === 'tanks' && s.cut.amount > 0.01;
        if (tanks.current) tanks.current.visible = tanksOpen;
    });

    const firstStage = (
        <>
            {/* Engine bay: carbon aft skirt flaring slightly, refractory heat shield across the base */}
            <Tube r={1.98} top={STACK.r1} h={3.2} y={0} mat={aftSkirt} />
            <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} material={heatShield} receiveShadow>
                <circleGeometry args={[1.97, 64]} />
            </mesh>
            {/* Kerosene tank, intertank (ribbed), liquid-oxygen tank, forward skirt */}
            <Tube r={STACK.r1} h={9.8} y={3.2} mat={paintFuel} />
            <Tube r={STACK.r1 + 0.01} h={2} y={13} mat={intertank} />
            <Tube r={STACK.r1} h={16} y={15} mat={paintLox} />
            <Tube r={STACK.r1} h={1.5} y={31} mat={paintFwd} />
            {/* Roll pattern band for optical tracking, and the vehicle name */}
            <mesh position={[0, 29.4, 0]} material={rollMat}>
                <cylinderGeometry args={[STACK.r1 + 0.004, STACK.r1 + 0.004, 0.9, 64, 1, true]} />
            </mesh>
            <Decal r={STACK.r1} y={16.6} h={10.4} azimuth={FRONT} width={0.62} map={name} />
            {/* Interstage (carbon), the separation plane and four separation motors */}
            <Tube r={STACK.r1} h={STACK.interstageTop - STACK.stage1Top} y={STACK.stage1Top} mat={interstage} />
            {[0.785, 2.356, 3.927, 5.498].map((t) => (
                <group key={t} position={onRadius(STACK.r1 + 0.12, t, 35.6)}>
                    <mesh material={dark} castShadow>
                        <cylinderGeometry args={[0.13, 0.13, 1.6, 14]} />
                    </mesh>
                    <mesh position={[0, 0.95, 0]} material={dark}>
                        <coneGeometry args={[0.13, 0.3, 14]} />
                    </mesh>
                </group>
            ))}
            {/* Cable raceway with clamps and a pressurisation line on the east side */}
            <mesh position={onRadius(STACK.r1 + 0.07, Math.PI / 2, 17)} rotation={[0, Math.PI / 2, 0]} material={raceway} castShadow>
                <boxGeometry args={[0.3, 28, 0.14]} />
            </mesh>
            {Array.from({ length: 12 }, (_, i) => (
                <mesh key={i} position={onRadius(STACK.r1 + 0.08, Math.PI / 2, 4 + i * 2.4)} rotation={[0, Math.PI / 2, 0]} material={ring}>
                    <boxGeometry args={[0.38, 0.08, 0.18]} />
                </mesh>
            ))}
            <mesh position={onRadius(STACK.r1 + 0.06, Math.PI / 2 + 0.2, 22)} material={metal} castShadow>
                <cylinderGeometry args={[0.06, 0.06, 16, 10]} />
            </mesh>
            {/* Umbilical plates on the tower side: tail service, oxygen fill-and-drain, upper stage */}
            {[2.4, 30.4, 35.2].map((y) => (
                <mesh key={y} position={onRadius(STACK.r1 + 0.04, TOWER_SIDE, y)} rotation={[0, TOWER_SIDE, 0]} material={dark} castShadow>
                    <boxGeometry args={[0.8, 0.9, 0.1]} />
                </mesh>
            ))}
            {/* Intertank stiffener rings and the weld land rings at the tank ends */}
            {[13.05, 14.95, 3.25, 31].map((y) => (
                <Tube key={y} r={STACK.r1 + 0.02} h={0.06} y={y} mat={ring} segments={48} />
            ))}
            <VentVapour state={state} />
            {/* Tank cutaway (shown with the Propellant Tanks topic): walls, domes and propellant levels */}
            <group ref={tanks} visible={false}>
                <Tube r={1.84} h={9.2} y={3.6} mat={tankWall} open />
                <Tube r={1.8} h={8.6} y={3.65} mat={tankFuel} />
                <mesh position={[0, 3.6, 0]} material={tankWall}>
                    <sphereGeometry args={[1.84, 40, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                </mesh>
                <mesh position={[0, 12.8, 0]} scale={[1, 0.45, 1]} material={tankWall}>
                    <sphereGeometry args={[1.84, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                </mesh>
                <Tube r={1.84} h={15.4} y={15.3} mat={tankWall} open />
                <Tube r={1.8} h={14.6} y={15.35} mat={tankLox} />
                <mesh position={[0, 15.3, 0]} scale={[1, 0.45, 1]} material={tankWall}>
                    <sphereGeometry args={[1.84, 40, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                </mesh>
                <mesh position={[0, 30.7, 0]} scale={[1, 0.5, 1]} material={tankWall}>
                    <sphereGeometry args={[1.84, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                </mesh>
                {/* Oxygen feed line running down through the kerosene tank (tunnel) */}
                <mesh position={[0.6, 8.5, 0.6]} material={metal}>
                    <cylinderGeometry args={[0.16, 0.16, 7.4, 16]} />
                </mesh>
            </group>
            {/* Two main engines, with their glow and plumes */}
            <group position={[0, -2.6, 0]}>
                <EngineGlow power={() => state.current.firing1 * 0.22 + state.current.igniter * 0.8} size={() => 3 + 3 * state.current.pressure} color={IGNITER_COLOR(state)} />
            </group>
            {[-0.86, 0.86].map((x) => (
                <MainEngine key={x} bell={bell1} skin={nozzle1} soot={soot} metal={metal} dark={dark} x={x} />
            ))}
            {/* Both engines' exhaust, one volume: twin cores merging downstream; length and width follow
                the ambient pressure (tight and opaque at the pad, wide and faint near vacuum). */}
            <group position={[0, 0.2 - 2.25, 0]} visible={!perfOff('noPlume')}>
                <VolumePlume
                    kind="kerosene"
                    quality={quality}
                    nozzle={0.68}
                    separation={0.86}
                    power={() => (state.current.engineOut ? 0 : state.current.firing1)}
                    pressure={() => state.current.pressure}
                    length={() => 40 + 64 * (1 - state.current.pressure) ** 1.5}
                    radius={() => 3.0 + 15 * (1 - state.current.pressure) ** 2}
                />
            </group>
            {/* Engine-out fault scenario: only the remaining engine's flame. */}
            <group position={[-0.86, 0.2 - 2.25, 0]} visible={!perfOff('noPlume')}>
                <VolumePlume
                    kind="kerosene"
                    quality={quality}
                    nozzle={0.68}
                    separation={0}
                    power={() => (state.current.engineOut ? state.current.firing1 : 0)}
                    pressure={() => state.current.pressure}
                    length={() => 0.8 * (40 + 64 * (1 - state.current.pressure) ** 1.5)}
                    radius={() => 0.72 * (3.0 + 15 * (1 - state.current.pressure) ** 2)}
                />
            </group>
        </>
    );

    return (
        <group ref={vehicleGroup}>
            {/* ── First stage and interstage ── */}
            <group ref={stageGroup}>{firstStage}</group>

            {/* ── Upper stage, adapter and payload (moves back only when the kick stage separates) ── */}
            <group ref={upperGroup}>
                {/* Aft dome and thrust structure, visible in the interstage cutaway */}
                <mesh position={[0, STACK.interstageTop, 0]} scale={[1, 0.42, 1]} material={upperFoam}>
                    <sphereGeometry args={[STACK.rUpper, 48, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                </mesh>
                <Tube r={STACK.rUpper} h={STACK.upperTop - STACK.interstageTop} y={STACK.interstageTop} mat={upperFoam} />
                {/* Separation interface: a polished ring at the joint, and the upper stage's raceway */}
                <Tube r={STACK.r1 + 0.02} h={0.14} y={STACK.interstageTop - 0.07} mat={ring} />
                <mesh position={onRadius(STACK.rUpper + 0.05, Math.PI / 2, 42.2)} rotation={[0, Math.PI / 2, 0]} material={dark} castShadow>
                    <boxGeometry args={[0.22, 10.4, 0.1]} />
                </mesh>
                {[39.5, 44.2].map((y) => (
                    <Tube key={y} r={STACK.rUpper + 0.015} h={0.08} y={y} mat={dark} segments={48} />
                ))}
                {[-0.7, 0.7].map((x) => (
                    <group key={x} position={[x, STACK.interstageTop - 0.55, 0]}>
                        <mesh position={[0, 0.3, 0]} material={metal}>
                            <cylinderGeometry args={[0.17, 0.14, 0.6, 18]} />
                        </mesh>
                        <mesh geometry={bell2} material={nozzle2} />
                        <mesh geometry={bell2} material={soot} scale={[0.985, 1, 0.985]} />
                    </group>
                ))}
                <group position={[0, STACK.interstageTop - 3.0, 0]}>
                    <EngineGlow power={() => (state.current.firing2 ? 0.3 : 0)} size={() => 2.2} color="#cfdcff" />
                </group>
                {/* Hydrogen–oxygen exhaust in vacuum: almost transparent, a faint blue-violet glow. */}
                <group position={[0, STACK.interstageTop - 0.55 - 2.2, 0]}>
                    <VolumePlume kind="hydrogen" quality={quality} nozzle={0.62} separation={0.7} power={() => (state.current.firing2 ? 1 : 0)} pressure={() => 0} length={() => 22} radius={() => 5} />
                </group>
                {/* Conical adapter to the fairing diameter, and the fairing separation ring */}
                <Tube r={STACK.rUpper} top={STACK.rFairing} h={STACK.adapterTop - STACK.upperTop} y={STACK.upperTop} mat={paintAdapter} />
                <Tube r={STACK.rFairing + 0.02} h={0.16} y={STACK.adapterTop - 0.08} mat={ring} />
            </group>

            {/* ── Payload: adapter cone, spinning kick stage, spacecraft ── */}
            <group>
                <Tube r={0.95} top={0.62} h={0.5} y={STACK.adapterTop} mat={metal} />
                <group ref={aAdapter} position={[-1.05, STACK.adapterTop + 0.2, 0.6]} />
                <group ref={aFairing} position={[-1.35, STACK.fairingCylTop + 1.2, -1.2]} />
                <group ref={kickSpin}>
                    <KickStage state={state} />
                    <group ref={aKick} position={[0.75, STACK.kickBase + 0.8, 0.6]} />
                    {children ?? <SpacecraftModel state={state} position={[0, STACK.spacecraftBase, 0]} />}
                    <group ref={aHga} position={[1.3, STACK.spacecraftBase + 2.35, 0.5]} />
                    <group ref={aRtg} position={[-1.15, STACK.spacecraftBase - 0.1, 0.5]} />
                    <group ref={aMag} position={[1.0, STACK.spacecraftBase + 1.0, 0.5]} />
                </group>
            </group>

            {/* ── Fairing halves (hinge at the base, outer edge), each with its acoustic lining ── */}
            <group ref={halfA}>
                <group position={[-STACK.rFairing, 0, 0]}>
                    <mesh position={[0, (STACK.fairingCylTop - STACK.adapterTop) / 2, 0]} material={fairingPaint} castShadow receiveShadow>
                        <cylinderGeometry args={[STACK.rFairing, STACK.rFairing, STACK.fairingCylTop - STACK.adapterTop, 64, 1, true, 0, Math.PI]} />
                    </mesh>
                    <mesh position={[0, STACK.fairingCylTop - STACK.adapterTop, 0]} geometry={noseA} material={fairingPaint} castShadow receiveShadow />
                    <mesh position={[0, (STACK.fairingCylTop - STACK.adapterTop) / 2, 0]} material={lining}>
                        <cylinderGeometry args={[STACK.rFairing - 0.04, STACK.rFairing - 0.04, STACK.fairingCylTop - STACK.adapterTop, 64, 1, true, 0, Math.PI]} />
                    </mesh>
                    <mesh position={[0, STACK.fairingCylTop - STACK.adapterTop, 0]} geometry={noseLiningA} material={lining} />
                    {[-1, 1].map((z) => (
                        <mesh key={z} position={[0, (STACK.fairingCylTop - STACK.adapterTop) / 2, z * (STACK.rFairing + 0.006)]} material={seam}>
                            <boxGeometry args={[0.04, STACK.fairingCylTop - STACK.adapterTop, 0.02]} />
                        </mesh>
                    ))}
                </group>
            </group>
            <group ref={halfB}>
                <group position={[STACK.rFairing, 0, 0]}>
                    <mesh position={[0, (STACK.fairingCylTop - STACK.adapterTop) / 2, 0]} material={fairingPaint} castShadow receiveShadow>
                        <cylinderGeometry args={[STACK.rFairing, STACK.rFairing, STACK.fairingCylTop - STACK.adapterTop, 64, 1, true, Math.PI, Math.PI]} />
                    </mesh>
                    <mesh position={[0, STACK.fairingCylTop - STACK.adapterTop, 0]} geometry={noseB} material={fairingPaint} castShadow receiveShadow />
                    <mesh position={[0, (STACK.fairingCylTop - STACK.adapterTop) / 2, 0]} material={lining}>
                        <cylinderGeometry args={[STACK.rFairing - 0.04, STACK.rFairing - 0.04, STACK.fairingCylTop - STACK.adapterTop, 64, 1, true, Math.PI, Math.PI]} />
                    </mesh>
                    <mesh position={[0, STACK.fairingCylTop - STACK.adapterTop, 0]} geometry={noseLiningB} material={lining} />
                    {[-1, 1].map((z) => (
                        <mesh key={z} position={[0, (STACK.fairingCylTop - STACK.adapterTop) / 2, z * (STACK.rFairing + 0.006)]} material={seam}>
                            <boxGeometry args={[0.04, STACK.fairingCylTop - STACK.adapterTop, 0.02]} />
                        </mesh>
                    ))}
                </group>
            </group>
        </group>
    );
}

/** Ignition colour: the green flash of the TEA–TEB igniter fading into the warm kerosene flame. */
function IGNITER_COLOR(state: MutableRefObject<VehicleState>) {
    const warm = new Color('#ffd9a0');
    const green = new Color('#7dff9a');
    const c = new Color();
    return () => c.copy(warm).lerp(green, Math.min(1, state.current.igniter * 1.4));
}

/**
 * Liquid-oxygen boil-off venting on the pad: white vapour puffs from vents at the top of the oxygen tank
 * and the intertank, drifting down the side in the breeze. Driven by the story clock so it keeps moving
 * while the countdown is held; it stops at engine ignition (state.frost below 1).
 */
function VentVapour({ state }: { state: MutableRefObject<VehicleState> }) {
    const count = 48;
    const ref = useRef<InstancedMesh>(null);
    const texture = useMemo(() => {
        if (typeof document === 'undefined') return null;
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const g = c.getContext('2d')!;
        const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255,255,255,0.75)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 64);
        const t = new CanvasTexture(c);
        t.colorSpace = SRGBColorSpace;
        return t;
    }, []);
    // Condensed vapour is bright even on the shaded side (it scatters skylight): partly self-lit.
    const material = useMemo(
        () => new MeshStandardMaterial({ color: '#f4f6f8', emissive: '#c9d2dc', emissiveIntensity: 0.55, emissiveMap: texture ?? undefined, map: texture ?? undefined, transparent: true, depthWrite: false, roughness: 1, opacity: 0.5 }),
        [texture],
    );
    useEffect(
        () => () => {
            material.dispose();
            texture?.dispose();
        },
        [material, texture],
    );
    const o = useMemo(() => new Object3D(), []);
    const vents: [number, number, number][] = [
        [-1.95, 30.9, 0.6],
        [1.6, 14.2, -1.1],
        [-1.4, 46.8, 0.5],
    ];
    useFrame(({ camera }) => {
        const mesh = ref.current;
        if (!mesh) return;
        const s = state.current;
        const on = s.frost >= 0.999;
        mesh.visible = on;
        if (!on) return;
        let n = 0;
        for (let i = 0; i < count; i++) {
            const life = 3.4;
            const age = (s.time + (i * life) / (count / vents.length)) % life;
            const v = vents[i % vents.length];
            const side = v[0] < 0 ? -1 : 1;
            o.position.set(v[0] + side * age * 0.5, v[1] - age * 1.4, v[2] + age * 0.9);
            o.scale.setScalar(0.5 + age * 0.9);
            o.quaternion.copy(camera.quaternion);
            o.updateMatrix();
            mesh.setMatrixAt(n++, o.matrix);
        }
        mesh.count = n;
        mesh.instanceMatrix.needsUpdate = true;
    });
    return (
        <instancedMesh ref={ref} args={[undefined, material, count]} frustumCulled={false} renderOrder={6}>
            <planeGeometry args={[1, 1]} />
        </instancedMesh>
    );
}

/** The solid kick stage: a spherical composite motor case with a short nozzle, on its spin table. */
export function KickStage({ state }: { state: MutableRefObject<VehicleState> }) {
    const caseMat = useMaterial({ color: '#2b2e33', roughness: 0.5, metalness: 0.35 });
    const band = useMaterial({ color: '#a7adb5', roughness: 0.3, metalness: 0.9 });
    const nozzle = useMaterial({ color: '#4c4741', roughness: 0.5, metalness: 0.6, side: DoubleSide });
    useHighlight(state, [caseMat, nozzle], 'kick');
    const bell = useMemo(() => bellGeometry(0.1, 0.36, 0.7), []);
    useEffect(() => () => bell.dispose(), [bell]);
    const y = STACK.kickBase;
    return (
        <group>
            {/* Spin table and its bearing ring */}
            <mesh position={[0, y + 0.05, 0]} material={band}>
                <cylinderGeometry args={[0.7, 0.7, 0.1, 40]} />
            </mesh>
            <mesh position={[0, y + 1.0, 0]} material={caseMat} castShadow>
                <sphereGeometry args={[0.62, 48, 32]} />
            </mesh>
            <mesh position={[0, y + 1.0, 0]} material={caseMat}>
                <cylinderGeometry args={[0.62, 0.62, 0.5, 48]} />
            </mesh>
            <mesh position={[0, y + 1.0, 0]} material={band}>
                <cylinderGeometry args={[0.635, 0.635, 0.06, 48]} />
            </mesh>
            <group position={[0, y + 0.42, 0]}>
                <group position={[0, -0.75, 0]}>
                    <EngineGlow power={() => (state.current.firingKick ? 0.8 : 0)} size={() => 3.6} />
                </group>
                <mesh geometry={bell} material={nozzle} />
                <group position={[0, -0.7, 0]}>
                    {/* A solid motor in vacuum: a bright core and a broad, faint, rapidly expanding glow */}
                    <VolumePlume kind="solid" nozzle={0.36} power={() => (state.current.firingKick ? 1 : 0)} pressure={() => 0} length={() => 14} radius={() => 3.2} />
                </group>
            </group>
            {/* Spacecraft attach fitting with its clamp band */}
            <mesh position={[0, y + 1.75, 0]} material={band}>
                <cylinderGeometry args={[0.7, 0.5, 0.3, 40]} />
            </mesh>
        </group>
    );
}
