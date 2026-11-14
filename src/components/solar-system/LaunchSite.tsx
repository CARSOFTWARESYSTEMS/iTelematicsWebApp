"use client";
// The conceptual coastal launch site, built for realism from licensed photographic surfaces
// (Poly Haven, CC0; see docs/ASSET_SOURCES.md): grass-and-rock terrain with sandy patches and a beach,
// an ocean with sun glints to the east, a concrete pad with a sooted flame trench and an open launch
// mount, a lattice umbilical tower whose service arms swing away before ignition, lightning masts and
// corrugated-metal buildings. Everything is lit by the Sun and the sky, casts and receives shadows near
// the pad and fades into haze with distance. The ignition cloud and the exhaust trail are pure
// functions of mission time (seeded), so replays and jumps look the same every time.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BufferGeometry, CanvasTexture, Color, DoubleSide, Float32BufferAttribute, FogExp2, InstancedMesh, MeshStandardMaterial, Object3D, RepeatWrapping, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector2, Vector3, type Group, type Mesh, type Texture } from 'three';
import { R_EARTH } from '@/lib/solar-system/constants';
import { flight } from '@/lib/solar-system/flight';
import { LOGDEPTH } from './environment';

/** Height of the launch mount deck: the vehicle's base sits here. */
export const MOUNT_TOP = 7.4;
const TOWER_X = -9.5; // tower beside the vehicle, west side
const TOWER_H = 74;
const TRENCH_EXIT = new Vector3(-62, 0.5, 0); // flame trench opening, towards the west
const GROUND_RADIUS = 60000;
const SUN_SITE = new Vector3(0.814, 0.5, 0.296).normalize();

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
    const m = useMemo(() => new MeshStandardMaterial(params), deps); // the material is rebuilt when its maps arrive
    useEffect(() => () => m.dispose(), [m]);
    return m;
}

const NOISE_GLSL = /* glsl */ `
    float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
    float fbm(vec2 p) { float a = 0.5; float s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
    float coastAt(float z) { return 2600.0 + 900.0 * (fbm(vec2(z * 0.0004, 3.1)) - 0.5) * 2.0; }
`;

/**
 * Land: photographic grass-and-rock terrain sampled at two scales (no visible tiling from afar), sandy
 * patches and a beach towards the coast, large-scale variation, lit and shadowed like any surface and
 * hazed by the scene fog. East of the coastline the land is cut away to show the ocean beneath.
 */
function Land({ opacity }: { opacity: () => number }) {
    const maps = useContext(MapsContext);
    const ref = useRef<Mesh>(null);
    const normal = useRepeat(maps?.grassN, (GROUND_RADIUS * 2) / 18, (GROUND_RADIUS * 2) / 18);
    const material = useMemo(() => {
        const m = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.96, metalness: 0, map: maps?.grass ?? null, normalMap: normal ?? null, normalScale: new Vector2(0.9, 0.9), transparent: true });
        m.onBeforeCompile = (shader) => {
            shader.uniforms.uBeach = { value: maps?.beach ?? null };
            shader.uniforms.uOpacity = { value: 1 };
            m.userData.shader = shader;
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nvarying vec3 vWorldP;')
                .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', `#include <common>\nvarying vec3 vWorldP;\nuniform sampler2D uBeach;\nuniform float uOpacity;\n${NOISE_GLSL}`)
                .replace(
                    '#include <map_fragment>',
                    /* glsl */ `
                    vec2 wp = vWorldP.xz;
                    if (wp.x > coastAt(wp.y)) discard;
                    float camDist = length(cameraPosition - vWorldP);
                    // Anti-tiling: two samples at different rotations and scales, blended by low-frequency noise,
                    // so the photograph's repeat never lines up into a grid.
                    float w = smoothstep(0.3, 0.7, fbm(wp * 0.012));
                    vec2 r1 = mat2(0.8, -0.6, 0.6, 0.8) * wp;
                    vec3 gA = texture2D(map, wp / 18.0).rgb;
                    vec3 gB = texture2D(map, r1 / 23.0 + 0.41).rgb;
                    vec3 gNear = mix(gA, gB, w);
                    vec3 gFar = texture2D(map, (mat2(0.6, 0.8, -0.8, 0.6) * wp) / 260.0 + 0.37).rgb;
                    vec3 grass = mix(gNear, gFar, smoothstep(80.0, 700.0, camDist) * 0.7);
                    vec3 sand = texture2D(uBeach, wp / 34.0).rgb;
                    float coast = coastAt(wp.y);
                    float beach = smoothstep(coast - 240.0, coast - 30.0, wp.x);
                    float patches = smoothstep(0.58, 0.8, fbm(wp * 0.0035 + 7.0)) * 0.6;
                    vec3 col = mix(grass, sand, max(beach, patches));
                    // From afar the texture's repeat would show: fade to its average colour, varied by large-scale noise.
                    vec3 avg = mix(vec3(0.3, 0.29, 0.19), vec3(0.62, 0.56, 0.44), max(beach, patches));
                    col = mix(col, avg, smoothstep(350.0, 2600.0, camDist));
                    col *= (0.8 + 0.42 * fbm(wp * 0.0009)) * 1.18;
                    diffuseColor.rgb *= col;
                    diffuseColor.a *= uOpacity;
                    `,
                );
        };
        return m;
    }, [maps, normal]);
    useEffect(() => () => material.dispose(), [material]);
    useFrame(() => {
        const o = opacity();
        const shader = material.userData.shader as { uniforms: Record<string, { value: number }> } | undefined;
        if (shader) shader.uniforms.uOpacity.value = o;
        material.depthWrite = o > 0.99;
        if (ref.current) ref.current.visible = o > 0.003;
    });
    return (
        <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} material={material} receiveShadow renderOrder={-5}>
            <circleGeometry args={[GROUND_RADIUS, 128]} />
        </mesh>
    );
}

