"use client";
// The /space-station interactive model: Station Reference Case SRC-1, a conceptual modular research
// station (1 unit = 1 m) modelled on no real station. A 100 m lattice truss carries eight
// sun-tracking solar wings in four power channels on two rotary joints, four battery groups, power
// electronics and cable trays, two radiator wings set edge-on to the Sun, a high-gain antenna and a
// two-boom robotic arm. Below it, a pressurised stack of habitat, node and laboratory modules with a
// research module, an airlock and two docking ports, one with a generic visiting vehicle.
//
// New, separate files. The shared space environment, lighting, materials, camera rig and labels of
// the Space Digital Twin are imported read-only and used unchanged; nothing here alters them.
// Energy flows, eclipse lighting and the channel fault follow the SRC-1 simulation.
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, CatmullRomCurve3, Euler, Matrix4, Quaternion, Vector3, type Group, type InstancedMesh } from 'three';
import { Reflections, Sky } from '@/components/space-twin/environment';
import { AnomalyMarker, Anchor, ANODISED, ANODISED_LIGHT, Box, CERAMIC, COPPER, Cyl, EnergyFlow, GOLD, Mat, PartGroup, RAIL, SILVER, TITANIUM, WHITE_PAINT, type Glow, type V3 } from '@/components/space-twin/primitives';
import { earthBehind, OrbitLighting } from '@/components/space-twin/scenes/lighting';
import { viewPosition } from '@/components/space-twin/rig';
import { StoryCamera, type SceneProps } from '@/components/space-twin/scenes/shared';
import { useSpaceTextures } from '@/components/space-twin/textures';
import { fitDistance } from '@/lib/space-twin/story';
import { SRC_FAULT, SRC_FOCUS, SRC_HOME, SRC_SPAN, srcCameraAt, srcFlow, srcSampleAt, srcShadowAt, type SrcAnchorId, type SrcPartId } from '@/lib/station-twin/model';

type Textures = ReturnType<typeof useSpaceTextures>;
type Tones = Partial<Record<SrcPartId | SrcAnchorId, Glow>>;

/** β = 0°: the Sun lies close to the orbit plane, so the rotary joints alone keep the wings square to it. */
const SUN: V3 = [-18, 66, 64];
const ALPHA = -Math.atan2(SUN[1], SUN[2]);
const EARTH_RADIUS = 1600;
const EARTH_POSITION = earthBehind(SRC_HOME, 180, 3600, 36, -4);

const TRUSS_HALF = 50;
const TRUSS_H = 1.6;
const JOINT_X = 28;
const SECTION_X = 39;
const PAIR_OFFSET = 6.5;
const WING_L = 30;
const WING_W = 11;
const MODULE_Y = -6.6;
const R_MOD = 2.2;

/** Channel numbering: 1 port outboard, 2 port inboard, 3 starboard inboard, 4 starboard outboard. */
const CHANNEL_X = [-(SECTION_X + PAIR_OFFSET), -(SECTION_X - PAIR_OFFSET), SECTION_X - PAIR_OFFSET, SECTION_X + PAIR_OFFSET];

/** A point on a wing (local x offset, distance along the wing) in station coordinates. */
function onWing(x: number, along: number) {
    return new Vector3(x, along * Math.cos(ALPHA), along * Math.sin(ALPHA));
}

/** A straight rod between two points (an arm boom, a strut). */
function Rod({ from, to, r, ...mat }: { from: V3; to: V3; r: number } & Parameters<typeof Mat>[0]) {
    const { position, quaternion, length } = useMemo(() => {
        const a = new Vector3(...from);
        const b = new Vector3(...to);
        const d = b.clone().sub(a);
        return {
            position: a.clone().add(b).multiplyScalar(0.5),
            quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.clone().normalize()),
            length: d.length(),
        };
    }, [from, to]);
    return (
        <mesh position={position} quaternion={quaternion} castShadow receiveShadow>
            <cylinderGeometry args={[r, r, length, 20]} />
            <Mat {...mat} />
        </mesh>
    );
}

