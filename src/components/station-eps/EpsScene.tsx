"use client";
// 3D scene of the Space Station Electrical Power & Energy Management experience. The same conceptual
// station (SRC-1) as /space-station, with engineering overlays driven by the EPS-1 model: power paths
// per channel, energy flows, the sunlight direction, a battery cutaway and fault markers. The camera
// moves only between predefined, composed views; there is no free camera.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CatmullRomCurve3, Color, InstancedMesh, Matrix4, MeshBasicMaterial, Object3D, Vector3, type Group } from 'three';
import { Reflections, Sky } from '@/components/space-twin/environment';
import { AnomalyMarker, Anchor, ANODISED_LIGHT, Box, COPPER, EnergyFlow, GOLD, Mat, PCB, type V3 } from '@/components/space-twin/primitives';
import { viewPosition } from '@/components/space-twin/rig';
import { OrbitLighting } from '@/components/space-twin/scenes/lighting';
import { CHANNEL_X, EARTH_POSITION, EARTH_RADIUS, JOINT_X, MODULE_Y, onWing, Rod, StationModel, SUN, TRUSS_H } from '@/components/station-twin/StationScene';
import { fitDistance, type StoryClock, type View } from '@/lib/space-twin/story';
import { SRC_SPAN } from '@/lib/station-twin/model';
import { EPS, sampleAt, traceOf, type EpsSample } from '@/lib/station-eps/model';
import { OVERVIEW_KEYS, sceneMinute, type Highlight, type Scene, type Tone } from '@/lib/station-eps/scenes';

const BATTERY_X = [-25, -21, 21, 25];
const DIST_X = [-8, -4, 4, 8];
const CUTAWAY: V3 = [-21, -7.4, 5.6];

export const sampleNow = (scene: Scene, clock: StoryClock): EpsSample => sampleAt(traceOf(scene.scenario), sceneMinute(scene, clock.time));

// ── Camera ──────────────────────────────────────────────────────────────────

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

function overviewView(t: number): View {
    const keys = OVERVIEW_KEYS;
    if (t <= keys[0].t) return keys[0].v as View;
    for (let i = 1; i < keys.length; i++) {
        if (t <= keys[i].t) {
            const a = keys[i - 1];
            const b = keys[i];
            const k = smooth((t - a.t) / (b.t - a.t));
            const lerp = (x: number, y: number) => x + (y - x) * k;
            return {
                az: lerp(a.v.az, b.v.az),
                el: lerp(a.v.el, b.v.el),
                dist: lerp(a.v.dist, b.v.dist),
                target: [lerp(a.v.target[0], b.v.target[0]), lerp(a.v.target[1], b.v.target[1]), lerp(a.v.target[2], b.v.target[2])],
            };
        }
    }
    return keys[keys.length - 1].v as View;
}

/** Glides between the predefined views; snaps under reduced motion. */
function CameraController({ scene, clock, overview, reducedMotion }: { scene: Scene; clock: StoryClock; overview: boolean; reducedMotion: boolean }) {
    const current = useRef<View | null>(null);
    useFrame((state, delta) => {
        const want = overview ? overviewView(reducedMotion ? 99 : clock.time) : scene.view;
        const cur = current.current;
        let next: View;
        if (!cur || reducedMotion) next = want;
        else {
            const k = overview ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 1.9);
            let dAz = want.az - cur.az;
            dAz = ((dAz + 540) % 360) - 180;
            next = {
                az: cur.az + dAz * k,
                el: cur.el + (want.el - cur.el) * k,
                dist: cur.dist + (want.dist - cur.dist) * k,
                target: [0, 1, 2].map((i) => cur.target[i] + (want.target[i] - cur.target[i]) * k) as [number, number, number],
            };
        }
        current.current = next;
        const fit = fitDistance(state.size.width / Math.max(1, state.size.height), SRC_SPAN);
        state.camera.position.copy(viewPosition(next, fit));
        state.camera.lookAt(new Vector3(...next.target));
    });
    return null;
}

// ── Overlays ────────────────────────────────────────────────────────────────

/** The direction of incident sunlight onto channel 2's wing. */
function SunBeam({ scene, clock }: { scene: Scene; clock: StoryClock }) {
    const ref = useRef<Group>(null);
    const from = useMemo(() => onWing(CHANNEL_X[1], 12), []);
    const to = useMemo(() => from.clone().add(new Vector3(...SUN).normalize().multiplyScalar(60)), [from]);
    useFrame(() => {
        if (ref.current) ref.current.visible = sampleNow(scene, clock).illumination > 0;
    });
    return (
        <group ref={ref}>
            <Rod from={to.toArray() as V3} to={from.toArray() as V3} r={0.12} color="#FBBF24" emissive="#FBBF24" emissiveIntensity={0.8} transparent opacity={0.45} metalness={0} roughness={1} />
        </group>
    );
}

