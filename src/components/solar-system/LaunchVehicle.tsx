"use client";
// Reference Launch Vehicle RLV-1 in 3D, to the dimensions of lib/solar-system/vehicle.ts (61.4 m):
// first stage (3.8 m, two kerosene/oxygen engines), carbon interstage, hydrogen/oxygen upper stage
// (3.05 m, two long-nozzle engines), a clam-shell fairing (4.2 m) over the payload adapter, solid kick
// stage and spacecraft. Every movement is driven by mission time: plume size from ambient pressure,
// first-stage drift after separation, fairing halves hinging away. Highlight and translucency serve
// the cutaway labels. Origin: centre of the first-stage base; +Y along the vehicle axis.
import { useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BackSide, CanvasTexture, Color, DoubleSide, InstancedMesh, LatheGeometry, MeshStandardMaterial, NormalBlending, Object3D, RepeatWrapping, ShaderMaterial, SRGBColorSpace, Vector2, type Group, type Mesh } from 'three';
import type { Focus } from '@/lib/solar-system/mission';
import SpacecraftModel from './Spacecraft';
import { LOGDEPTH } from './environment';

export interface VehicleState {
    /** First-stage engines: 0 off … 1 full thrust. */
    firing1: number;
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
    /** Translucent cutaway of the interstage, the stage walls or the fairing (pad views only). */
    xray: 'upper' | 'tanks' | 'fairing' | null;
    /** Frost on the liquid-oxygen tank: 1 on the pad, shedding to 0 after liftoff. */
    frost: number;
    /** Boom deployment 0…1 (spacecraft). */
    booms: { rtgBoom: number; magnetometerBoom: number; scienceBoom: number };
    time: number;
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

// ── Materials ─────────────────────────────────────────────────────────────

function useMaterial(params: ConstructorParameters<typeof MeshStandardMaterial>[0]) {
    const m = useMemo(() => new MeshStandardMaterial(params), []);
    useEffect(() => () => m.dispose(), [m]);
    return m;
}

/** Panel-line texture for the painted stages, drawn once. */
function usePanelTexture() {
    const t = useMemo(() => {
        if (typeof document === 'undefined') return null;
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 1024;
        const g = c.getContext('2d')!;
        g.fillStyle = '#f2f3f4';
        g.fillRect(0, 0, 256, 1024);
        g.strokeStyle = 'rgba(70,78,90,0.22)';
        g.lineWidth = 2;
        for (let y = 0; y < 1024; y += 128) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(256, y);
            g.stroke();
        }
        g.strokeStyle = 'rgba(70,78,90,0.12)';
        for (let x = 0; x < 256; x += 64) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, 1024);
            g.stroke();
        }
        // Subtle soot and weathering towards the base.
        const grad = g.createLinearGradient(0, 1024, 0, 700);
        grad.addColorStop(0, 'rgba(60,60,64,0.18)');
        grad.addColorStop(1, 'rgba(60,60,64,0)');
        g.fillStyle = grad;
        g.fillRect(0, 700, 256, 324);
        const tex = new CanvasTexture(c);
        tex.anisotropy = 4;
        return tex;
    }, []);
    useEffect(() => () => t?.dispose(), [t]);
    return t;
}

/** Emissive highlight and translucency, applied every frame from the shared state. */
function useHighlight(state: MutableRefObject<VehicleState>, materials: MeshStandardMaterial[], part: Focus | Focus[], xray?: 'upper' | 'tanks' | 'fairing') {
    const parts = Array.isArray(part) ? part : [part];
    const cyan = useMemo(() => new Color('#22D3EE'), []);
    useFrame(() => {
        const s = state.current;
        const on = s.focus !== undefined && parts.includes(s.focus);
        const pulse = on ? 0.07 + 0.05 * Math.sin(s.time * 3) : 0;
        const see = xray !== undefined && s.xray === xray;
        for (const m of materials) {
            m.emissive.copy(cyan);
            m.emissiveIntensity = pulse;
            const opacity = see ? (xray === 'fairing' ? 0.22 : 0.18) : 1;
            if (m.opacity !== opacity) {
                m.opacity = opacity;
                m.transparent = opacity < 1;
                m.depthWrite = opacity === 1;
                m.needsUpdate = true;
            }
        }
    });
}