/** The integrated truss: four longerons, square frames every bay and X-bracing on every face, as one instanced mesh. */
function Truss() {
    const ref = useRef<InstancedMesh>(null);
    const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
    const bars = useMemo(() => {
        const list: { at: V3; size: V3; rot?: V3 }[] = [];
        const h = TRUSS_H;
        for (const [y, z] of [[-h, -h], [-h, h], [h, -h], [h, h]] as const) list.push({ at: [0, y, z], size: [TRUSS_HALF * 2, 0.24, 0.24] });
        const bay = 5;
        for (let x = -TRUSS_HALF; x <= TRUSS_HALF + 0.01; x += bay) {
            list.push({ at: [x, -h, 0], size: [0.2, 0.2, h * 2] }, { at: [x, h, 0], size: [0.2, 0.2, h * 2] });
            list.push({ at: [x, 0, -h], size: [0.2, h * 2, 0.2] }, { at: [x, 0, h], size: [0.2, h * 2, 0.2] });
            if (x + bay > TRUSS_HALF + 0.01) continue;
            const d = Math.hypot(bay, h * 2);
            const a = Math.atan2(h * 2, bay);
            for (const s of [1, -1]) {
                list.push({ at: [x + bay / 2, 0, h], size: [d, 0.11, 0.11], rot: [0, 0, s * a] });
                list.push({ at: [x + bay / 2, 0, -h], size: [d, 0.11, 0.11], rot: [0, 0, s * a] });
                list.push({ at: [x + bay / 2, h, 0], size: [d, 0.11, 0.11], rot: [0, s * a, 0] });
                list.push({ at: [x + bay / 2, -h, 0], size: [d, 0.11, 0.11], rot: [0, s * a, 0] });
            }
        }
        return list;
    }, []);
    useEffect(() => {
        const m = new Matrix4();
        const q = new Quaternion();
        bars.forEach((b, i) => {
            q.setFromEuler(new Euler(...(b.rot ?? [0, 0, 0])));
            m.compose(new Vector3(...b.at), q, new Vector3(...b.size));
            ref.current?.setMatrixAt(i, m);
        });
        if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    }, [bars]);
    useEffect(() => () => geometry.dispose(), [geometry]);
    return (
        <instancedMesh ref={ref} args={[geometry, undefined, bars.length]} castShadow receiveShadow>
            <Mat {...RAIL} />
        </instancedMesh>
    );
}

/** One wing: a deployment canister, a lattice mast between two cell blankets, a tip bar and tensioning wires. */
function Wing({ x, dir, textures }: { x: number; dir: 1 | -1; textures: Textures }) {
    const half = WING_W / 2 - 0.35;
    return (
        <group position={[x, dir * 2.4, 0]}>
            <Box size={[WING_W + 0.8, 1.1, 1.3]} {...ANODISED_LIGHT} />
            <Box size={[0.5, WING_L, 0.5]} at={[0, (dir * WING_L) / 2, 0]} {...TITANIUM} />
            <Box size={[WING_W + 0.6, 0.7, 1]} at={[0, dir * WING_L, 0]} {...ANODISED_LIGHT} />
            {[-1, 1].map((s) => (
                <group key={s} position={[s * (half / 2 + 0.5), (dir * WING_L) / 2, 0.14]}>
                    <mesh receiveShadow>
                        <planeGeometry args={[half, WING_L - 1.6]} />
                        <Mat map={textures.blanket.map} roughnessMap={textures.blanket.roughnessMap} metalness={0.45} roughness={1} envIntensity={0.7} glowScale={0.35} doubleSided />
                    </mesh>
                    <Cyl r={0.03} h={WING_L - 1.6} at={[s * (half / 2 + 0.06), 0, 0.02]} segments={6} {...SILVER} />
                </group>
            ))}
        </group>
    );
}

