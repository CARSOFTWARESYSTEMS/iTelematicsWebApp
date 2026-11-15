"use client";
// Environment of the Solar System experience (option 06), kept separate from the other Space Digital
// Twin experiences: its own Earth globe (the same Earth imagery files, credited on /policies/terms) with an
// opacity control and the cloud layer in one pass, a sky dome that turns from blue to black with
// altitude, and daylight reflections for the launch pad. Everything is released on unmount.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
    AdditiveBlending,
    BackSide,
    Color,
    DoubleSide,
    Mesh,
    MeshBasicMaterial,
    PMREMGenerator,
    PlaneGeometry,
    Scene,
    ShaderMaterial,
    SphereGeometry,
    ImageBitmapLoader,
    SRGBColorSpace,
    Texture,
    TextureLoader,
    Vector3,
    type Quaternion,
} from 'three';

const BASE = '/images/space-twin/';

/** Logarithmic depth chunks: the canvas spans metres (engine close-ups) to AU (the Sun-centred view). */
// Each chunk is a preprocessor directive, so it is wrapped in newlines to stand on its own line.
export const LOGDEPTH = {
    vPars: '\n#include <common>\n#include <logdepthbuf_pars_vertex>\n',
    v: '\n#include <logdepthbuf_vertex>\n',
    fPars: '\n#include <logdepthbuf_pars_fragment>\n',
    f: '\n#include <logdepthbuf_fragment>\n',
} as const;

type Maps = { day: Texture; night: Texture; clouds: Texture };
const MapsContext = createContext<Maps | null>(null);

/**
 * Loads the Earth imagery once per canvas. Without it (offline) the globe falls back to a plain shaded
 * sphere. The 2k maps (shared with the other experiences) load first; with `hd`, this experience's own
 * 8k day and cloud maps and 4k night lights (Solar System Scope, CC BY 4.0) replace them once loaded,
 * so the opening never waits for them.
 */
