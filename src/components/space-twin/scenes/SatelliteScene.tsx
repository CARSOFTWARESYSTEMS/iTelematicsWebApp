"use client";
// Experience 01 · Satellite. The 6U CubeSat-class spacecraft of the "Learn to Protect Missions"
// showcase (1 unit = 1 cm: a 22.6 × 36.6 × 10 cm body on four rails, two deployed wings of two
// panels, gold multi-layer insulation, a mirrored radiator, and the modules a 6U carries), now
// driven by the reference energy model: sunlight and eclipse, battery charge and discharge, and a
// simulated heater fault answered by safe mode.
import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Quaternion, QuadraticBezierCurve3, Vector3, type Group, type MeshStandardMaterial, type Texture } from 'three';
import {
    SAT_FOCUS,
    SAT_HOME,
    SAT_PARTS,
    SAT_SPAN,
    satCameraAt,
    satCutawayAt,
    satFlow,
    satShadowAt,
    satSlewAt,
    type SatPartId,
} from '@/lib/space-twin/satellite';
import { Reflections, Sky } from '../environment';
import { AnomalyMarker, ANODISED, ANODISED_LIGHT, Box, CERAMIC, CHIP, COPPER, Cyl, EnergyFlow, GLASS, GOLD, Mat, PartGroup, PCB, RAIL, SILVER, type Glow, type V3 } from '../primitives';
import { useSpaceTextures } from '../textures';
import { earthBehind, OrbitLighting } from './lighting';
import { StoryCamera, type SceneProps } from './shared';

/** Direction of the Sun in the scene (from the spacecraft). */
const SUN: V3 = [-70, 45, 85];
const SUN_UNIT = new Vector3(...SUN).normalize();

const BAY_A = 5.65;
const BAY_B = -5.65;

// Earth: large and far (not to scale), its limb across the lower part of the resting view.
const EARTH_RADIUS = 1300;
const EARTH_POSITION = earthBehind(SAT_HOME, 170, 3000);

function Board({ x, y }: { x: number; y: number }) {
    return <Box size={[9.2, 0.16, 9.2]} at={[x, y, 0]} {...PCB} />;
}

function Structure() {
    return (
        <>
            {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Box key={`r${sx}${sz}`} size={[1, 36.6, 1]} at={[sx * 10.8, 0, sz * 4.5]} {...RAIL} />))}
            {[-1, 1].map((sy) => (
                <Box key={`e${sy}`} size={[22.6, 0.8, 10]} at={[0, sy * 17.9, 0]} {...ANODISED_LIGHT} />
            ))}
            <Box size={[0.3, 34.6, 9]} at={[-11.05, 0, 0]} {...ANODISED} />
            <Box size={[0.3, 34.6, 9]} at={[10.95, 0, 0]} {...ANODISED} />
            <Box size={[21, 34.6, 0.3]} at={[0, 0, -4.95]} {...ANODISED} />
            {[-1, 1].flatMap((dx) => [-1, 1].map((dz) => <Cyl key={`a${dx}${dz}`} r={0.18} h={29} at={[BAY_A + dx * 4.1, 2.5, dz * 4.1]} segments={8} {...GOLD} />))}
            {/* Earth-observation camera in bay B: telescope tube, electronics, and the aperture on the Earth-facing end. */}
            <Cyl r={3.9} h={21} at={[BAY_B, -7.4, 0]} color="#30353f" metalness={0.75} roughness={0.38} />
            <Cyl r={4.3} h={1.2} at={[BAY_B, -18.9, 0]} {...ANODISED_LIGHT} />
            <Cyl r={3.3} h={0.2} at={[BAY_B, -19.55, 0]} {...GLASS} />
            <Box size={[9, 3.4, 8.6]} at={[BAY_B, 5.2, 0]} color="#2a2f38" metalness={0.7} roughness={0.4} />
            <Board x={BAY_B} y={9.6} />
            <Box size={[3, 0.4, 3]} at={[BAY_B, 9.88, 1]} {...CHIP} />
            <Board x={BAY_B} y={12.2} />
            <Box size={[3.2, 0.3, 3.2]} at={[BAY_B, 18.45, 0]} {...CERAMIC} />
        </>
    );
}

