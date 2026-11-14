"use client";
// Experience 02 · Orbital Constellation. Earth at the centre (1 unit = 100 km), turning once per
// sidereal day; 30 satellites on circular orbits drawn with instancing; orbit rings fixed in
// inertial space; coverage caps whose size comes from the elevation geometry; ground stations on
// the turning Earth; ground links only above the elevation mask. Every position comes from the
// orbit model at the simulated time, so the picture and the readouts always agree.
import { useContext, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import {
    AdditiveBlending,
    BufferAttribute,
    BufferGeometry,
    Color,
    CylinderGeometry,
    DynamicDrawUsage,
    Matrix4,
    Object3D,
    Quaternion,
    ShaderMaterial,
    SphereGeometry,
    Vector3,
    type Group,
    type InstancedMesh,
    type LineSegments,
    type Points,
} from 'three';
import {
    CON,
    CON_HALF_ANGLE_DEG,
    CON_HOME,
    CON_MIN_ELEV_DEG,
    CON_SLOTS,
    CON_SPAN,
    CON_STATIONS,
    CON_SUN_SCENE,
    CON_EARTH0_DEG,
    conCameraAt,
    conLayers,
    conSimMinutes,
    toScene,
} from '@/lib/space-twin/constellation';
import { RE_KM, earthRotationDeg, elevationDeg, geoToEcef, lineOfSight, positionEci, rotateZ, type Vec3 } from '@/lib/space-twin/orbit';
import { Earth, Reflections, Sky } from '../environment';
import { LabelContext, useLabelAnchor } from '../labels';
import { GLOW } from '../primitives';
import { StoryCamera, type SceneProps } from './shared';

const N = CON.total;
const R = RE_KM / 100;
const DEG = Math.PI / 180;
const SUN = new Vector3(...CON_SUN_SCENE);
const LAMBDA = CON_HALF_ANGLE_DEG * DEG;
const ORBIT_COLOR = '#A5B4FC';

/** Orbit rings: each plane's circle, fixed in inertial space. */
function OrbitRings() {
    const geometries = useMemo(
        () =>
            Array.from({ length: CON.planes }, (_, p) => {
                const slot = CON_SLOTS[p * (N / CON.planes)];
                const pts: number[] = [];
                const period = 2 * Math.PI * Math.sqrt((RE_KM + slot.altKm) ** 3 / 398600) / 60;
                for (let i = 0; i <= 256; i++) pts.push(...toScene(positionEci(slot, (period * i) / 256)));
                const g = new BufferGeometry();
                g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
                return g;
            }),
        [],
    );
    useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);
    return (
        <group>
            {geometries.map((g, i) => (
                <line key={i}>
                    <primitive object={g} attach="geometry" />
                    <lineBasicMaterial color={ORBIT_COLOR} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
                </line>
            ))}
        </group>
    );
}

/** A ground station on the Earth-fixed frame: a small mast and a ring on the surface. */
function Station({ id, lat, lon }: { id: string; lat: number; lon: number }) {
    const ref = useRef<Group>(null);
    useLabelAnchor(id, ref, [0, 2.2, 0]);
    const { position, quaternion } = useMemo(() => {
        const p = new Vector3(...toScene(geoToEcef(lat, lon)));
        const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), p.clone().normalize());
        return { position: p, quaternion: q };
    }, [lat, lon]);
    return (
        <group ref={ref} position={position} quaternion={quaternion}>
            <mesh position={[0, 0.45, 0]}>
                <coneGeometry args={[0.32, 0.9, 12]} />
                <meshBasicMaterial color="#e2e8f0" toneMapped={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
                <ringGeometry args={[0.55, 0.75, 32]} />
                <meshBasicMaterial color={GLOW.info} transparent opacity={0.8} toneMapped={false} />
            </mesh>
        </group>
    );
}

const STATION_ECEF: Vec3[] = CON_STATIONS.map((g) => geoToEcef(g.lat, g.lon));