function channelRoutes(i: number) {
    const side = Math.sign(CHANNEL_X[i]);
    const wing = onWing(CHANNEL_X[i], 3);
    const joint = new Vector3(side * JOINT_X, 0, 0);
    const battery = new Vector3(BATTERY_X[i], -TRUSS_H - 0.8, 0.4);
    const dist = new Vector3(DIST_X[i], -TRUSS_H - 0.8, -0.9);
    const stack = new Vector3(DIST_X[i] * 0.2, MODULE_Y + 2.3, 2 + i);
    return {
        path: new CatmullRomCurve3([wing, joint, battery, dist, new Vector3(DIST_X[i] * 0.5, -TRUSS_H - 2.6, 0), stack]),
        array: new CatmullRomCurve3([onWing(CHANNEL_X[i], 20), wing, joint, new Vector3(DIST_X[i], -TRUSS_H - 0.4, -0.9)]),
        charge: new CatmullRomCurve3([joint, new Vector3((JOINT_X * side + BATTERY_X[i]) / 2, -TRUSS_H - 0.3, 0.4), battery]),
        discharge: new CatmullRomCurve3([battery, dist, new Vector3(DIST_X[i] * 0.5, -TRUSS_H - 2.6, 0), stack]),
    };
}

/** One power channel: its path (state-coloured) and energy flows, all from the model. */
function Channel({ i, scene, clock, playing, showPath }: { i: number; scene: Scene; clock: StoryClock; playing: boolean; showPath: boolean }) {
    const routes = useMemo(() => channelRoutes(i), [i]);
    const material = useMemo(() => new MeshBasicMaterial({ color: '#22D3EE', transparent: true, opacity: 0.35, toneMapped: false, depthWrite: false }), []);
    const arrayRef = useRef<Group>(null);
    const chargeRef = useRef<Group>(null);
    const dischargeRef = useRef<Group>(null);
    const ok = useMemo(() => new Color('#22D3EE'), []);
    const bad = useMemo(() => new Color('#F87171'), []);
    useEffect(() => () => material.dispose(), [material]);
    useFrame(() => {
        const c = sampleNow(scene, clock).channels[i];
        material.color.copy(c.available ? ok : bad);
        material.opacity = c.available ? 0.3 : 0.85;
        if (arrayRef.current) arrayRef.current.visible = c.arrayDrawnKw > 0.5;
        if (chargeRef.current) chargeRef.current.visible = c.batteryKw > 0.5;
        if (dischargeRef.current) dischargeRef.current.visible = c.batteryKw < -0.5;
    });
    return (
        <group>
            {showPath && (
                <mesh material={material}>
                    <tubeGeometry args={[routes.path, 160, 0.09, 6, false]} />
                </mesh>
            )}
            <group ref={arrayRef} visible={false}>
                <EnergyFlow routes={[[routes.array]]} playing={playing} count={6} size={0.42} speed={0.35} />
            </group>
            <group ref={chargeRef} visible={false}>
                <EnergyFlow routes={[[routes.charge]]} playing={playing} count={4} size={0.42} speed={0.5} />
            </group>
            <group ref={dischargeRef} visible={false}>
                <EnergyFlow routes={[[routes.discharge]]} playing={playing} count={6} size={0.42} speed={0.35} color="#A5B4FC" />
            </group>
        </group>
    );
}

/** Engineering view of battery group 2: cells fill with the modelled state of charge. */
function BatteryCutaway({ scene, clock }: { scene: Scene; clock: StoryClock }) {
    const cells = useRef<InstancedMesh>(null);
    const N = EPS.battery.cellsInSeries;
    const cols = 6;
    const lit = useMemo(() => new Color('#22D3EE'), []);
    const warm = useMemo(() => new Color('#FBBF24'), []);
    const empty = useMemo(() => new Color('#1b2533'), []);
    useEffect(() => {
        const m = new Matrix4();
        const o = new Object3D();
        for (let k = 0; k < N; k++) {
            o.position.set(((k % cols) - (cols - 1) / 2) * 0.62, 0, (Math.floor(k / cols) - 2) * 0.62);
            o.rotation.set(0, 0, 0);
            o.updateMatrix();
            m.copy(o.matrix);
            cells.current?.setMatrixAt(k, m);
        }
        if (cells.current) cells.current.instanceMatrix.needsUpdate = true;
    }, [N]);
    useFrame(() => {
        const c = sampleNow(scene, clock).channels[1];
        const full = Math.round(c.soc * N);
        const hot = c.batteryTempC >= EPS.battery.tempWarningC - 1;
        for (let k = 0; k < N; k++) cells.current?.setColorAt(k, k < full ? (hot ? warm : lit) : empty);
        if (cells.current?.instanceColor) cells.current.instanceColor.needsUpdate = true;
    });
    const leaderFrom: V3 = [BATTERY_X[1], -TRUSS_H - 1.5, 0.6];
    return (
        <group>
            <Rod from={leaderFrom} to={[CUTAWAY[0], CUTAWAY[1] + 2.1, CUTAWAY[2] - 1.2]} r={0.035} color="#22D3EE" emissive="#22D3EE" emissiveIntensity={0.6} metalness={0} roughness={1} transparent opacity={0.7} />
            <group position={CUTAWAY} scale={1.5}>
                {/* Housing, opened: base plate, two walls and a translucent cover. */}
                <Box size={[4.4, 0.18, 3.6]} at={[0, -0.75, 0]} {...ANODISED_LIGHT} />
                <Box size={[0.12, 1.5, 3.6]} at={[-2.2, 0, 0]} {...ANODISED_LIGHT} />
                <Box size={[4.4, 1.5, 0.12]} at={[0, 0, -1.8]} {...ANODISED_LIGHT} />
                <mesh position={[0, 0.8, 0]}>
                    <boxGeometry args={[4.4, 0.06, 3.6]} />
                    <Mat color="#9fb4d8" metalness={0.2} roughness={0.3} transparent opacity={0.18} />
                </mesh>
                <instancedMesh ref={cells} args={[undefined, undefined, N]} position={[0, -0.2, 0.1]}>
                    <cylinderGeometry args={[0.24, 0.24, 1, 20]} />
                    <meshStandardMaterial metalness={0.3} roughness={0.5} emissive="#0a2a33" emissiveIntensity={0.4} />
                </instancedMesh>
                {/* Battery-management board and busbars. */}
                <Box size={[3.8, 0.08, 0.5]} at={[0, 0.45, -1.4]} {...PCB} />
                <Box size={[3.8, 0.06, 0.12]} at={[0, 0.36, 1.35]} {...COPPER} />
                <Box size={[0.3, 0.3, 0.3]} at={[1.9, 0.5, 1.5]} {...GOLD} />
                <Box size={[0.3, 0.3, 0.3]} at={[-1.9, 0.5, 1.5]} {...GOLD} />
                <Anchor id="cutaway" at={[0, 1.6, 0]} />
            </group>
        </group>
    );
}

