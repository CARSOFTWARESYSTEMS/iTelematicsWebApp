"use client";
// Experience 03 · Spacecraft. A generic unmanned Earth-observation spacecraft (1 unit = 10 cm):
// a 1.6 × 2.4 × 1.6 m bus wrapped in silver multi-layer insulation, a mirrored-tile radiator,
// two three-panel wings on solar-array drives that turn the cells to the Sun, a gimballed
// high-gain antenna, a nadir-pointing instrument with its baffle, a propulsion module, and inside
// (shown in cutaway) the battery, power distribution unit, avionics, reaction wheels and tanks.
// Generic architecture for learning, not a real mission's spacecraft.
import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { QuadraticBezierCurve3, Vector3, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { SC_FOCUS, SC_HOME, SC_PARTS, SC_SPAN, scCameraAt, scCutawayAt, scFlow, scSampleAt, scShadowAt, type ScPartId } from '@/lib/space-twin/spacecraft';
import { Reflections, Sky } from '../environment';
import { Anchor, ANODISED, ANODISED_LIGHT, AnomalyMarker, Ball, Box, CHIP, COPPER, Cyl, EnergyFlow, GLASS, GLOW, GOLD, Mat, PartGroup, RAIL, SILVER, TITANIUM, type Glow, type V3 } from '../primitives';
import { useSpaceTextures } from '../textures';
import { earthBehind, OrbitLighting } from './lighting';
import { StoryCamera, type SceneProps } from './shared';

const SUN: V3 = [-60, 55, 90];
/** Solar-array drive angle that turns the cells (+z) towards the Sun about the wing (x) axis. */
const ARRAY_TILT = -Math.atan2(SUN[1], SUN[2]);
const EARTH_RADIUS = 1500;
const EARTH_POSITION = earthBehind(SC_HOME, 170, 3400, 38, -6);

const HX = 8;
const HY = 12;
const HZ = 8;

/** Bus frame: edges, decks and closed panels (the +z panel is the see-through foil). */
function Bus({ textures, foilRef, tones, onSelect }: { textures: ReturnType<typeof useSpaceTextures>; foilRef: RefObject<MeshStandardMaterial | null>; tones: Partial<Record<ScPartId, Glow>>; onSelect: (id: string) => void }) {
    return (
        <>
            {/* Edge rails and decks. */}
            {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Box key={`v${sx}${sz}`} size={[0.6, HY * 2, 0.6]} at={[sx * HX, 0, sz * HZ]} {...RAIL} />))}
            {[-1, 1].map((sy) => (
                <Box key={`d${sy}`} size={[HX * 2 + 0.6, 0.6, HZ * 2 + 0.6]} at={[0, sy * HY, 0]} {...ANODISED_LIGHT} />
            ))}
            <Box size={[HX * 2, 0.3, HZ * 2]} at={[0, 3.2, 0]} {...ANODISED} />
            <Box size={[HX * 2, 0.3, HZ * 2]} at={[0, -2.6, 0]} {...ANODISED} />
            {/* ±x side panels in silver insulation, with the drive openings. */}
            {[-1, 1].map((sx) => (
                <mesh key={`x${sx}`} position={[sx * (HX + 0.05), 0, 0]} rotation={[0, (sx * Math.PI) / 2, 0]} castShadow receiveShadow>
                    <planeGeometry args={[HZ * 2, HY * 2]} />
                    <meshStandardMaterial map={textures.silverFoil.map} bumpMap={textures.silverFoil.bumpMap} bumpScale={0.4} color="#f1f4f8" metalness={0.7} roughness={0.3} envMapIntensity={1.5} />
                </mesh>
            ))}
            {/* Thermal: radiator of mirrored tiles on the anti-sun (−z) face. */}
            <PartGroup id="thermal" tone={tones.thermal} anchor={[0, HY + 1, -HZ]} onSelect={onSelect}>
                <mesh position={[0, 0, -HZ - 0.05]} rotation={[0, Math.PI, 0]} receiveShadow>
                    <planeGeometry args={[HX * 2, HY * 2]} />
                    <Mat map={textures.radiator.map} roughnessMap={textures.radiator.roughnessMap} metalness={0.95} roughness={1} />
                </mesh>
                {/* Heater mats inside, on the tanks' shelf and under the battery. */}
                <Box size={[HX * 1.7, 0.12, HZ * 1.6]} at={[0, -2.4, 0]} color="#8a4b2a" metalness={0.3} roughness={0.6} />
            </PartGroup>
            {/* +z face: silver insulation that turns see-through for the cutaway. */}
            <mesh position={[0, 0, HZ + 0.12]} receiveShadow>
                <boxGeometry args={[HX * 2, HY * 2, 0.24]} />
                <meshStandardMaterial ref={foilRef} map={textures.silverFoil.map} bumpMap={textures.silverFoil.bumpMap} bumpScale={0.4} color="#f1f4f8" metalness={0.7} roughness={0.3} envMapIntensity={1.5} transparent />
            </mesh>
        </>
    );
}