export function GlobeTextures({ children, hd = false }: { children: ReactNode; hd?: boolean }) {
    const { gl, invalidate } = useThree();
    const [maps, setMaps] = useState<Maps | null>(null);
    useEffect(() => {
        let alive = true;
        const loader = new TextureLoader();
        const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
        const load = (file: string, srgb: boolean) =>
            loader.loadAsync(file).then((t) => {
                if (srgb) t.colorSpace = SRGBColorSpace;
                t.anisotropy = aniso;
                return t;
            });
        const set = (list: Texture[], next: Maps) => {
            if (!alive) return list.forEach((t) => t.dispose());
            setMaps(next);
            invalidate();
        };
        Promise.all([load(BASE + 'earth-day-2k.jpg', true), load(BASE + 'earth-night-2k.jpg', true), load(BASE + 'earth-clouds-2k.jpg', false)])
            .then(([day, night, clouds]) => {
                set([day, night, clouds], { day, night, clouds });
                if (!hd || !alive) return;
                // Large maps: decoded off the main thread (ImageBitmap) and uploaded to the GPU as soon as they
                // arrive, during the opening, so the first view of the globe never stalls on them.
                const HD = '/images/solar-system/';
                const bitmaps = new ImageBitmapLoader().setOptions({ imageOrientation: 'flipY' });
                const loadHD = (file: string, srgb: boolean) =>
                    bitmaps.loadAsync(HD + file).then((bmp) => {
                        const t = new Texture(bmp as unknown as HTMLImageElement);
                        if (srgb) t.colorSpace = SRGBColorSpace;
                        t.anisotropy = aniso;
                        t.flipY = false;
                        t.needsUpdate = true;
                        gl.initTexture(t);
                        return t;
                    });
                return Promise.all([loadHD('earth-day-8k.jpg', true), loadHD('earth-night-4k.jpg', true), loadHD('earth-clouds-8k.jpg', false)]).then(([d8, n4, c8]) => set([d8, n4, c8], { day: d8, night: n4, clouds: c8 }));
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [gl, invalidate, hd]);
    useEffect(
        () => () => {
            maps?.day.dispose();
            maps?.night.dispose();
            maps?.clouds.dispose();
        },
        [maps],
    );
    return <MapsContext.Provider value={maps}>{children}</MapsContext.Provider>;
}

export const useEarthMaps = () => useContext(MapsContext);

const SPHERE_HIGH = new SphereGeometry(1, 160, 120);
const SPHERE_LOW = new SphereGeometry(1, 64, 48);

/**
 * Earth: day imagery lit by the Sun, ocean glint, clouds, city lights on the night side and a limb
 * glow, in one shader with an opacity for cross-fades. `spin` (radians about the polar axis) is read
 * every frame; `orientation` places the polar axis and the launch site in the scene.
 */
export function Globe({
    radius,
    position = [0, 0, 0],
    orientation,
    spin,
    sun,
    opacity = 1,
    detail = 'high',
}: {
    radius: number;
    position?: readonly [number, number, number];
    orientation: Quaternion;
    spin?: () => number;
    sun: { current: Vector3 };
    opacity?: number | (() => number);
    detail?: 'high' | 'low';
}) {
    const maps = useEarthMaps();
    const spinRef = useRef<Mesh>(null);
    const camera = useThree((st) => st.camera);
    const centre = useMemo(() => new Vector3(), []);
    const material = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: {
                    uDay: { value: maps?.day ?? null },
                    uNight: { value: maps?.night ?? null },
                    uClouds: { value: maps?.clouds ?? null },
                    uHasMaps: { value: maps ? 1 : 0 },
                    uSun: { value: new Vector3(0, 1, 0) },
                    uOpacity: { value: 1 },
                    uDetail: { value: 0 },
                },
                vertexShader: /* glsl */ `
                    ${LOGDEPTH.vPars}
                    varying vec2 vUv; varying vec3 vN; varying vec3 vPos;
                    void main() {
                        vUv = uv;
                        vN = normalize(mat3(modelMatrix) * normal);
                        vec4 wp = modelMatrix * vec4(position, 1.0);
                        vPos = wp.xyz;
                        gl_Position = projectionMatrix * viewMatrix * wp;
                        ${LOGDEPTH.v}
                    }`,
                fragmentShader: /* glsl */ `
                    ${LOGDEPTH.fPars}
                    uniform sampler2D uDay; uniform sampler2D uNight; uniform sampler2D uClouds;
                    uniform float uHasMaps; uniform vec3 uSun; uniform float uOpacity; uniform float uDetail;
                    varying vec2 vUv; varying vec3 vN; varying vec3 vPos;
                    float gh(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
                    float gn(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
                        return mix(mix(gh(i), gh(i + vec2(1.0, 0.0)), f.x), mix(gh(i + vec2(0.0, 1.0)), gh(i + vec2(1.0, 1.0)), f.x), f.y); }
                    // Fine cloud structure below the map's resolution (cells of a few km), for low-orbit views.
                    float cloudFine(vec2 uv) { vec2 p = uv * vec2(6000.0, 3000.0); return 0.5 * gn(p) + 0.3 * gn(p * 2.63 + 7.1) + 0.2 * gn(p * 6.9 + 3.3); }
                    void main() {
                        ${LOGDEPTH.f}
                        vec3 n = normalize(vN);
                        vec3 v = normalize(cameraPosition - vPos);
                        float d = dot(n, uSun);
                        float day = smoothstep(-0.08, 0.22, d);
                        vec3 dayCol = uHasMaps > 0.5 ? texture2D(uDay, vUv).rgb : vec3(0.08, 0.16, 0.3);
                        float cloud = uHasMaps > 0.5 ? texture2D(uClouds, vUv).r : 0.0;
                        float fine = 0.5;
                        if (uDetail > 0.001) {
                            fine = cloudFine(vUv);
                            // Erode and build the edges of the mapped clouds; clear sky stays clear.
                            cloud = clamp(cloud + (fine - 0.5) * 1.5 * uDetail * smoothstep(0.03, 0.35, cloud), 0.0, 1.0);
                        }
                        vec3 nightCol = uHasMaps > 0.5 ? texture2D(uNight, vUv).rgb : vec3(0.0);
                        float ocean = smoothstep(0.015, 0.09, dayCol.b - max(dayCol.r, dayCol.g));
                        float glint = pow(max(dot(n, normalize(uSun + v)), 0.0), 60.0) * ocean * (1.0 - cloud);
                        vec3 col = dayCol * (0.03 + 1.25 * max(d, 0.0)) + vec3(1.0, 0.95, 0.85) * glint * 0.7 * day;
                        col = mix(col, vec3(0.04 + 1.1 * max(d, 0.0)) * (1.0 + (fine - 0.5) * 0.5 * uDetail), cloud * 0.86);
                        col += nightCol * vec3(1.0, 0.78, 0.5) * (1.0 - day) * (1.0 - cloud) * 1.4;
                        float rim = pow(1.0 - max(dot(n, v), 0.0), 3.5);
                        col += vec3(0.32, 0.56, 1.0) * rim * (0.12 + 0.88 * day) * 0.8;
                        gl_FragColor = vec4(col, uOpacity);
                        #include <colorspace_fragment>
                    }`,
                transparent: true,
            }),
        [maps],
    );
    const halo = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: { uSun: { value: new Vector3(0, 1, 0) }, uOpacity: { value: 1 } },
                vertexShader: /* glsl */ `${LOGDEPTH.vPars}
                    varying vec3 vN; varying vec3 vPos;
                    void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; ${LOGDEPTH.v} }`,
                fragmentShader: /* glsl */ `${LOGDEPTH.fPars}
                    uniform vec3 uSun; uniform float uOpacity; varying vec3 vN; varying vec3 vPos;
                    void main() {
                        ${LOGDEPTH.f}
                        vec3 v = normalize(cameraPosition - vPos);
                        float edge = pow(max(0.0, 1.0 - abs(dot(normalize(vN), v))), 5.0);
                        float lit = smoothstep(-0.3, 0.4, dot(normalize(vN), uSun));
                        gl_FragColor = vec4(vec3(0.35, 0.62, 1.0) * edge * lit * 1.3 * uOpacity, 1.0);
                    }`,
                side: BackSide,
                blending: AdditiveBlending,
                transparent: true,
                depthWrite: false,
            }),
        [],
    );
    useEffect(() => () => material.dispose(), [material]);
    useEffect(() => () => halo.dispose(), [halo]);
    useFrame(() => {
        const o = typeof opacity === 'function' ? opacity() : opacity;
        material.uniforms.uOpacity.value = o;
        material.depthWrite = o > 0.99;
        halo.uniforms.uOpacity.value = o;
        (material.uniforms.uSun.value as Vector3).copy(sun.current);
        (halo.uniforms.uSun.value as Vector3).copy(sun.current);
        // Fine cloud detail only when the camera is low over the globe.
        if (spinRef.current) {
            spinRef.current.getWorldPosition(centre);
            const alt = camera.position.distanceTo(centre) - radius;
            material.uniforms.uDetail.value = 1 - Math.min(1, Math.max(0, (alt - 4e5) / 3e6));
        }
        if (spinRef.current && spin) spinRef.current.rotation.y = spin();
        if (spinRef.current) spinRef.current.visible = o > 0.002;
    });
    const geometry = detail === 'high' ? SPHERE_HIGH : SPHERE_LOW;
    return (
        <group position={position as [number, number, number]} quaternion={orientation}>
            <mesh ref={spinRef} geometry={geometry} material={material} scale={radius} renderOrder={-2} />
            <mesh geometry={geometry} material={halo} scale={radius * 1.018} renderOrder={-1} />
        </group>
    );
}

