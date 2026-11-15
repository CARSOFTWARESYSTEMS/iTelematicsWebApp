'use client';
// Physically based sky for the launch and ascent: single scattering of sunlight by air molecules
// (Rayleigh, which makes the sky blue) and aerosols (Mie, the bright halo around the Sun and the hazy
// horizon), integrated along each view ray through an exponential atmosphere (scale heights 8 km and
// 1.2 km, 100 km thick) and towards the Sun for the light reaching each point. The same shader gives
// a blue sky at the pad, a darkening sky during ascent and black space with a thin blue limb above the
// atmosphere. Directions below the horizon show the hazy distant ground. Written for this experience
// from the standard equations; also prefiltered once into the pad's lighting environment.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BackSide, Mesh, PMREMGenerator, Scene, ShaderMaterial, SphereGeometry, Vector3, type WebGLRenderer } from 'three';
import { LOGDEPTH } from './environment';

const R_PLANET = 6.371e6;
const R_ATMOS = 6.471e6;

export const ATMOSPHERE_GLSL = /* glsl */ `
    const float R_PLANET = ${R_PLANET.toFixed(1)};
    const float R_ATMOS = ${R_ATMOS.toFixed(1)};
    const vec3 K_RAY = vec3(5.5e-6, 13.0e-6, 22.4e-6);
    const float K_MIE = 21e-6;
    const float H_RAY = 8000.0;
    const float H_MIE = 1200.0;
    const float G_MIE = 0.758;
    const float SUN_I = 22.0;

    // Ray–sphere intersection (sphere at the origin): near and far distances, or (1e9, -1e9) for a miss.
    vec2 sphereHit(vec3 o, vec3 d, float r) {
        float b = dot(o, d);
        float c = dot(o, o) - r * r;
        float h = b * b - c;
        if (h < 0.0) return vec2(1e9, -1e9);
        h = sqrt(h);
        return vec2(-b - h, -b + h);
    }

    // In-scattered light along a ray from o (metres from the Earth's centre) in direction d.
    // Returns the scattered radiance; 'trans' receives the transmittance along the ray.
    vec3 atmosphere(vec3 o, vec3 d, vec3 sun, int steps, int lightSteps, out vec3 trans, out float groundHit) {
        vec2 a = sphereHit(o, d, R_ATMOS);
        groundHit = 0.0;
        trans = vec3(1.0);
        if (a.x > a.y) return vec3(0.0);
        vec2 p = sphereHit(o, d, R_PLANET);
        float t0 = max(a.x, 0.0);
        float t1 = a.y;
        if (p.x < p.y && p.x > 0.0) { t1 = min(t1, p.x); groundHit = 1.0; }
        float ds = (t1 - t0) / float(steps);
        float mu = dot(d, sun);
        float pRay = 3.0 / (16.0 * 3.14159265) * (1.0 + mu * mu);
        float g2 = G_MIE * G_MIE;
        float pMie = 3.0 / (8.0 * 3.14159265) * ((1.0 - g2) * (mu * mu + 1.0)) / (pow(1.0 + g2 - 2.0 * mu * G_MIE, 1.5) * (2.0 + g2));
        float odRay = 0.0;
        float odMie = 0.0;
        vec3 sumRay = vec3(0.0);
        vec3 sumMie = vec3(0.0);
        for (int i = 0; i < 24; i++) {
            if (i >= steps) break;
            vec3 x = o + d * (t0 + (float(i) + 0.5) * ds);
            float h = length(x) - R_PLANET;
            float dRay = exp(-h / H_RAY) * ds;
            float dMie = exp(-h / H_MIE) * ds;
            odRay += dRay;
            odMie += dMie;
            // Light from the Sun to this point (skipped where the Earth blocks it).
            vec2 l = sphereHit(x, sun, R_ATMOS);
            vec2 lp = sphereHit(x, sun, R_PLANET);
            if (lp.x < lp.y && lp.x > 0.0) continue;
            float lds = l.y / float(lightSteps);
            float lRay = 0.0;
            float lMie = 0.0;
            for (int j = 0; j < 12; j++) {
                if (j >= lightSteps) break;
                vec3 y = x + sun * ((float(j) + 0.5) * lds);
                float hy = length(y) - R_PLANET;
                lRay += exp(-hy / H_RAY) * lds;
                lMie += exp(-hy / H_MIE) * lds;
            }
            vec3 att = exp(-(K_MIE * 1.1 * (odMie + lMie) + K_RAY * (odRay + lRay)));
            sumRay += dRay * att;
            sumMie += dMie * att;
        }
        trans = exp(-(K_MIE * 1.1 * odMie + K_RAY * odRay));
        vec3 single = SUN_I * (pRay * K_RAY * sumRay + pMie * K_MIE * sumMie);
        // Light scattered more than once: single scattering alone leaves long horizontal paths too dark
        // and too warm. Approximated as isotropic skylight added where the path has lost light.
        float sunUp = clamp(dot(normalize(o), sun) * 2.0 + 0.2, 0.0, 1.0);
        vec3 multiple = vec3(0.42, 0.52, 0.66) * (vec3(1.0) - trans) * 0.55 * sunUp;
        return single + multiple;
    }
`;

