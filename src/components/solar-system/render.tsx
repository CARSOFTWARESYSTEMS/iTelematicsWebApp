'use client';
// Rendering foundation of the Solar System experience (visual recovery, round 2):
//
// • PostFX — the frame is rendered in linear HDR (half float, 4× MSAA) and only then tone mapped
//   (ACES filmic) by an output pass. In between, a bloom pass spreads light from genuinely bright
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
    WebGLCubeRenderTarget,
    WebGLRenderTarget,
    type Object3D,
    type Texture,
    type Vector3,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { LOGDEPTH } from './environment';
import { skyEnvironmentTarget } from './atmosphere';
import { SUN } from './sun';

const BASE = '/images/solar-system/';

/**
 * HDR post-processing. Renders the scene itself (priority 1 takes over R3F's render), so it is only
 * mounted at high quality; low quality renders directly with the same tone mapping.
 */
export function PostFX({ exposure }: { exposure: () => number }) {
    const gl = useThree((s) => s.gl);
    const scene = useThree((s) => s.scene);
    const camera = useThree((s) => s.camera);
    const size = useThree((s) => s.size);
    const fx = useMemo(() => {
        const target = new WebGLRenderTarget(2, 2, { type: HalfFloatType, samples: 4 });
        const composer = new EffectComposer(gl, target);
        const bloom = new UnrealBloomPass(new Vector2(256, 256), 0.55, 0.55, 2.4);
        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(bloom);
        composer.addPass(new OutputPass());
        return { composer, bloom, w: 0, h: 0, pr: 0 };
    }, [gl, scene, camera]);
    useEffect(
        () => () => {
            fx.bloom.dispose();
            fx.composer.dispose();
        },
        [fx],
    );
    useFrame(() => {
        const pr = gl.getPixelRatio();
        if (pr !== fx.pr || size.width !== fx.w || size.height !== fx.h) {
            fx.pr = pr;
            fx.w = size.width;
            fx.h = size.height;
            fx.composer.setPixelRatio(pr);
            fx.composer.setSize(size.width, size.height);
        }
        gl.toneMappingExposure += (exposure() - gl.toneMappingExposure) * 0.08;
        fx.composer.render();
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
export function PhotoSky({ opacity, quality }: { opacity: () => number; quality: 'high' | 'low' }) {
    const camera = useThree((s) => s.camera);
    const invalidate = useThree((s) => s.invalidate);
    const ref = useRef<Mesh>(null);
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
                invalidate();
            });
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
 * Live reflections for a subject in space: a 128 px cube camera at `at()` records the scene (without
 * the subject itself) every `interval` seconds and is prefiltered into the scene's environment.
 */
export function LiveReflections({ at, hide, interval = 0.3, intensity = 1 }: { at: () => Vector3; hide?: RefObject<Object3D | null>; interval?: number; intensity?: number }) {
    const gl = useThree((s) => s.gl);
    const scene = useThree((s) => s.scene);
    const rig = useMemo(() => {
        const cube = new WebGLCubeRenderTarget(128, { type: HalfFloatType, generateMipmaps: true, minFilter: LinearMipmapLinearFilter });
        const camera = new CubeCamera(1, 1e13, cube);
        const pmrem = new PMREMGenerator(gl);
        return { cube, camera, pmrem, target: null as WebGLRenderTarget | null, last: -1e9 };
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
        if (t - rig.last < interval && rig.target) return;
        rig.last = t;
        rig.camera.position.copy(at());
        const h = hide?.current;
        const wasVisible = h?.visible ?? false;
        if (h) h.visible = false;
        const env = scene.environment;
        scene.environment = null;
        rig.camera.update(gl, scene);
        if (h) h.visible = wasVisible;
        rig.target = rig.pmrem.fromCubemap(rig.cube.texture, rig.target ?? undefined);
        scene.environment = rig.target.texture ?? env;
        scene.environmentIntensity = intensity;
    });
    return null;
}