/** Satellites, footprints and links, moved every frame from the orbit model. */
function Fleet({ clock, phase, selected, onSelect }: Pick<SceneProps, 'clock' | 'phase' | 'selected' | 'onSelect'>) {
    const bodies = useRef<InstancedMesh>(null);
    const panels = useRef<InstancedMesh>(null);
    const hits = useRef<InstancedMesh>(null);
    const caps = useRef<InstancedMesh>(null);
    const rims = useRef<InstancedMesh>(null);
    const groundLinks = useRef<InstancedMesh>(null);
    const crossLinks = useRef<LineSegments>(null);
    const glints = useRef<Points>(null);
    const marker = useRef<Group>(null);
    const anchor = useRef<Group>(null);
    const layers = conLayers(phase);
    const selectedIndex = selected ? Number(selected.slice(4)) : null;
    useLabelAnchor(selected, anchor, [0, 2.4, 0]);

    const tmp = useMemo(
        () => ({
            eci: Array.from({ length: N }, () => [0, 0, 0] as Vec3),
            ahead: [0, 0, 0] as Vec3,
            stations: STATION_ECEF.map(() => [0, 0, 0] as Vec3),
            o: new Object3D(),
            p: new Vector3(),
            fwd: new Vector3(),
            up: new Vector3(),
            right: new Vector3(),
            m: new Matrix4(),
            q: new Quaternion(),
            y: new Vector3(0, 1, 0),
            z: new Vector3(0, 0, 1),
            lit: new Color('#d7dce4'),
            dark: new Color('#3b4252'),
            a: new Vector3(),
            b: new Vector3(),
        }),
        [],
    );
    const dpr = useThree((s) => s.viewport.dpr);

    const linkGeometry = useMemo(() => new CylinderGeometry(0.13, 0.13, 1, 6, 1, true), []);
    const glintGeometry = useMemo(() => {
        const g = new BufferGeometry();
        const p = new BufferAttribute(new Float32Array(N * 3), 3);
        const c = new BufferAttribute(new Float32Array(N * 3), 3);
        p.setUsage(DynamicDrawUsage);
        c.setUsage(DynamicDrawUsage);
        g.setAttribute('position', p);
        g.setAttribute('aColor', c);
        return g;
    }, []);
    const glintMaterial = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: { uPx: { value: dpr } },
                vertexShader: /* glsl */ `
                    attribute vec3 aColor; uniform float uPx; varying vec3 vColor;
                    void main() { vColor = aColor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = 11.0 * uPx; }`,
                fragmentShader: /* glsl */ `
                    varying vec3 vColor;
                    void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vColor * a * a, a); }`,
                transparent: true,
                depthWrite: false,
                blending: AdditiveBlending,
            }),
        [dpr],
    );
    const crossGeometry = useMemo(() => {
        const g = new BufferGeometry();
        const a = new BufferAttribute(new Float32Array(N * 6), 3);
        a.setUsage(DynamicDrawUsage);
        g.setAttribute('position', a);
        g.setDrawRange(0, 0);
        return g;
    }, []);
    const capGeometry = useMemo(() => new SphereGeometry(R * 1.004, 48, 6, 0, Math.PI * 2, 0, LAMBDA), []);
    useEffect(
        () => () => {
            linkGeometry.dispose();
            crossGeometry.dispose();
            capGeometry.dispose();
            glintGeometry.dispose();
        },
        [linkGeometry, crossGeometry, capGeometry, glintGeometry],
    );
    useEffect(() => () => glintMaterial.dispose(), [glintMaterial]);

    useFrame(() => {
        const tMin = conSimMinutes(clock.elapsed);
        const earthDeg = earthRotationDeg(tMin, CON_EARTH0_DEG);
        const t = tmp;
        for (let i = 0; i < N; i++) {
            positionEci(CON_SLOTS[i], tMin, t.eci[i]);
            positionEci(CON_SLOTS[i], tMin + 0.2, t.ahead);
            t.p.set(...toScene(t.eci[i]));
            t.up.copy(t.p).normalize();
            t.fwd.set(...toScene(t.ahead)).sub(t.p).normalize();
            t.right.crossVectors(t.fwd, t.up).normalize();
            t.m.makeBasis(t.right, t.up, t.fwd);
            t.o.position.copy(t.p);
            t.o.quaternion.setFromRotationMatrix(t.m);
            t.o.scale.setScalar(1);
            t.o.updateMatrix();
            bodies.current?.setMatrixAt(i, t.o.matrix);
            panels.current?.setMatrixAt(i, t.o.matrix);
            hits.current?.setMatrixAt(i, t.o.matrix);
            // Sunlit or in Earth's cylindrical shadow: dim the satellites that are in eclipse.
            const along = t.p.dot(SUN);
            const inShadow = along < 0 && t.p.lengthSq() - along * along < R * R;
            bodies.current?.setColorAt(i, inShadow ? t.dark : t.lit);
            // A small glint makes every satellite findable; dimmer in eclipse, cyan when selected.
            const gp = glintGeometry.attributes.position as BufferAttribute;
            const gc = glintGeometry.attributes.aColor as BufferAttribute;
            gp.setXYZ(i, t.p.x, t.p.y, t.p.z);
            if (i === selectedIndex) gc.setXYZ(i, 0.13, 0.83, 0.93);
            else if (inShadow) gc.setXYZ(i, 0.28, 0.3, 0.42);
            else gc.setXYZ(i, 0.95, 0.93, 0.86);
            // Footprint cap and rim: centred under the satellite.
            t.q.setFromUnitVectors(t.y, t.up);
            t.o.position.set(0, 0, 0);
            t.o.quaternion.copy(t.q);
            t.o.updateMatrix();
            caps.current?.setMatrixAt(i, t.o.matrix);
            t.o.position.copy(t.up).multiplyScalar(R * Math.cos(LAMBDA) * 1.004);
            t.o.quaternion.setFromUnitVectors(t.z, t.up);
            t.o.updateMatrix();
            rims.current?.setMatrixAt(i, t.o.matrix);
        }
        for (const mesh of [bodies.current, panels.current, hits.current, caps.current, rims.current]) if (mesh) mesh.instanceMatrix.needsUpdate = true;
        if (bodies.current?.instanceColor) bodies.current.instanceColor.needsUpdate = true;
        glintGeometry.attributes.position.needsUpdate = true;
        glintGeometry.attributes.aColor.needsUpdate = true;

        // Ground links: only when the satellite is above the station's elevation mask.
        let k = 0;
        const links = groundLinks.current;
        STATION_ECEF.forEach((g, gi) => {
            rotateZ(g, earthDeg, t.stations[gi]);
            for (let i = 0; i < N; i++) {
                if (!links || elevationDeg(t.stations[gi], t.eci[i]) < CON_MIN_ELEV_DEG) continue;
                t.a.set(...toScene(t.stations[gi]));
                t.b.set(...toScene(t.eci[i]));
                t.fwd.subVectors(t.b, t.a);
                t.o.position.copy(t.a).add(t.b).multiplyScalar(0.5);
                t.o.quaternion.setFromUnitVectors(t.y, t.fwd.clone().normalize());
                t.o.scale.set(1, t.fwd.length(), 1);
                t.o.updateMatrix();
                links.setMatrixAt(k++, t.o.matrix);
            }
        });
        if (links) {
            links.count = k;
            links.instanceMatrix.needsUpdate = true;
        }

        // In-plane links between neighbours, only with a clear line of sight.
        let c = 0;
        const cp = crossGeometry.attributes.position as BufferAttribute;
        const perPlane = N / CON.planes;
        for (let i = 0; i < N; i++) {
            const next = CON_SLOTS[i].plane * perPlane + ((CON_SLOTS[i].slot + 1) % perPlane);
            if (!lineOfSight(t.eci[i], t.eci[next], 100)) continue;
            const a = toScene(t.eci[i]);
            const b = toScene(t.eci[next]);
            cp.setXYZ(c++, a[0], a[1], a[2]);
            cp.setXYZ(c++, b[0], b[1], b[2]);
        }
        cp.needsUpdate = true;
        crossGeometry.setDrawRange(0, c);

        if (selectedIndex !== null) {
            const p = toScene(t.eci[selectedIndex]);
            marker.current?.position.set(...p);
            anchor.current?.position.set(...p);
            marker.current?.lookAt(0, 0, 0);
        }
    });

    const pick = (e: ThreeEvent<MouseEvent>) => {
        if (e.instanceId === undefined || e.delta > 6) return;
        e.stopPropagation();
        onSelect(`sat-${e.instanceId}`);
    };

    return (
        <group>
            <instancedMesh ref={bodies} args={[undefined, undefined, N]}>
                <boxGeometry args={[0.75, 0.75, 1.2]} />
                <meshStandardMaterial color="#ffffff" metalness={0.6} roughness={0.35} />
            </instancedMesh>
            <instancedMesh ref={panels} args={[undefined, undefined, N]}>
                <boxGeometry args={[4.0, 0.06, 0.85]} />
                <meshStandardMaterial color="#2a4a92" metalness={0.5} roughness={0.4} emissive="#0e2148" emissiveIntensity={0.5} />
            </instancedMesh>
            {/* Generous invisible targets, so a satellite is easy to click or tap. */}
            <instancedMesh
                ref={hits}
                args={[undefined, undefined, N]}
                onClick={pick}
                onPointerOver={() => {
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                    document.body.style.cursor = '';
                }}
            >
                <sphereGeometry args={[2.4, 8, 6]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
            </instancedMesh>
            <instancedMesh ref={caps} args={[capGeometry, undefined, N]} visible={layers.footprints}>
                <meshBasicMaterial color={ORBIT_COLOR} transparent opacity={0.09} depthWrite={false} />
            </instancedMesh>
            <instancedMesh ref={rims} args={[undefined, undefined, N]} visible={layers.footprints}>
                <torusGeometry args={[R * Math.sin(LAMBDA), 0.07, 6, 72]} />
                <meshBasicMaterial color={ORBIT_COLOR} transparent opacity={0.55} depthWrite={false} toneMapped={false} />
            </instancedMesh>
            <instancedMesh ref={groundLinks} args={[linkGeometry, undefined, N * CON_STATIONS.length]} visible={layers.links} frustumCulled={false}>
                <meshBasicMaterial color={GLOW.info} transparent opacity={0.9} toneMapped={false} />
            </instancedMesh>
            <lineSegments ref={crossLinks} geometry={crossGeometry} visible={layers.links}>
                <lineBasicMaterial color={GLOW.info} transparent opacity={0.4} depthWrite={false} toneMapped={false} />
            </lineSegments>
            <points ref={glints} geometry={glintGeometry} material={glintMaterial} frustumCulled={false} />
            {selectedIndex !== null && (
                <group ref={marker}>
                    <mesh>
                        <torusGeometry args={[2.2, 0.09, 8, 48]} />
                        <meshBasicMaterial color={GLOW.info} toneMapped={false} />
                    </mesh>
                </group>
            )}
            <group ref={anchor} />
        </group>
    );
}

