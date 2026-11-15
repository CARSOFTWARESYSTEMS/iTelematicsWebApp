'use client';
// Rendering foundation of the Solar System experience (visual recovery, round 2):
//
// • PostFX — the frame is rendered in linear HDR (half float, 4× MSAA) and only then tone mapped
//   (ACES filmic) in the final camera-look pass. In between, a bloom pass spreads light from genuinely bright
//   sources only — exhaust cores, the Sun, specular glints — with a threshold well above the brightest
//   sky and sunlit hardware, so nothing ordinary glows.
// • PhotoSky — the pad's sky is a photographed high-dynamic-range sky (CC0, Poly Haven), shown at its
//   measured radiance and faded into the physically based scattering sky as the camera climbs.
// • PadEnvironment — image-based lighting at the pad from the same photograph (sun removed: the
//   directional light carries it), switching to the scattering sky's own environment in the upper air.
// • LiveReflections — in space, a small cube camera at the spacecraft records its surroundings (the
//   Earth, Jupiter, the Sun) a few times a second, so foil, paint and metal reflect what is really there.
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
    BackSide,
    CubeCamera,
    CustomBlending,
    EquirectangularReflectionMapping,
    HalfFloatType,
    LinearFilter,
    LinearMipmapLinearFilter,
    Mesh,
    NormalBlending,
    PMREMGenerator,
    RepeatWrapping,
    ShaderMaterial,
    SRGBColorSpace,
    TextureLoader,
    Vector2,
    Vector3 as V3,
    WebGLCubeRenderTarget,
    WebGLRenderTarget,
    type Object3D,
    type Texture,
    type Vector3,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { LOGDEPTH } from './environment';
import { skyEnvironmentTarget } from './atmosphere';
import { SUN } from './sun';

const BASE = '/images/solar-system/';

/** Development only: ?solar-perf=noPost,noScrub,… switches parts off to measure their cost. */
export const perfOff = (key: string) => process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('solar-perf') ?? '').split(',').includes(key);

/**
 * The look of a real camera, applied after tone mapping (display values): a gentle filmic grade (soft
 * S-curve, slightly lifted blacks, warm highlights and cool shadows), lens vignetting, faint lateral
 * chromatic aberration towards the edges and fine animated grain, strongest in the mid-tones as film
 * and sensor noise are. Kept subtle: it should read as footage, not as an effect.
 */