function Interior({ tones, onSelect }: { tones: Partial<Record<ScPartId, Glow>>; onSelect: (id: string) => void }) {
    return (
        <>
            {/* Battery and power conditioning & distribution unit on the middle shelf. */}
            <PartGroup id="power" tone={tones.power} anchor={[0, 3.6, HZ]} onSelect={onSelect}>
                <Box size={[6.4, 4.6, 9]} at={[3.6, 0.6, 1]} color="#3a3f49" metalness={0.8} roughness={0.38} />
                {[-2.2, 0, 2.2].flatMap((z) => [-1.4, 1.4].map((x) => <Cyl key={`${x}${z}`} r={0.9} h={4.8} at={[3.6 + x, 0.8, 1 + z]} color="#2e3a4f" metalness={0.55} roughness={0.36} />))}
                <Box size={[6, 4, 7]} at={[-3.6, 0.6, 1.6]} color="#2a2f38" metalness={0.75} roughness={0.4} />
                {[-1.8, -0.6, 0.6, 1.8].map((y) => (
                    <Box key={y} size={[6.2, 0.18, 7.2]} at={[-3.6, 0.6 + y, 1.6]} {...SILVER} />
                ))}
                <Box size={[3, 0.5, 2]} at={[-3.6, 2.8, 4]} {...CHIP} />
            </PartGroup>
            {/* Avionics and attitude control on the upper shelf. */}
            <PartGroup id="avionics" tone={tones.avionics} anchor={[-3, 9.5, HZ]} onSelect={onSelect}>
                <Box size={[5.6, 4, 5.4]} at={[-3.4, 5.6, 2]} {...ANODISED_LIGHT} />
                {[0, 1, 2].map((i) => (
                    <Box key={i} size={[0.25, 3.6, 4.6]} at={[-5.4 + i * 1.6, 5.6, 2]} color="#18432f" metalness={0.15} roughness={0.62} />
                ))}
                {[
                    [2.2, 5.4, 3.2],
                    [5.2, 5.4, 3.2],
                    [2.2, 5.4, 0],
                    [5.2, 5.4, 0],
                ].map((p, i) => (
                    <group key={i} position={p as V3} rotation={[0.6, i * 0.9, 0.3]}>
                        <Cyl r={1.25} h={0.9} {...SILVER} />
                        <Cyl r={0.4} h={1.1} {...GOLD} />
                    </group>
                ))}
                <Box size={[2.4, 2.4, 2.4]} at={[3.6, 9, -2]} {...ANODISED} />
                {/* Star trackers with sunshades on the top deck. */}
                {[-1, 1].map((s) => (
                    <group key={s} position={[s * 4.5, HY + 1.4, -4]} rotation={[-0.5, 0, s * 0.35]}>
                        <Box size={[2.4, 1.8, 2.4]} {...ANODISED_LIGHT} />
                        <Cyl r={0.9} top={1.4} h={2.4} at={[0, 1.8, 0]} open color="#0b0c10" metalness={0.4} roughness={0.7} doubleSided />
                        <Cyl r={0.8} h={0.1} at={[0, 0.95, 0]} {...GLASS} />
                    </group>
                ))}
            </PartGroup>
            {/* Propellant tanks on the lower shelf. */}
            <PartGroup id="propulsion" tone={tones.propulsion} anchor={[0, -HY - 6, -HZ]} onSelect={onSelect}>
                {[-1, 1].map((s) => (
                    <group key={s}>
                        <Ball r={3.4} at={[s * 3.8, -7, -0.5]} {...TITANIUM} />
                        <Cyl r={0.5} h={2.6} at={[s * 3.8, -3.3, -0.5]} {...TITANIUM} />
                    </group>
                ))}
                <Cyl r={0.18} h={7.6} at={[0, -9.6, -2]} rot={[0, 0, Math.PI / 2]} {...COPPER} />
                {/* Main thruster on the −z face and attitude-thruster clusters on the corners. */}
                <group position={[0, -6.5, -HZ - 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
                    <Cyl r={1.4} h={1.2} at={[0, 0.6, 0]} {...ANODISED_LIGHT} />
                    <Cyl r={1.1} top={2.6} h={4.2} at={[0, 3.2, 0]} open color="#30333a" metalness={0.85} roughness={0.42} doubleSided />
                </group>
                {[-1, 1].flatMap((sx) => [-1, 1].map((sy) => (
                    <group key={`${sx}${sy}`} position={[sx * (HX + 0.6), sy * (HY - 1.2), -HZ + 0.8]}>
                        <Box size={[1.2, 1.2, 1.2]} {...ANODISED} />
                        <Cyl r={0.25} top={0.45} h={0.9} at={[sx * 0.9, 0, 0]} rot={[0, 0, (sx * Math.PI) / 2]} {...SILVER} />
                    </group>
                )))}
            </PartGroup>
        </>
    );
}

function Wing({ side, textures, tone, dimmed, panelRef }: { side: 1 | -1; textures: ReturnType<typeof useSpaceTextures>; tone?: Glow; dimmed?: boolean; panelRef?: RefObject<Mesh | null> }) {
    const cells = textures.wideCells;
    return (
        <group position={[side * HX, 2, 0]}>
            {/* Solar-array drive at the bus wall. */}
            <Cyl r={1.4} h={1.8} at={[side * 0.9, 0, 0]} rot={[0, 0, Math.PI / 2]} {...ANODISED_LIGHT} />
            <group rotation={[ARRAY_TILT, 0, 0]}>
                {/* Yoke: a V from the drive shaft to the inner panel's corners. */}
                <Cyl r={0.45} h={1.6} at={[side * 1.6, 0, 0]} rot={[0, 0, Math.PI / 2]} {...RAIL} />
                {[-1, 1].map((s) => {
                    const dx = 2.9;
                    const dy = 6 * s;
                    return <Cyl key={s} r={0.3} h={Math.hypot(dx, dy)} at={[side * (2.4 + dx / 2), dy / 2, 0]} rot={[0, 0, -Math.atan2(side * dx, dy)]} {...RAIL} />;
                })}
                {[0, 1, 2].map((i) => {
                    const cx = side * (10.2 + i * 11.6);
                    return (
                        <group key={i} position={[cx, 0, 0]}>
                            <Box size={[11, 18, 0.4]} color="#141821" metalness={0.5} roughness={0.5} />
                            <mesh position={[0, 0, 0.21]} receiveShadow ref={i === 1 ? panelRef : undefined}>
                                <planeGeometry args={[10.6, 17.6]} />
                                <Mat map={cells.map} roughnessMap={cells.roughnessMap} metalness={0.45} roughness={1} envIntensity={0.7} glowScale={0.35} />
                            </mesh>
                            {/* Failed strings (simulated): the outer two panels' lower halves go dark. */}
                            {dimmed && i > 0 && (
                                <mesh position={[0, -4.4, 0.24]}>
                                    <planeGeometry args={[10.6, 8.8]} />
                                    <meshBasicMaterial color="#05070c" transparent opacity={0.72} />
                                </mesh>
                            )}
                            {tone === 'alert' && i > 0 && (
                                <mesh position={[0, -4.4, 0.26]}>
                                    <planeGeometry args={[10.6, 8.8]} />
                                    <meshBasicMaterial color={GLOW.alert} transparent opacity={0.16} toneMapped={false} />
                                </mesh>
                            )}
                            {i < 2 && <Box size={[0.6, 2.4, 0.6]} at={[side * 5.8, 6, 0]} {...RAIL} />}
                            {i < 2 && <Box size={[0.6, 2.4, 0.6]} at={[side * 5.8, -6, 0]} {...RAIL} />}
                        </group>
                    );
                })}
            </group>
        </group>
    );
}

function HighGainAntenna() {
    return (
        <group position={[2, HY, HZ - 1.5]}>
            <Cyl r={0.45} h={7} at={[0, 3.5, 0]} {...RAIL} />
            <Box size={[1.8, 1.4, 1.8]} at={[0, 7.4, 0]} {...ANODISED_LIGHT} />
            {/* Dish turned towards Earth (down and forward) on its gimbal. */}
            <group position={[0, 8.4, 1.6]} rotation={[2.2, 0, 0]}>
                <mesh castShadow receiveShadow>
                    <sphereGeometry args={[9, 40, 10, 0, Math.PI * 2, 0, 0.42]} />
                    <Mat color="#e9ecef" metalness={0.25} roughness={0.5} doubleSided />
                </mesh>
                <mesh position={[0, 9 * Math.cos(0.42) - 0.2, 0]}>
                    <cylinderGeometry args={[3.7, 3.7, 0.25, 40]} />
                    <Mat color="#cfd4da" metalness={0.6} roughness={0.4} />
                </mesh>
                {[0, 1, 2].map((i) => (
                    <Cyl key={i} r={0.12} h={4.6} at={[Math.cos((i * 2 * Math.PI) / 3) * 1.7, 9 - 3.2, Math.sin((i * 2 * Math.PI) / 3) * 1.7]} rot={[Math.sin((i * 2 * Math.PI) / 3) * 0.35, 0, -Math.cos((i * 2 * Math.PI) / 3) * 0.35]} {...RAIL} />
                ))}
                <Cyl r={0.5} top={0.75} h={1.4} at={[0, 9 - 5.4, 0]} {...GOLD} />
            </group>
        </group>
    );
}

function Payload() {
    return (
        <group position={[0, -HY, 2.5]}>
            <Box size={[8, 2, 7]} at={[0, -1, 0]} {...ANODISED_LIGHT} />
            <Cyl r={3.2} h={7} at={[0, -5.5, 0]} color="#2a2f38" metalness={0.7} roughness={0.4} />
            <Cyl r={3.6} h={0.6} at={[0, -2.3, 0]} {...GOLD} />
            {/* Baffle and aperture, pointing at the Earth. */}
            <Cyl r={3.0} top={3.4} h={3.4} at={[0, -10.6, 0]} open color="#0b0c10" metalness={0.4} roughness={0.75} doubleSided />
            <Cyl r={2.6} h={0.12} at={[0, -9, 0]} {...GLASS} />
            <Box size={[3, 2.6, 2.6]} at={[5, -3, -1]} color="#2a2f38" metalness={0.7} roughness={0.4} />
        </group>
    );
}

function OmniAntennas() {
    return (
        <>
            {[-1, 1].map((s) => (
                <group key={s} position={[s * (HX - 1), -HY - 0.4, -HZ + 1]}>
                    <Cyl r={0.12} h={5} at={[0, -2.5, 0]} {...SILVER} />
                    <Cyl r={0.5} h={0.6} at={[0, -5.2, 0]} color="#e9ecef" metalness={0.1} roughness={0.6} />
                </group>
            ))}
        </>
    );
}

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);

/** Arrays → drives → power unit → battery while charging; battery → power unit → loads in eclipse. */
const CHARGE_ROUTES = [1, -1].flatMap((s) => {
    const drive = v(s * (HX + 0.4), 2, 0);
    const toPcdu = new QuadraticBezierCurve3(drive, v(s * 6, 4.4, 5.2), v(-3.6, 2.4, 5.4));
    const toBattery = new QuadraticBezierCurve3(v(-3.6, 2.4, 5.4), v(0, 4, 6.4), v(3.6, 2.4, 5.8));
    const tilt = (x: number, y: number) => {
        const c = Math.cos(ARRAY_TILT);
        const sn = Math.sin(ARRAY_TILT);
        return v(s * x, 2 + y * c, y * sn + 0.6);
    };
    return [
        [new QuadraticBezierCurve3(tilt(40, 6), tilt(24, 7), drive), toPcdu, toBattery],
        [new QuadraticBezierCurve3(tilt(30, -6), tilt(18, -4), drive), toPcdu, toBattery],
    ];
});

const DISCHARGE_ROUTES = (() => {
    const out = new QuadraticBezierCurve3(v(3.6, 2.4, 5.8), v(0, 4, 6.4), v(-3.6, 2.4, 5.4));
    return [
        [out, new QuadraticBezierCurve3(v(-3.6, 2.4, 5.4), v(-4.6, 5, 6.2), v(-3.4, 7.8, 4.6))],
        [out, new QuadraticBezierCurve3(v(-3.6, 2.4, 5.4), v(-1, -6, 7.4), v(0, -HY - 1, 4.5))],
        [out, new QuadraticBezierCurve3(v(-3.6, 2.4, 5.4), v(1, 9, 7.4), v(2, HY + 0.5, HZ - 1.5))],
    ];
})();

function Craft({ clock, phase, selected, reducedMotion, playing, foilRef, children }: Pick<SceneProps, 'clock' | 'phase' | 'selected' | 'reducedMotion' | 'playing'> & { foilRef: RefObject<MeshStandardMaterial | null>; children: React.ReactNode }) {
    const eased = useRef(0);
    const chargeRef = useRef<Group>(null);
    const dischargeRef = useRef<Group>(null);
    const group = useRef<Group>(null);
    useFrame((state, delta) => {
        const t = clock.time;
        const part = selected ? SC_PARTS.find((p) => p.id === selected) : null;
        const want = part ? (part.internal ? 1 : 0) : scCutawayAt(t);
        const k = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 5);
        eased.current += (want - eased.current) * k;
        const foil = foilRef.current;
        if (foil) {
            foil.opacity = 1 - 0.88 * eased.current;
            foil.depthWrite = foil.opacity > 0.98;
        }
        const flow = selected || phase.startsWith('systems') || phase === 'reveal' ? null : scFlow(t);
        if (chargeRef.current) chargeRef.current.visible = flow === 'charge';
        if (dischargeRef.current) dischargeRef.current.visible = flow === 'discharge';
        // A slow, natural drift in attitude during the reveal only.
        if (group.current) group.current.rotation.y = reducedMotion ? 0 : Math.sin(Math.min(t, 4.5) * 0.35) * 0.06;
        if (Math.abs(want - eased.current) > 0.002) state.invalidate();
    });
    return (
        <group ref={group}>
            <pointLight position={[0, 3, 5]} intensity={60} distance={30} decay={2} color="#dbeafe" />
            {children}
            <group ref={chargeRef} visible={false}>
                <EnergyFlow routes={CHARGE_ROUTES} playing={playing} count={18} size={0.45} />
            </group>
            <group ref={dischargeRef} visible={false}>
                <EnergyFlow routes={DISCHARGE_ROUTES} playing={playing} count={12} size={0.45} speed={0.5} />
            </group>
        </group>
    );
}