/** The Earth stops clicks and hovers, so a satellite behind it cannot be picked through it. */
function EarthBlocker() {
    const stop = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.stopPropagation();
    return (
        <mesh onClick={stop} onPointerMove={stop} onPointerOver={stop}>
            <sphereGeometry args={[R * 1.01, 32, 24]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
    );
}

/** Labels for the stations hide behind the Earth. */
function Occluder() {
    const registry = useContext(LabelContext);
    useEffect(() => {
        registry?.setOccluder({ centre: new Vector3(0, 0, 0), radius: R });
        return () => registry?.setOccluder(null);
    }, [registry]);
    return null;
}

export default function ConstellationScene({ clock, phase, playing, reducedMotion, selected, onSelect, viewRef, lowQuality }: SceneProps) {
    const sun = useRef(SUN.clone());
    const angle = useMemo(() => () => earthRotationDeg(conSimMinutes(clock.elapsed), CON_EARTH0_DEG) * DEG, [clock]);
    const viewAt = useMemo(() => (t: number) => (t < 0 ? CON_HOME : conCameraAt(t)), []);
    const layers = conLayers(phase);
    const sunPos = useMemo(() => SUN.clone().multiplyScalar(600).toArray() as [number, number, number], []);
    return (
        <>
            <Sky earthward={[0, -1, 0]} />
            <Reflections sun={CON_SUN_SCENE} />
            <hemisphereLight args={['#9fb4d8', '#0b1430', 0.25]} />
            <directionalLight position={sunPos} intensity={2.6} color="#fff2df" />
            <Earth radius={R} position={[0, 0, 0]} sun={sun} tilt={0} angle={angle} playing={playing} clouds={!lowQuality}>
                {CON_STATIONS.map((g) => (
                    <Station key={g.id} id={g.id} lat={g.lat} lon={g.lon} />
                ))}
            </Earth>
            {layers.rings && <OrbitRings />}
            <Fleet clock={clock} phase={phase} selected={selected} onSelect={onSelect} />
            <EarthBlocker />
            <Occluder />
            <StoryCamera clock={clock} viewAt={viewAt} home={CON_HOME} span={CON_SPAN} reducedMotion={reducedMotion} viewRef={viewRef} />
        </>
    );
}