const CINEMA = {
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.03 }, uVignette: { value: 0.3 }, uAberration: { value: 0.0022 }, uExposure: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse; uniform float uTime; uniform float uGrain; uniform float uVignette; uniform float uAberration; uniform float uExposure;
        varying vec2 vUv;
        float h(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
        // ACES filmic (the same fit three.js uses), then the sRGB transfer: tone mapping happens here, once.
        vec3 rrt(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
        vec3 aces(vec3 color) {
            const mat3 IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
            const mat3 OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
            color *= uExposure / 0.6;
            return clamp(OUT * rrt(IN * color), 0.0, 1.0);
        }
        vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
        vec3 tone(vec3 c) { return srgb(aces(c)); }
        void main() {
            vec2 c = vUv - 0.5;
            float r2 = dot(c, c);
            vec2 off = c * r2 * uAberration * 4.0;
            vec3 col = vec3(tone(texture2D(tDiffuse, vUv + off).rgb).r, tone(texture2D(tDiffuse, vUv).rgb).g, tone(texture2D(tDiffuse, vUv - off).rgb).b);
            float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
            col = mix(col, col * col * (3.0 - 2.0 * col), 0.16);
            col = col * 0.976 + 0.01;
            col *= mix(vec3(0.985, 1.0, 1.025), vec3(1.025, 1.0, 0.97), smoothstep(0.25, 0.85, l));
            col *= 1.0 - uVignette * smoothstep(0.06, 0.5, r2 * 1.4);
            float g = h(gl_FragCoord.xy + fract(uTime * 13.7) * vec2(97.0, 57.0)) + h(gl_FragCoord.xy * 1.37 + fract(uTime * 7.1) * 61.0) - 1.0;
            col += g * uGrain * (0.3 + 0.7 * (1.0 - abs(l * 2.0 - 1.0)));
            gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }`,
};

/**
 * HDR post-processing. Renders the scene itself (priority 1 takes over R3F's render), so it is only
 * mounted at high quality; low quality renders directly with the same tone mapping.
 */
export function PostFX({ exposure, bloom = () => 0.5, sceneKey = () => '' }: { exposure: () => number; bloom?: () => number; sceneKey?: () => string }) {
    const gl = useThree((s) => s.gl);
    const scene = useThree((s) => s.scene);
    const camera = useThree((s) => s.camera);
    const size = useThree((s) => s.size);
    const fx = useMemo(() => {
        const target = new WebGLRenderTarget(2, 2, { type: HalfFloatType, samples: perfOff('msaa4') ? 4 : 2 });
        const composer = new EffectComposer(gl, target);
        // Threshold above sunlit paint, foil and clouds: only flames, the Sun and true glints glow.
        const bloom = new UnrealBloomPass(new Vector2(256, 256), 0.5, 0.55, 3.6);
        // Halation: the wider bloom levels are warmer, as light scattered in a lens and film is.
        const tints = [new V3(1, 1, 1), new V3(1, 0.96, 0.92), new V3(1, 0.9, 0.82), new V3(1, 0.84, 0.72), new V3(1, 0.78, 0.64)];
        bloom.bloomTintColors.forEach((t, i) => t.copy(tints[i] ?? tints[4]));
        const cinema = new ShaderPass(CINEMA);
        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(bloom);
        composer.addPass(cinema);
        return { composer, bloom, cinema, w: 0, h: 0, pr: 0, scale: 1, avg: 16.7, since: 0, key: '' };
    }, [gl, scene, camera]);
    useEffect(
        () => () => {
            fx.bloom.dispose();
            fx.composer.dispose();
        },
        [fx],
    );
    useFrame((_, delta) => {
        // Dynamic resolution: when frames run long (smoothed over ~1 s), render the scene at a slightly lower
        // internal resolution (down to 70 %); the grain and bloom hide the softness. Each scene starts sharp.
        const key = sceneKey();
        let rescale = false;
        if (key !== fx.key) {
            fx.key = key;
            if (fx.scale !== 1) rescale = true;
            fx.scale = 1;
            fx.avg = 16.7;
            fx.since = 0;
        } else if (delta < 0.1) {
            fx.avg += (delta * 1000 - fx.avg) * 0.05;
            fx.since += delta;
            if (fx.since > 1 && fx.avg > 18.5 && fx.scale > 0.7) {
                fx.scale = Math.max(0.7, fx.scale - 0.1);
                fx.since = 0;
                fx.avg = 16.7;
                rescale = true;
            }
        }
        const pr = gl.getPixelRatio();
        if (rescale || pr !== fx.pr || size.width !== fx.w || size.height !== fx.h) {
            fx.pr = pr;
            fx.w = size.width;
            fx.h = size.height;
            fx.composer.setPixelRatio(pr * fx.scale);
            fx.composer.setSize(size.width, size.height);
            // The glow is soft: half the resolution is plenty (its mip chain then starts at a quarter).
            fx.bloom.setSize(Math.round((size.width * pr * fx.scale) / 2), Math.round((size.height * pr * fx.scale) / 2));
        }
        gl.toneMappingExposure += (exposure() - gl.toneMappingExposure) * 0.08;
        fx.cinema.uniforms.uTime.value = performance.now() / 1000;
        fx.cinema.uniforms.uExposure.value = gl.toneMappingExposure;
        fx.bloom.strength += (bloom() - fx.bloom.strength) * 0.1;
        const t0 = performance.now();
        fx.composer.render();
        if (process.env.NODE_ENV !== 'production') {
            const w = window as Window & { __solarCpu?: number[]; __solarFrameStart?: number };
            (w.__solarCpu ??= []).push(performance.now() - (w.__solarFrameStart ?? t0), performance.now() - t0);
            if (w.__solarCpu.length > 2000) w.__solarCpu.splice(0, 1000);
        }
    }, 1);
    return null;
}

/** Eases the renderer's exposure on the low-quality path (no PostFX), so both paths match. */
export function Exposure({ exposure }: { exposure: () => number }) {
    const gl = useThree((s) => s.gl);
    useFrame(() => {
        gl.toneMappingExposure += (exposure() - gl.toneMappingExposure) * 0.08;
    });
    return null;
}

const SKY_VERT = /* glsl */ `${LOGDEPTH.vPars}
    varying vec3 vDir;
    void main() {
        vDir = (modelMatrix * vec4(position, 0.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        ${LOGDEPTH.v}
    }`;

/**
 * The photographed sky (upper hemisphere, equirectangular, stored at 0.4× radiance in sRGB). Drawn
 * over the scattering sky, behind everything else; `opacity` fades it out as the camera climbs.
 */
export function PhotoSky({ opacity, quality, onLoaded }: { opacity: () => number; quality: 'high' | 'low'; onLoaded?: () => void }) {
    const camera = useThree((s) => s.camera);
    const invalidate = useThree((s) => s.invalidate);
    const ref = useRef<Mesh>(null);
    const loadedRef = useRef(onLoaded);
    loadedRef.current = onLoaded;
    const material = useMemo(
        () =>
            new ShaderMaterial({
                side: BackSide,
                depthWrite: false,
                depthTest: false,
                transparent: false,
                uniforms: { uMap: { value: null as Texture | null }, uBackdrop: { value: null as Texture | null }, uHasBackdrop: { value: 0 }, uOpacity: { value: 0 }, uScale: { value: 2.5 } },
                vertexShader: SKY_VERT,
                fragmentShader: /* glsl */ `${LOGDEPTH.fPars}
                    uniform sampler2D uMap; uniform sampler2D uBackdrop; uniform float uHasBackdrop; uniform float uOpacity; uniform float uScale;
                    varying vec3 vDir;
                    void main() {
                        ${LOGDEPTH.f}
                        vec3 d = normalize(vDir);
                        float az = atan(d.z, d.x);
                        float el = asin(clamp(d.y, -1.0, 1.0));
                        float u = az * 0.15915494 + 0.5;
                        float v = clamp(el * 0.63661977, 0.0015, 1.0);
                        vec3 col = texture2D(uMap, vec2(u, v)).rgb;
                        // Behind the pad in the long-lens launch shots (azimuth −115°…−35°, up to 42°):
                        // the same sky at twice the resolution, blended in over 3° at the window edges.
                        float azd = degrees(az);
                        float eld = max(degrees(el), 0.05);
                        vec2 bu = vec2((azd + 115.0) / 80.0, eld / 41.99);
                        float w = uHasBackdrop * smoothstep(0.0, 3.0, azd + 115.0) * smoothstep(0.0, 3.0, -35.0 - azd) * smoothstep(0.0, 3.0, 41.99 - eld);
                        if (w > 0.0) col = mix(col, texture2D(uBackdrop, clamp(bu, 0.0, 1.0)).rgb, w);
                        col *= uScale;
                        gl_FragColor = vec4(col, uOpacity);
                        #include <tonemapping_fragment>
                        #include <colorspace_fragment>
                    }`,
            }),
        [],
    );
    useEffect(() => {
        let alive = true;
        const loaded: Texture[] = [];
        const load = (file: string, slot: 'uMap' | 'uBackdrop') =>
            new TextureLoader().load(`${BASE}${file}`, (t) => {
                if (!alive) return t.dispose();
                t.colorSpace = SRGBColorSpace;
                if (slot === 'uMap') t.wrapS = RepeatWrapping;
                // The sky is always magnified (8192 px around the horizon), so mipmaps are not needed.
                t.generateMipmaps = false;
                t.minFilter = LinearFilter;
                t.magFilter = LinearFilter;
                loaded.push(t);
                material.uniforms[slot].value = t;
                if (slot === 'uBackdrop') material.uniforms.uHasBackdrop.value = 1;
                if (loaded.length === expected) loadedRef.current?.();
                invalidate();
            });
        const expected = quality === 'high' ? 2 : 1;
        load(quality === 'high' ? 'sky-cumulus-8k.jpg' : 'sky-cumulus-4k.jpg', 'uMap');
        if (quality === 'high') load('sky-cumulus-backdrop.jpg', 'uBackdrop');
        return () => {
            alive = false;
            loaded.forEach((t) => t.dispose());
            material.dispose();
        };
    }, [material, quality, invalidate]);
    useFrame(() => {
        const o = material.uniforms.uMap.value ? opacity() : 0;
        material.uniforms.uOpacity.value = o;
        // Opaque queue, after the scattering sky: blend by alpha without entering the transparent queue.
        material.blending = o < 0.999 ? CustomBlending : NormalBlending;
        if (ref.current) {
            ref.current.visible = o > 0.001;
            ref.current.position.copy(camera.position);
            ref.current.scale.setScalar(Math.min(camera.far * 0.5, 1e6));
        }
    });
    return (
        <mesh ref={ref} material={material} renderOrder={-9} frustumCulled={false}>
            <sphereGeometry args={[1, 64, 32]} />
        </mesh>
    );
}

/**
 * Image-based light at the pad and during ascent: the photographed sky (with a measured ground
 * reflectance below the horizon) near the ground; above `switchAt` metres, the scattering sky's own
 * prefiltered environment, which darkens correctly towards space.
 */
export function PadEnvironment({ altitude, switchAt = 2500 }: { altitude: () => number; switchAt?: number }) {
    const gl = useThree((s) => s.gl);
    const scene = useThree((s) => s.scene);
    const invalidate = useThree((s) => s.invalidate);
    const sky = useMemo(() => skyEnvironmentTarget(gl, SUN), [gl]);
    const photo = useRef<WebGLRenderTarget | null>(null);
    useEffect(() => {
        let alive = true;
        new HDRLoader().load(`${BASE}sky-cumulus-env.hdr`, (t) => {
            if (!alive) return t.dispose();
            t.mapping = EquirectangularReflectionMapping;
            const pmrem = new PMREMGenerator(gl);
            photo.current = pmrem.fromEquirectangular(t);
            pmrem.dispose();
            t.dispose();
            invalidate();
        });
        const before = scene.environment;
        return () => {
            alive = false;
            photo.current?.dispose();
            photo.current = null;
            sky.dispose();
            scene.environment = before;
        };
    }, [gl, scene, sky, invalidate]);
    useFrame(() => {
        const p = photo.current;
        const next = p && altitude() < switchAt ? p.texture : sky.texture;
        if (scene.environment !== next) scene.environment = next;
    });
    return null;
}

/**
 * Live reflections for a subject in space: a 96 px cube camera at `at()` records the scene (without the
 * subject itself), one cube face per frame so the cost is spread evenly (no periodic hitch), and after
 * the sixth face the cube is prefiltered into the scene's environment; a full refresh every `interval`.
 */
export function LiveReflections({ at, hide, interval = 0.3, intensity = 1 }: { at: () => Vector3; hide?: RefObject<Object3D | null>; interval?: number; intensity?: number }) {
    const gl = useThree((s) => s.gl);
    const scene = useThree((s) => s.scene);
    const rig = useMemo(() => {
        const cube = new WebGLCubeRenderTarget(96, { type: HalfFloatType, generateMipmaps: true, minFilter: LinearMipmapLinearFilter });
        const camera = new CubeCamera(1, 1e13, cube);
        const pmrem = new PMREMGenerator(gl);
        return { cube, camera, pmrem, target: null as WebGLRenderTarget | null, last: -1e9, face: -1 };
    }, [gl]);
    useEffect(() => {
        const before = scene.environment;
        const beforeIntensity = scene.environmentIntensity;
        return () => {
            scene.environment = before;
            scene.environmentIntensity = beforeIntensity;
            rig.cube.dispose();
            rig.target?.dispose();
            rig.pmrem.dispose();
        };
    }, [rig, scene]);
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (rig.face < 0) {
            if (t - rig.last < interval && rig.target) return;
            rig.last = t;
            rig.face = 0;
            rig.camera.position.copy(at());
            rig.camera.updateMatrixWorld();
        }
        const h = hide?.current;
        const wasVisible = h?.visible ?? false;
        if (h) h.visible = false;
        const env = scene.environment;
        scene.environment = null;
        const before = gl.getRenderTarget();
        const xr = gl.xr.enabled;
        gl.xr.enabled = false;
        const cams = rig.camera.children as CubeCamera['children'];
        gl.setRenderTarget(rig.cube, rig.face);
        gl.render(scene, cams[rig.face] as unknown as Parameters<typeof gl.render>[1]);
        gl.setRenderTarget(before);
        gl.xr.enabled = xr;
        if (h) h.visible = wasVisible;
        scene.environment = env;
        rig.face++;
        if (rig.face === 6) {
            rig.face = -1;
            rig.cube.texture.needsPMREMUpdate = true;
            rig.target = rig.pmrem.fromCubemap(rig.cube.texture, rig.target ?? undefined);
            scene.environment = rig.target.texture;
            scene.environmentIntensity = intensity;
        }
    });
    return null;
}