function FaultMarker({ scene, clock, kind, reducedMotion }: { scene: Scene; clock: StoryClock; kind: 'array' | 'battery' | 'bus'; reducedMotion: boolean }) {
    const ref = useRef<Group>(null);
    const at: V3 = kind === 'array' ? (onWing(CHANNEL_X[1], 4).toArray() as V3) : kind === 'battery' ? [BATTERY_X[1], -TRUSS_H - 0.8, 0] : [DIST_X[1], -TRUSS_H - 0.8, -0.9];
    useFrame(() => {
        const c = sampleNow(scene, clock).channels[1];
        const on = kind === 'array' ? c.arrayHealth < 1 : kind === 'battery' ? c.chargeLimited || c.batteryTempC >= EPS.battery.tempWarningC - 1 : !c.available;
        if (ref.current) ref.current.visible = on;
    });
    const rot: V3 = kind === 'array' ? [-Math.atan2(SUN[1], SUN[2]) + Math.PI / 2, 0, 0] : [Math.PI / 2, 0, 0];
    return (
        <group ref={ref} visible={false}>
            <AnomalyMarker at={at} radius={kind === 'array' ? 2.6 : 1.6} reducedMotion={reducedMotion} rot={rot} />
        </group>
    );
}

// ── Scene ───────────────────────────────────────────────────────────────────

export default function EpsScene({
    scene,
    clock,
    overview,
    playing,
    reducedMotion,
    overlay,
    shadows,
    tones,
}: {
    scene: Scene;
    clock: StoryClock;
    overview: boolean;
    playing: boolean;
    reducedMotion: boolean;
    overlay: boolean;
    shadows: boolean;
    tones: Partial<Record<Highlight, Tone>>;
}) {
    const shadowAt = useMemo(() => (t: number) => 1 - sampleAt(traceOf(scene.scenario), sceneMinute(scene, t)).illumination, [scene]);
    const o = scene.overlays;
    return (
        <>
            <Sky />
            <Reflections sun={SUN} />
            <OrbitLighting clock={clock} shadowAt={shadowAt} sun={SUN} earth={EARTH_POSITION} earthRadius={EARTH_RADIUS} shadows={shadows} shadowBox={[80, 400]} playing={playing} />
            <CameraController scene={scene} clock={clock} overview={overview} reducedMotion={reducedMotion} />
            <pointLight position={[0, MODULE_Y - 4, 6]} intensity={300} distance={40} decay={2} color="#dbeafe" />
            <StationModel tones={tones} faultMarker={false} reducedMotion={reducedMotion} />
            <Anchor id="dist2" at={[DIST_X[1], -TRUSS_H - 1.8, -0.9]} />
            <Anchor id="bat2" at={[BATTERY_X[1], -TRUSS_H - 1.8, 0]} />
            {overlay && (
                <>
                    {o.sun && <SunBeam scene={scene} clock={clock} />}
                    {(o.flows || o.channels) && [0, 1, 2, 3].map((i) => <Channel key={i} i={i} scene={scene} clock={clock} playing={playing} showPath={!!o.channels} />)}
                    {o.cutaway && <BatteryCutaway scene={scene} clock={clock} />}
                    {o.marker && <FaultMarker scene={scene} clock={clock} kind={o.marker} reducedMotion={reducedMotion} />}
                </>
            )}
        </>
    );
}

