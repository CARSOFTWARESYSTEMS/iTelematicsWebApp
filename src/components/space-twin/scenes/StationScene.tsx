"use client";
// Experience 04 · Space Station. A generic modular orbital station (1 unit = 1 m), not modelled
// on any real station: a 92 m lattice truss carrying eight solar-array wings on rotary joints that
// turn them to the Sun, battery units and power electronics at the joints, radiators set edge-on to
// the Sun, a high-gain antenna and an external payload platform; below it a pressurised stack of
// habitat, node and laboratory modules, a research module and two docking ports, one with a
// generic visiting vehicle. Energy flows and eclipse lighting come from the station energy model.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, CatmullRomCurve3, Euler, Matrix4, Quaternion, Vector3, type Group, type InstancedMesh } from 'three';
import { ST_FOCUS, ST_HOME, ST_SPAN, stCameraAt, stFlow, stShadowAt, type StPartId } from '@/lib/space-twin/station';
import { Reflections, Sky } from '../environment';
import { ANODISED, ANODISED_LIGHT, Box, CERAMIC, Cyl, EnergyFlow, GOLD, Mat, PartGroup, RAIL, SILVER, WHITE_PAINT, type Glow, type V3 } from '../primitives';
import { useSpaceTextures } from '../textures';
import { earthBehind, OrbitLighting } from './lighting';
import { StoryCamera, type SceneProps } from './shared';

/** β = 0°: the Sun lies in the orbit plane, so the rotary joints alone keep the arrays square to it. */
const SUN: V3 = [-14, 70, 62];
const ALPHA = -Math.atan2(SUN[1], SUN[2]);
const EARTH_RADIUS = 1600;
const EARTH_POSITION = earthBehind(ST_HOME, 175, 3600, 36, -4);

const TRUSS_HALF = 46;
const MODULE_Y = -6.5;
const R_MOD = 2.15;

