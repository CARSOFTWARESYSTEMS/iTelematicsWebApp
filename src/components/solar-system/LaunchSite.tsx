'use client';
// The conceptual coastal launch complex, laid out as one engineering facility:
// - a raised concrete hardstand with a flame trench running north under the launch table and a steel
//   flame deflector, so the exhaust is turned away from the vehicle and out of the trench;
// - the launch table on four pedestals with hold-down clamps and two tail-service masts;
// - a fixed umbilical tower (steel lattice, platforms, an elevator core and three service arms whose
//   umbilical lines swing away before ignition), topped by a lightning mast;
// - catenary lightning protection (three masts and their wires), the sound-suppression water tower;
// - the propellant farm: liquid-oxygen and liquid-hydrogen spheres and kerosene tanks, piped to the pad;
// - lighting towers, a perimeter road, the pad terminal, a service building and, further away, the
//   vehicle integration hangar and the launch control centre;
// - coastal terrain with gentle relief, a beach and dunes, and the ocean to the east, the direction of
//   launch.
// Surfaces are licensed photographs (Poly Haven, CC0; docs/ASSET_SOURCES.md) or drawn in code
// (textures.ts). The ignition cloud and the exhaust trail are pure functions of mission time (seeded),
// so replays and jumps look the same every time.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
    BufferGeometry,
    CanvasTexture,
    CatmullRomCurve3,
    Color,
    DoubleSide,
    Float32BufferAttribute,
    FogExp2,
    IcosahedronGeometry,
    InstancedMesh,
    Line,
    LineBasicMaterial,
    MeshStandardMaterial,
    Object3D,
    RepeatWrapping,
    ShaderMaterial,
    SRGBColorSpace,
    TextureLoader,
    Vector3,
    type Group,
    type Mesh,
    type Texture,
} from 'three';
import { R_EARTH } from '@/lib/solar-system/constants';
import { flight, sampleAt } from '@/lib/solar-system/flight';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ExhaustClouds, VolumePlume } from './exhaust';
import { SUN } from './sun';
import { LOGDEPTH } from './environment';
import { cladding, paintedSteel, repeated, type SurfaceSet } from './textures';

/** Height of the launch table deck: the vehicle's base sits here. */
export const MOUNT_TOP = 7.4;
/** Hardstand deck level. */
export const DECK = 3.0;
const TOWER_X = -13.5; // tower centre, west of the vehicle
const TOWER_H = 74; // above the deck
const TRENCH_HALF = 6; // half width of the flame trench (it runs north, along −z)
const TRENCH_EXIT = new Vector3(0, 0.6, -52);
const GROUND_RADIUS = 60000;
const SUN_SITE = SUN;

/** The coastline (east of the pad), x as a function of z; the same formula is used in the shaders. */
export const coastX = (z: number) => 720 + 170 * Math.sin(z * 0.00042 + 0.6) + 80 * Math.sin(z * 0.0013 + 2.1);
const COAST_GLSL = /* glsl */ `float coastAt(float z) { return 720.0 + 170.0 * sin(z * 0.00042 + 0.6) + 80.0 * sin(z * 0.0013 + 2.1); }`;

// ── Licensed surfaces ─────────────────────────────────────────────────────

type SiteMaps = { grass: Texture; grassN: Texture; beach: Texture; beachN: Texture; concrete: Texture; concreteN: Texture; metal: Texture; metalN: Texture };
const MapsContext = createContext<SiteMaps | null>(null);
const BASE = '/images/solar-system/';

