'use client';
// Reference Spacecraft RSC-1 in 3D (720 kg, radioisotope-powered outer-planet flyby spacecraft):
// - a decagonal bus wrapped in multi-layer insulation (gold and black Kapton), with radiator louvres,
//   star trackers, Sun sensors, four hydrazine thruster clusters and, inside, the flight computers,
//   the power regulator and battery, and the hydrazine tank;
// - a 3.7 m high-gain antenna (ribbed paraboloid) with its tripod-mounted subreflector, feed and the
//   low-gain antenna;
// - two finned radioisotope thermoelectric generators on a hinged boom;
// - a coilable lattice magnetometer boom (7 m deployed) with the sensor at its tip;
// - a science boom with the scan platform (camera and spectrometers).
// No solar arrays: at Jupiter sunlight is about 3.7 % of its strength at Earth. Booms deploy from
// lib/solar-system/spacecraft.ts (boomsAt). Origin: centre of the bus base; +Y towards the dish.
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, CatmullRomCurve3, Color, DoubleSide, LatheGeometry, MeshBasicMaterial, MeshStandardMaterial, Vector2, Vector3, type Group, type Mesh } from 'three';
import { EnergyFlow } from '@/components/space-twin/primitives';
import type { Focus } from '@/lib/solar-system/mission';
import type { VehicleState } from './LaunchVehicle';
import { crumpledFoil, repeated, type SurfaceSet } from './textures';

function useMat(params: ConstructorParameters<typeof MeshStandardMaterial>[0], deps: unknown[] = []) {
    const m = useMemo(() => new MeshStandardMaterial(params), deps);
    useEffect(() => () => m.dispose(), [m]);
    return m;
}