function SpacecraftModel({ phase, tones, onSelect, foilRef, clock }: { phase: string; tones: Partial<Record<ScPartId, Glow>>; onSelect: (id: string) => void; foilRef: RefObject<MeshStandardMaterial | null>; clock: SceneProps['clock'] }) {
    const textures = useSpaceTextures();
    const faultVisible = (phase === 'fault' || phase === 'detected' || phase === 'limited') && !scSampleAt(clock.time).eclipse;
    const alert = phase === 'detected' || phase === 'limited';
    return (
        <group>
            <Bus textures={textures} foilRef={foilRef} tones={tones} onSelect={onSelect} />
            <Interior tones={tones} onSelect={onSelect} />
            <PartGroup id="arrays" tone={tones.arrays} anchor={[HX + 30, 15, 0]} onSelect={onSelect}>
                <Wing side={1} textures={textures} />
                <Wing side={-1} textures={textures} dimmed={faultVisible || alert} tone={alert ? 'alert' : undefined} />
            </PartGroup>
            <Anchor id="wingB" at={[-HX - 30, 13, 0]} />
            <PartGroup id="comms" tone={tones.comms} anchor={[2, HY + 15, HZ + 2]} onSelect={onSelect}>
                <HighGainAntenna />
                <OmniAntennas />
            </PartGroup>
            <PartGroup id="payload" tone={tones.payload} anchor={[0, -HY - 13, 2.5]} onSelect={onSelect}>
                <Payload />
            </PartGroup>
        </group>
    );
}