function ArrayWing({ side, cells }: { side: 1 | -1; cells: { map: Texture; roughnessMap: Texture } }) {
    // Mirrored for the −x wing; three.js keeps the faces correct under a negative scale.
    return (
        <group scale={[side, 1, 1]}>
            {[-12, 12].map((y) => (
                <Box key={y} size={[1.6, 2.6, 1]} at={[11.9, y, 5.2]} {...RAIL} />
            ))}
            <Cyl r={0.32} h={30} at={[12.5, 0, 5.4]} {...RAIL} />
            {[22.9, 43.7].map((cx) => (
                <group key={cx} position={[cx, 0, 5.6]}>
                    <Box size={[20, 34, 0.5]} color="#141821" metalness={0.5} roughness={0.5} />
                    <mesh position={[0, 0, 0.26]} receiveShadow>
                        <planeGeometry args={[19.3, 33.3]} />
                        <Mat map={cells.map} roughnessMap={cells.roughnessMap} metalness={0.45} roughness={1} envIntensity={0.7} glowScale={0.45} />
                    </mesh>
                </group>
            ))}
            <Cyl r={0.32} h={30} at={[33.3, 0, 5.6]} {...RAIL} />
        </group>
    );
}

/** Gold insulation over the Sun-facing side; it turns see-through for the cutaway. */
function Foil({ map, bumpMap, materialRef, tone }: { map: Texture; bumpMap: Texture; materialRef: RefObject<MeshStandardMaterial | null>; tone?: Glow }) {
    return (
        // Casts no shadow: when it turns see-through, the modules behind it must stay lit.
        <mesh position={[0, 0, 5.12]} receiveShadow>
            <boxGeometry args={[21, 34.6, 0.4]} />
            <meshStandardMaterial
                ref={materialRef}
                map={map}
                bumpMap={bumpMap}
                bumpScale={0.5}
                color="#ffffff"
                metalness={1}
                roughness={0.36}
                transparent
                emissive={tone === 'alert' ? '#F87171' : tone === 'info' ? '#22D3EE' : '#000000'}
                emissiveIntensity={tone ? 0.2 : 0}
            />
        </mesh>
    );
}

function ReactionWheel({ at, rot }: { at: V3; rot?: V3 }) {
    return (
        <group position={at} rotation={rot}>
            <Cyl r={1.7} h={1.1} {...SILVER} />
            <Cyl r={0.5} h={1.3} {...GOLD} />
        </group>
    );
}

function UhfAntenna({ sx, sz }: { sx: number; sz: number }) {
    return (
        <group position={[sx * 10.4, -18.4, sz * 4.2]} rotation={[0, Math.atan2(sx, sz), 0]}>
            <group rotation={[0.26, 0, 0]}>
                <mesh position={[0, 0, 16]}>
                    <boxGeometry args={[0.5, 0.06, 32]} />
                    <Mat color="#d9d4c5" metalness={0.8} roughness={0.3} />
                </mesh>
            </group>
        </group>
    );
}