const VERT = /* glsl */ `${LOGDEPTH.vPars}
    varying vec3 vDir;
    void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); ${LOGDEPTH.v} }`;

function skyMaterial(steps: number, lightSteps: number) {
    return new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        depthTest: false,
        uniforms: { uOrigin: { value: new Vector3(0, R_PLANET + 2, 0) }, uSun: { value: new Vector3(0, 1, 0) }, uGround: { value: new Vector3(0.09, 0.1, 0.07) }, uExposure: { value: 1 } },
        vertexShader: VERT,
        fragmentShader: /* glsl */ `${LOGDEPTH.fPars}
            uniform vec3 uOrigin; uniform vec3 uSun; uniform vec3 uGround; uniform float uExposure;
            varying vec3 vDir;
            ${ATMOSPHERE_GLSL}
            void main() {
                ${LOGDEPTH.f}
                vec3 d = normalize(vDir);
                vec3 trans; float ground;
                vec3 col = atmosphere(uOrigin, d, uSun, ${steps}, ${lightSteps}, trans, ground);
                // Distant ground under the haze, lit by the Sun and the sky.
                if (ground > 0.5) {
                    vec2 p = sphereHit(uOrigin, d, R_PLANET);
                    vec3 n = normalize(uOrigin + d * p.x);
                    col += uGround * (max(dot(n, uSun), 0.0) * 1.0 + 0.25) * trans * 6.0;
                } else {
                    // The Sun's disc (0.27° radius), dimmed by the air in front of it.
                    float s = smoothstep(0.99996, 0.99999, dot(d, uSun));
                    col += vec3(1.0, 0.97, 0.9) * s * 40.0 * trans;
                }
                col = 1.0 - exp(-col * uExposure);
                gl_FragColor = vec4(col, 1.0);
                #include <colorspace_fragment>
            }`,
    });
}

/**
 * The sky around the camera. `origin()` is the camera position in metres from the Earth's centre,
 * `sun` the direction towards the Sun (both in the scene frame).
 */
export function AtmosphereSky({ origin, sun, quality, hidden }: { origin: () => Vector3; sun: Vector3; quality: 'high' | 'low'; hidden?: () => boolean }) {
    const camera = useThree((s) => s.camera);
    const ref = useRef<Mesh>(null);
    const material = useMemo(() => {
        const m = quality === 'high' ? skyMaterial(16, 6) : skyMaterial(10, 4);
        // Display exposure: a clear midday-like blue overhead with a bright, pale horizon.
        m.uniforms.uExposure.value = 2.1;
        return m;
    }, [quality]);
    useEffect(() => () => material.dispose(), [material]);
    useFrame(() => {
        (material.uniforms.uOrigin.value as Vector3).copy(origin());
        (material.uniforms.uSun.value as Vector3).copy(sun);
        if (ref.current) {
            // Fully covered by the photographed sky near the ground: skip the scattering integral.
            ref.current.visible = !hidden?.();
            ref.current.position.copy(camera.position);
            ref.current.scale.setScalar(Math.min(camera.far * 0.5, 1e6));
        }
    });
    return (
        <mesh ref={ref} material={material} renderOrder={-10} frustumCulled={false}>
            <sphereGeometry args={[1, 64, 32]} />
        </mesh>
    );
}

/** The scattering sky seen from the ground, prefiltered into an environment map. */
export function skyEnvironmentTarget(gl: WebGLRenderer, sun: Vector3) {
    const pmrem = new PMREMGenerator(gl);
    const scene = new Scene();
    const material = skyMaterial(16, 6);
    material.depthTest = true;
    (material.uniforms.uSun.value as Vector3).copy(sun);
    (material.uniforms.uOrigin.value as Vector3).set(0, R_PLANET + 30, 0);
    // A brighter exposure for lighting, so the sky contributes realistic fill.
    material.uniforms.uExposure.value = 1.6;
    const geometry = new SphereGeometry(100, 64, 32);
    scene.add(new Mesh(geometry, material));
    // Same cube size as the photographed-sky environment (128), so switching between them does not
    // change shader constants and recompile every material mid-flight.
    const rt = pmrem.fromScene(scene, 0, 0.1, 1000, { size: 128 });
    geometry.dispose();
    material.dispose();
    pmrem.dispose();
    return rt;
}

/** The pad's lighting environment: the same sky, seen from the ground, prefiltered once. */
export function SkyEnvironment({ sun }: { sun: Vector3 }) {
    const gl = useThree((s) => s.gl);
    const key = sun.toArray().join(',');
    const target = useMemo(() => skyEnvironmentTarget(gl, new Vector3().fromArray(key.split(',').map(Number))), [gl, key]);
    useEffect(() => () => target.dispose(), [target]);
    return <primitive object={target.texture} attach="environment" />;
}