export default function SpacecraftScene({ clock, phase, playing, reducedMotion, selected, onSelect, tones, viewRef, shadows }: SceneProps) {
    const foilRef = useRef<MeshStandardMaterial>(null);
    const viewAt = useMemo(() => {
        const focus = selected ? SC_FOCUS[selected as ScPartId] : null;
        return (t: number) => focus ?? (t < 0 ? SC_HOME : scCameraAt(t));
    }, [selected]);
    const anomaly = !selected && (phase === 'detected' || phase === 'limited');
    return (
        <>
            <Sky />
            <Reflections sun={SUN} />
            <OrbitLighting clock={clock} shadowAt={scShadowAt} sun={SUN} earth={EARTH_POSITION} earthRadius={EARTH_RADIUS} shadows={shadows} shadowBox={[70, 320]} playing={playing} />
            <StoryCamera clock={clock} viewAt={viewAt} home={SC_HOME} span={SC_SPAN} reducedMotion={reducedMotion} viewRef={viewRef} />
            <Craft clock={clock} phase={phase} selected={selected} reducedMotion={reducedMotion} playing={playing} foilRef={foilRef}>
                <SpacecraftModel phase={phase} tones={tones as Partial<Record<ScPartId, Glow>>} onSelect={onSelect} foilRef={foilRef} clock={clock} />
                {anomaly && <AnomalyMarker at={[-HX - 21.8, -2, 2]} radius={6} reducedMotion={reducedMotion} rot={[ARRAY_TILT, 0, 0]} />}
            </Craft>
        </>
    );
}