/** The ocean east of the coast: Fresnel reflection of the sky, wind waves, the Sun's glitter, haze. */
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
                        vec3 deep = vec3(0.012, 0.055, 0.075) * (0.55 + 0.6 * max(uSun.y, 0.0));
                        vec3 col = mix(deep, sky, fres);
                        col += vec3(1.0, 0.95, 0.85) * pow(max(dot(r, uSun), 0.0), 380.0) * 6.0;
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

/** Lattice tower: four corner columns and cross-bracing, instanced. */
function Lattice({ height, width, material }: { height: number; width: number; material: MeshStandardMaterial }) {
    const ref = useRef<InstancedMesh>(null);
    const count = useMemo(() => {
        const bays = Math.round(height / 4);
        return 4 + bays * 8;
    }, [height]);
    useEffect(() => {
        const mesh = ref.current;
        if (!mesh) return;
        const o = new Object3D();
        let i = 0;
        const h = width / 2;
        const corners: [number, number][] = [
            [-h, -h],
            [h, -h],
            [h, h],
            [-h, h],
        ];
        for (const [x, z] of corners) {
            o.position.set(x, height / 2, z);
            o.rotation.set(0, 0, 0);
            o.scale.set(0.35, height, 0.35);
            o.updateMatrix();
            mesh.setMatrixAt(i++, o.matrix);
        }
        const bays = Math.round(height / 4);
        const diag = Math.hypot(width, 4);
        const ang = Math.atan2(4, width);
        for (let b = 0; b < bays; b++) {
            const y = b * 4 + 2;
            for (let side = 0; side < 4; side++) {
                const rot = (side * Math.PI) / 2;
                const cx = Math.round(Math.sin(rot) * 1e6) / 1e6;
                const cz = Math.round(Math.cos(rot) * 1e6) / 1e6;
                // Horizontal girt
                o.position.set(cx * h, b * 4, cz * h);
                o.rotation.set(0, rot, 0);
                o.scale.set(width, 0.22, 0.22);
                o.updateMatrix();
                mesh.setMatrixAt(i++, o.matrix);
                // Diagonal brace
                o.position.set(cx * h, y, cz * h);
                o.rotation.set(0, rot, (b % 2 ? 1 : -1) * ang);
                o.scale.set(diag, 0.16, 0.16);
                o.updateMatrix();
                mesh.setMatrixAt(i++, o.matrix);
            }
        }
        mesh.count = i;
        mesh.instanceMatrix.needsUpdate = true;
        // Bounds from every beam, not just the base box: otherwise the whole tower is culled whenever
        // the camera looks up the vehicle and the tower's foot leaves the frame.
        mesh.computeBoundingBox();
        mesh.computeBoundingSphere();
    }, [height, width, count]);
    return (
        <instancedMesh ref={ref} args={[undefined, material, count]} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
        </instancedMesh>
    );
}