/**
 * The sky around the camera: blue near the ground with a bright horizon and a Sun glow, fading to the
 * black of space between about 12 and 65 km. `state` is read every frame.
 */
export function SkyDome({ state }: { state: () => { altitude: number; up: Vector3; sun: Vector3; radius: number } }) {
    const camera = useThree((s) => s.camera);
    const ref = useRef<Mesh>(null);
    const material = useMemo(
        () =>
            new ShaderMaterial({
                side: BackSide,
                depthWrite: false,
                depthTest: false,
                uniforms: { uAlt: { value: 0 }, uUp: { value: new Vector3(0, 1, 0) }, uSun: { value: new Vector3(0, 1, 0) } },
                vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                fragmentShader: /* glsl */ `
                    uniform float uAlt; uniform vec3 uUp; uniform vec3 uSun; varying vec3 vDir;
                    void main() {
                        vec3 d = normalize(vDir);
                        float e = dot(d, uUp);
                        float space = smoothstep(12000.0, 65000.0, uAlt);
                        vec3 zenith = vec3(0.13, 0.3, 0.66);
                        vec3 horizon = vec3(0.66, 0.78, 0.9);
                        vec3 sky = mix(horizon, zenith, pow(clamp(e, 0.0, 1.0), 0.45));
                        sky = e < 0.0 ? mix(horizon * 0.92, vec3(0.5, 0.56, 0.6), clamp(-e * 6.0, 0.0, 1.0)) : sky;
                        float s = max(dot(d, uSun), 0.0);
                        vec3 glow = vec3(1.0, 0.93, 0.8) * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.28);
                        vec3 dark = vec3(0.0035, 0.0055, 0.011) + vec3(1.0, 0.95, 0.85) * pow(s, 2000.0) * 8.0;
                        gl_FragColor = vec4(mix(sky + glow, dark, space), 1.0);
                        #include <colorspace_fragment>
                    }`,
            }),
        [],
    );
    useEffect(() => () => material.dispose(), [material]);
    useFrame(() => {
        const s = state();
        material.uniforms.uAlt.value = s.altitude;
        (material.uniforms.uUp.value as Vector3).copy(s.up);
        (material.uniforms.uSun.value as Vector3).copy(s.sun);
        if (ref.current) {
            ref.current.position.copy(camera.position);
            ref.current.scale.setScalar(s.radius);
        }
    });
    return (
        <mesh ref={ref} material={material} renderOrder={-10} frustumCulled={false}>
            <sphereGeometry args={[1, 48, 24]} />
        </mesh>
    );
}