/** A wing pair (one up, one down) is one power channel. */
function Channel({ x, textures }: { x: number; textures: Textures }) {
    return (
        <>
            <Wing x={x} dir={1} textures={textures} />
            <Wing x={x} dir={-1} textures={textures} />
        </>
    );
}

/** A rotary joint drum on the truss, turning the outboard section and its four wings to the Sun. */
function Joint({ side }: { side: 1 | -1 }) {
    return (
        <group position={[side * JOINT_X, 0, 0]}>
            <Cyl r={2.3} h={1.8} rot={[0, 0, Math.PI / 2]} segments={36} {...ANODISED_LIGHT} />
            <Cyl r={2.45} h={0.3} at={[side * 0.95, 0, 0]} rot={[0, 0, Math.PI / 2]} segments={36} {...SILVER} />
        </group>
    );
}

/** A pressurised module along an axis: shell, end cones, berthing rings and thermal-blanket bands. */
function Module({ at, length, axis = 'z', band = '#d8dde3', r = R_MOD, children }: { at: V3; length: number; axis?: 'x' | 'z'; band?: string; r?: number; children?: ReactNode }) {
    const rot: V3 = axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2];
    return (
        <group position={at}>
            <group rotation={rot}>
                <Cyl r={r} h={length} segments={44} {...WHITE_PAINT} />
                {[-1, 1].map((s) => (
                    <group key={s}>
                        <Cyl r={r * 0.84} top={r * 0.6} h={0.8} at={[0, s * (length / 2 + 0.4), 0]} rot={s < 0 ? [Math.PI, 0, 0] : undefined} segments={36} {...WHITE_PAINT} />
                        <Cyl r={r + 0.07} h={0.24} at={[0, s * (length / 2 - 0.25), 0]} segments={44} {...SILVER} />
                    </group>
                ))}
                {[-0.3, 0, 0.3].map((k) => (
                    <Cyl key={k} r={r + 0.035} h={length * 0.12} at={[0, k * length, 0]} segments={44} color={band} metalness={0.15} roughness={0.7} />
                ))}
                {/* Handrails along the shell. */}
                {[0, Math.PI].map((a) => (
                    <Box key={a} size={[0.08, length * 0.86, 0.08]} at={[Math.cos(a) * (r + 0.18), 0, Math.sin(a) * (r + 0.18)]} {...GOLD} />
                ))}
            </group>
            {children}
        </group>
    );
}

/** A node along z with radial ports. */
function Node({ at }: { at: V3 }) {
    return (
        <group position={at}>
            <group rotation={[Math.PI / 2, 0, 0]}>
                <Cyl r={R_MOD + 0.25} h={5} segments={44} {...WHITE_PAINT} />
            </group>
            {[[1, 0], [-1, 0], [0, -1]].map(([x, y]) => (
                <Cyl key={`${x}${y}`} r={1.05} h={1.1} at={[x * (R_MOD + 0.7), y * (R_MOD + 0.7), 0]} rot={x ? [0, 0, Math.PI / 2] : undefined} segments={28} {...SILVER} />
            ))}
        </group>
    );
}

function DockingPort({ at, dir }: { at: V3; dir: 1 | -1 }) {
    return (
        <group position={at} rotation={[(dir * Math.PI) / 2, 0, 0]}>
            <Cyl r={1.25} top={1.05} h={1.6} segments={32} {...SILVER} />
            <Cyl r={1.5} h={0.32} at={[0, 0.85, 0]} segments={32} {...ANODISED_LIGHT} />
            {[0, 1, 2].map((i) => (
                <Box key={i} size={[0.3, 0.5, 0.3]} at={[Math.cos((i * 2 * Math.PI) / 3) * 1.35, 1.1, Math.sin((i * 2 * Math.PI) / 3) * 1.35]} {...GOLD} />
            ))}
        </group>
    );
}