// ── Geometry helpers ──────────────────────────────────────────────────────

/** A bell nozzle: throat radius rt at the top, exit radius re at the bottom, length L (top at y = 0). */
function bellGeometry(rt: number, re: number, L: number, segments = 40) {
    const pts: Vector2[] = [];
    pts.push(new Vector2(rt * 1.6, 0.35 * L * 0));
    for (let i = 0; i <= 16; i++) {
        const f = i / 16;
        // Parabolic contour from throat to exit.
        const r = rt + (re - rt) * Math.pow(f, 0.62);
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
    for (let i = 0; i <= 40; i++) {
        const y = (i / 40) * h;
        if (radius(y) < tip) {
            yCut = y;
            break;
        }
        pts.push(new Vector2(radius(y), y));
    }
    // Spherical cap on the blunted end.
    const last = pts[pts.length - 1];
    for (let k = 1; k <= 8; k++) {
        const a = (k / 8) * (Math.PI / 2);
        pts.push(new Vector2(Math.max(0.001, last.x * Math.cos(a)), last.y + (yCut - last.y + last.x * 0.6) * Math.sin(a)));
    }
    return new LatheGeometry(pts, 48, phiStart, phiLength);
}

/** Vertical ribs (stringers) for the intertank and interstage, drawn once. */
function useRibTexture(base: string, rib: string) {
    const t = useMemo(() => {
        if (typeof document === 'undefined') return null;
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 64;
        const g = c.getContext('2d')!;
        g.fillStyle = base;
        g.fillRect(0, 0, 512, 64);
        for (let x = 0; x < 512; x += 16) {
            g.fillStyle = rib;
            g.fillRect(x, 0, 5, 64);
            g.fillStyle = 'rgba(255,255,255,0.06)';
            g.fillRect(x + 5, 0, 1, 64);
        }
        const tex = new CanvasTexture(c);
        tex.wrapS = RepeatWrapping;
        tex.repeat.set(3, 1);
        tex.anisotropy = 4;
        return tex;
    }, [base, rib]);
    useEffect(() => () => t?.dispose(), [t]);
    return t;
}

/** Frost on a cryogenic tank: white flakes with gaps, transparent, drawn once. */
function useFrostTexture() {
    const t = useMemo(() => {
        if (typeof document === 'undefined') return null;
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 512;
        const g = c.getContext('2d')!;
        let seed = 17;
        const rnd = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        g.clearRect(0, 0, 256, 512);
        for (let i = 0; i < 2600; i++) {
            const x = rnd() * 256;
            const y = rnd() * 512;
            const r = 1 + rnd() * 5;
            g.fillStyle = `rgba(245,248,252,${0.25 + rnd() * 0.5})`;
            g.beginPath();
            g.ellipse(x, y, r, r * (0.4 + rnd()), rnd() * Math.PI, 0, Math.PI * 2);
            g.fill();
        }
        const tex = new CanvasTexture(c);
        tex.wrapS = RepeatWrapping;
        tex.repeat.set(2, 1);
        return tex;
    }, []);
    useEffect(() => () => t?.dispose(), [t]);
    return t;
}

function Tube({ r, top, h, y, mat, segments = 48, open = false, children }: { r: number; top?: number; h: number; y: number; mat: MeshStandardMaterial; segments?: number; open?: boolean; children?: ReactNode }) {
    return (
        <mesh position={[0, y + h / 2, 0]} material={mat} castShadow receiveShadow>
            <cylinderGeometry args={[top ?? r, r, h, segments, 1, open]} />
            {children}
        </mesh>
    );
}

// ── Plume ─────────────────────────────────────────────────────────────────

const PLUME_VERT = /* glsl */ `${LOGDEPTH.vPars}
    varying vec2 vUv; varying vec3 vN; varying vec3 vPos;
    void main() { vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; ${LOGDEPTH.v} }`;
const PLUME_FRAG = /* glsl */ `${LOGDEPTH.fPars}
    uniform float uTime; uniform float uPower; uniform vec3 uCore; uniform vec3 uEdge; uniform float uDiamonds; uniform float uHot;
    varying vec2 vUv; varying vec3 vN; varying vec3 vPos;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
    void main() {
        ${LOGDEPTH.f}
        float along = 1.0 - vUv.y; // 0 at the nozzle, 1 at the tail
        vec3 v = normalize(cameraPosition - vPos);
        float facing = abs(dot(normalize(vN), v));
        float soft = smoothstep(0.0, 0.75, facing);
        float flicker = 0.84 + 0.16 * noise(vec2(vUv.x * 11.0, along * 7.0 - uTime * 10.0));
        float fade = pow(1.0 - along, 1.4) * smoothstep(0.0, 0.025, along);
        float diamonds = uDiamonds * (0.5 + 0.5 * cos(along * 46.0)) * smoothstep(0.3, 0.0, along);
        float hot = pow(1.0 - along, 5.0);
        vec3 col = mix(uEdge, uCore, hot) * (1.0 + diamonds) * (1.0 + uHot);
        float a = clamp(fade * soft * flicker * uPower, 0.0, 1.0);
        gl_FragColor = vec4(col, a);
    }`;

/**
 * An exhaust plume: an outer flame (normal blending, so it reads against a bright sky) and, when
 * `core` is set, a narrower additive core. Length and radius follow the ambient pressure.
 */
function Plume({ length, radius, core, edge, power, diamonds = 0, additive = false }: { length: () => number; radius: () => number; core: string; edge: string; power: () => number; diamonds?: number; additive?: boolean }) {
    const ref = useRef<Mesh>(null);
    const material = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: { uTime: { value: 0 }, uPower: { value: 0 }, uCore: { value: new Color(core) }, uEdge: { value: new Color(edge) }, uDiamonds: { value: diamonds }, uHot: { value: additive ? 0.6 : 0 } },
                vertexShader: PLUME_VERT,
                fragmentShader: PLUME_FRAG,
                transparent: true,
                depthWrite: false,
                blending: additive ? AdditiveBlending : NormalBlending,
                side: DoubleSide,
            }),
        [core, edge, diamonds, additive],
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
            <cylinderGeometry args={[0.35, 1, 1, 32, 1, true]} />
        </mesh>
    );
}