/** The ignition cloud: seeded particles whose state is a function of mission time only. */

/** A cloudy puff texture (value-noise turbulence with a soft edge), drawn once. */
function puffTexture() {
    if (typeof document === 'undefined') return null;
    const N = 128;
    const c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d')!;
    const img = g.createImageData(N, N);
    let seed = 3;
    const rnd = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    };
    const grid = Array.from({ length: 17 * 17 }, () => rnd());
    const vn = (x: number, y: number, f: number) => {
        const gx = (x / N) * f;
        const gy = (y / N) * f;
        const ix = Math.floor(gx) % 16;
        const iy = Math.floor(gy) % 16;
        const fx = gx - Math.floor(gx);
        const fy = gy - Math.floor(gy);
        const s = (t: number) => t * t * (3 - 2 * t);
        const a = grid[iy * 17 + ix];
        const b = grid[iy * 17 + ix + 1];
        const cc = grid[(iy + 1) * 17 + ix];
        const d = grid[(iy + 1) * 17 + ix + 1];
        return a + (b - a) * s(fx) + (cc - a) * s(fy) + (a - b - cc + d) * s(fx) * s(fy);
    };
    for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
            const r = Math.hypot(x - N / 2, y - N / 2) / (N / 2);
            const turb = 0.5 * vn(x, y, 4) + 0.3 * vn(x, y, 8) + 0.2 * vn(x, y, 16);
            const a = Math.max(0, 1 - r) ** 1.3 * (0.45 + 0.75 * turb);
            const shade = 200 + 55 * turb - 30 * (y / N);
            const i = (y * N + x) * 4;
            img.data[i] = img.data[i + 1] = shade;
            img.data[i + 2] = Math.min(255, shade + 4);
            img.data[i + 3] = Math.min(255, a * 255);
        }
    g.putImageData(img, 0, 0);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
}

/** The ignition cloud: seeded particles whose state is a function of mission time only. */
function ExhaustCloud({ met, quality }: { met: () => number; quality: 'high' | 'low' }) {
    const count = quality === 'high' ? 320 : 140;
    const ref = useRef<InstancedMesh>(null);
    const camera = useThree((s) => s.camera);
    const texture = useMemo(() => puffTexture(), []);
    const material = useMemo(() => new MeshStandardMaterial({ color: '#eceef0', map: texture ?? undefined, transparent: true, depthWrite: false, roughness: 1, metalness: 0, opacity: 0.75 }), [texture]);
    useEffect(
        () => () => {
            material.dispose();
            texture?.dispose();
        },
        [material, texture],
    );
    const seeds = useMemo(() => {
        let s = 7;
        const rnd = () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
        return Array.from({ length: count }, () => ({ birth: -3 + rnd() * 16, a: rnd() * Math.PI * 2, spread: rnd(), up: rnd(), size: 0.6 + rnd() * 0.8, life: 16 + rnd() * 10, spin: (rnd() - 0.5) * 0.3, rot: rnd() * Math.PI * 2 }));
    }, [count]);
    const o = useMemo(() => new Object3D(), []);
    const dir = useMemo(() => new Vector3(), []);
    useFrame(() => {
        const mesh = ref.current;
        if (!mesh) return;
        const t = met();
        let n = 0;
        for (const p of seeds) {
            const age = t - p.birth;
            if (age < 0 || age > p.life) continue;
            // Out of the trench westwards and up, slowing with age (drag), growing as it mixes.
            const travel = 140 * (1 - Math.exp(-age / 3.5));
            dir.set(-Math.cos(p.a * 0.35) * 0.9, 0, Math.sin(p.a) * 0.9);
            o.position.copy(TRENCH_EXIT).addScaledVector(dir, travel * (0.4 + p.spread));
            o.position.y += 5 + age * (1.8 + 3.2 * p.up);
            // A little steam also rises around the mount itself.
            if (p.spread < 0.07) o.position.set(Math.cos(p.a) * (8 + age * 2), 3 + age * 2.4, Math.sin(p.a) * (8 + age * 2));
            const s = (p.spread < 0.07 ? 4 + age * 2.5 : 8 + age * 5.2) * p.size;
            o.scale.setScalar(s);
            o.quaternion.copy(camera.quaternion);
            o.rotateZ(p.rot + age * p.spin);
            o.updateMatrix();
            mesh.setMatrixAt(n++, o.matrix);
        }
        mesh.count = n;
        mesh.instanceMatrix.needsUpdate = true;
        mesh.visible = n > 0;
    });
    return (
        <instancedMesh ref={ref} args={[undefined, material, count]} frustumCulled={false} renderOrder={6}>
            <planeGeometry args={[1, 1]} />
        </instancedMesh>
    );
}

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
                uniforms: { uMet: { value: 0 }, uHead: { value: new Vector3() }, uSun: { value: new Vector3(0.814, 0.5, 0.296).normalize() } },
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