function useBlanket(kind: 'gold' | 'black' | 'silver', x: number, y: number) {
    const set = useMemo<SurfaceSet | null>(() => (typeof document === 'undefined' ? null : repeated(crumpledFoil(kind), x, y)), [kind, x, y]);
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

const maps = (s: SurfaceSet | null, normal = 0.8) => (s ? { map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, normalScale: new Vector2(normal, normal) } : {});

function useGlow(state: MutableRefObject<VehicleState>, materials: MeshStandardMaterial[], parts: Focus[]) {
    const cyan = useMemo(() => new Color('#22D3EE'), []);
    useFrame(() => {
        const s = state.current;
        const on = s.focus !== undefined && parts.includes(s.focus);
        for (const m of materials) {
            m.emissive.copy(cyan);
            m.emissiveIntensity = on ? 0.06 + 0.04 * Math.sin(s.time * 3) : 0;
        }
    });
}

const BUS_R = 0.85;
const BUS_H = 1.6;
const DISH_R = 1.85;
const DISH_F = 1.6; // focal length of the paraboloid
const SIDES = 10;

/** Centre and outward direction of bus face k (of the ten). */
const face = (k: number, y: number, out = 0): [number, number, number] => {
    const a = ((k + 0.5) / SIDES) * Math.PI * 2;
    const r = BUS_R * Math.cos(Math.PI / SIDES) + out;
    return [r * Math.cos(a), y, r * Math.sin(a)];
};
const faceAngle = (k: number) => -((k + 0.5) / SIDES) * Math.PI * 2;

export default function SpacecraftModel({ state, position = [0, 0, 0] }: { state: MutableRefObject<VehicleState>; position?: [number, number, number] }) {
    const goldMli = useBlanket('gold', 2, 1);
    const blackMli = useBlanket('black', 2, 1);
    const silverMli = useBlanket('silver', 1, 1);
    // Goldised and aluminised Kapton foil: metallic, smooth facets (the roughness map carries 0.12–0.45).
    const gold = useMat({ color: '#ffffff', roughness: 1, metalness: 1, side: DoubleSide, envMapIntensity: 1.4, ...maps(goldMli, 1) }, [goldMli]);
    const black = useMat({ color: '#ffffff', roughness: 1, metalness: 0.3, ...maps(blackMli, 0.8) }, [blackMli]);
    const silver = useMat({ color: '#ffffff', roughness: 1, metalness: 1, envMapIntensity: 1.4, ...maps(silverMli, 1) }, [silverMli]);
    const dishWhite = useMat({ color: '#eef0f2', roughness: 0.55, metalness: 0.05, side: DoubleSide });
    const dishRib = useMat({ color: '#9aa0a8', roughness: 0.5, metalness: 0.4 });
    const truss = useMat({ color: '#a9b0b9', roughness: 0.32, metalness: 0.9 });
    const composite = useMat({ color: '#2a2c31', roughness: 0.6, metalness: 0.3 });
    const rtg = useMat({ color: '#2f3135', roughness: 0.62, metalness: 0.5 });
    const rtgCap = useMat({ color: '#8a9099', roughness: 0.4, metalness: 0.85 });
    const computer = useMat({ color: '#1d4a35', roughness: 0.6, metalness: 0.2 });
    const louvre = useMat({ color: '#d7dbe0', roughness: 0.18, metalness: 1 });
    const thruster = useMat({ color: '#6b6f77', roughness: 0.35, metalness: 0.9 });
    const lens = useMat({ color: '#0b1220', roughness: 0.05, metalness: 1 });
    const tank = useMat({ color: '#c3c8ce', roughness: 0.3, metalness: 0.9 });

    useGlow(state, [dishWhite, gold, black], ['spacecraft']);
    useGlow(state, [dishWhite], ['antenna']);
    useGlow(state, [rtg], ['rtg', 'eps']);
    useGlow(state, [computer], ['computer', 'eps']);
    useGlow(state, [thruster], ['thrusters']);
    useGlow(state, [truss], ['booms']);

    // High-gain antenna: a paraboloid 3.7 m across (z = r²/4f), with a rolled rim.
    const dish = useMemo(() => {
        const pts: Vector2[] = [];
        for (let i = 0; i <= 28; i++) {
            const r = (i / 28) * DISH_R;
            pts.push(new Vector2(r, (r * r) / (4 * DISH_F)));
        }
        pts.push(new Vector2(DISH_R + 0.03, (DISH_R * DISH_R) / (4 * DISH_F) - 0.04));
        return new LatheGeometry(pts, 96);
    }, []);
    useEffect(() => () => dish.dispose(), [dish]);
    const rimY = (DISH_R * DISH_R) / (4 * DISH_F);

    const rtgBoom = useRef<Group>(null);
    const magBoom = useRef<Group>(null);
    const sciBoom = useRef<Group>(null);
    const busShell = useRef<Group>(null);

    useFrame(() => {
        const b = state.current.booms;
        // Stowed for launch, everything folds within the fairing: the RTG boom hangs down along the bus
        // (−Y) and swings out to −X; the science boom hangs down on the +Z side and folds out to +Z; the
        // magnetometer mast is coiled in its canister and extends along +X.
        if (rtgBoom.current) rtgBoom.current.rotation.z = Math.PI - (Math.PI / 2) * b.rtgBoom;
        if (sciBoom.current) sciBoom.current.rotation.x = Math.PI - (Math.PI / 2) * b.scienceBoom;
        if (magBoom.current) magBoom.current.scale.x = 0.07 + 0.93 * b.magnetometerBoom;
        if (busShell.current) busShell.current.visible = state.current.focus !== 'computer' && state.current.focus !== 'eps';
    });

    // Power paths: RTGs → boom → regulator (in the bus) → loads, drawn when the EPS is in focus.
    const routes = useMemo(
        () => [
            [new CatmullRomCurve3([new Vector3(-3.2, 0.55, 0), new Vector3(-1.4, 0.55, 0), new Vector3(-0.5, 0.75, 0), new Vector3(0, 0.8, 0)])],
            [new CatmullRomCurve3([new Vector3(0, 0.8, 0), new Vector3(0.4, 1.1, 0.3), new Vector3(0.55, 1.4, 0)])],
            [new CatmullRomCurve3([new Vector3(0, 0.8, 0), new Vector3(-0.2, 0.5, -0.45), new Vector3(0.1, 0.3, -0.55)])],
        ],
        [],
    );
    const flow = useRef<Group>(null);
    useFrame(() => {
        if (flow.current) flow.current.visible = state.current.focus === 'eps';
    });

    // Magnetometer boom: a coilable lattice (three longerons and battens), 7 m long when deployed.
    const lattice = useMemo(() => {
        const L = 7;
        const out: { p: [number, number, number]; r: [number, number, number]; len: number; w: number }[] = [];
        for (let k = 0; k < 3; k++) {
            const a = (k / 3) * Math.PI * 2;
            out.push({ p: [L / 2, Math.cos(a) * 0.09, Math.sin(a) * 0.09], r: [0, 0, Math.PI / 2], len: L, w: 0.012 });
        }
        for (let i = 0; i <= 28; i++) out.push({ p: [(i / 28) * L, 0, 0], r: [0, 0, Math.PI / 2], len: 0.02, w: 0.1 });
        return out;
    }, []);

    return (
        <group position={position}>
            {/* ── Bus: decagonal, wrapped in insulation (translucent views remove the shell) ── */}
            <group ref={busShell}>
                <mesh position={[0, BUS_H / 2, 0]} material={gold} castShadow>
                    <cylinderGeometry args={[BUS_R, BUS_R, BUS_H, SIDES, 1, true]} />
                </mesh>
                {/* Black Kapton panels on alternate faces, and two radiator faces with louvres */}
                {[1, 4, 6, 9].map((k) => (
                    <mesh key={k} position={face(k, BUS_H / 2, 0.006)} rotation={[0, faceAngle(k) + Math.PI / 2, 0]} material={black}>
                        <planeGeometry args={[2 * BUS_R * Math.sin(Math.PI / SIDES) * 0.98, BUS_H * 0.96]} />
                    </mesh>
                ))}
                {[2, 7].map((k) => (
                    <group key={k} position={face(k, BUS_H / 2, 0.012)} rotation={[0, faceAngle(k) + Math.PI / 2, 0]}>
                        {Array.from({ length: 8 }, (_, i) => (
                            <mesh key={i} position={[0, -0.56 + i * 0.16, 0.01]} rotation={[-0.35, 0, 0]} material={louvre}>
                                <boxGeometry args={[0.44, 0.12, 0.008]} />
                            </mesh>
                        ))}
                    </group>
                ))}
            </group>
            {/* Top and bottom decks */}
            <mesh position={[0, BUS_H, 0]} rotation={[Math.PI / 2, 0, 0]} material={silver}>
                <circleGeometry args={[BUS_R, SIDES]} />
            </mesh>
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={black}>
                <circleGeometry args={[BUS_R, SIDES]} />
            </mesh>
            <mesh position={[0, BUS_H / 2, 0]} material={truss}>
                <cylinderGeometry args={[BUS_R * 1.012, BUS_R * 1.012, 0.035, SIDES, 1, true]} />
            </mesh>
            {/* Inside the bus: hydrazine tank, flight computers, power regulator and battery */}
            <mesh position={[0, 0.8, 0]} material={tank}>
                <sphereGeometry args={[0.36, 32, 20]} />
            </mesh>
            <mesh position={[0.42, 1.12, 0.25]} material={computer}>
                <boxGeometry args={[0.36, 0.34, 0.36]} />
            </mesh>
            <mesh position={[-0.4, 0.6, -0.28]} material={computer}>
                <boxGeometry args={[0.36, 0.3, 0.32]} />
            </mesh>
            <mesh position={[0.12, 0.3, -0.52]} material={rtg}>
                <boxGeometry args={[0.4, 0.25, 0.25]} />
            </mesh>
            {/* Star trackers (baffled) and Sun sensors on the bus side */}
            {[3, 8].map((k) => (
                <group key={k} position={face(k, 1.25, 0.12)} rotation={[0, faceAngle(k) + Math.PI / 2, 0]}>
                    <mesh rotation={[Math.PI / 2 - 0.5, 0, 0]} material={composite}>
                        <cylinderGeometry args={[0.07, 0.05, 0.26, 16]} />
                    </mesh>
                    <mesh position={[0, -0.32, 0.02]} material={silver}>
                        <boxGeometry args={[0.1, 0.08, 0.06]} />
                    </mesh>
                </group>
            ))}
            {/* Thruster clusters at four corners of the bus base, three nozzles each */}
            {[0, 1, 2, 3].map((i) => {
                const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
                return (
                    <group key={i} position={[Math.cos(a) * 0.86, 0.14, Math.sin(a) * 0.86]} rotation={[0, -a, 0]}>
                        <mesh material={thruster}>
                            <boxGeometry args={[0.18, 0.12, 0.16]} />
                        </mesh>
                        <mesh position={[0, -0.09, 0]} material={thruster}>
                            <coneGeometry args={[0.03, 0.07, 12, 1, true]} />
                        </mesh>
                        <ThrusterPulse state={state} />
                        {[-1, 1].map((s) => (
                            <mesh key={s} position={[0.1, 0, s * 0.05]} rotation={[0, 0, -Math.PI / 2]} material={thruster}>
                                <coneGeometry args={[0.025, 0.06, 12, 1, true]} />
                            </mesh>
                        ))}
                    </group>
                );
            })}

            {/* ── High-gain antenna: reflector, back ribs, tripod, subreflector, feed, low-gain antenna ── */}
            <group position={[0, BUS_H + 0.12, 0]}>
                <mesh geometry={dish} material={dishWhite} castShadow receiveShadow />
                {Array.from({ length: 12 }, (_, i) => {
                    const a = (i / 12) * Math.PI * 2;
                    const r = DISH_R * 0.5;
                    return (
                        <mesh key={i} position={[Math.cos(a) * r, (r * r) / (4 * DISH_F) - 0.05, Math.sin(a) * r]} rotation={[0, -a, Math.atan(r / (2 * DISH_F))]} material={dishRib}>
                            <boxGeometry args={[DISH_R, 0.035, 0.022]} />
                        </mesh>
                    );
                })}
                <mesh position={[0, -0.02, 0]} material={composite}>
                    <cylinderGeometry args={[0.45, 0.6, 0.12, 24]} />
                </mesh>
                {[0, 1, 2].map((i) => {
                    const a = (i / 3) * Math.PI * 2 + 0.3;
                    const base = new Vector3(Math.cos(a) * 1.3, (1.3 * 1.3) / (4 * DISH_F), Math.sin(a) * 1.3);
                    const top = new Vector3(0, DISH_F - 0.25, 0);
                    const mid = base.clone().add(top).multiplyScalar(0.5);
                    const len = base.distanceTo(top);
                    const dir = top.clone().sub(base).normalize();
                    const q = new Vector3(0, 1, 0);
                    const axis = q.clone().cross(dir).normalize();
                    const ang = Math.acos(q.dot(dir));
                    return (
                        <mesh key={i} position={mid.toArray()} quaternion={[axis.x * Math.sin(ang / 2), axis.y * Math.sin(ang / 2), axis.z * Math.sin(ang / 2), Math.cos(ang / 2)]} material={truss}>
                            <cylinderGeometry args={[0.018, 0.018, len, 8]} />
                        </mesh>
                    );
                })}
                <mesh position={[0, DISH_F - 0.22, 0]} rotation={[Math.PI, 0, 0]} material={dishWhite}>
                    <sphereGeometry args={[0.24, 32, 10, 0, Math.PI * 2, 0, Math.PI / 3.2]} />
                </mesh>
                <mesh position={[0, 0.35, 0]} material={silver}>
                    <cylinderGeometry args={[0.1, 0.16, 0.5, 20]} />
                </mesh>
                <mesh position={[0, DISH_F - 0.02, 0]} material={dishWhite}>
                    <cylinderGeometry args={[0.07, 0.07, 0.22, 16]} />
                </mesh>
                <mesh position={[0, DISH_F + 0.14, 0]} material={composite}>
                    <coneGeometry args={[0.1, 0.14, 16]} />
                </mesh>
            </group>

            {/* ── RTG boom: hinged on the −X side; two finned generators with end caps ── */}
            <group position={[-BUS_R - 0.2, 1.25, 0]}>
                <group ref={rtgBoom}>
                    {[-0.08, 0.08].map((z) => (
                        <mesh key={z} position={[0, 1.45, z]} material={truss}>
                            <cylinderGeometry args={[0.03, 0.03, 2.9, 8]} />
                        </mesh>
                    ))}
                    {[0.4, 0.95, 1.5, 2.05, 2.6].map((y) => (
                        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={truss}>
                            <cylinderGeometry args={[0.018, 0.018, 0.16, 6]} />
                        </mesh>
                    ))}
                    {[1.2, 2.4].map((y) => (
                        <group key={y} position={[0, y, 0]}>
                            {y === 2.4 && <FaultMark state={state} />}
                            <mesh material={rtg} castShadow>
                                <cylinderGeometry args={[0.2, 0.2, 1.0, 24]} />
                            </mesh>
                            {[0.52, -0.52].map((h) => (
                                <mesh key={h} position={[0, h, 0]} material={rtgCap}>
                                    <cylinderGeometry args={[0.23, 0.23, 0.05, 24]} />
                                </mesh>
                            ))}
                            {Array.from({ length: 8 }, (_, k) => (
                                <mesh key={k} rotation={[0, (k / 8) * Math.PI, 0]} material={rtg} castShadow>
                                    <boxGeometry args={[0.66, 0.94, 0.022]} />
                                </mesh>
                            ))}
                        </group>
                    ))}
                </group>
            </group>

            {/* ── Magnetometer boom: canister on the +X side, coilable lattice extending along +X ── */}
            <group position={[BUS_R, 1.0, 0]}>
                <mesh position={[0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={silver}>
                    <cylinderGeometry args={[0.13, 0.13, 0.3, 20]} />
                </mesh>
                <group ref={magBoom}>
                    {lattice.map((m, i) => (
                        <mesh key={i} position={m.p} rotation={m.r} material={truss}>
                            <cylinderGeometry args={[m.w, m.w, m.len, 6]} />
                        </mesh>
                    ))}
                    <mesh position={[7.05, 0, 0]} material={silver}>
                        <boxGeometry args={[0.16, 0.14, 0.14]} />
                    </mesh>
                </group>
            </group>

            {/* ── Science boom with the scan platform (camera and spectrometers), hinged on the +Z side ── */}
            <group position={[0, 1.4, BUS_R + 0.1]}>
                <group ref={sciBoom}>
                    <mesh position={[0, 1.1, 0]} material={truss}>
                        <boxGeometry args={[0.09, 2.2, 0.09]} />
                    </mesh>
                    <group position={[0, 2.3, 0]}>
                        <mesh material={black}>
                            <boxGeometry args={[0.46, 0.34, 0.4]} />
                        </mesh>
                        <mesh position={[0.08, 0, 0.27]} rotation={[Math.PI / 2, 0, 0]} material={composite}>
                            <cylinderGeometry args={[0.1, 0.12, 0.18, 20]} />
                        </mesh>
                        <mesh position={[0.08, 0, 0.365]} rotation={[Math.PI / 2, 0, 0]} material={lens}>
                            <circleGeometry args={[0.085, 20]} />
                        </mesh>
                        <mesh position={[-0.14, 0.03, 0.24]} material={silver}>
                            <boxGeometry args={[0.14, 0.18, 0.12]} />
                        </mesh>
                    </group>
                </group>
            </group>
            <group ref={flow}>
                <EnergyFlow routes={routes} playing count={18} size={0.075} speed={0.45} />
            </group>
            {/* Rim highlight for the dish edge (separate so it never casts the dish shadow twice) */}
            <mesh position={[0, BUS_H + 0.12 + rimY, 0]} rotation={[Math.PI / 2, 0, 0]} material={truss}>
                <torusGeometry args={[DISH_R + 0.02, 0.022, 8, 96]} />
            </mesh>
        </group>
    );
}

/** A short hydrazine-thruster pulse (rate damping after separation): a faint, fast-fading jet. */
function ThrusterPulse({ state }: { state: MutableRefObject<VehicleState> }) {
    const ref = useRef<Mesh>(null);
    const material = useMemo(() => new MeshBasicMaterial({ color: '#cfe3ff', transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }), []);
    useEffect(() => () => material.dispose(), [material]);
    useFrame(() => {
        const p = state.current.pulse ?? 0;
        material.opacity = 0.55 * p;
        if (ref.current) ref.current.visible = p > 0.02;
    });
    return (
        <mesh ref={ref} position={[0, -0.24, 0]} rotation={[Math.PI, 0, 0]} material={material}>
            <coneGeometry args={[0.07, 0.26, 12, 1, true]} />
        </mesh>
    );
}

/** Marks the failed generator in the RTG fault scenario (a warning-red shell). */
function FaultMark({ state }: { state: MutableRefObject<VehicleState> }) {
    const ref = useRef<Mesh>(null);
    const material = useMemo(() => new MeshBasicMaterial({ color: '#f87171', transparent: true, opacity: 0.35, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }), []);
    useEffect(() => () => material.dispose(), [material]);
    useFrame(() => {
        if (ref.current) ref.current.visible = !!state.current.rtgFault;
        material.opacity = 0.12 + 0.08 * Math.sin(state.current.time * 4);
    });
    return (
        <mesh ref={ref} material={material} visible={false}>
            <cylinderGeometry args={[0.42, 0.42, 1.18, 24, 1, true]} />
        </mesh>
    );
}
