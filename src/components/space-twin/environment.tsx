"use client";
// The shared space environment for every scene, from the "Learn to Protect Missions" showcase:
// a near-black sky, fixed stars, prefiltered reflections, and Earth from day, night-lights and
// cloud imagery. Recoloured to the iTelematics® palette (navy and cool steel, no purple). The
// Earth reads its Sun direction every frame, so scenes can move the terminator and show eclipse,
// and can be turned by the simulation (the constellation) instead of a decorative spin.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
    AdditiveBlending,
    BackSide,
    BufferGeometry,
    Color,
    DoubleSide,
    Float32BufferAttribute,
    Mesh,
    MeshBasicMaterial,
    PMREMGenerator,
    PlaneGeometry,
    Scene,
    ShaderMaterial,
    SRGBColorSpace,
    TextureLoader,
    Vector3,
    type Group,
    type Texture,
} from 'three';

const BASE = '/images/space-twin/';

type EarthMaps = { day: Texture; night: Texture; clouds: Texture };
const EarthContext = createContext<EarthMaps | null>(null);

/** Loads Earth imagery once per canvas, shared by every scene; released when the canvas unmounts. */
export function EarthTextures({ children }: { children: ReactNode }) {
    const { gl, invalidate } = useThree();
    const [maps, setMaps] = useState<EarthMaps | null>(null);
    useEffect(() => {
        let alive = true;
        const loader = new TextureLoader();
        const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
        const load = (file: string, srgb: boolean) =>
            loader.loadAsync(BASE + file).then((t) => {
                if (srgb) t.colorSpace = SRGBColorSpace;
                t.anisotropy = aniso;
                return t;
            });
        Promise.all([load('earth-day-2k.jpg', true), load('earth-night-2k.jpg', true), load('earth-clouds-2k.jpg', false)])
            .then(([day, night, clouds]) => {
                if (!alive) {
                    day.dispose();
                    night.dispose();
                    clouds.dispose();
                    return;
                }
                setMaps({ day, night, clouds });
                invalidate();
            })
            // No imagery (offline, blocked): scenes simply show no Earth.
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [gl, invalidate]);
    useEffect(
        () => () => {
            maps?.day.dispose();
            maps?.night.dispose();
            maps?.clouds.dispose();
        },
        [maps],
    );
    return <EarthContext.Provider value={maps}>{children}</EarthContext.Provider>;
}

interface EarthProps {
    radius: number;
    position: readonly [number, number, number];
    /** Direction from Earth towards the Sun, in world space; read every frame. */
    sun: { current: Vector3 };
    /** Overall brightness, so Earth can sit back as a backdrop. */
    exposure?: number;
    /** Axial tilt for backdrops (radians). The constellation uses an equator-aligned frame (0). */
    tilt?: number;
    /** Decorative spin (radians per second) while playing; ignored when `angle` is given. */
    spin?: number;
    /** Earth rotation angle (radians) from the simulation, read every frame. */
    angle?: () => number;
    /** Initial longitude offset for backdrops. */
    offset?: number;
    playing: boolean;
    clouds?: boolean;
    children?: ReactNode;
}

/**
 * Earth lit by the Sun with ocean glint, city lights on the night side, a cloud layer, a thin
 * atmosphere at the limb. Children are attached to the Earth-fixed frame (ground stations).
 */
export function Earth({ radius, position, sun, exposure = 1, tilt = (23.4 * Math.PI) / 180, spin = 0.018, angle, offset = 2.2, playing, clouds = true, children }: EarthProps) {
    const maps = useContext(EarthContext);
    const surfaceRef = useRef<Group>(null);
    const cloudsRef = useRef<Group>(null);

    const surface = useMemo(() => {
        if (!maps) return null;
        return new ShaderMaterial({
            uniforms: { uDay: { value: maps.day }, uNight: { value: maps.night }, uSun: { value: new Vector3(0, 1, 0) }, uExposure: { value: exposure } },
            vertexShader: /* glsl */ `
                varying vec2 vUv; varying vec3 vN; varying vec3 vPos;
                void main() {
                    vUv = uv;
                    vN = normalize(mat3(modelMatrix) * normal);
                    vec4 wp = modelMatrix * vec4(position, 1.0);
                    vPos = wp.xyz;
                    gl_Position = projectionMatrix * viewMatrix * wp;
                }`,
            fragmentShader: /* glsl */ `
                uniform sampler2D uDay; uniform sampler2D uNight; uniform vec3 uSun; uniform float uExposure;
                varying vec2 vUv; varying vec3 vN; varying vec3 vPos;
                void main() {
                    vec3 n = normalize(vN);
                    vec3 v = normalize(cameraPosition - vPos);
                    float d = dot(n, uSun);
                    float day = smoothstep(-0.06, 0.2, d);
                    vec3 dayCol = texture2D(uDay, vUv).rgb;
                    vec3 nightCol = texture2D(uNight, vUv).rgb;
                    float ocean = smoothstep(0.015, 0.09, dayCol.b - max(dayCol.r, dayCol.g));
                    float glint = pow(max(dot(n, normalize(uSun + v)), 0.0), 70.0) * ocean;
                    vec3 col = dayCol * (0.025 + 1.3 * max(d, 0.0)) + vec3(1.0, 0.94, 0.82) * glint * 0.8 * day;
                    col += nightCol * vec3(1.0, 0.78, 0.5) * (1.0 - day) * 1.6;
                    col += vec3(0.9, 0.42, 0.16) * clamp(1.0 - abs(d) * 5.0, 0.0, 1.0) * 0.05;
                    float rim = pow(1.0 - max(dot(n, v), 0.0), 4.0);
                    col += vec3(0.3, 0.56, 1.0) * rim * (0.1 + 0.9 * day) * 0.7;
                    gl_FragColor = vec4(col * uExposure, 1.0);
                    #include <colorspace_fragment>
                }`,
        });
    }, [maps, exposure]);

    const atmosphere = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: { uSun: { value: new Vector3(0, 1, 0) }, uExposure: { value: exposure } },
                vertexShader: /* glsl */ `
                    varying vec3 vN; varying vec3 vPos;
                    void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
                fragmentShader: /* glsl */ `
                    uniform vec3 uSun; uniform float uExposure; varying vec3 vN; varying vec3 vPos;
                    void main() {
                        vec3 v = normalize(cameraPosition - vPos);
                        float edge = pow(max(0.0, 1.0 - abs(dot(normalize(vN), v))), 6.0);
                        float lit = smoothstep(-0.25, 0.4, dot(normalize(vN), uSun));
                        gl_FragColor = vec4(vec3(0.35, 0.62, 1.0) * edge * lit * 1.4 * uExposure, 1.0);
                    }`,
                side: BackSide,
                blending: AdditiveBlending,
                transparent: true,
                depthWrite: false,
            }),
        [exposure],
    );

    useEffect(() => () => surface?.dispose(), [surface]);
    useEffect(() => () => atmosphere.dispose(), [atmosphere]);

    useFrame((_, delta) => {
        if (surface) (surface.uniforms.uSun.value as Vector3).copy(sun.current);
        (atmosphere.uniforms.uSun.value as Vector3).copy(sun.current);
        if (angle) {
            const a = angle();
            if (surfaceRef.current) surfaceRef.current.rotation.y = a;
            if (cloudsRef.current) cloudsRef.current.rotation.y = a * 1.02;
        } else if (playing) {
            const dt = Math.min(delta, 0.05);
            if (surfaceRef.current) surfaceRef.current.rotation.y += spin * dt;
            if (cloudsRef.current) cloudsRef.current.rotation.y += spin * 1.33 * dt;
        }
    });

    if (!maps || !surface) return null;
    return (
        <group position={position as [number, number, number]} rotation={[0, 0, tilt]}>
            <group ref={surfaceRef} rotation={[0, angle ? 0 : offset, 0]}>
                <mesh material={surface}>
                    <sphereGeometry args={[radius, 128, 96]} />
                </mesh>
                {children}
            </group>
            {clouds && (
                <group ref={cloudsRef} rotation={[0, angle ? 0 : offset, 0]}>
                    <mesh>
                        <sphereGeometry args={[radius * 1.006, 96, 72]} />
                        <meshStandardMaterial color="#ffffff" alphaMap={maps.clouds} transparent depthWrite={false} roughness={1} metalness={0} opacity={Math.min(1, exposure) * 0.9} />
                    </mesh>
                </group>
            )}
            <mesh material={atmosphere} scale={1.025}>
                <sphereGeometry args={[radius, 96, 72]} />
            </mesh>
        </group>
    );
}

/** The sky: near-black navy with a faint cool glow, and a hint of blue towards Earth. */
export function Sky({ earthward = [-0.2, -0.45, -0.87] }: { earthward?: readonly [number, number, number] }) {
    const key = earthward.join(',');
    const material = useMemo(
        () =>
            new ShaderMaterial({
                side: BackSide,
                depthWrite: false,
                uniforms: { uEarth: { value: new Vector3(...key.split(',').map(Number)).normalize() } },
                vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                fragmentShader: /* glsl */ `
                    uniform vec3 uEarth;
                    varying vec3 vDir;
                    void main() {
                        vec3 d = normalize(vDir);
                        vec3 col = vec3(0.0032, 0.0052, 0.0105);
                        float p = pow(max(dot(d, normalize(vec3(0.55, 0.6, -0.58))), 0.0), 6.0);
                        col += vec3(0.03, 0.06, 0.1) * p * 0.35;
                        float b = pow(max(dot(d, uEarth), 0.0), 8.0);
                        col += vec3(0.015, 0.04, 0.12) * b * 0.2;
                        gl_FragColor = vec4(col, 1.0);
                        #include <colorspace_fragment>
                    }`,
            }),
        [key],
    );
    useEffect(() => () => material.dispose(), [material]);
    return (
        <mesh material={material} renderOrder={-1}>
            <sphereGeometry args={[9500, 32, 16]} />
        </mesh>
    );
}

/** Fixed stars as soft points of a constant pixel size (no twinkling, no drift). */
export function StarField({ count }: { count: number }) {
    const dpr = useThree((s) => s.viewport.dpr);
    const geometry = useMemo(() => {
        let seed = 42;
        const rnd = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        const positions: number[] = [];
        const sizes: number[] = [];
        const colors: number[] = [];
        for (let i = 0; i < count; i++) {
            const z = rnd() * 2 - 1;
            const a = rnd() * Math.PI * 2;
            const r = Math.sqrt(1 - z * z);
            positions.push(8000 * r * Math.cos(a), 8000 * z, 8000 * r * Math.sin(a));
            sizes.push(0.9 + Math.pow(rnd(), 7) * 2.6);
            const b = 0.35 + 0.65 * rnd() * rnd();
            const tint = rnd();
            colors.push(b * (0.86 + 0.14 * tint), b * (0.9 + 0.08 * tint), b);
        }
        const g = new BufferGeometry();
        g.setAttribute('position', new Float32BufferAttribute(positions, 3));
        g.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
        g.setAttribute('aColor', new Float32BufferAttribute(colors, 3));
        return g;
    }, [count]);
    const material = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: { uPx: { value: dpr } },
                vertexShader: /* glsl */ `
                    attribute float aSize; attribute vec3 aColor; uniform float uPx; varying vec3 vColor;
                    void main() { vColor = aColor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uPx; }`,
                fragmentShader: /* glsl */ `
                    varying vec3 vColor;
                    void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d); gl_FragColor = vec4(vColor * a, a); }`,
                transparent: true,
                depthWrite: false,
                blending: AdditiveBlending,
            }),
        [dpr],
    );
    useEffect(() => () => geometry.dispose(), [geometry]);
    useEffect(() => () => material.dispose(), [material]);
    return <points geometry={geometry} material={material} />;
}

/** Reflections for metal, cells and foil: a few soft light panels, prefiltered once per scene. */
export function Reflections({ sun }: { sun: readonly [number, number, number] }) {
    const gl = useThree((s) => s.gl);
    const key = sun.join(',');
    const target = useMemo(() => {
        const [sx, sy, sz] = key.split(',').map(Number);
        const l = Math.hypot(sx, sy, sz);
        const pmrem = new PMREMGenerator(gl);
        const scene = new Scene();
        scene.background = new Color(0.006, 0.008, 0.016);
        const plane = new PlaneGeometry(1, 1);
        const materials: MeshBasicMaterial[] = [];
        const panel = (rgb: [number, number, number], at: [number, number, number], w: number, h: number) => {
            const material = new MeshBasicMaterial({ color: new Color(...rgb), side: DoubleSide });
            materials.push(material);
            const mesh = new Mesh(plane, material);
            mesh.position.set(...at);
            mesh.scale.set(w, h, 1);
            mesh.lookAt(0, 0, 0);
            scene.add(mesh);
        };
        panel([9, 8, 6.6], [(sx / l) * 10, (sy / l) * 10, (sz / l) * 10], 5, 5); // the Sun
        panel([0.45, 0.6, 0.85], [9, 5, -9], 12, 9); // cool steel, behind
        panel([0.16, 0.36, 0.9], [2, -11, -3], 26, 10); // earthshine, below
        panel([0.5, 0.56, 0.62], [-11, 1, 6], 1, 12); // a neutral strip
        panel([0.3, 0.33, 0.4], [0, 11, 2], 14, 10); // soft top light
        const rt = pmrem.fromScene(scene, 0.03);
        materials.forEach((m) => m.dispose());
        plane.dispose();
        pmrem.dispose();
        return rt;
    }, [gl, key]);
    useEffect(() => () => target.dispose(), [target]);
    return <primitive object={target.texture} attach="environment" />;
}

/** If the first seconds run slowly, drop to a 1× pixel ratio. */
export function AdaptiveDpr() {
    const setDpr = useThree((s) => s.setDpr);
    const stats = useRef({ frames: 0, time: 0, done: false });
    useFrame((_, delta) => {
        const s = stats.current;
        if (s.done) return;
        s.frames += 1;
        if (s.frames <= 20) return; // shader compilation
        s.time += delta;
        if (s.frames >= 110) {
            s.done = true;
            if (s.time / 90 > 1 / 38) setDpr(1);
        }
    });
    return null;
}