/** The truss as one instanced lattice: four longerons, square frames and diagonal braces. */
function Truss() {
    const ref = useRef<InstancedMesh>(null);
    const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
    const bars = useMemo(() => {
        const list: { at: V3; size: V3; rot?: V3 }[] = [];
        const h = 1.5;
        for (const [y, z] of [[-h, -h], [-h, h], [h, -h], [h, h]] as const) list.push({ at: [0, y, z], size: [TRUSS_HALF * 2, 0.22, 0.22] });
        const bay = 4.6;
        for (let x = -TRUSS_HALF; x <= TRUSS_HALF + 0.01; x += bay) {
            list.push({ at: [x, -h, 0], size: [0.18, 0.18, h * 2] }, { at: [x, h, 0], size: [0.18, 0.18, h * 2] });
            list.push({ at: [x, 0, -h], size: [0.18, h * 2, 0.18] }, { at: [x, 0, h], size: [0.18, h * 2, 0.18] });
            if (x + bay <= TRUSS_HALF + 0.01) {
                const d = Math.hypot(bay, h * 2);
                const a = Math.atan2(h * 2, bay);
                list.push({ at: [x + bay / 2, 0, h], size: [d, 0.12, 0.12], rot: [0, 0, a] });
                list.push({ at: [x + bay / 2, 0, -h], size: [d, 0.12, 0.12], rot: [0, 0, -a] });
                list.push({ at: [x + bay / 2, h, 0], size: [d, 0.12, 0.12], rot: [0, a, 0] });
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

/** One array wing: a mast and a long blanket of cells, folded out from a box at the joint. */
function ArrayWing({ dir, offset, textures }: { dir: 1 | -1; offset: number; textures: ReturnType<typeof useSpaceTextures> }) {
    const L = 32;
    const W = 11;
    return (
        <group position={[offset, dir * 2.6, 0]}>
            <Box size={[W + 0.6, 1, 1.2]} at={[0, 0, 0]} {...ANODISED_LIGHT} />
            <Cyl r={0.22} h={L} at={[0, (dir * L) / 2, 0]} {...RAIL} />
            <Box size={[W + 0.6, 0.8, 1.2]} at={[0, dir * L, 0]} {...ANODISED_LIGHT} />
            {[-1, 1].map((s) => (
                <group key={s} position={[(s * (W / 2 + 0.3)) / 2 + s * 0.15, (dir * L) / 2, 0.15]}>
                    <mesh receiveShadow>
                        <planeGeometry args={[W / 2 - 0.3, L - 1.4]} />
                        <Mat map={textures.blanket.map} roughnessMap={textures.blanket.roughnessMap} metalness={0.45} roughness={1} envIntensity={0.7} glowScale={0.35} doubleSided />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

/** A rotary joint at each truss end turns four wings (two up, two down) to face the Sun. */
function ArraySection({ side, textures }: { side: 1 | -1; textures: ReturnType<typeof useSpaceTextures> }) {
    return (
        <group position={[side * (TRUSS_HALF - 6), 0, 0]}>
            <Cyl r={2.1} h={1.6} at={[side * -6.8, 0, 0]} rot={[0, 0, Math.PI / 2]} {...ANODISED_LIGHT} />
            <group rotation={[ALPHA, 0, 0]}>
                {[-1, 1].flatMap((dir) => [-6.2, 6.2].map((off) => <ArrayWing key={`${dir}${off}`} dir={dir as 1 | -1} offset={off} textures={textures} />))}
            </group>
        </group>
    );
}

/** A pressurised module: a cylinder with end rings and thermal-blanket bands. */
function Module({ at, length, axis = 'z', band = '#d8dde3', r = R_MOD }: { at: V3; length: number; axis?: 'x' | 'z'; band?: string; r?: number }) {
    const rot: V3 = axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2];
    return (
        <group position={at} rotation={rot}>
            <Cyl r={r} h={length} segments={40} {...WHITE_PAINT} />
            {[-1, 1].map((s) => (
                <group key={s}>
                    <Cyl r={r * 0.82} top={s > 0 ? r * 0.55 : r * 0.82} h={0.9} at={[0, s * (length / 2 + 0.45), 0]} rot={s < 0 ? [Math.PI, 0, 0] : undefined} segments={32} {...WHITE_PAINT} />
                    <Cyl r={r + 0.06} h={0.25} at={[0, s * (length / 2 - 0.2), 0]} segments={40} {...SILVER} />
                </group>
            ))}
            {[-0.25, 0.25].map((k) => (
                <Cyl key={k} r={r + 0.03} h={length * 0.18} at={[0, k * length, 0]} segments={40} color={band} metalness={0.15} roughness={0.7} />
            ))}
        </group>
    );
}

function Node({ at }: { at: V3 }) {
    return (
        <group position={at}>
            <Cyl r={R_MOD + 0.2} h={4.4} segments={40} {...WHITE_PAINT} />
            {[0, 1, 2, 3].map((i) => (
                <Cyl key={i} r={0.9} h={1} at={[Math.cos((i * Math.PI) / 2) * (R_MOD + 0.6), 0, Math.sin((i * Math.PI) / 2) * (R_MOD + 0.6)]} rot={[i % 2 ? Math.PI / 2 : 0, 0, i % 2 ? 0 : Math.PI / 2]} {...SILVER} />
            ))}
        </group>
    );
}

function DockingPort({ at, dir }: { at: V3; dir: 1 | -1 }) {
    return (
        <group position={at} rotation={[(dir * Math.PI) / 2, 0, 0]}>
            <Cyl r={1.2} h={1.4} {...SILVER} />
            <Cyl r={1.45} h={0.3} at={[0, 0.75, 0]} {...ANODISED_LIGHT} />
        </group>
    );
}

/** A generic visiting vehicle: a capsule on a service module with two small arrays. */
function VisitingVehicle({ at, textures }: { at: V3; textures: ReturnType<typeof useSpaceTextures> }) {
    return (
        <group position={at} rotation={[Math.PI / 2, 0, 0]}>
            <Cyl r={1.3} top={0.9} h={1.2} at={[0, -0.6, 0]} {...SILVER} />
            <Cyl r={2} top={1.3} h={3.2} at={[0, -2.8, 0]} color="#d9dde2" metalness={0.3} roughness={0.5} />
            <Cyl r={2} h={4.6} at={[0, -6.7, 0]} {...WHITE_PAINT} />
            <Cyl r={1.1} top={0.6} h={1.4} at={[0, -9.7, 0]} open color="#30333a" metalness={0.85} roughness={0.42} doubleSided />
            {[-1, 1].map((s) => (
                <group key={s} position={[s * 6.2, -6.7, 0]}>
                    <Box size={[8, 0.1, 2.6]} color="#141821" metalness={0.5} roughness={0.5} />
                    <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[7.8, 2.4]} />
                        <Mat map={textures.wideCells.map} roughnessMap={textures.wideCells.roughnessMap} metalness={0.45} roughness={1} envIntensity={0.7} />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

function Radiators({ side, textures }: { side: 1 | -1; textures: ReturnType<typeof useSpaceTextures> }) {
    // Edge-on to the Sun: the panels lie in the plane that contains the Sun's direction.
    return (
        <group position={[side * 19, 0, -2]}>
            <Cyl r={0.5} h={1.4} at={[0, 0, -1.6]} rot={[Math.PI / 2, 0, 0]} {...ANODISED_LIGHT} />
            {[0, 1, 2].map((i) => (
                <mesh key={i} position={[0, 0, -4.6 - i * 4.4]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[4.2, 9, 0.12]} />
                    <Mat map={textures.whitePanel} metalness={0.05} roughness={0.55} />
                </mesh>
            ))}
        </group>
    );
}

function StationModel({ tones, onSelect }: { tones: Partial<Record<StPartId, Glow>>; onSelect: (id: string) => void }) {
    const textures = useSpaceTextures();
    return (
        <group>
            <PartGroup id="truss" tone={tones.truss} anchor={[-24, 4.2, 0]} onSelect={onSelect}>
                <Truss />
                {/* External payload platform on the truss. */}
                <group position={[-12, 2.4, 1.6]}>
                    <Box size={[6, 0.3, 3]} {...ANODISED_LIGHT} />
                    <Box size={[1.6, 1.4, 1.2]} at={[-1.6, 0.8, 0.2]} {...GOLD} />
                    <Box size={[1.4, 1.1, 1.4]} at={[0.6, 0.7, -0.3]} {...CERAMIC} />
                    <Box size={[1.2, 1.6, 1]} at={[2.2, 0.9, 0.3]} {...SILVER} />
                </group>
            </PartGroup>
            <PartGroup id="arrays" tone={tones.arrays} anchor={[TRUSS_HALF - 6, 38, 0]} onSelect={onSelect}>
                <ArraySection side={1} textures={textures} />
                <ArraySection side={-1} textures={textures} />
            </PartGroup>
            <PartGroup id="power" tone={tones.power} anchor={[TRUSS_HALF - 14, -3.8, 2]} onSelect={onSelect}>
                {[-1, 1].flatMap((side) =>
                    [0, 1, 2, 3].map((i) => <Box key={`${side}${i}`} size={[1.6, 1.4, 1.1]} at={[side * (TRUSS_HALF - 16.5 + i * 1.9), -2.3, 1.2]} color="#3a3f49" metalness={0.75} roughness={0.4} />),
                )}
                {[-1, 1].map((side) => (
                    <Box key={side} size={[3.4, 1.6, 2.4]} at={[side * (TRUSS_HALF - 10.5), -2.4, -0.6]} {...ANODISED_LIGHT} />
                ))}
            </PartGroup>
            <PartGroup id="radiators" tone={tones.radiators} anchor={[19, 6, -12]} onSelect={onSelect}>
                <Radiators side={1} textures={textures} />
                <Radiators side={-1} textures={textures} />
            </PartGroup>
            <PartGroup id="comms" tone={tones.comms} anchor={[6, 10, -2]} onSelect={onSelect}>
                <group position={[6, 1.6, -1.6]}>
                    <Cyl r={0.2} h={4.4} at={[0, 2.2, 0]} {...RAIL} />
                    <group position={[0, 4.6, 0]} rotation={[-0.7, 0.4, 0]}>
                        <mesh castShadow>
                            <sphereGeometry args={[3, 32, 8, 0, Math.PI * 2, 0, 0.5]} />
                            <Mat color="#e9ecef" metalness={0.25} roughness={0.5} doubleSided />
                        </mesh>
                        <Cyl r={0.15} top={0.25} h={0.8} at={[0, 2.2, 0]} {...GOLD} />
                    </group>
                </group>
                <Cyl r={0.06} h={3} at={[-4, 3, 1.4]} {...SILVER} />
            </PartGroup>
            {/* Pressurised stack under the truss, joined to it by a short pylon. */}
            <Box size={[2.4, 4.2, 2.4]} at={[0, -3.4, 0]} {...ANODISED} />
            <PartGroup id="modules" tone={tones.modules} anchor={[0, MODULE_Y + 3.6, 8]} onSelect={onSelect}>
                <Node at={[0, MODULE_Y, 0]} />
                <Module at={[0, MODULE_Y, 8.4]} length={11} />
                <Node at={[0, MODULE_Y, 16.4]} />
            </PartGroup>
            <PartGroup id="research" tone={tones.research} anchor={[0, MODULE_Y + 3.6, -9]} onSelect={onSelect}>
                <Module at={[0, MODULE_Y, -8.4]} length={11} band="#c9a86a" />
                <Module at={[8.2, MODULE_Y, 16.4]} length={9} axis="x" band="#c9a86a" r={1.9} />
                {/* Exposed experiment rack on the laboratory's end. */}
                <Box size={[3.2, 0.25, 2.4]} at={[0, MODULE_Y - 2.4, -12]} {...ANODISED_LIGHT} />
            </PartGroup>
            <PartGroup id="docking" tone={tones.docking} anchor={[0, MODULE_Y + 3.4, 25]} onSelect={onSelect}>
                <DockingPort at={[0, MODULE_Y, 19.4]} dir={1} />
                <VisitingVehicle at={[0, MODULE_Y, 20.6]} textures={textures} />
                <DockingPort at={[0, MODULE_Y, -14.6]} dir={-1} />
            </PartGroup>
        </group>
    );
}

/** Arrays → joints → battery units while charging; batteries → truss → modules in eclipse. */
const CHARGE_ROUTES = [1, -1].flatMap((side) => {
    const joint = new Vector3(side * (TRUSS_HALF - 12.8), 0, 0);
    const battery = new Vector3(side * (TRUSS_HALF - 14), -2.3, 1.4);
    const c = Math.cos(ALPHA);
    const s = Math.sin(ALPHA);
    const wingTip = (dir: number, off: number) => new Vector3(side * (TRUSS_HALF - 6) + off, dir * 28 * c, dir * 28 * s);
    return [1, -1].map((dir) => [new CatmullRomCurve3([wingTip(dir, 6.2), new Vector3(side * (TRUSS_HALF - 6) + 6.2, dir * 8 * c, dir * 8 * s), joint, battery])]);
});

const DISCHARGE_ROUTES = [1, -1].flatMap((side) => {
    const battery = new Vector3(side * (TRUSS_HALF - 14), -2.3, 1.4);
    return [
        [new CatmullRomCurve3([battery, new Vector3(side * 20, -1.6, 1.4), new Vector3(0, -1.6, 1.4), new Vector3(0, MODULE_Y + 2.4, 2), new Vector3(0, MODULE_Y + 2.3, 12)])],
        [new CatmullRomCurve3([battery, new Vector3(side * 20, -1.6, 1.4), new Vector3(0, -1.6, 1.4), new Vector3(0, MODULE_Y + 2.4, -2), new Vector3(0, MODULE_Y + 2.3, -11)])],
    ];
});

function Flow({ clock, playing, selected, phase }: Pick<SceneProps, 'clock' | 'playing' | 'selected' | 'phase'>) {
    const charge = useRef<Group>(null);
    const discharge = useRef<Group>(null);
    useFrame(() => {
        const flow = selected || phase === 'reveal' || phase.startsWith('explore') ? null : stFlow(clock.time);
        if (charge.current) charge.current.visible = flow === 'charge';
        if (discharge.current) discharge.current.visible = flow === 'discharge';
    });
    return (
        <>
            <group ref={charge} visible={false}>
                <EnergyFlow routes={CHARGE_ROUTES} playing={playing} count={20} size={0.55} speed={0.3} />
            </group>
            <group ref={discharge} visible={false}>
                <EnergyFlow routes={DISCHARGE_ROUTES} playing={playing} count={16} size={0.5} speed={0.32} />
            </group>
        </>
    );
}

export default function StationScene({ clock, phase, playing, reducedMotion, selected, onSelect, tones, viewRef, shadows }: SceneProps) {
    const viewAt = useMemo(() => {
        const focus = selected ? ST_FOCUS[selected as StPartId] : null;
        return (t: number) => focus ?? (t < 0 ? ST_HOME : stCameraAt(t));
    }, [selected]);
    return (
        <>
            <Sky />
            <Reflections sun={SUN} />
            <OrbitLighting clock={clock} shadowAt={stShadowAt} sun={SUN} earth={EARTH_POSITION} earthRadius={EARTH_RADIUS} shadows={shadows} shadowBox={[80, 400]} playing={playing} />
            <StoryCamera clock={clock} viewAt={viewAt} home={ST_HOME} span={ST_SPAN} reducedMotion={reducedMotion} viewRef={viewRef} />
            <group>
                <pointLight position={[0, MODULE_Y - 4, 6]} intensity={300} distance={40} decay={2} color="#dbeafe" />
                <StationModel tones={tones as Partial<Record<StPartId, Glow>>} onSelect={onSelect} />
                <Flow clock={clock} playing={playing} selected={selected} phase={phase} />
            </group>
        </>
    );
}