function SatelliteModel({ tones, onSelect, foilMaterialRef }: { tones: Partial<Record<SatPartId, Glow>>; onSelect?: (id: string) => void; foilMaterialRef: RefObject<MeshStandardMaterial | null> }) {
    const textures = useSpaceTextures();
    return (
        <group>
            <Structure />

            <PartGroup id="arrays" tone={tones.arrays} anchor={[43.7, 19.2, 6]} onSelect={onSelect}>
                <ArrayWing side={1} cells={textures.cells} />
                <ArrayWing side={-1} cells={textures.cells} />
            </PartGroup>

            <PartGroup id="thermal" tone={tones.thermal} anchor={[-5, 19.2, 5.6]} onSelect={onSelect}>
                <Foil map={textures.goldFoil.map} bumpMap={textures.goldFoil.bumpMap} materialRef={foilMaterialRef} tone={tones.thermal} />
                <mesh position={[11.13, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[8.4, 34]} />
                    <Mat map={textures.radiator.map} roughnessMap={textures.radiator.roughnessMap} metalness={0.95} roughness={1} />
                </mesh>
            </PartGroup>

            <PartGroup id="power" tone={tones.power} anchor={[BAY_A, 7.4, 5.6]} onSelect={onSelect}>
                <Board x={BAY_A} y={8.4} />
                <Cyl r={0.7} h={0.8} at={[BAY_A - 2.2, 8.9, 2]} color="#3b4150" metalness={0.6} roughness={0.4} />
                <Cyl r={0.7} h={0.8} at={[BAY_A + 2.2, 8.9, 2]} color="#3b4150" metalness={0.6} roughness={0.4} />
                <Box size={[1.6, 0.3, 1.6]} at={[BAY_A, 8.63, -1.8]} {...CHIP} />
                {[2, 6.9].map((y) => (
                    <Box key={y} size={[9.2, 0.3, 9.2]} at={[BAY_A, y, 0]} color="#3a3f49" metalness={0.8} roughness={0.38} />
                ))}
                {[3.45, 5.45].flatMap((y) => [-2.2, 2.2].map((z) => <Cyl key={`${y}${z}`} r={0.92} h={7.4} at={[BAY_A, y, z]} rot={[0, 0, Math.PI / 2]} color="#2e3a4f" metalness={0.55} roughness={0.36} />))}
            </PartGroup>

            <PartGroup id="computer" tone={tones.computer} anchor={[BAY_A, 11.2, 5.6]} onSelect={onSelect}>
                <Board x={BAY_A} y={10.4} />
                <Box size={[2.6, 0.35, 2.6]} at={[BAY_A, 10.66, 1]} {...CHIP} />
                <Box size={[1.2, 0.25, 2]} at={[BAY_A + 3, 10.6, 1]} {...CHIP} />
                <Box size={[1.2, 0.25, 2]} at={[BAY_A - 3, 10.6, 1]} {...CHIP} />
                <Box size={[6, 0.4, 0.6]} at={[BAY_A, 10.68, -3.8]} {...GOLD} />
            </PartGroup>

            <PartGroup id="attitude" tone={tones.attitude} anchor={[BAY_A, 23.4, -1.2]} onSelect={onSelect}>
                <Box size={[9.2, 0.3, 9.2]} at={[BAY_A, 12.5, 0]} {...ANODISED_LIGHT} />
                <ReactionWheel at={[BAY_A - 2.3, 14.4, -2]} rot={[0, 0, Math.PI / 2]} />
                <ReactionWheel at={[BAY_A, 16, 2.2]} />
                <ReactionWheel at={[BAY_A + 2.4, 14.2, 2]} rot={[Math.PI / 2, 0, 0]} />
                <Cyl r={0.45} h={8} at={[BAY_A, -9.2, -2.5]} rot={[0, 0, Math.PI / 2]} {...COPPER} />
                <Cyl r={0.45} h={8} at={[BAY_A, -10.6, 1]} rot={[Math.PI / 2, 0, 0]} {...COPPER} />
                <Box size={[3.4, 2.4, 3.4]} at={[BAY_A, 19.5, -1.2]} {...ANODISED_LIGHT} />
                <Cyl r={1.5} top={2.3} h={3.6} at={[BAY_A, 22.4, -1.2]} rot={[-0.22, 0, 0]} open color="#0b0c10" metalness={0.4} roughness={0.7} doubleSided />
                <Cyl r={1.25} h={0.12} at={[BAY_A, 20.75, -1.2]} {...GLASS} />
                {[-8.4, 8.4].map((x) => (
                    <Box key={x} size={[1.4, 0.35, 1.4]} at={[x, 18.45, 3]} {...GLASS} />
                ))}
            </PartGroup>

            <PartGroup id="comms" tone={tones.comms} anchor={[5.6, -22, 0]} onSelect={onSelect}>
                <Board x={BAY_A} y={-0.4} />
                <Box size={[6.4, 0.9, 5.4]} at={[BAY_A, 0.15, 0.6]} {...SILVER} />
                <Board x={BAY_A} y={-3.2} />
                <Box size={[5.4, 0.8, 4.4]} at={[BAY_A, -2.7, 0.8]} {...SILVER} />
                {[3.3, 8.2].map((x) => (
                    <group key={x}>
                        <Box size={[4, 0.3, 4]} at={[x, -18.45, 0]} {...CERAMIC} />
                        <Box size={[2.6, 0.06, 2.6]} at={[x, -18.63, 0]} {...GOLD} />
                    </group>
                ))}
                {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <UhfAntenna key={`${sx}${sz}`} sx={sx} sz={sz} />))}
            </PartGroup>
        </group>
    );
}

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);

/** Energy paths: arrays → wing roots → power board → battery while charging; battery → board → loads in eclipse. */
const CHARGE_ROUTES = (() => {
    const intoBattery = new QuadraticBezierCurve3(v(BAY_A, 8.6, 1.5), v(BAY_A + 2, 7.2, 3), v(BAY_A, 5.4, 3));
    return [1, -1].flatMap((s) => {
        const root = v(s * 12.5, 8.6, 5.9);
        const intoBoard = new QuadraticBezierCurve3(root, v(s * 8, 9.6, 4.2), v(BAY_A, 8.6, 1.5));
        return [
            [new QuadraticBezierCurve3(v(s * 44, 10, 6.2), v(s * 28, 13, 6.5), root), intoBoard, intoBattery],
            [new QuadraticBezierCurve3(v(s * 26, -9, 6.2), v(s * 19, 4, 6.5), root), intoBoard, intoBattery],
        ];
    });
})();