/** A generic visiting cargo vehicle: pressurised section, service module and two array wings. */
function VisitingVehicle({ at, textures }: { at: V3; textures: Textures }) {
    return (
        <group position={at} rotation={[Math.PI / 2, 0, 0]}>
            <Cyl r={1.25} top={1} h={1} at={[0, -0.5, 0]} segments={32} {...SILVER} />
            <Cyl r={1.9} h={5.2} at={[0, -3.6, 0]} segments={40} color="#dfe3e7" metalness={0.2} roughness={0.55} />
            <Cyl r={1.95} h={2.6} at={[0, -7.5, 0]} segments={40} {...ANODISED_LIGHT} />
            <Cyl r={0.9} top={0.5} h={1} at={[0, -9.3, 0]} open segments={24} color="#30333a" metalness={0.85} roughness={0.42} doubleSided />
            {[-1, 1].map((s) => (
                <group key={s} position={[s * 5.6, -7.5, 0]}>
                    <Box size={[7, 0.1, 2.3]} color="#141821" metalness={0.5} roughness={0.5} />
                    <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[6.8, 2.1]} />
                        <Mat map={textures.wideCells.map} roughnessMap={textures.wideCells.roughnessMap} metalness={0.45} roughness={1} envIntensity={0.7} />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

/** A radiator wing: a hinge drum and a spine with panels extending aft, edge-on to the Sun. */
function RadiatorWing({ side, textures }: { side: 1 | -1; textures: Textures }) {
    return (
        <group position={[side * 15, 0, -TRUSS_H]}>
            <Cyl r={0.6} h={1.2} at={[0, 0, -0.5]} rot={[Math.PI / 2, 0, 0]} segments={20} {...ANODISED_LIGHT} />
            <Box size={[0.22, 0.22, 17.5]} at={[0, 0, -9.6]} {...RAIL} />
            {[0, 1, 2, 3].map((i) => (
                <mesh key={i} position={[0, 0, -3.3 - i * 4.25]} castShadow receiveShadow>
                    <boxGeometry args={[0.12, 7.2, 4]} />
                    <Mat map={textures.whitePanel} metalness={0.05} roughness={0.55} />
                </mesh>
            ))}
        </group>
    );
}

/** Two-boom robotic arm on a base on the truss, reaching towards the laboratory. */
function RoboticArm() {
    const base: V3 = [-12, TRUSS_H + 0.45, 1.2];
    const shoulder: V3 = [-12, TRUSS_H + 1.4, 1.2];
    const elbow: V3 = [-9.5, 8.2, 5.5];
    const wrist: V3 = [-5.5, 1.2, 9.8];
    const tool: V3 = [-5.2, -0.6, 10.2];
    return (
        <group>
            <Box size={[2.6, 0.7, 2.6]} at={base} {...ANODISED} />
            <Cyl r={0.55} h={1.2} at={shoulder} segments={20} {...WHITE_PAINT} />
            <Rod from={shoulder} to={elbow} r={0.28} {...WHITE_PAINT} />
            <Cyl r={0.5} h={1} at={elbow} rot={[0, 0, Math.PI / 2]} segments={20} {...SILVER} />
            <Rod from={elbow} to={wrist} r={0.26} {...WHITE_PAINT} />
            <Cyl r={0.42} h={0.9} at={wrist} rot={[0, 0, Math.PI / 2]} segments={20} {...SILVER} />
            <Rod from={wrist} to={tool} r={0.32} {...ANODISED_LIGHT} />
            <Cyl r={0.5} h={0.4} at={tool} segments={20} {...GOLD} />
        </group>
    );
}

function StationModel({ tones, onSelect, faultMarker, reducedMotion }: { tones: Tones; onSelect?: (id: string) => void; faultMarker: boolean; reducedMotion: boolean }) {
    const textures = useSpaceTextures();
    const arraysTip = onWing(SECTION_X, 26).toArray() as V3;
    const ch2Base = onWing(CHANNEL_X[SRC_FAULT.channel - 1], 4).toArray() as V3;
    return (
        <group>
            <PartGroup id="truss" tone={tones.truss} anchor={[-6, TRUSS_H + 2.4, -0.5]} onSelect={onSelect}>
                <Truss />
                <Joint side={1} />
                <Joint side={-1} />
            </PartGroup>

            {/* Channels 1, 3 and 4 share one part; channel 2 is its own group so its health can be shown alone. */}
            <PartGroup id="arrays" tone={tones.arrays} anchor={arraysTip} onSelect={onSelect}>
                <group rotation={[ALPHA, 0, 0]}>
                    {CHANNEL_X.filter((_, i) => i + 1 !== SRC_FAULT.channel).map((x) => (
                        <Channel key={x} x={x} textures={textures} />
                    ))}
                </group>
            </PartGroup>
            <PartGroup id="ch2" tone={tones.ch2 ?? tones.arrays} anchor={onWing(CHANNEL_X[SRC_FAULT.channel - 1], 18).toArray() as V3} onSelect={onSelect && (() => onSelect('arrays'))}>
                <group rotation={[ALPHA, 0, 0]}>
                    <Channel x={CHANNEL_X[SRC_FAULT.channel - 1]} textures={textures} />
                </group>
            </PartGroup>
            {faultMarker && <AnomalyMarker at={ch2Base} radius={2.6} reducedMotion={reducedMotion} rot={[ALPHA + Math.PI / 2, 0, 0]} />}

            <PartGroup id="batteries" tone={tones.batteries} anchor={[-23, -TRUSS_H - 2.6, 1]} onSelect={onSelect}>
                {[-25, -21, 21, 25].flatMap((x) =>
                    [-1.15, 0, 1.15].map((z) => <Box key={`${x}${z}`} size={[3.2, 1.3, 1]} at={[x, -TRUSS_H - 0.75, z]} color="#3a3f49" metalness={0.72} roughness={0.42} />),
                )}
            </PartGroup>

            <PartGroup id="distribution" tone={tones.distribution} anchor={[0, -TRUSS_H - 2.2, -1.6]} onSelect={onSelect}>
                {[-8, -4, 4, 8].map((x) => (
                    <Box key={x} size={[2.4, 1.4, 1.8]} at={[x, -TRUSS_H - 0.8, -0.9]} {...ANODISED_LIGHT} />
                ))}
                {/* Cable trays along the truss, from the joints to the power electronics. */}
                {[-1, 1].map((s) => (
                    <Box key={s} size={[JOINT_X - 2, 0.18, 0.5]} at={[(s * (JOINT_X + 2)) / 2, -TRUSS_H - 0.12, 1.8]} {...COPPER} />
                ))}
            </PartGroup>

            <PartGroup id="radiators" tone={tones.radiators} anchor={[15, 5, -12]} onSelect={onSelect}>
                <RadiatorWing side={1} textures={textures} />
                <RadiatorWing side={-1} textures={textures} />
            </PartGroup>

            <PartGroup id="comms" tone={tones.comms} anchor={[9, 8.6, -1.5]} onSelect={onSelect}>
                <group position={[9, TRUSS_H, -1.5]}>
                    <Cyl r={0.2} h={4} at={[0, 2, 0]} {...RAIL} />
                    <group position={[0, 4.3, 0]} rotation={[-0.75, 0.5, 0]}>
                        <mesh castShadow>
                            <sphereGeometry args={[2.6, 36, 10, 0, Math.PI * 2, 0, 0.52]} />
                            <Mat color="#e9ecef" metalness={0.25} roughness={0.5} doubleSided />
                        </mesh>
                        <Cyl r={0.14} top={0.24} h={0.8} at={[0, 1.9, 0]} {...GOLD} />
                    </group>
                </group>
                {[-20, 20].map((x) => (
                    <Cyl key={x} r={0.12} h={2.4} at={[x, TRUSS_H + 1.2, 1.4]} segments={10} {...SILVER} />
                ))}
            </PartGroup>

            <PartGroup id="robotics" tone={tones.robotics} anchor={[-9.5, 9.6, 5.5]} onSelect={onSelect}>
                <RoboticArm />
            </PartGroup>

            {/* Pylon from the truss down to the pressurised stack. */}
            <Box size={[2.4, 3.8, 2.4]} at={[0, -TRUSS_H - 1.9, 0]} {...ANODISED} />
            <PartGroup id="modules" tone={tones.modules} anchor={[0, MODULE_Y + 3.4, -10]} onSelect={onSelect}>
                <Node at={[0, MODULE_Y, 0]} />
                <Module at={[0, MODULE_Y, 8.6]} length={12} band="#c9a86a" />
                <Node at={[0, MODULE_Y, 17.2]} />
                <Module at={[0, MODULE_Y, -8.6]} length={12} />
                <Module at={[-4.6, MODULE_Y, 0]} length={3.4} axis="x" r={1.35} />
                <Module at={[7.6, MODULE_Y, 17.2]} length={8} axis="x" band="#c9a86a" r={1.9}>
                    <Anchor id="research" at={[3, 2.6, 0]} />
                </Module>
                {/* Exposed experiment platform on the laboratory. */}
                <group position={[R_MOD + 0.9, MODULE_Y - 0.6, 9]}>
                    <Box size={[0.25, 2.4, 4]} {...ANODISED_LIGHT} />
                    <Box size={[1, 1, 1.2]} at={[0.6, 0.3, -1]} {...CERAMIC} />
                    <Box size={[0.9, 1.2, 1]} at={[0.55, -0.2, 1.1]} {...GOLD} />
                </group>
            </PartGroup>

            <PartGroup id="docking" tone={tones.docking} anchor={[0, MODULE_Y + 3.4, 25]} onSelect={onSelect}>
                <DockingPort at={[0, MODULE_Y, 20.3]} dir={1} />
                <VisitingVehicle at={[0, MODULE_Y, 21.5]} textures={textures} />
                <DockingPort at={[0, MODULE_Y, -15.3]} dir={-1} />
            </PartGroup>
        </group>
    );
}

// ── Energy flows, from the simulation ───────────────────────────────────────

const batteryAt = (side: number) => new Vector3(side * 23, -TRUSS_H - 0.8, 0.5);

function chargeRoute(channelX: number, dir: 1 | -1) {
    const side = Math.sign(channelX);
    const tip = onWing(channelX, dir * 24);
    const mid = onWing(channelX, dir * 6);
    return [new CatmullRomCurve3([tip, mid, new Vector3(side * JOINT_X, 0, 0), batteryAt(side)])];
}

const CHARGE_ROUTES = CHANNEL_X.filter((_, i) => i + 1 !== SRC_FAULT.channel).flatMap((x) => [chargeRoute(x, 1), chargeRoute(x, -1)]);
const CH2_ROUTES = [chargeRoute(CHANNEL_X[SRC_FAULT.channel - 1], 1), chargeRoute(CHANNEL_X[SRC_FAULT.channel - 1], -1)];

const DISCHARGE_ROUTES = [1, -1].flatMap((side) => [
    [new CatmullRomCurve3([batteryAt(side), new Vector3(side * 10, -TRUSS_H - 0.2, 1.4), new Vector3(0, -TRUSS_H - 0.2, 1.4), new Vector3(0, MODULE_Y + 2.5, 2), new Vector3(0, MODULE_Y + 2.4, 12)])],
    [new CatmullRomCurve3([batteryAt(side), new Vector3(side * 10, -TRUSS_H - 0.2, 1.4), new Vector3(0, -TRUSS_H - 0.2, 1.4), new Vector3(0, MODULE_Y + 2.5, -2), new Vector3(0, MODULE_Y + 2.4, -11)])],
]);

function Flow({ clock, playing, selected, phase }: Pick<SceneProps, 'clock' | 'playing' | 'selected' | 'phase'>) {
    const charge = useRef<Group>(null);
    const ch2 = useRef<Group>(null);
    const discharge = useRef<Group>(null);
    useFrame(() => {
        const quiet = selected || phase === 'reveal' || phase.startsWith('explore');
        const flow = quiet ? null : srcFlow(clock.time);
        const faulted = srcSampleAt(clock.time).faultActive;
        if (charge.current) charge.current.visible = flow === 'charge';
        if (ch2.current) ch2.current.visible = flow === 'charge' && !faulted;
        if (discharge.current) discharge.current.visible = flow === 'discharge';
    });
    return (
        <>
            <group ref={charge} visible={false}>
                <EnergyFlow routes={CHARGE_ROUTES} playing={playing} count={24} size={0.55} speed={0.3} />
            </group>
            <group ref={ch2} visible={false}>
                <EnergyFlow routes={CH2_ROUTES} playing={playing} count={8} size={0.55} speed={0.3} />
            </group>
            <group ref={discharge} visible={false}>
                <EnergyFlow routes={DISCHARGE_ROUTES} playing={playing} count={16} size={0.5} speed={0.32} />
            </group>
        </>
    );
}

/**
 * The homepage hero: the same station, nominal only (no fault), passing between sunlight and
 * eclipse as the SRC-1 model says, with a slow cinematic camera and no controls.
 */
export function StationHeroScene({ clock, playing, shadows }: { clock: SceneProps['clock']; playing: boolean; shadows: boolean }) {
    const time = useRef(0);
    const target = useMemo(() => new Vector3(0, -2.5, 0), []);
    useFrame((state, delta) => {
        if (playing) time.current += Math.min(delta, 0.05);
        const t = time.current;
        const view = { az: 40 + 24 * Math.sin((2 * Math.PI * t) / 46), el: 16 + 7 * Math.sin((2 * Math.PI * t) / 31 + 1), dist: 1.1, target: [target.x, target.y, target.z] as const };
        state.camera.position.copy(viewPosition(view, fitDistance(state.size.width / Math.max(1, state.size.height), SRC_SPAN)));
        state.camera.lookAt(target);
    });
    return (
        <>
            <Sky />
            <Reflections sun={SUN} />
            <OrbitLighting clock={clock} shadowAt={srcShadowAt} sun={SUN} earth={EARTH_POSITION} earthRadius={EARTH_RADIUS} shadows={shadows} shadowBox={[80, 400]} playing={playing} />
            <group>
                <pointLight position={[0, MODULE_Y - 4, 6]} intensity={300} distance={40} decay={2} color="#dbeafe" />
                <StationModel tones={{}} faultMarker={false} reducedMotion={!playing} />
                <Flow clock={clock} playing={playing} selected={null} phase="health" />
            </group>
        </>
    );
}

export default function StationScene({ clock, phase, playing, reducedMotion, selected, onSelect, tones, viewRef, shadows }: SceneProps) {
    const viewAt = useMemo(() => {
        const focus = selected ? SRC_FOCUS[selected as SrcPartId] : null;
        return (t: number) => focus ?? (t < 0 ? SRC_HOME : srcCameraAt(t));
    }, [selected]);
    const faultMarker = phase === 'fault' || phase === 'detected' || phase === 'protected';
    return (
        <>
            <Sky />
            <Reflections sun={SUN} />
            <OrbitLighting clock={clock} shadowAt={srcShadowAt} sun={SUN} earth={EARTH_POSITION} earthRadius={EARTH_RADIUS} shadows={shadows} shadowBox={[80, 400]} playing={playing} />
            <StoryCamera clock={clock} viewAt={viewAt} home={SRC_HOME} span={SRC_SPAN} reducedMotion={reducedMotion} viewRef={viewRef} />
            <group>
                <pointLight position={[0, MODULE_Y - 4, 6]} intensity={300} distance={40} decay={2} color="#dbeafe" />
                <StationModel tones={tones as Tones} onSelect={onSelect} faultMarker={faultMarker} reducedMotion={reducedMotion} />
                <Flow clock={clock} playing={playing} selected={selected} phase={phase} />
            </group>
        </>
    );
}