/** A box with a photographic material whose texture repeats every `tile` metres. */
function SurfaceBox({ size, at, tile, map, normal, color = '#ffffff', roughness = 0.9, metalness = 0, castShadow = true }: { size: [number, number, number]; at: [number, number, number]; tile: number; map?: Texture; normal?: Texture; color?: string; roughness?: number; metalness?: number; castShadow?: boolean }) {
    const rx = Math.max(1, size[0] / tile);
    const ry = Math.max(1, Math.max(size[1], size[2]) / tile);
    const m = useRepeat(map, rx, ry);
    const nm = useRepeat(normal, rx, ry);
    const material = useMat({ color, roughness, metalness, map: m ?? undefined, normalMap: nm ?? undefined }, [m, nm, color, roughness, metalness]);
    return (
        <mesh position={at} material={material} castShadow={castShadow} receiveShadow>
            <boxGeometry args={size} />
        </mesh>
    );
}

export default function LaunchSite({ met, head, groundOpacity, quality }: { met: () => number; head: () => Vector3; groundOpacity: () => number; quality: 'high' | 'low' }) {
    const maps = useContext(MapsContext);
    const steel = useMat({ color: '#80858d', roughness: 0.45, metalness: 0.8 });
    const towerPaint = useMat({ color: '#a2462c', roughness: 0.62, metalness: 0.35 });
    const tankPaint = useMat({ color: '#e8e9ea', roughness: 0.55, metalness: 0.15 });
    const arms = useRef<Group>(null);
    const site = useRef<Group>(null);

    useFrame(() => {
        const t = met();
        // Service arms swing away from T−60 s to T−40 s.
        const swing = Math.min(1, Math.max(0, (t + 60) / 20));
        if (arms.current) arms.current.children.forEach((arm) => (arm.rotation.y = (-Math.PI / 2) * swing));
        if (site.current) site.current.visible = groundOpacity() > 0.003;
    });

    return (
        <group>
            <Ocean opacity={groundOpacity} />
            <Land opacity={groundOpacity} />
            <group ref={site}>
                {/* Pad deck, apron and the access road, in concrete */}
                <SurfaceBox size={[110, 1.2, 80]} at={[-20, 0.6, 0]} tile={14} map={maps?.concrete} normal={maps?.concreteN} color="#f2f0ea" />
                <SurfaceBox size={[260, 0.25, 200]} at={[-40, 0.12, 0]} tile={16} map={maps?.concrete} normal={maps?.concreteN} color="#e2dfd8" castShadow={false} />
                <SurfaceBox size={[1300, 0.2, 9]} at={[-820, 0.1, 0]} tile={9} map={maps?.concrete} normal={maps?.concreteN} color="#a9a6a0" castShadow={false} />
                {/* Flame trench running west: sooted concrete walls and floor below the deck level */}
                <SurfaceBox size={[46, 1.3, 12]} at={[-40, 0.66, 0]} tile={6} map={maps?.concrete} normal={maps?.concreteN} color="#4a4844" castShadow={false} />
                {/* Launch mount: an open frame on four legs over the trench (the exhaust passes through), with hold-down posts */}
                {[
                    [0, -4.6, 11, 1.8],
                    [0, 4.6, 11, 1.8],
                    [-4.6, 0, 1.8, 7.4],
                    [4.6, 0, 1.8, 7.4],
                ].map(([x, z, w, d]) => (
                    <mesh key={`${x},${z}`} position={[x, MOUNT_TOP - 0.5, z]} material={steel} castShadow receiveShadow>
                        <boxGeometry args={[w, 1, d]} />
                    </mesh>
                ))}
                {[
                    [-4.6, -4.6],
                    [4.6, -4.6],
                    [4.6, 4.6],
                    [-4.6, 4.6],
                ].map(([x, z]) => (
                    <SurfaceBox key={`${x},${z}`} size={[1.6, MOUNT_TOP - 1.4, 1.6]} at={[x, (MOUNT_TOP - 1.4) / 2 + 1.2, z]} tile={2} map={maps?.concrete} normal={maps?.concreteN} color="#9a9792" />
                ))}
                {[0, 1, 2, 3].map((k) => {
                    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
                    return (
                        <mesh key={k} position={[Math.cos(a) * 2.2, MOUNT_TOP + 0.5, Math.sin(a) * 2.2]} material={steel} castShadow>
                            <boxGeometry args={[0.6, 1.0, 0.6]} />
                        </mesh>
                    );
                })}
                {/* Umbilical tower with three service arms */}
                <group position={[TOWER_X - 4, 1.2, 0]}>
                    <Lattice height={TOWER_H} width={8} material={towerPaint} />
                    {[16, 32, 48, 64].map((y) => (
                        <mesh key={y} position={[0, y, 0]} material={steel} receiveShadow castShadow>
                            <boxGeometry args={[8.4, 0.25, 8.4]} />
                        </mesh>
                    ))}
                    <mesh position={[0, TOWER_H + 1.5, 0]} material={steel} castShadow>
                        <boxGeometry args={[9, 3, 9]} />
                    </mesh>
                    <group ref={arms}>
                        {[20, 36, 52].map((y) => (
                            <group key={y} position={[4, y, 0]}>
                                <mesh position={[2.5, 0, 0]} material={towerPaint} castShadow>
                                    <boxGeometry args={[5.6, 1.2, 1.6]} />
                                </mesh>
                            </group>
                        ))}
                    </group>
                </group>
                {/* Lightning masts */}
                {[
                    [-30, -38],
                    [36, -30],
                    [-6, 42],
                ].map(([x, z]) => (
                    <mesh key={`${x},${z}`} position={[x, 45, z]} material={steel} castShadow>
                        <cylinderGeometry args={[0.35, 0.8, 90, 10]} />
                    </mesh>
                ))}
                {/* Water tower */}
                <group position={[-160, 0, 60]}>
                    {[
                        [-6, -6],
                        [6, -6],
                        [6, 6],
                        [-6, 6],
                    ].map(([x, z]) => (
                        <mesh key={`${x},${z}`} position={[x, 25, z]} material={steel} castShadow>
                            <cylinderGeometry args={[0.6, 0.6, 50, 8]} />
                        </mesh>
                    ))}
                    <mesh position={[0, 55, 0]} material={tankPaint} castShadow>
                        <sphereGeometry args={[11, 32, 20]} />
                    </mesh>
                </group>
                {/* Corrugated-metal support buildings and the tall vehicle assembly building */}
                {(
                    [
                        [-280, -110, 64, 18, 40, '#c9ccd0'],
                        [-320, 80, 44, 13, 30, '#b9bec4'],
                        [-430, -30, 96, 24, 52, '#d3d5d8'],
                        [-760, 140, 120, 62, 90, '#e1e3e5'],
                    ] as const
                ).map(([x, z, w, h, d, c]) => (
                    <SurfaceBox key={`${x},${z}`} size={[w, h, d]} at={[x, h / 2, z]} tile={4} normal={maps?.metalN} color={c} roughness={0.55} metalness={0.25} />
                ))}
            </group>
            <ExhaustCloud met={met} quality={quality} />
            <ExhaustTrail met={met} head={head} />
        </group>
    );
}