/** Loads the site's photographic surfaces once per canvas; the site renders plain colours until they arrive. */
export function SiteTextures({ children }: { children: ReactNode }) {
    const { gl, invalidate } = useThree();
    const [maps, setMaps] = useState<SiteMaps | null>(null);
    useEffect(() => {
        let alive = true;
        const loader = new TextureLoader();
        const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
        const load = (file: string, color: boolean) =>
            loader.loadAsync(BASE + file).then((t) => {
                if (color) t.colorSpace = SRGBColorSpace;
                t.wrapS = t.wrapT = RepeatWrapping;
                t.anisotropy = aniso;
                return t;
            });
        Promise.all([
            load('terrain-grass-rock.jpg', true),
            load('terrain-grass-rock-normal.jpg', false),
            load('terrain-beach.jpg', true),
            load('terrain-beach-normal.jpg', false),
            load('concrete.jpg', true),
            load('concrete-normal.jpg', false),
            load('corrugated.jpg', true),
            load('corrugated-normal.jpg', false),
        ])
            .then(([grass, grassN, beach, beachN, concrete, concreteN, metal, metalN]) => {
                const m = { grass, grassN, beach, beachN, concrete, concreteN, metal, metalN };
                if (!alive) return Object.values(m).forEach((t) => t.dispose());
                setMaps(m);
                invalidate();
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [gl, invalidate]);
    useEffect(() => () => Object.values(maps ?? {}).forEach((t) => (t as Texture).dispose()), [maps]);
    return <MapsContext.Provider value={maps}>{children}</MapsContext.Provider>;
}

/** A copy of a texture with its own repeat (the image is shared, not duplicated). */
function useRepeat(t: Texture | undefined, x: number, y: number) {
    const c = useMemo(() => {
        if (!t) return null;
        const k = t.clone();
        k.repeat.set(x, y);
        k.needsUpdate = true;
        return k;
    }, [t, x, y]);
    useEffect(() => () => c?.dispose(), [c]);
    return c;
}

function useMat(params: ConstructorParameters<typeof MeshStandardMaterial>[0], deps: unknown[] = []) {
    const m = useMemo(() => new MeshStandardMaterial(params), deps);
    useEffect(() => () => m.dispose(), [m]);
    return m;
}

/** A procedural surface set with its own repeat, released with the component. */
function useSurface(make: () => SurfaceSet, x = 1, y = 1) {
    const set = useMemo(() => (typeof document === 'undefined' ? null : repeated(make(), x, y)), [x, y]);
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

const NOISE_GLSL = /* glsl */ `
    float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
    float fbm(vec2 p) { float a = 0.5; float s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
    ${COAST_GLSL}
`;

// ── Terrain ───────────────────────────────────────────────────────────────

/** Ground height (m): flat around the pad, low dunes behind the beach, rolling country inland. */
export function terrainHeight(x: number, z: number) {
    const d = Math.hypot(x, z);
    const toCoast = coastX(z) - x; // metres inland from the shoreline
    if (toCoast < 0) return -1.2;
    // The beach rises from just above the waterline to the general ground level 80 m inland.
    const beach = toCoast < 80 ? -0.4 + (toCoast / 80) * 0.4 : 0;
    const dunes = toCoast < 420 ? (1 - toCoast / 420) * (2.2 + 1.8 * Math.sin(z * 0.021) * Math.sin(x * 0.017 + 1.3)) * Math.min(1, toCoast / 40) : 0;
    const inland = Math.max(0, Math.min(1, (toCoast - 300) / 900));
    const away = Math.max(0, Math.min(1, (d - 650) / 2600));
    const rolling = (Math.sin(x * 0.0011 + 0.7) * Math.sin(z * 0.0009 + 2.3) + 0.6 * Math.sin(x * 0.0023 - z * 0.0017 + 4.1) + 0.35 * Math.sin(x * 0.0051 + z * 0.0043)) * 18 + 14;
    const far = Math.max(0, Math.min(1, (d - 7000) / 16000));
    const hills = (Math.sin(x * 0.00027 + 1.9) * Math.sin(z * 0.00031 + 0.4) + 0.7) * 150;
    return beach + dunes + inland * away * rolling + inland * far * hills;
}

/** A polar grid (dense near the pad, sparse far away) displaced by the terrain height. */
function terrainGeometry() {
    const rings = 96;
    const sectors = 220;
    const pos: number[] = [];
    const index: number[] = [];
    const radius = (i: number) => (i === 0 ? 0 : 40 * Math.pow(GROUND_RADIUS / 40, (i - 1) / (rings - 1)));
    for (let i = 0; i <= rings; i++) {
        const r = radius(i);
        for (let j = 0; j < sectors; j++) {
            const a = (j / sectors) * Math.PI * 2;
            const x = r * Math.cos(a);
            const z = r * Math.sin(a);
            pos.push(x, r < 70 ? 0 : terrainHeight(x, z), z);
        }
    }
    for (let i = 0; i < rings; i++)
        for (let j = 0; j < sectors; j++) {
            const a = i * sectors + j;
            const b = i * sectors + ((j + 1) % sectors);
            const c = (i + 1) * sectors + j;
            const d = (i + 1) * sectors + ((j + 1) % sectors);
            // Counter-clockwise seen from above, so the surface faces up.
            index.push(a, b, c, b, d, c);
        }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    return g;
}

/**
 * Land: photographic grass-and-rock terrain sampled at two scales (no visible tiling from afar), sandy
 * patches and a beach towards the coast, scrub darkening in hollows, lit and shadowed like any surface
 * and hazed by the scene fog. East of the coastline the land is cut away to show the ocean.
 */
function Land({ opacity }: { opacity: () => number }) {
    const maps = useContext(MapsContext);
    const ref = useRef<Mesh>(null);
    const geometry = useMemo(() => terrainGeometry(), []);
    useEffect(() => () => geometry.dispose(), [geometry]);
    const material = useMemo(() => {
        const m = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.97, metalness: 0, map: maps?.grass ?? null, transparent: true });
        m.onBeforeCompile = (shader) => {
            shader.uniforms.uBeach = { value: maps?.beach ?? null };
            shader.uniforms.uOpacity = { value: 1 };
            m.userData.shader = shader;
            shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWorldP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
            shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWorldP;\nuniform sampler2D uBeach;\nuniform float uOpacity;\n${NOISE_GLSL}`).replace(
                '#include <map_fragment>',
                /* glsl */ `
                    vec2 wp = vWorldP.xz;
                    float coast = coastAt(wp.y);
                    if (wp.x > coast + 2.0) discard;
                    float camDist = length(cameraPosition - vWorldP);
                    // Anti-tiling: two samples at different rotations and scales, blended by low-frequency noise.
                    float w = smoothstep(0.3, 0.7, fbm(wp * 0.012));
                    vec2 r1 = mat2(0.8, -0.6, 0.6, 0.8) * wp;
                    #ifdef USE_MAP
                    vec3 gA = texture2D(map, wp / 16.0).rgb;
                    vec3 gB = texture2D(map, r1 / 21.0 + 0.41).rgb;
                    vec3 gNear = mix(gA, gB, w);
                    vec3 gFar = texture2D(map, (mat2(0.6, 0.8, -0.8, 0.6) * wp) / 240.0 + 0.37).rgb;
                    vec3 grass = mix(gNear, gFar, smoothstep(80.0, 700.0, camDist) * 0.7);
                    vec3 sand = texture2D(uBeach, wp / 30.0).rgb;
                    #else
                    // Until the photographs arrive: their average colours.
                    vec3 grass = vec3(0.3, 0.29, 0.19) * (0.85 + 0.3 * w);
                    vec3 sand = vec3(0.62, 0.57, 0.45);
                    #endif
                    float beach = smoothstep(coast - 200.0, coast - 25.0, wp.x);
                    float patches = smoothstep(0.66, 0.86, fbm(wp * 0.0035 + 7.0)) * 0.3;
                    // Low coastal scrub (saw palmetto, wax myrtle): dark olive cover broken by sandy grass,
                    // at two scales so it reads as vegetation from the pad and from a kilometre away.
                    float scrub = smoothstep(0.32, 0.62, fbm(wp * 0.006 + 3.0) * 0.65 + fbm(wp * 0.045 + 11.0) * 0.35) * (1.0 - beach);
                    vec3 col = mix(grass, sand, max(beach, patches));
                    col = mix(col, col * vec3(0.42, 0.55, 0.3), scrub * 0.85);
                    // Crushed-stone apron inside the perimeter road, kept clear of vegetation.
                    float r = length(wp);
                    float apron = 1.0 - smoothstep(128.0, 150.0, r + (fbm(wp * 0.08) - 0.5) * 14.0);
                    vec3 gravel = sand * vec3(0.86, 0.86, 0.88) * (0.85 + 0.3 * fbm(wp * 0.4));
                    col = mix(col, gravel, apron);
                    scrub *= 1.0 - apron;
                    // From afar the texture's repeat would show: fade to its average colour, varied by large-scale noise.
                    vec3 avg = mix(vec3(0.25, 0.26, 0.15), vec3(0.62, 0.57, 0.45), max(beach, patches));
                    avg = mix(avg, avg * vec3(0.48, 0.6, 0.36), scrub * 0.85);
                    avg = mix(avg, vec3(0.55, 0.52, 0.47), apron);
                    col = mix(col, avg, smoothstep(350.0, 2600.0, camDist));
                    col *= (0.8 + 0.42 * fbm(wp * 0.0009)) * 0.9;
                    // Wet sand darkens at the waterline.
                    col *= 1.0 - 0.35 * smoothstep(coast - 12.0, coast, wp.x);
                    diffuseColor.rgb *= col;
                    diffuseColor.a *= uOpacity;
                    `,
            );
        };
        return m;
    }, [maps]);
    useEffect(() => () => material.dispose(), [material]);
    useFrame(() => {
        const o = opacity();
        const shader = material.userData.shader as { uniforms: Record<string, { value: number }> } | undefined;
        if (shader) shader.uniforms.uOpacity.value = o;
        material.depthWrite = o > 0.99;
        if (ref.current) ref.current.visible = o > 0.003;
    });
    return <mesh ref={ref} geometry={geometry} material={material} receiveShadow renderOrder={-5} />;
}

/** The ocean east of the coast: Fresnel reflection of the sky, wind waves, surf, the Sun's glitter, haze. */
function Ocean({ opacity }: { opacity: () => number }) {
    const ref = useRef<Mesh>(null);
    const scene = useThree((s) => s.scene);
    const material = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: { uSun: { value: SUN_SITE.clone() }, uTime: { value: 0 }, uFog: { value: new Color('#aebfd2') }, uFogDensity: { value: 0 }, uOpacity: { value: 1 } },
                vertexShader: /* glsl */ `${LOGDEPTH.vPars}
                    varying vec3 vPos;
                    void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; ${LOGDEPTH.v} }`,
                fragmentShader: /* glsl */ `${LOGDEPTH.fPars}
                    uniform vec3 uSun; uniform float uTime; uniform vec3 uFog; uniform float uFogDensity; uniform float uOpacity;
                    varying vec3 vPos;
                    ${NOISE_GLSL}
                    float waves(vec2 p) {
                        float h = 0.0;
                        h += sin(dot(p, vec2(0.021, 0.013)) + uTime * 0.9) * 0.6;
                        h += sin(dot(p, vec2(-0.017, 0.029)) + uTime * 1.1) * 0.4;
                        h += (vnoise(p * 0.08 + uTime * 0.05) - 0.5) * 0.5;
                        h += (vnoise(p * 0.31 - uTime * 0.12) - 0.5) * 0.18;
                        return h;
                    }
                    void main() {
                        ${LOGDEPTH.f}
                        vec2 p = vPos.xz;
                        float dist = length(cameraPosition - vPos);
                        float e = 0.6 + dist * 0.0006;
                        float hx = waves(p + vec2(e, 0.0)) - waves(p - vec2(e, 0.0));
                        float hz = waves(p + vec2(0.0, e)) - waves(p - vec2(0.0, e));
                        float calm = smoothstep(800.0, 9000.0, dist);
                        vec3 n = normalize(vec3(-hx, 2.0 * e * (1.0 + calm * 6.0), -hz));
                        vec3 v = normalize(cameraPosition - vPos);
                        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
                        vec3 r = reflect(-v, n);
                        vec3 sky = mix(vec3(0.62, 0.72, 0.84), vec3(0.2, 0.36, 0.66), clamp(r.y * 1.8, 0.0, 1.0));
                        float off = p.x - coastAt(p.y);
                        // Shallow water is greener and brighter near the shore.
                        vec3 deep = mix(vec3(0.03, 0.12, 0.13), vec3(0.012, 0.05, 0.075), smoothstep(10.0, 260.0, off)) * (0.55 + 0.6 * max(uSun.y, 0.0));
                        vec3 col = mix(deep, sky, fres);
                        col += vec3(1.0, 0.95, 0.85) * pow(max(dot(r, uSun), 0.0), 380.0) * 6.0;
                        // Surf: breaking bands parallel to the beach.
                        float surf = smoothstep(0.55, 0.9, sin(off * 0.16 - uTime * 1.2 + vnoise(p * 0.05) * 3.0)) * (1.0 - smoothstep(4.0, 70.0, off));
                        col = mix(col, vec3(0.86, 0.9, 0.92), surf * 0.7 * (1.0 - calm));
                        float f = 1.0 - exp(-pow(uFogDensity * dist, 2.0));
                        col = mix(col, uFog, clamp(f, 0.0, 1.0));
                        gl_FragColor = vec4(col, uOpacity);
                        #include <colorspace_fragment>
                    }`,
                transparent: true,
            }),
        [],
    );
    useEffect(() => () => material.dispose(), [material]);
    useFrame((st) => {
        const o = opacity();
        material.uniforms.uOpacity.value = o;
        material.uniforms.uTime.value = st.clock.elapsedTime;
        const fog = scene.fog as FogExp2 | null;
        if (fog) {
            material.uniforms.uFogDensity.value = fog.density;
            (material.uniforms.uFog.value as Color).copy(fog.color);
        }
        material.depthWrite = o > 0.99;
        if (ref.current) ref.current.visible = o > 0.003;
    });
    return (
        <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} material={material} renderOrder={-6}>
            <circleGeometry args={[GROUND_RADIUS, 96]} />
        </mesh>
    );
}

// ── Structural helpers ────────────────────────────────────────────────────

type Beam = { from: [number, number, number]; to: [number, number, number]; w: number };

/** Many straight members (columns, girts, braces) as one instanced mesh of unit boxes. */
function Members({ beams, material, cast = true }: { beams: Beam[]; material: MeshStandardMaterial; cast?: boolean }) {
    const ref = useRef<InstancedMesh>(null);
    useEffect(() => {
        const mesh = ref.current;
        if (!mesh) return;
        const o = new Object3D();
        const a = new Vector3();
        const b = new Vector3();
        const up = new Vector3(0, 1, 0);
        beams.forEach((m, i) => {
            a.fromArray(m.from);
            b.fromArray(m.to);
            const len = a.distanceTo(b);
            o.position.copy(a).add(b).multiplyScalar(0.5);
            o.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
            o.scale.set(m.w, len, m.w);
            o.updateMatrix();
            mesh.setMatrixAt(i, o.matrix);
        });
        mesh.count = beams.length;
        mesh.instanceMatrix.needsUpdate = true;
        // Bounds from every member, so the structure is not culled when its foot leaves the frame.
        mesh.computeBoundingBox();
        mesh.computeBoundingSphere();
    }, [beams]);
    return (
        <instancedMesh ref={ref} args={[undefined, material, beams.length]} castShadow={cast} receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
        </instancedMesh>
    );
}

/** Members of a square lattice tower of side `w` and height `h`: columns, girts and X bracing per bay. */
function latticeBeams(w: number, h: number, bay: number, col: number, brace: number, offset: [number, number, number] = [0, 0, 0]): Beam[] {
    const out: Beam[] = [];
    const s = w / 2;
    const [ox, oy, oz] = offset;
    const P = (x: number, y: number, z: number): [number, number, number] => [x + ox, y + oy, z + oz];
    const corners: [number, number][] = [
        [-s, -s],
        [s, -s],
        [s, s],
        [-s, s],
    ];
    for (const [x, z] of corners) out.push({ from: P(x, 0, z), to: P(x, h, z), w: col });
    const bays = Math.round(h / bay);
    for (let k = 0; k <= bays; k++) {
        const y = Math.min(h, k * bay);
        for (let c = 0; c < 4; c++) {
            const [x0, z0] = corners[c];
            const [x1, z1] = corners[(c + 1) % 4];
            out.push({ from: P(x0, y, z0), to: P(x1, y, z1), w: brace * 1.2 });
            if (k < bays) {
                const y1 = Math.min(h, y + bay);
                out.push({ from: P(x0, y, z0), to: P(x1, y1, z1), w: brace });
                out.push({ from: P(x1, y, z1), to: P(x0, y1, z0), w: brace });
            }
        }
    }
    return out;
}

/** A sagging cable between two points (for catenary wires and umbilical lines). */
function sagPoints(a: Vector3, b: Vector3, sag: number, n = 24) {
    return Array.from({ length: n + 1 }, (_, i) => {
        const t = i / n;
        return a
            .clone()
            .lerp(b, t)
            .add(new Vector3(0, -sag * 4 * t * (1 - t), 0));
    });
}

function Wires({ spans, color = '#3b4048', opacity = 0.75 }: { spans: Vector3[][]; color?: string; opacity?: number }) {
    const lines = useMemo(
        () =>
            spans.map((pts) => {
                const l = new Line(new BufferGeometry().setFromPoints(pts), new LineBasicMaterial({ color, transparent: true, opacity }));
                l.frustumCulled = false;
                return l;
            }),
        [spans, color, opacity],
    );
    useEffect(
        () => () =>
            lines.forEach((l) => {
                l.geometry.dispose();
                (l.material as LineBasicMaterial).dispose();
            }),
        [lines],
    );
    return (
        <group>
            {lines.map((l, i) => (
                <primitive key={i} object={l} />
            ))}
        </group>
    );
}

/** A box with a photographic material whose texture repeats every `tile` metres. */
function SurfaceBox({
    size,
    at,
    tile,
    map,
    normal,
    color = '#ffffff',
    roughness = 0.9,
    metalness = 0,
    castShadow = true,
    rotation,
}: {
    size: [number, number, number];
    at: [number, number, number];
    tile: number;
    map?: Texture;
    normal?: Texture;
    color?: string;
    roughness?: number;
    metalness?: number;
    castShadow?: boolean;
    rotation?: [number, number, number];
}) {
    const rx = Math.max(1, size[0] / tile);
    const ry = Math.max(1, Math.max(size[1], size[2]) / tile);
    const m = useRepeat(map, rx, ry);
    const nm = useRepeat(normal, rx, ry);
    const material = useMat({ color, roughness, metalness, map: m ?? undefined, normalMap: nm ?? undefined }, [m, nm, color, roughness, metalness]);
    return (
        <mesh position={at} rotation={rotation} material={material} castShadow={castShadow} receiveShadow>
            <boxGeometry args={size} />
        </mesh>
    );
}

// ── Vegetation ────────────────────────────────────────────────────────────

/** A low-poly shrub (an icosphere pushed out by smooth noise): `variant` changes the noise. */
function shrubGeometry(variant: number, detail: number) {
    // Shared vertices, so the noise displacement keeps the surface continuous and shading is smooth.
    const base = new IcosahedronGeometry(1, detail);
    base.deleteAttribute('normal');
    base.deleteAttribute('uv');
    const g = mergeVertices(base);
    base.dispose();
    const p = g.getAttribute('position');
    const v = new Vector3();
    for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const n = Math.sin(v.x * 3.1 + variant) * Math.sin(v.y * 2.7 + variant * 1.7) * Math.sin(v.z * 3.3 + variant * 0.6);
        const r = 1 + 0.28 * n + 0.1 * Math.sin(v.x * 7 + v.z * 5 + variant);
        // Flat-bottomed: shrubs sit on the ground.
        v.multiplyScalar(r);
        if (v.y < -0.2) v.y = -0.2 + (v.y + 0.2) * 0.25;
        p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
}

/**
 * Coastal scrub and a few low trees around the cleared pad area (seeded, so it never changes): kept off
 * the roads, the buildings, the beach and the 175 m cleared zone around the pad. From the long-lens
 * camera positions it forms the dark vegetation band in front of the launch complex.
 */
function Scrub({ quality }: { quality: 'high' | 'low' }) {
    const count = quality === 'high' ? 9000 : 2600;
    const sets = useMemo(() => {
        let seed = 77;
        const rnd = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        // Camera positions of the pad shots (site frame) and the hero lines of sight to the vehicle: no
        // vegetation there, so nothing large ever stands in front of a lens.
        const cams: [number, number][] = [
            [-174, 699],
            [-158, 682],
            [-700, 1212],
            [-587, 1103],
            [-142, 181],
            [-13, 33],
            [-1, 95],
            [70, 262],
            [-700, 2600],
        ];
        const nearSegment = (x: number, z: number, ax: number, az: number, w: number) => {
            const t = Math.max(0, Math.min(1, (x * ax + z * az) / (ax * ax + az * az)));
            return Math.hypot(x - ax * t, z - az * t) < w;
        };
        const blocked = (x: number, z: number) => {
            const r = Math.hypot(x, z);
            if (r < 175 || r > 1900) return true;
            if (coastX(z) - x < 60) return true;
            if (x < -140 && Math.abs(z - 14) < 14) return true; // access road
            if (Math.abs(x + 720) < 95 && Math.abs(z - 230) < 65) return true; // integration hangar
            if (Math.hypot(x + 205, z + 40) < 45) return true;
            if (Math.hypot(x + 52, z + 178) < 22) return true;
            for (const [cx, cz] of cams) if (Math.hypot(x - cx, z - cz) < 80) return true;
            if (nearSegment(x, z, -174, 699, 18) || nearSegment(x, z, -700, 1212, 22)) return true;
            return false;
        };
        // More clumps south-south-west of the pad, the side the long-lens cameras look across from.
        const centres = Array.from({ length: 420 }, () => {
            const sector = rnd() < 0.55;
            const a = sector ? ((80 + rnd() * 75) * Math.PI) / 180 : rnd() * Math.PI * 2;
            const r = 185 + Math.sqrt(rnd()) * (sector ? 1500 : 1650);
            return [Math.cos(a) * r, Math.sin(a) * r, 30 + rnd() * 80] as const;
        });
        const out: { x: number; z: number; s: number; h: number; rot: number; tone: number; tree: boolean }[] = [];
        let guard = 0;
        while (out.length < count && guard++ < count * 20) {
            const c = centres[Math.floor(rnd() * centres.length)];
            const a = rnd() * Math.PI * 2;
            const d = Math.sqrt(rnd()) * c[2];
            const x = c[0] + Math.cos(a) * d;
            const z = c[1] + Math.sin(a) * d;
            if (blocked(x, z)) continue;
            const r = Math.hypot(x, z);
            const tree = r > 650 && rnd() < 0.04;
            out.push({ x, z, s: tree ? 2.2 + rnd() * 1.2 : 0.9 + rnd() * 1.4, h: tree ? 1.6 + rnd() * 0.8 : 0.55 + rnd() * 0.45, rot: rnd() * Math.PI * 2, tone: rnd(), tree });
        }
        return out;
    }, [count]);
    const geos = useMemo(() => [0, 1, 2].map((k) => shrubGeometry(k * 2.3 + 0.4, 1)), []);
    const material = useMemo(() => new MeshStandardMaterial({ roughness: 0.95, metalness: 0, vertexColors: false }), []);
    const refs = [useRef<InstancedMesh>(null), useRef<InstancedMesh>(null), useRef<InstancedMesh>(null)];
    useEffect(() => {
        const o = new Object3D();
        const col = new Color();
        const counts = [0, 0, 0];
        sets.forEach((b, i) => {
            const k = i % 3;
            const mesh = refs[k].current;
            if (!mesh) return;
            o.position.set(b.x, terrainHeight(b.x, b.z) + b.s * b.h * 0.55, b.z);
            o.rotation.set(0, b.rot, 0);
            o.scale.set(b.s, b.s * b.h, b.s * (0.85 + 0.3 * b.tone));
            o.updateMatrix();
            mesh.setMatrixAt(counts[k], o.matrix);
            // Olive, sage and dark green, sun-bleached at random.
            col.setRGB(0.09 + 0.05 * b.tone, 0.12 + 0.05 * b.tone, 0.05 + 0.02 * b.tone);
            if (b.tree) col.multiplyScalar(0.8);
            mesh.setColorAt(counts[k], col);
            counts[k]++;
        });
        refs.forEach((r, k) => {
            if (!r.current) return;
            r.current.count = counts[k];
            r.current.instanceMatrix.needsUpdate = true;
            if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true;
            r.current.computeBoundingSphere();
        });
    }, [sets]);
    useEffect(
        () => () => {
            geos.forEach((g) => g.dispose());
            material.dispose();
        },
        [geos, material],
    );
    const per = Math.ceil(count / 3) + 1;
    return (
        <>
            {geos.map((g, k) => (
                <instancedMesh key={k} ref={refs[k]} args={[g, material, per]} castShadow={false} receiveShadow />
            ))}
        </>
    );
}

// ── Exhaust ───────────────────────────────────────────────────────────────

/**
 * The exhaust trail left in the sky: a tube along the simulated trajectory (first 160 s) whose sections
 * appear as the vehicle passes, then widen and fade with age; thin air (above about 25 km) leaves none.
 */
function ExhaustTrail({ met, head }: { met: () => number; head: () => Vector3 }) {
    const geometry = useMemo(() => {
        const f = flight();
        const pts = f.samples.filter((x) => x.t >= 0.5 && x.t <= 160);
        const ring = 14;
        const centers: number[] = [];
        const dirs: number[] = [];
        const times: number[] = [];
        const alts: number[] = [];
        const index: number[] = [];
        const P = pts.map((x) => {
            const th = x.downrange / R_EARTH;
            const r = R_EARTH + x.altitude;
            return new Vector3(r * Math.sin(th), r * Math.cos(th) - R_EARTH + MOUNT_TOP, 0);
        });
        const z = new Vector3(0, 0, 1);
        P.forEach((c, i) => {
            const t = new Vector3().subVectors(P[Math.min(P.length - 1, i + 1)], P[Math.max(0, i - 1)]).normalize();
            const side = new Vector3().crossVectors(t, z).normalize();
            const bin = new Vector3().crossVectors(t, side).normalize();
            for (let k = 0; k < ring; k++) {
                const a = (k / ring) * Math.PI * 2;
                const d = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(bin, Math.sin(a));
                centers.push(c.x, c.y, c.z);
                dirs.push(d.x, d.y, d.z);
                times.push(pts[i].t);
                alts.push(pts[i].altitude);
            }
            if (i > 0) {
                for (let k = 0; k < ring; k++) {
                    const a0 = (i - 1) * ring + k;
                    const a1 = (i - 1) * ring + ((k + 1) % ring);
                    const b0 = i * ring + k;
                    const b1 = i * ring + ((k + 1) % ring);
                    index.push(a0, b0, a1, a1, b0, b1);
                }
            }
        });
        const g = new BufferGeometry();
        g.setAttribute('position', new Float32BufferAttribute(centers, 3));
        g.setAttribute('aDir', new Float32BufferAttribute(dirs, 3));
        g.setAttribute('aTime', new Float32BufferAttribute(times, 1));
        g.setAttribute('aAlt', new Float32BufferAttribute(alts, 1));
        g.setIndex(index);
        return g;
    }, []);
    const material = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: { uMet: { value: 0 }, uHead: { value: new Vector3() }, uSun: { value: SUN_SITE.clone() } },
                vertexShader: /* glsl */ `${LOGDEPTH.vPars}
                    attribute vec3 aDir; attribute float aTime; attribute float aAlt; uniform float uMet; uniform vec3 uHead;
                    varying float vAge; varying float vAlt; varying vec3 vN; varying vec3 vPos;
                    void main() {
                        float age = uMet - aTime;
                        float r = 1.8 + 2.4 * sqrt(max(age, 0.0)) + aAlt * 0.0006 * sqrt(max(age, 0.0));
                        // Rings the vehicle has not reached yet collapse onto its base: the trail ends there.
                        vec3 p = age > 0.0 ? position + aDir * r : uHead;
                        vec4 wp = modelMatrix * vec4(p, 1.0);
                        vAge = max(age, 0.001); vAlt = aAlt; vN = aDir; vPos = wp.xyz;
                        gl_Position = projectionMatrix * viewMatrix * wp;
                        ${LOGDEPTH.v}
                    }`,
                fragmentShader: /* glsl */ `${LOGDEPTH.fPars}
                    uniform vec3 uSun; varying float vAge; varying float vAlt; varying vec3 vN; varying vec3 vPos;
                    void main() {
                        ${LOGDEPTH.f}
                        vec3 v = normalize(cameraPosition - vPos);
                        float facing = abs(dot(normalize(vN), v));
                        float soft = smoothstep(0.0, 0.8, facing);
                        float lit = 0.62 + 0.38 * max(dot(normalize(vN), uSun), 0.0);
                        float a = 0.5 * soft * exp(-vAge / 110.0) * (1.0 - smoothstep(18000.0, 30000.0, vAlt)) * smoothstep(0.0, 1.5, vAge);
                        gl_FragColor = vec4(vec3(0.93, 0.94, 0.95) * lit, a);
                    }`,
                transparent: true,
                depthWrite: false,
                side: DoubleSide,
            }),
        [],
    );
    useEffect(
        () => () => {
            geometry.dispose();
            material.dispose();
        },
        [geometry, material],
    );
    useFrame(() => {
        material.uniforms.uMet.value = met();
        (material.uniforms.uHead.value as Vector3).copy(head());
    });
    return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={4} />;
}

/**
 * The exhaust turned by the flame deflector: a flattened jet running north along the trench and out of
 * its exit while the vehicle is low (thrust from the flight simulation; it fades as the vehicle climbs).
 */
function TrenchJet({ met, quality }: { met: () => number; quality: 'high' | 'low' }) {
    const power = () => {
        const s = sampleAt(met());
        if (s.phase !== 'ignition' && s.phase !== 'stage1') return 0;
        return s.throttle * Math.max(0, 1 - Math.max(0, s.altitude) / 55);
    };
    // Deflected exhaust running north along the trench floor, flattened by the trench walls.
    return (
        <group position={[0, 1.6, -4]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.55]}>
            <VolumePlume kind="kerosene" power={power} length={() => 56} radius={() => 7.5} nozzle={3.2} pressure={() => 1} quality={quality} />
        </group>
    );
}

// ── Facility parts ────────────────────────────────────────────────────────

/** Soot and scorch on the deck around the table and at the trench exit: soft dark decals. */
function Scorch() {
    const texture = useMemo(() => {
        if (typeof document === 'undefined') return null;
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const g = c.getContext('2d')!;
        const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
        grad.addColorStop(0, 'rgba(20,18,16,0.75)');
        grad.addColorStop(0.5, 'rgba(30,27,24,0.35)');
        grad.addColorStop(1, 'rgba(30,27,24,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 128, 128);
        const t = new CanvasTexture(c);
        t.colorSpace = SRGBColorSpace;
        return t;
    }, []);
    const material = useMemo(() => new MeshStandardMaterial({ map: texture, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4 }), [texture]);
    useEffect(
        () => () => {
            material.dispose();
            texture?.dispose();
        },
        [material, texture],
    );
    const spots: [number, number, number, number][] = [
        [0, DECK + 0.02, 0, 36],
        [0, DECK + 0.02, -30, 30],
        [0, 0.08, -60, 70],
        [10, 0.08, -78, 50],
    ];
    return (
        <group>
            {spots.map(([x, y, z, s], i) => (
                <mesh key={i} position={[x, y, z]} rotation={[-Math.PI / 2, 0, i]} material={material} renderOrder={1} receiveShadow>
                    <planeGeometry args={[s, s]} />
                </mesh>
            ))}
        </group>
    );
}

/** Hardstand, flame trench, deflector and launch table. */
function Pad({ concrete, concreteN, steel, dark }: { concrete?: Texture; concreteN?: Texture; steel: MeshStandardMaterial; dark: MeshStandardMaterial }) {
    const soot = useMat({ color: '#2d2a27', roughness: 0.95, metalness: 0 });
    const W = TRENCH_HALF;
    return (
        <group>
            {/* Raised hardstand in three blocks around the trench, which runs north under the table. */}
            <SurfaceBox size={[39, DECK, 84]} at={[-25.5, DECK / 2, -2]} tile={12} map={concrete} normal={concreteN} color="#e9e6df" />
            <SurfaceBox size={[39, DECK, 84]} at={[25.5, DECK / 2, -2]} tile={12} map={concrete} normal={concreteN} color="#e9e6df" />
            <SurfaceBox size={[2 * W, DECK, 34]} at={[0, DECK / 2, 23]} tile={12} map={concrete} normal={concreteN} color="#e9e6df" />
            {/* Ramps down to grade on the west (access road) and east sides */}
            <SurfaceBox size={[30, 0.6, 14]} at={[-55, DECK / 2 - 0.3, 18]} rotation={[0, 0, 0.1]} tile={12} map={concrete} normal={concreteN} color="#dcd8d0" castShadow={false} />
            {/* Trench floor and sooty walls */}
            <mesh position={[0, 0.06, -20]} rotation={[-Math.PI / 2, 0, 0]} material={soot} receiveShadow>
                <planeGeometry args={[2 * W, 76]} />
            </mesh>
            {[-1, 1].map((s) => (
                <mesh key={s} position={[s * (W - 0.02), DECK / 2, -19]} rotation={[0, (-s * Math.PI) / 2, 0]} material={soot}>
                    <planeGeometry args={[50, DECK]} />
                </mesh>
            ))}
            {/* Flame deflector: a steel wedge under the table that turns the exhaust north */}
            <mesh position={[0, DECK / 2 + 0.2, 1.2]} rotation={[-0.62, 0, 0]} material={dark} castShadow receiveShadow>
                <boxGeometry args={[2 * W - 0.4, 0.5, 9]} />
            </mesh>
            {/* Launch table on four pedestals, with the exhaust opening in the middle */}
            {[
                [-8, -5],
                [8, -5],
                [8, 5],
                [-8, 5],
            ].map(([x, z]) => (
                <SurfaceBox key={`${x},${z}`} size={[2.4, MOUNT_TOP - 1.4 - DECK, 2.4]} at={[x, DECK + (MOUNT_TOP - 1.4 - DECK) / 2, z]} tile={3} map={concrete} normal={concreteN} color="#bdbab4" />
            ))}
            {[
                [0, -4.4, 20, 3.2],
                [0, 4.4, 20, 3.2],
                [-6.8, 0, 6.4, 5.6],
                [6.8, 0, 6.4, 5.6],
            ].map(([x, z, w, d]) => (
                <mesh key={`${x},${z}`} position={[x, MOUNT_TOP - 0.7, z]} material={steel} castShadow receiveShadow>
                    <boxGeometry args={[w, 1.4, d]} />
                </mesh>
            ))}
            {/* Hold-down clamps: four arms that grip the aft skirt until thrust is confirmed */}
            {[0, 1, 2, 3].map((k) => {
                const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
                return (
                    <group key={k} position={[Math.cos(a) * 2.55, MOUNT_TOP, Math.sin(a) * 2.55]} rotation={[0, -a, 0]}>
                        <mesh position={[0, 0.45, 0]} material={dark} castShadow>
                            <boxGeometry args={[0.9, 0.9, 0.7]} />
                        </mesh>
                        <mesh position={[-0.45, 1.05, 0]} material={steel} castShadow>
                            <boxGeometry args={[0.5, 0.35, 0.45]} />
                        </mesh>
                    </group>
                );
            })}
            {/* Tail-service masts on the tower side */}
            {[-1.9, 1.9].map((z) => (
                <group key={z} position={[-4.2, MOUNT_TOP, z]}>
                    <mesh position={[0, 2.2, 0]} material={steel} castShadow>
                        <boxGeometry args={[0.9, 4.4, 0.9]} />
                    </mesh>
                    <mesh position={[0.9, 3.3, 0]} rotation={[0, 0, -0.45]} material={dark} castShadow>
                        <boxGeometry args={[1.8, 0.35, 0.5]} />
                    </mesh>
                </group>
            ))}
            {/* Water deluge headers along the table */}
            {[-1, 1].map((s) => (
                <mesh key={s} position={[s * 9.4, MOUNT_TOP - 1.1, 0]} rotation={[Math.PI / 2, 0, 0]} material={steel} castShadow>
                    <cylinderGeometry args={[0.35, 0.35, 16, 14]} />
                </mesh>
            ))}
            {/* Guard rails along the deck edge of the trench */}
            {[-1, 1].map((s) => (
                <mesh key={s} position={[s * (W + 0.3), DECK + 0.55, -24]} material={steel}>
                    <boxGeometry args={[0.08, 1.1, 28]} />
                </mesh>
            ))}
        </group>
    );
}

/** The fixed umbilical tower with platforms, an elevator core, a top mast and three service arms. */
function UmbilicalTower({ met, steel, dark, hose }: { met: () => number; steel: MeshStandardMaterial; dark: MeshStandardMaterial; hose: MeshStandardMaterial }) {
    const arms = useRef<Group>(null);
    const beams = useMemo(() => latticeBeams(9, TOWER_H, 4, 0.65, 0.24), []);
    // Platform grating every 8 m, with toe rails (part of the same instanced set).
    const decks = useMemo(() => Array.from({ length: Math.floor(TOWER_H / 8) }, (_, i) => 8 * (i + 1)), []);
    // Service arms: [height above the vehicle base, reach]: tail, oxygen fill-and-drain, upper stage.
    // Reach: from the tower face (4.5 m east of its centre) to just short of the vehicle skin.
    const armDefs: [number, number][] = [
        [30.4, 6.85],
        [35.2, 6.85],
        [45, 7.2],
    ];
    const armBeams = useMemo(() => {
        return armDefs.map(([, reach]) => {
            const out: Beam[] = [];
            const L = reach;
            // A Warren truss: top and bottom chords, diagonals, on two sides.
            for (const z of [-0.7, 0.7]) {
                out.push({ from: [0, 0, z], to: [L, 0, z], w: 0.22 });
                out.push({ from: [0, 1.6, z], to: [L - 0.6, 1.6, z], w: 0.2 });
                for (let k = 0; k < 5; k++) {
                    const x0 = (k / 5) * (L - 0.6);
                    const x1 = ((k + 1) / 5) * (L - 0.6);
                    out.push({ from: [x0, k % 2 ? 1.6 : 0, z], to: [x1, k % 2 ? 0 : 1.6, z], w: 0.12 });
                }
            }
            for (let k = 0; k <= 5; k++) out.push({ from: [(k / 5) * (L - 0.6), 0, -0.7], to: [(k / 5) * (L - 0.6), 0, 0.7], w: 0.12 });
            return out;
        });
    }, []);
    // Umbilical lines hanging from each arm to its plate on the vehicle (in arm coordinates).
    const hoses = useMemo(
        () =>
            armDefs.map(([, reach]) => {
                const curve = new CatmullRomCurve3([new Vector3(0.8, 0.0, 0.35), new Vector3(reach * 0.5, -1.3, 0.38), new Vector3(reach - 0.5, 0.3, 0.3), new Vector3(reach + 0.1, 1.4, 0)]);
                return curve;
            }),
        [],
    );
    useFrame(() => {
        const t = met();
        // Service arms swing away from T−60 s to T−40 s (the tail masts stay until liftoff).
        const swing = Math.min(1, Math.max(0, (t + 60) / 20));
        if (arms.current) arms.current.children.forEach((arm) => (arm.rotation.y = (-Math.PI / 2) * (0.5 - 0.5 * Math.cos(Math.PI * swing)) * 0.95));
    });
    return (
        <group position={[TOWER_X, DECK, 0]}>
            <Members beams={beams} material={steel} />
            {decks.map((y) => (
                <mesh key={y} position={[0, y, 0]} material={dark} receiveShadow castShadow>
                    <boxGeometry args={[9.3, 0.18, 9.3]} />
                </mesh>
            ))}
            {/* Elevator core (enclosed shaft) on the west side, and the stair tower beside it */}
            <mesh position={[-2.2, TOWER_H / 2 + 1, -1.8]} material={dark} castShadow receiveShadow>
                <boxGeometry args={[3, TOWER_H + 2, 3]} />
            </mesh>
            {/* Roof, crane rail and lightning mast */}
            <mesh position={[0, TOWER_H + 0.6, 0]} material={steel} castShadow>
                <boxGeometry args={[10, 1.2, 10]} />
            </mesh>
            <mesh position={[0, TOWER_H + 1.8, 0]} material={dark} castShadow>
                <boxGeometry args={[3, 1.2, 3]} />
            </mesh>
            <mesh position={[0, TOWER_H + 12, 0]} material={steel} castShadow>
                <cylinderGeometry args={[0.12, 0.4, 20, 10]} />
            </mesh>
            {/* Service arms, hinged at the tower's east face (vehicle side) */}
            <group ref={arms}>
                {armDefs.map(([h, reach], i) => (
                    <group key={h} position={[4.5, MOUNT_TOP - DECK + h - 1.4, 0]}>
                        <ArmTruss beams={armBeams[i]} steel={steel} />
                        <mesh position={[reach - 0.25, 1.4, 0]} material={dark} castShadow>
                            <boxGeometry args={[0.6, 1.4, 1.6]} />
                        </mesh>
                        <mesh material={hose} castShadow>
                            <tubeGeometry args={[hoses[i], 32, 0.16, 8, false]} />
                        </mesh>
                    </group>
                ))}
            </group>
        </group>
    );
}

function ArmTruss({ beams, steel }: { beams: Beam[]; steel: MeshStandardMaterial }) {
    return <Members beams={beams} material={steel} />;
}

/** A sphere on legs (cryogenic storage dewar). */
function Sphere({ at, r, paint, steel }: { at: [number, number, number]; r: number; paint: MeshStandardMaterial; steel: MeshStandardMaterial }) {
    const legs = 8;
    return (
        <group position={at}>
            <mesh position={[0, r + 3.5, 0]} material={paint} castShadow receiveShadow>
                <sphereGeometry args={[r, 48, 32]} />
            </mesh>
            <mesh position={[0, r + 3.5, 0]} material={steel}>
                <cylinderGeometry args={[r * 1.005, r * 1.005, 0.3, 48, 1, true]} />
            </mesh>
            {Array.from({ length: legs }, (_, i) => {
                const a = (i / legs) * Math.PI * 2;
                return (
                    <mesh key={i} position={[Math.cos(a) * r * 0.86, (r + 3.5) / 2, Math.sin(a) * r * 0.86]} material={steel} castShadow>
                        <cylinderGeometry args={[0.32, 0.4, r + 3.5, 8]} />
                    </mesh>
                );
            })}
            <mesh position={[r * 0.7, (r + 3.5) / 2 + r * 0.4, 0]} rotation={[0, 0, 0.25]} material={steel}>
                <boxGeometry args={[0.9, r * 2 + 4, 0.9]} />
            </mesh>
        </group>
    );
}

/** A pipe rack: a bundle of pipes on T-supports from `a` to `b` (ground coordinates, y = height). */
function PipeRack({ a, b, steel, pipe }: { a: [number, number]; b: [number, number]; steel: MeshStandardMaterial; pipe: MeshStandardMaterial }) {
    const from = new Vector3(a[0], 0, a[1]);
    const to = new Vector3(b[0], 0, b[1]);
    const len = from.distanceTo(to);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const ang = Math.atan2(to.x - from.x, to.z - from.z);
    const supports = Math.max(2, Math.round(len / 12));
    return (
        <group position={[mid.x, 0, mid.z]} rotation={[0, ang, 0]}>
            {[-0.45, 0, 0.45].map((x, i) => (
                <mesh key={x} position={[x, 1.7 + (i % 2) * 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} material={pipe} castShadow>
                    <cylinderGeometry args={[0.2 - i * 0.03, 0.2 - i * 0.03, len, 10]} />
                </mesh>
            ))}
            {Array.from({ length: supports + 1 }, (_, k) => (
                <group key={k} position={[0, 0, -len / 2 + (k / supports) * len]}>
                    <mesh position={[0, 0.75, 0]} material={steel} castShadow>
                        <boxGeometry args={[0.25, 1.5, 0.25]} />
                    </mesh>
                    <mesh position={[0, 1.5, 0]} material={steel}>
                        <boxGeometry args={[1.6, 0.18, 0.3]} />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

/** A building with clad walls, a roof cap and a parapet. */
function Building({ at, size, clad, roof, rotation = 0 }: { at: [number, number]; size: [number, number, number]; clad: SurfaceSet | null; roof: MeshStandardMaterial; rotation?: number }) {
    const [w, h, d] = size;
    const material = useMat({ color: '#ffffff', roughness: 1, metalness: 0.2, ...(clad ? { map: clad.map, normalMap: clad.normalMap, roughnessMap: clad.roughnessMap } : {}) }, [clad]);
    return (
        <group position={[at[0], 0, at[1]]} rotation={[0, rotation, 0]}>
            <mesh position={[0, h / 2, 0]} material={material} castShadow receiveShadow>
                <boxGeometry args={[w, h, d]} />
            </mesh>
            <mesh position={[0, h + 0.4, 0]} material={roof} castShadow receiveShadow>
                <boxGeometry args={[w + 0.6, 0.8, d + 0.6]} />
            </mesh>
            {/* Rooftop plant */}
            <mesh position={[w * 0.2, h + 1.6, -d * 0.15]} material={roof} castShadow>
                <boxGeometry args={[Math.min(6, w * 0.2), 1.8, Math.min(4, d * 0.2)]} />
            </mesh>
        </group>
    );
}

/** A floodlight tower: a tapered mast with a lamp head. */
function LightTower({ at, steel, dark }: { at: [number, number]; steel: MeshStandardMaterial; dark: MeshStandardMaterial }) {
    return (
        <group position={[at[0], 0, at[1]]}>
            <mesh position={[0, 17, 0]} material={steel} castShadow>
                <cylinderGeometry args={[0.35, 0.7, 34, 10]} />
            </mesh>
            <mesh position={[0, 34.4, 0]} material={steel} castShadow>
                <boxGeometry args={[3.2, 1.4, 0.6]} />
            </mesh>
            {[-1, 0, 1].map((k) => (
                <mesh key={k} position={[k * 1.05, 34.4, 0.32]} material={dark}>
                    <boxGeometry args={[0.8, 1.0, 0.05]} />
                </mesh>
            ))}
        </group>
    );
}

export default function LaunchSite({ met, head, groundOpacity, quality }: { met: () => number; head: () => Vector3; groundOpacity: () => number; quality: 'high' | 'low' }) {
    const plumeAt = useMemo(() => new Vector3(), []);
    const maps = useContext(MapsContext);
    const towerSteel = useSurface(() => paintedSteel([172, 176, 182], 43), 4, 4);
    const darkSteel = useSurface(() => paintedSteel([70, 74, 80], 47), 4, 4);
    const whitePaint = useSurface(() => paintedSteel([226, 228, 230], 49), 3, 3);
    const cladA = useSurface(() => cladding([206, 210, 214], 2, 71), 3, 1);
    const cladB = useSurface(() => cladding([178, 184, 190], 1, 73), 4, 1);
    const cladC = useSurface(() => cladding([226, 228, 230], 0, 75), 6, 2);
    const steel = useMat({ color: '#ffffff', roughness: 1, metalness: 0.55, ...(towerSteel ? { map: towerSteel.map, normalMap: towerSteel.normalMap, roughnessMap: towerSteel.roughnessMap } : {}) }, [towerSteel]);
    const dark = useMat({ color: '#ffffff', roughness: 1, metalness: 0.5, ...(darkSteel ? { map: darkSteel.map, normalMap: darkSteel.normalMap, roughnessMap: darkSteel.roughnessMap } : {}) }, [darkSteel]);
    const tankPaint = useMat({ color: '#ffffff', roughness: 1, metalness: 0.15, ...(whitePaint ? { map: whitePaint.map, normalMap: whitePaint.normalMap, roughnessMap: whitePaint.roughnessMap } : {}) }, [whitePaint]);
    const pipe = useMat({ color: '#c3c7cc', roughness: 0.35, metalness: 0.85 });
    const hose = useMat({ color: '#e9e9e6', roughness: 0.6, metalness: 0.1 });
    const roof = useMat({ color: '#6c7178', roughness: 0.75, metalness: 0.3 });
    const asphalt = useMat({ color: '#3d3e40', roughness: 0.95, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1 });
    const site = useRef<Group>(null);

    // Catenary lightning protection: three masts around the pad with wires between their tops and
    // down to ground anchors outside them.
    const masts: [number, number][] = [
        [-46, -38],
        [52, -30],
        [40, 52],
    ];
    const MAST_H = 104;
    const spans = useMemo(() => {
        const tops = masts.map(([x, z]) => new Vector3(x, MAST_H, z));
        const out: Vector3[][] = [];
        for (let i = 0; i < tops.length; i++) out.push(sagPoints(tops[i], tops[(i + 1) % tops.length], 9));
        const towerTop = new Vector3(TOWER_X, DECK + TOWER_H + 20, 0);
        for (const t of tops) out.push(sagPoints(t, towerTop, 6));
        return out;
    }, []);

    // Sound-suppression water tower: a tank on a braced lattice.
    const waterBeams = useMemo(() => latticeBeams(10, 52, 6.5, 0.7, 0.28, [-118, 0, -118]), []);

    useFrame(() => {
        if (site.current) site.current.visible = groundOpacity() > 0.003;
    });

    return (
        <group>
            <Ocean opacity={groundOpacity} />
            <Land opacity={groundOpacity} />
            <Scrub quality={quality} />
            <group ref={site}>
                <Pad concrete={maps?.concrete} concreteN={maps?.concreteN} steel={steel} dark={dark} />
                <Scorch />
                <UmbilicalTower met={met} steel={steel} dark={dark} hose={hose} />
                {/* Lightning protection */}
                {masts.map(([x, z]) => (
                    <group key={`${x},${z}`} position={[x, 0, z]}>
                        <mesh position={[0, MAST_H / 2 - 6, 0]} material={steel} castShadow>
                            <cylinderGeometry args={[0.55, 1.4, MAST_H - 12, 12]} />
                        </mesh>
                        <mesh position={[0, MAST_H - 6, 0]} material={hose} castShadow>
                            <cylinderGeometry args={[0.18, 0.4, 12, 10]} />
                        </mesh>
                    </group>
                ))}
                <Wires spans={spans} />
                {/* Water tower */}
                <Members beams={waterBeams} material={steel} />
                <mesh position={[-118, 61, -118]} material={tankPaint} castShadow receiveShadow>
                    <cylinderGeometry args={[9, 9, 17, 48]} />
                </mesh>
                <mesh position={[-118, 70.5, -118]} material={tankPaint} castShadow>
                    <sphereGeometry args={[9, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                </mesh>
                <PipeRack a={[-112, -112]} b={[-20, -20]} steel={dark} pipe={pipe} />
                {/* Propellant farm: liquid oxygen (east), liquid hydrogen (north-west), kerosene (south-east) */}
                <Sphere at={[118, 0, -96]} r={9} paint={tankPaint} steel={steel} />
                <Sphere at={[-52, 0, -178]} r={10.5} paint={tankPaint} steel={steel} />
                {[0, 1].map((k) => (
                    <group key={k} position={[96 + k * 7, 0, 74]}>
                        <mesh position={[0, 3.6, 0]} rotation={[Math.PI / 2, 0, 0]} material={tankPaint} castShadow receiveShadow>
                            <cylinderGeometry args={[2.6, 2.6, 22, 32]} />
                        </mesh>
                        {[-7, 0, 7].map((z) => (
                            <mesh key={z} position={[0, 1.2, z]} material={steel} castShadow>
                                <boxGeometry args={[4, 2.4, 0.8]} />
                            </mesh>
                        ))}
                    </group>
                ))}
                <PipeRack a={[108, -86]} b={[22, -12]} steel={dark} pipe={pipe} />
                <PipeRack a={[-46, -164]} b={[-22, -24]} steel={dark} pipe={pipe} />
                <PipeRack a={[94, 62]} b={[22, 12]} steel={dark} pipe={pipe} />
                {/* Lighting towers at the corners of the hardstand */}
                {(
                    [
                        [-70, 62],
                        [74, 64],
                        [76, -70],
                        [-74, -66],
                    ] as [number, number][]
                ).map((p) => (
                    <LightTower key={p.join(',')} at={p} steel={steel} dark={dark} />
                ))}
                {/* Perimeter road and the access road from the west */}
                <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} material={asphalt} receiveShadow>
                    <ringGeometry args={[150, 158, 128]} />
                </mesh>
                <mesh position={[-900, 0.06, 14]} rotation={[-Math.PI / 2, 0, 0]} material={asphalt} receiveShadow>
                    <planeGeometry args={[1500, 10]} />
                </mesh>
                {/* Pad terminal, service building, integration hangar, launch control */}
                <Building at={[-96, 52]} size={[34, 7, 20]} clad={cladA} roof={roof} />
                <Building at={[-205, -40]} size={[46, 16, 30]} clad={cladB} roof={roof} rotation={0.1} />
                <Building at={[-720, 230]} size={[150, 42, 90]} clad={cladC} roof={roof} rotation={0.05} />
                <Building at={[-2300, 1300]} size={[80, 14, 50]} clad={cladA} roof={roof} rotation={-0.3} />
            </group>
            <ExhaustClouds
                met={met}
                trenchExit={TRENCH_EXIT}
                deck={DECK}
                plume={() => plumeAt.set(head().x, Math.max(DECK + 2, head().y - 8), head().z)}
                throttle={() => {
                    const s = sampleAt(met());
                    return s.phase === 'ignition' || s.phase === 'stage1' ? s.throttle : 0;
                }}
                altitude={() => sampleAt(met()).altitude}
                quality={quality}
            />
            <TrenchJet met={met} quality={quality} />
            <ExhaustTrail met={met} head={head} />
        </group>
    );
}
