"use client";
// Reference Spacecraft RSC-1 in 3D: a decagonal bus in gold multi-layer insulation under a 3.7 m
// high-gain antenna; two finned radioisotope thermoelectric generators on a hinged boom; a
// telescoping magnetometer boom; a science boom with a scan platform; thruster clusters. Booms deploy
// from lib/solar-system/spacecraft.ts (boomsAt). Origin: centre of the bus base; +Y towards the dish.
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { CatmullRomCurve3, Color, DoubleSide, LatheGeometry, MeshStandardMaterial, Vector2, Vector3, type Group } from 'three';
import { EnergyFlow } from '@/components/space-twin/primitives';
import type { Focus } from '@/lib/solar-system/mission';
import type { VehicleState } from './LaunchVehicle';

function useMat(params: ConstructorParameters<typeof MeshStandardMaterial>[0]) {
    const m = useMemo(() => new MeshStandardMaterial(params), []);
    useEffect(() => () => m.dispose(), [m]);
    return m;
}

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

export default function SpacecraftModel({ state, position = [0, 0, 0] }: { state: MutableRefObject<VehicleState>; position?: [number, number, number] }) {
    const gold = useMat({ color: '#c9a24b', roughness: 0.42, metalness: 0.8 });
    const black = useMat({ color: '#15171b', roughness: 0.6, metalness: 0.3 });
    const white = useMat({ color: '#eceef0', roughness: 0.45, metalness: 0.1, side: DoubleSide });
    const truss = useMat({ color: '#9aa1ab', roughness: 0.35, metalness: 0.85 });
    const rtg = useMat({ color: '#3b3d42', roughness: 0.5, metalness: 0.7 });
    const computer = useMat({ color: '#18432f', roughness: 0.6, metalness: 0.2 });
    const thruster = useMat({ color: '#6b6f77', roughness: 0.4, metalness: 0.9 });

    useGlow(state, [white], ['spacecraft']);
    useGlow(state, [white], ['antenna']);
    useGlow(state, [rtg], ['rtg', 'eps']);
    useGlow(state, [computer], ['computer', 'eps']);
    useGlow(state, [thruster], ['thrusters']);
    useGlow(state, [truss], ['booms']);

    // High-gain antenna: a shallow paraboloid, 3.7 m across.
    const dish = useMemo(() => {
        const pts: Vector2[] = [];
        for (let i = 0; i <= 20; i++) {
            const r = (i / 20) * 1.85;
            pts.push(new Vector2(r, (r * r) / (4 * 1.6)));
        }
        return new LatheGeometry(pts, 64);
    }, []);
    useEffect(() => () => dish.dispose(), [dish]);

    const rtgBoom = useRef<Group>(null);
    const magBoom = useRef<Group>(null);
    const sciBoom = useRef<Group>(null);
    const busShell = useRef<Group>(null);

    useFrame(() => {
        const b = state.current.booms;
        // The RTG boom stows folded down along the bus (−Y) and swings out to −X; the science boom stows
        // upright beside the dish and folds out to +Z; the magnetometer mast telescopes out along +X.
        if (rtgBoom.current) rtgBoom.current.rotation.z = Math.PI - (Math.PI / 2) * b.rtgBoom;
        if (sciBoom.current) sciBoom.current.rotation.x = (-Math.PI / 2) * b.scienceBoom;
        if (magBoom.current) magBoom.current.scale.x = 0.07 + 0.93 * b.magnetometerBoom;
        if (busShell.current) busShell.current.visible = state.current.focus !== 'computer' && state.current.focus !== 'eps';
    });

    // Power paths: RTGs → boom → regulator (in the bus) → loads, drawn when the EPS is in focus.
    const routes = useMemo(() => [[new CatmullRomCurve3([new Vector3(-3.2, 0.55, 0), new Vector3(-1.4, 0.55, 0), new Vector3(-0.5, 0.75, 0), new Vector3(0, 0.8, 0)])], [new CatmullRomCurve3([new Vector3(0, 0.8, 0), new Vector3(0.4, 1.1, 0.3), new Vector3(0.55, 1.4, 0)])], [new CatmullRomCurve3([new Vector3(0, 0.8, 0), new Vector3(-0.2, 0.5, -0.45), new Vector3(0.1, 0.3, -0.55)])]], []);
    const flow = useRef<Group>(null);
    useFrame(() => {
        if (flow.current) flow.current.visible = state.current.focus === 'eps';
    });

    return (
        <group position={position}>
            {/* Bus: decagonal, gold insulation; translucent when the computers or power system are shown */}
            <group ref={busShell}>
                <mesh position={[0, BUS_H / 2, 0]} material={gold} castShadow>
                    <cylinderGeometry args={[BUS_R, BUS_R, BUS_H, 10]} />
                </mesh>
                <mesh position={[0, BUS_H / 2, 0]} material={black}>
                    <cylinderGeometry args={[BUS_R * 0.98, BUS_R * 0.98, BUS_H * 0.98, 10, 1, true]} />
                </mesh>
            </group>
            {/* Bus frame, always visible (the outline of the open bus in the cutaway views) */}
            <mesh position={[0, BUS_H / 2, 0]} material={truss}>
                <cylinderGeometry args={[BUS_R * 1.01, BUS_R * 1.01, 0.04, 10, 1, true]} />
            </mesh>
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={black}>
                <circleGeometry args={[BUS_R, 10]} />
            </mesh>
            {/* Inside the bus: flight computers, power regulator and battery */}
            <mesh position={[0.25, 1.1, 0.2]} material={computer}>
                <boxGeometry args={[0.5, 0.35, 0.4]} />
            </mesh>
            <mesh position={[-0.3, 0.6, -0.25]} material={computer}>
                <boxGeometry args={[0.45, 0.3, 0.35]} />
            </mesh>
            <mesh position={[0.1, 0.3, -0.5]} material={rtg}>
                <boxGeometry args={[0.4, 0.25, 0.25]} />
            </mesh>
            {/* High-gain antenna with its feed and low-gain antenna */}
            <mesh position={[0, BUS_H + 0.15, 0]} geometry={dish} material={white} castShadow />
            {[0, 1, 2].map((i) => {
                const a = (i / 3) * Math.PI * 2;
                return (
                    <mesh key={i} position={[Math.cos(a) * 0.6, BUS_H + 0.75, Math.sin(a) * 0.6]} rotation={[Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55]} material={truss}>
                        <cylinderGeometry args={[0.015, 0.015, 1.3, 6]} />
                    </mesh>
                );
            })}
            <mesh position={[0, BUS_H + 1.35, 0]} material={white}>
                <cylinderGeometry args={[0.12, 0.08, 0.3, 16]} />
            </mesh>
            {/* Thruster clusters at four corners of the bus base */}
            {[0, 1, 2, 3].map((i) => {
                const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
                return (
                    <group key={i} position={[Math.cos(a) * 0.82, 0.12, Math.sin(a) * 0.82]}>
                        <mesh material={thruster}>
                            <boxGeometry args={[0.16, 0.1, 0.16]} />
                        </mesh>
                        <mesh position={[0, -0.08, 0]} material={thruster}>
                            <coneGeometry args={[0.035, 0.08, 10, 1, true]} />
                        </mesh>
                    </group>
                );
            })}
            {/* RTG boom: hinged at the −X side; two finned generators */}
            <group position={[-BUS_R - 0.12, 1.25, 0]}>
                <group ref={rtgBoom}>
                    <mesh position={[0, 1.4, 0]} material={truss}>
                        <cylinderGeometry args={[0.04, 0.04, 2.8, 8]} />
                    </mesh>
                    {[1.25, 2.45].map((y) => (
                        <group key={y} position={[0, y, 0]}>
                            <mesh material={rtg} castShadow>
                                <cylinderGeometry args={[0.2, 0.2, 1.0, 20]} />
                            </mesh>
                            {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
                                <mesh key={k} rotation={[0, (k / 8) * Math.PI, 0]} material={rtg}>
                                    <boxGeometry args={[0.62, 0.95, 0.025]} />
                                </mesh>
                            ))}
                        </group>
                    ))}
                </group>
            </group>
            {/* Magnetometer boom: a telescoping mast along +X, 7 m when deployed */}
            <group position={[BUS_R, 1.2, 0]}>
                <group ref={magBoom}>
                    <mesh position={[3.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={truss}>
                        <cylinderGeometry args={[0.035, 0.05, 7, 8]} />
                    </mesh>
                    <mesh position={[7, 0, 0]} material={white}>
                        <boxGeometry args={[0.18, 0.14, 0.14]} />
                    </mesh>
                </group>
            </group>
            {/* Science boom with the scan platform, hinged at the +Z side */}
            <group position={[0, 0.4, BUS_R]}>
                <group ref={sciBoom}>
                    <mesh position={[0, 1.1, 0]} material={truss}>
                        <boxGeometry args={[0.1, 2.2, 0.1]} />
                    </mesh>
                    <group position={[0, 2.25, 0]}>
                        <mesh material={black}>
                            <boxGeometry args={[0.45, 0.35, 0.4]} />
                        </mesh>
                        <mesh position={[0, 0, 0.26]} rotation={[Math.PI / 2, 0, 0]} material={white}>
                            <cylinderGeometry args={[0.09, 0.11, 0.2, 16]} />
                        </mesh>
                    </group>
                </group>
            </group>
            <group ref={flow}>
                <EnergyFlow routes={routes} playing count={18} size={0.075} speed={0.45} />
            </group>
        </group>
    );
}