const DISCHARGE_ROUTES = (() => {
    const outOfBattery = new QuadraticBezierCurve3(v(BAY_A, 5.4, 3), v(BAY_A + 2, 7.2, 3), v(BAY_A, 8.6, 1.5));
    return [
        [outOfBattery, new QuadraticBezierCurve3(v(BAY_A, 8.6, 1.5), v(BAY_A + 3.6, 9.6, 2.6), v(BAY_A, 10.7, 2))],
        [outOfBattery, new QuadraticBezierCurve3(v(BAY_A, 8.6, 1.5), v(BAY_A - 3.8, 4, 3.4), v(BAY_A, 0.6, 2))],
        [outOfBattery, new QuadraticBezierCurve3(v(BAY_A, 8.6, 1.5), v(BAY_A + 3.4, 12.5, 3.2), v(BAY_A, 15.6, 2.4))],
    ];
})();

/** Attitude (nominal or arrays square to the Sun), cutaway, energy flow and eclipse lighting, all from the story clock. */
function Craft({ clock, selected, reducedMotion, playing, foilMaterialRef, children }: Pick<SceneProps, 'clock' | 'selected' | 'reducedMotion' | 'playing'> & { foilMaterialRef: RefObject<MeshStandardMaterial | null>; children: React.ReactNode }) {
    const group = useRef<Group>(null);
    const eased = useRef({ cut: 0, slew: 0 });
    const sunward = useMemo(() => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), SUN_UNIT), []);
    const nominal = useMemo(() => new Quaternion(), []);
    const flowRef = useRef<'charge' | 'discharge' | null>(null);
    const chargeRef = useRef<Group>(null);
    const dischargeRef = useRef<Group>(null);
    useFrame((state, delta) => {
        const t = clock.time;
        const part = selected ? SAT_PARTS.find((p) => p.id === selected) : null;
        const wantCut = part ? (part.internal ? 1 : 0) : satCutawayAt(t);
        const wantSlew = part ? 0 : satSlewAt(t);
        const k = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 5);
        const e = eased.current;
        e.cut += (wantCut - e.cut) * k;
        e.slew += (wantSlew - e.slew) * k;
        group.current?.quaternion.slerpQuaternions(nominal, sunward, e.slew);
        const foil = foilMaterialRef.current;
        if (foil) {
            foil.opacity = 1 - 0.9 * e.cut;
            foil.depthWrite = foil.opacity > 0.98;
        }
        const flow = selected ? null : satFlow(t);
        if (flow !== flowRef.current) {
            flowRef.current = flow;
            if (chargeRef.current) chargeRef.current.visible = flow === 'charge';
            if (dischargeRef.current) dischargeRef.current.visible = flow === 'discharge';
        }
        if (Math.abs(wantCut - e.cut) > 0.002 || Math.abs(wantSlew - e.slew) > 0.002) state.invalidate();
    });
    return (
        <group ref={group}>
            {/* A soft lamp inside the body, so the modules read when the side is see-through. */}
            <pointLight position={[0, 3, 2]} intensity={40} distance={26} decay={2} color="#dbeafe" />
            {children}
            <group ref={chargeRef} visible={false}>
                <EnergyFlow routes={CHARGE_ROUTES} playing={playing} />
            </group>
            <group ref={dischargeRef} visible={false}>
                <EnergyFlow routes={DISCHARGE_ROUTES} playing={playing} count={9} speed={0.5} />
            </group>
        </group>
    );
}

export default function SatelliteScene({ clock, phase, playing, reducedMotion, selected, onSelect, tones, viewRef, shadows }: SceneProps) {
    const foilMaterialRef = useRef<MeshStandardMaterial>(null);
    const viewAt = useMemo(() => {
        const focus = selected ? SAT_FOCUS[selected as SatPartId] : null;
        return (t: number) => focus ?? (t < 0 ? SAT_HOME : satCameraAt(t));
    }, [selected]);
    const anomaly = !selected && (phase === 'fault' || phase === 'detected' || phase === 'safe-mode');
    return (
        <>
            <Sky />
            <Reflections sun={SUN} />
            <OrbitLighting clock={clock} shadowAt={satShadowAt} sun={SUN} earth={EARTH_POSITION} earthRadius={EARTH_RADIUS} shadows={shadows} shadowBox={[60, 300]} playing={playing} />
            <StoryCamera clock={clock} viewAt={viewAt} home={SAT_HOME} span={SAT_SPAN} reducedMotion={reducedMotion} viewRef={viewRef} />
            <Craft clock={clock} selected={selected} reducedMotion={reducedMotion} playing={playing} foilMaterialRef={foilMaterialRef}>
                <SatelliteModel tones={tones as Partial<Record<SatPartId, Glow>>} onSelect={onSelect} foilMaterialRef={foilMaterialRef} />
                {anomaly && <AnomalyMarker at={[BAY_A, 4.45, 5.9]} radius={3} reducedMotion={reducedMotion} />}
            </Craft>
        </>
    );
}