/** Daylight reflections for the pad: a blue sky dome, a bright Sun and warm ground, prefiltered once. */
export function DaylightReflections({ sun }: { sun: readonly [number, number, number] }) {
    const gl = useThree((s) => s.gl);
    const key = sun.join(',');
    const target = useMemo(() => {
        const [sx, sy, sz] = key.split(',').map(Number);
        const pmrem = new PMREMGenerator(gl);
        const scene = new Scene();
        scene.background = new Color(0.36, 0.5, 0.7);
        const plane = new PlaneGeometry(1, 1);
        const materials: MeshBasicMaterial[] = [];
        const panel = (rgb: [number, number, number], at: [number, number, number], w: number, h: number) => {
            const m = new MeshBasicMaterial({ color: new Color(...rgb), side: DoubleSide });
            materials.push(m);
            const mesh = new Mesh(plane, m);
            mesh.position.set(...at);
            mesh.scale.set(w, h, 1);
            mesh.lookAt(0, 0, 0);
            scene.add(mesh);
        };
        panel([12, 11, 9.5], [sx * 10, sy * 10, sz * 10], 3, 3); // the Sun
        panel([0.42, 0.38, 0.32], [0, -10, 0], 40, 40); // ground
        panel([0.75, 0.82, 0.92], [0, 10, 0], 30, 30); // bright sky overhead
        const rt = pmrem.fromScene(scene, 0.04);
        materials.forEach((m) => m.dispose());
        plane.dispose();
        pmrem.dispose();
        return rt;
    }, [gl, key]);
    useEffect(() => () => target.dispose(), [target]);
    return <primitive object={target.texture} attach="environment" />;
}

/** A soft round sprite texture drawn once (smoke, glows). */
export function useSoftDisc() {
    const texture = useMemo(() => {
        if (typeof document === 'undefined') return null;
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const g = c.getContext('2d')!;
        const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.45, 'rgba(255,255,255,0.55)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 64);
        return c;
    }, []);
    return texture;
}