/**
 * The bright bloom a camera records around a rocket engine's exhaust: a soft, camera-facing glow at
 * the nozzle exit, largest and brightest in dense air, fading to a small hot spot in vacuum.
 */
function EngineGlow({ power, size, color = '#ffd9a0' }: { power: () => number; size: () => number; color?: string }) {
    const ref = useRef<Mesh>(null);
    const material = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: { uPower: { value: 0 }, uColor: { value: new Color(color) } },
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
        [color],
    );
    useEffect(() => () => material.dispose(), [material]);
    useFrame(({ camera }) => {
        const p = power();
        material.uniforms.uPower.value = p;
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

// ── The vehicle ───────────────────────────────────────────────────────────

export default function LaunchVehicle({ state, showStage1 = true, showFairing = true, children }: { state: MutableRefObject<VehicleState>; showStage1?: boolean; showFairing?: boolean; children?: ReactNode }) {
    const panels = usePanelTexture();
    const ribsDark = useRibTexture('#2f3339', '#24272c');
    const ribsCarbon = useRibTexture('#24272c', '#1b1d21');
    const frostMap = useFrostTexture();
    const paint = useMaterial({ color: '#f4f5f6', roughness: 0.48, metalness: 0.04, map: panels ?? undefined });
    const paintUpper = useMaterial({ color: '#e6e8eb', roughness: 0.5, metalness: 0.08, map: panels ?? undefined });
    const fairingPaint = useMaterial({ color: '#f6f6f7', roughness: 0.45, metalness: 0.04, side: DoubleSide });
    const carbon = useMaterial({ color: '#ffffff', roughness: 0.62, metalness: 0.25, map: ribsCarbon ?? undefined });
    const intertank = useMaterial({ color: '#ffffff', roughness: 0.55, metalness: 0.45, map: ribsDark ?? undefined });
    const aft = useMaterial({ color: '#2b2e33', roughness: 0.5, metalness: 0.6 });
    const nozzle1 = useMaterial({ color: '#5a524b', roughness: 0.38, metalness: 0.85 });
    const nozzle2 = useMaterial({ color: '#9a8669', roughness: 0.32, metalness: 0.9 });
    const soot = useMaterial({ color: '#16130f', roughness: 0.9, metalness: 0.2, side: BackSide });
    const seam = useMaterial({ color: '#8c9097', roughness: 0.5, metalness: 0.4 });
    const frost = useMaterial({ color: '#ffffff', roughness: 0.9, metalness: 0, map: frostMap ?? undefined, transparent: true, depthWrite: false, opacity: 1 });
    const raceway = useMaterial({ color: '#c9ccd1', roughness: 0.5, metalness: 0.2 });
    const tankFuel = useMaterial({ color: '#b07a3c', roughness: 0.45, metalness: 0.3, transparent: true, opacity: 0.85 });
    const tankLox = useMaterial({ color: '#7fa6d6', roughness: 0.35, metalness: 0.3, transparent: true, opacity: 0.85 });

    useHighlight(state, [paint, intertank], 'stage1', 'tanks');
    useHighlight(state, [aft, nozzle1], ['engines', 'stage1']);
    useHighlight(state, [carbon], 'stage1', 'upper');
    useHighlight(state, [paintUpper, nozzle2], 'upper');
    useHighlight(state, [fairingPaint], ['fairing', 'payload'], 'fairing');
    useHighlight(state, [tankFuel, tankLox], 'tanks');

    const bell1 = useMemo(() => bellGeometry(0.24, 0.68, 2.25), []);
    const bell2 = useMemo(() => bellGeometry(0.12, 0.62, 2.2), []);
    const noseA = useMemo(() => ogiveGeometry(STACK.rFairing, STACK.top - STACK.fairingCylTop, 0, Math.PI), []);
    const noseB = useMemo(() => ogiveGeometry(STACK.rFairing, STACK.top - STACK.fairingCylTop, Math.PI, Math.PI), []);
    useEffect(
        () => () => {
            bell1.dispose();
            bell2.dispose();
            noseA.dispose();
            noseB.dispose();
        },
        [bell1, bell2, noseA, noseB],
    );

    const stage1 = useRef<Group>(null);
    const upperGroup = useRef<Group>(null);
    const halfA = useRef<Group>(null);
    const halfB = useRef<Group>(null);
    const kickSpin = useRef<Group>(null);
    const tanks = useRef<Group>(null);
    const frostRef = useRef<Mesh>(null);

    useFrame(() => {
        const s = state.current;
        if (stage1.current) {
            const away = s.stage1Away;
            stage1.current.visible = showStage1 && (away === null || away < 4000);
            // The spent stage tumbles slowly about its centre of mass (about 13 m up the empty stage).
            const th = away === null ? 0 : s.stage1Tumble;
            const cg = 13;
            stage1.current.rotation.z = th;
            stage1.current.position.set(cg * Math.sin(th), cg - cg * Math.cos(th) - (away ?? 0), 0);
        }
        const hinge = Math.min(1, s.fairingOpen) * (Math.PI / 2.4);
        const drift = s.fairingAway;
        if (halfA.current && halfB.current) {
            const vis = showFairing && (s.fairingAttached || drift < 3000);
            halfA.current.visible = halfB.current.visible = vis;
            halfA.current.rotation.z = -hinge;
            halfB.current.rotation.z = hinge;
            halfA.current.position.set(STACK.rFairing + drift * 0.35, STACK.adapterTop - drift, 0);
            halfB.current.position.set(-STACK.rFairing - drift * 0.35, STACK.adapterTop - drift, 0);
        }
        if (upperGroup.current) upperGroup.current.position.y = s.upperAway === null ? 0 : -s.upperAway;
        if (kickSpin.current) kickSpin.current.rotation.y = s.spin;
        if (tanks.current) tanks.current.visible = s.xray === 'tanks';
        frost.opacity = s.frost;
        if (frostRef.current) frostRef.current.visible = s.frost > 0.01 && s.xray !== 'tanks';
    });

    return (
        <group>
            {/* ── First stage and interstage ── */}
            <group ref={stage1}>
                <group position={[0, -2.6, 0]}>
                    <EngineGlow power={() => state.current.firing1 * (0.75 + 0.25 * state.current.pressure)} size={() => 9 + 16 * state.current.pressure} />
                </group>
                <Tube r={1.98} top={STACK.r1} h={3.2} y={0} mat={aft} />
                <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} material={aft}>
                    <circleGeometry args={[1.98, 48]} />
                </mesh>
                <Tube r={STACK.r1} h={9.8} y={3.2} mat={paint} />
                <Tube r={STACK.r1} h={2} y={13} mat={intertank} />
                <Tube r={STACK.r1} h={16} y={15} mat={paint} />
                <Tube r={STACK.r1} h={1.5} y={31} mat={paint} />
                <Tube r={STACK.r1} h={STACK.interstageTop - STACK.stage1Top} y={STACK.stage1Top} mat={carbon} />
                {/* Cable raceway and a pressurisation line along the stage */}
                <mesh position={[0, 17, STACK.r1 + 0.05]} material={raceway} castShadow>
                    <boxGeometry args={[0.28, 28, 0.14]} />
                </mesh>
                <mesh position={[0.55, 22, STACK.r1 + 0.02]} material={seam} castShadow>
                    <cylinderGeometry args={[0.05, 0.05, 16, 8]} />
                </mesh>
                {/* Umbilical plates on the tower side */}
                {[2.6, 31.7, 34.6].map((y) => (
                    <mesh key={y} position={[-STACK.r1 - 0.03, y, 0]} material={aft} castShadow>
                        <boxGeometry args={[0.1, 0.8, 0.7]} />
                    </mesh>
                ))}
                {/* Frost on the liquid-oxygen tank while it is cold-soaked on the pad; it sheds after liftoff */}
                <mesh ref={frostRef} position={[0, 23, 0]} material={frost} renderOrder={3}>
                    <cylinderGeometry args={[STACK.r1 + 0.012, STACK.r1 + 0.012, 15.6, 48, 1, true]} />
                </mesh>
                <VentVapour state={state} />
                {/* Intertank stiffener rings */}
                {[13.3, 13.7, 14.1, 14.5].map((y) => (
                    <Tube key={y} r={STACK.r1 + 0.03} h={0.08} y={y} mat={aft} />
                ))}
                {/* Tank cutaway (shown with the Propellant Tanks label) */}
                <group ref={tanks} visible={false}>
                    <Tube r={1.82} h={9.2} y={3.5} mat={tankFuel} />
                    <Tube r={1.82} h={15.4} y={15.3} mat={tankLox} />
                    <mesh position={[0, 3.5, 0]} material={tankFuel}>
                        <sphereGeometry args={[1.82, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                    </mesh>
                    <mesh position={[0, 30.7, 0]} material={tankLox}>
                        <sphereGeometry args={[1.82, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    </mesh>
                </group>
                {/* Two main engines */}
                {[-0.86, 0.86].map((x) => (
                    <group key={x} position={[x, 0.2, 0]}>
                        <mesh position={[0, 0.25, 0]} material={aft}>
                            <cylinderGeometry args={[0.32, 0.3, 0.7, 24]} />
                        </mesh>
                        <mesh geometry={bell1} material={nozzle1} castShadow />
                        <mesh geometry={bell1} material={soot} scale={[0.985, 1, 0.985]} />
                        <group position={[0, -2.25, 0]}>
                            <Plume
                                power={() => state.current.firing1 * (0.9 - 0.45 * (1 - state.current.pressure))}
                                length={() => 24 + 40 * (1 - state.current.pressure) ** 1.5}
                                radius={() => 0.75 + 7.5 * (1 - state.current.pressure) ** 2.2}
                                core="#fff1c9"
                                edge="#f07a28"
                                diamonds={0.5}
                            />
                            <Plume
                                power={() => state.current.firing1 * 0.9}
                                length={() => 9 + 10 * (1 - state.current.pressure)}
                                radius={() => 0.55 + 1.6 * (1 - state.current.pressure) ** 2}
                                core="#fff8e6"
                                edge="#ffb347"
                                diamonds={0.8}
                                additive
                            />
                        </group>
                    </group>
                ))}
            </group>

            {/* ── Upper stage, adapter and payload (moves back only when the kick stage separates) ── */}
            <group ref={upperGroup}>
                <Tube r={STACK.rUpper} h={STACK.upperTop - STACK.interstageTop} y={STACK.interstageTop} mat={paintUpper} />
                {[38, 41.5, 45].map((y) => (
                    <Tube key={y} r={STACK.rUpper + 0.025} h={0.1} y={y} mat={raceway} />
                ))}
                <mesh position={[0, STACK.interstageTop, 0]} rotation={[Math.PI / 2, 0, 0]} material={paintUpper}>
                    <circleGeometry args={[STACK.rUpper, 40]} />
                </mesh>
                {[-0.7, 0.7].map((x) => (
                    <group key={x} position={[x, STACK.interstageTop, 0]}>
                        <mesh geometry={bell2} material={nozzle2} />
                        <mesh geometry={bell2} material={soot} scale={[0.985, 1, 0.985]} />
                        <group position={[0, -2.2, 0]}>
                            {/* Hydrogen-oxygen exhaust in vacuum is almost invisible: a faint blue cone. */}
                            <Plume power={() => (state.current.firing2 ? 0.09 : 0)} length={() => 16} radius={() => 2.4} core="#e4ecff" edge="#6d86d8" additive />
                            <Plume power={() => (state.current.firing2 ? 0.8 : 0)} length={() => 5} radius={() => 0.7} core="#ffffff" edge="#b9c8ff" additive />
                        </group>
                    </group>
                ))}
                <group position={[0, STACK.interstageTop - 2.4, 0]}>
                    <EngineGlow power={() => (state.current.firing2 ? 0.5 : 0)} size={() => 3.2} color="#cfdcff" />
                </group>
                {/* Conical adapter to the fairing diameter, and the fairing separation ring */}
                <Tube r={STACK.rUpper} top={STACK.rFairing} h={STACK.adapterTop - STACK.upperTop} y={STACK.upperTop} mat={paintUpper} />
                <Tube r={STACK.rFairing + 0.02} h={0.16} y={STACK.adapterTop - 0.08} mat={seam} />
            </group>

            {/* ── Payload: adapter cone, spinning kick stage, spacecraft ── */}
            <group>
                <Tube r={0.95} top={0.62} h={0.5} y={STACK.adapterTop} mat={aft} />
                <group ref={kickSpin}>
                    <KickStage state={state} />
                    {children ?? <SpacecraftModel state={state} position={[0, STACK.spacecraftBase, 0]} />}
                </group>
            </group>

            {/* ── Fairing halves (hinge at the base, outer edge) ── */}
            <group ref={halfA}>
                <group position={[-STACK.rFairing, 0, 0]}>
                    <mesh position={[0, (STACK.fairingCylTop - STACK.adapterTop) / 2, 0]} material={fairingPaint} castShadow>
                        <cylinderGeometry args={[STACK.rFairing, STACK.rFairing, STACK.fairingCylTop - STACK.adapterTop, 48, 1, true, 0, Math.PI]} />
                    </mesh>
                    <mesh position={[0, STACK.fairingCylTop - STACK.adapterTop, 0]} geometry={noseA} material={fairingPaint} castShadow />
                    {[-1, 1].map((z) => (
                        <mesh key={z} position={[0, (STACK.fairingCylTop - STACK.adapterTop) / 2, z * (STACK.rFairing + 0.005)]} material={seam}>
                            <boxGeometry args={[0.05, STACK.fairingCylTop - STACK.adapterTop, 0.03]} />
                        </mesh>
                    ))}
                </group>
            </group>
            <group ref={halfB}>
                <group position={[STACK.rFairing, 0, 0]}>
                    <mesh position={[0, (STACK.fairingCylTop - STACK.adapterTop) / 2, 0]} material={fairingPaint} castShadow>
                        <cylinderGeometry args={[STACK.rFairing, STACK.rFairing, STACK.fairingCylTop - STACK.adapterTop, 48, 1, true, Math.PI, Math.PI]} />
                    </mesh>
                    <mesh position={[0, STACK.fairingCylTop - STACK.adapterTop, 0]} geometry={noseB} material={fairingPaint} castShadow />
                    {[-1, 1].map((z) => (
                        <mesh key={z} position={[0, (STACK.fairingCylTop - STACK.adapterTop) / 2, z * (STACK.rFairing + 0.005)]} material={seam}>
                            <boxGeometry args={[0.05, STACK.fairingCylTop - STACK.adapterTop, 0.03]} />
                        </mesh>
                    ))}
                </group>
            </group>
        </group>
    );
}

/**
 * Liquid-oxygen boil-off venting on the pad: white vapour puffs from vents at the top of the oxygen tank
 * and the intertank, drifting down the side in the breeze. Driven by the story clock so it keeps moving
 * while the countdown is held; it stops at engine ignition (state.frost below 1).
 */
function VentVapour({ state }: { state: MutableRefObject<VehicleState> }) {
    const count = 40;
    const ref = useRef<InstancedMesh>(null);
    const texture = useMemo(() => {
        if (typeof document === 'undefined') return null;
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const g = c.getContext('2d')!;
        const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255,255,255,0.8)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 64);
        const t = new CanvasTexture(c);
        t.colorSpace = SRGBColorSpace;
        return t;
    }, []);
    const material = useMemo(() => new MeshStandardMaterial({ color: '#f4f6f8', map: texture ?? undefined, transparent: true, depthWrite: false, roughness: 1, opacity: 0.55 }), [texture]);
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
            const life = 3.2;
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

/** The solid kick stage: a spherical motor case with a short nozzle, on its spin table. */
export function KickStage({ state }: { state: MutableRefObject<VehicleState> }) {
    const caseMat = useMaterial({ color: '#2f3238', roughness: 0.45, metalness: 0.5 });
    const nozzle = useMaterial({ color: '#56504a', roughness: 0.4, metalness: 0.8, side: DoubleSide });
    useHighlight(state, [caseMat, nozzle], 'kick');
    const bell = useMemo(() => bellGeometry(0.1, 0.36, 0.7), []);
    useEffect(() => () => bell.dispose(), [bell]);
    const y = STACK.kickBase;
    return (
        <group>
            <mesh position={[0, y + 1.0, 0]} material={caseMat} castShadow>
                <sphereGeometry args={[0.62, 40, 28]} />
            </mesh>
            <mesh position={[0, y + 1.0, 0]} material={caseMat}>
                <cylinderGeometry args={[0.62, 0.62, 0.5, 40]} />
            </mesh>
            <group position={[0, y + 0.42, 0]}>
                <group position={[0, -0.75, 0]}>
                    <EngineGlow power={() => (state.current.firingKick ? 0.8 : 0)} size={() => 3.6} />
                </group>
                <mesh geometry={bell} material={nozzle} />
                <group position={[0, -0.7, 0]}>
                    {/* A solid motor in vacuum: a bright core and a broad, faint, rapidly expanding glow */}
                    <Plume power={() => (state.current.firingKick ? 0.16 : 0)} length={() => 9} radius={() => 2.6} core="#fff7e8" edge="#ffc27a" additive />
                    <Plume power={() => (state.current.firingKick ? 0.9 : 0)} length={() => 6} radius={() => 0.6} core="#ffffff" edge="#ffd38a" additive />
                </group>
            </group>
            <mesh position={[0, y + 1.75, 0]} material={caseMat}>
                <cylinderGeometry args={[0.7, 0.5, 0.3, 32]} />
            </mesh>
        </group>
    );
}
