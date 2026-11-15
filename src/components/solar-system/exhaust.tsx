'use client';
// Rocket exhaust for the Solar System experience (visual recovery, round 2).
//
// VolumePlume — a ray-marched exhaust volume instead of a textured cone. Along each view ray through
// the plume's bounding cylinder the shader integrates emission and absorption of a density field:
//   • the inviscid core leaving each nozzle (white-yellow, nozzle-sized, with faint shock cells at sea
//     level where the exhaust is over- or under-expanded);
//   • a turbulent mixing layer that widens downstream (three-dimensional noise advected with the flow),
//     where the hot gas mixes with air and cools from yellow through orange to dull red;
//   • for kerosene engines, soot: an optically thick, sun-lit smoky fringe further downstream.
// Length and width follow ambient pressure (the flight simulation's altitude): a tight, opaque plume
// at the pad, a wide, faint one near vacuum. Optical depth is normalised by the local radius, so the
// look holds at any scale. Brightness is in scene radiance units (the HDR pipeline tone maps it).
//
// ExhaustClouds — the ground cloud at ignition and liftoff: camera-facing puffs with a generated
// "cauliflower" normal/density atlas, lit by the Sun (with self-shadowing through the cloud mass), the
// sky and ground bounce, and orange light from the plume; positions are a pure function of mission
// time (seeded), so replaying or scrubbing shows the same cloud.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
    BackSide,
    CanvasTexture,
    Color,
    CustomBlending,
    DoubleSide,
    FrontSide,
    InstancedBufferAttribute,
    InstancedBufferGeometry,
    LinearFilter,
    LinearMipmapLinearFilter,
    Mesh,
    OneFactor,
    OneMinusSrcAlphaFactor,
    PlaneGeometry,
    ShaderMaterial,
    Vector3,
} from 'three';
import { LOGDEPTH } from './environment';
import { HORIZON, SUN, SUN_IRRADIANCE } from './sun';

// ── Volumetric plume ─────────────────────────────────────────────────────

export type PlumeKind = 'kerosene' | 'hydrogen' | 'solid';

const NOISE = /* glsl */ `
    float hash13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
    float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float noise3(vec3 p) {
        vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        float a = hash13(i), b = hash13(i + vec3(1, 0, 0)), c = hash13(i + vec3(0, 1, 0)), d = hash13(i + vec3(1, 1, 0));
        float e = hash13(i + vec3(0, 0, 1)), g = hash13(i + vec3(1, 0, 1)), h = hash13(i + vec3(0, 1, 1)), k = hash13(i + vec3(1, 1, 1));
        return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, g, f.x), mix(h, k, f.x), f.y), f.z);
    }`;

function plumeMaterial(steps: number, octaves: number) {
    return new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: FrontSide,
        blending: CustomBlending,
        blendSrc: OneFactor,
        blendDst: OneMinusSrcAlphaFactor,
        uniforms: {
            uOrigin: { value: new Vector3() },
            uAxis: { value: new Vector3(0, -1, 0) },
            uSide: { value: new Vector3(1, 0, 0) },
            uSide2: { value: new Vector3(0, 0, 1) },
            uL: { value: 30 },
            uR0: { value: 0.68 },
            uR1: { value: 4 },
            uRm: { value: 5 },
            uSep: { value: 0 },
            uTime: { value: 0 },
            uPower: { value: 0 },
            uEmit: { value: 6 },
            uDens: { value: 2.2 },
            uSoot: { value: 0 },
            uDiam: { value: 0 },
            uCoreLen: { value: 0.25 },
            uCoreI: { value: 40 },
            uFlow: { value: 60 },
            uTint: { value: new Color(1, 1, 1) },
            uSun: { value: SUN.clone() },
            uSunI: { value: SUN_IRRADIANCE },
            uAmb: { value: new Color(0.35, 0.4, 0.5) },
        },
        vertexShader: /* glsl */ `${LOGDEPTH.vPars}
            varying vec3 vWorld;
            void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; ${LOGDEPTH.v} }`,
        fragmentShader: /* glsl */ `${LOGDEPTH.fPars}
            uniform vec3 uOrigin; uniform vec3 uAxis; uniform vec3 uSide; uniform vec3 uSide2;
            uniform float uL; uniform float uR0; uniform float uR1; uniform float uRm; uniform float uSep;
            uniform float uTime; uniform float uPower; uniform float uEmit; uniform float uDens; uniform float uSoot;
            uniform float uDiam; uniform float uCoreLen; uniform float uCoreI; uniform float uFlow; uniform vec3 uTint;
            uniform vec3 uSun; uniform float uSunI; uniform vec3 uAmb;
            varying vec3 vWorld;
            ${NOISE}
            float fbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < ${octaves}; i++) { s += a * noise3(p); p = p * 2.03 + 17.1; a *= 0.5; } return s / (1.0 - pow(0.5, float(${octaves}))); }
            // Hot gas colour by normalised temperature (approximately incandescent soot and hot gas).
            vec3 fire(float t) {
                vec3 c0 = vec3(0.30, 0.05, 0.01), c1 = vec3(1.0, 0.36, 0.07), c2 = vec3(1.0, 0.70, 0.33), c3 = vec3(1.0, 0.93, 0.80);
                return t < 0.33 ? mix(c0, c1, t / 0.33) : t < 0.66 ? mix(c1, c2, (t - 0.33) / 0.33) : mix(c2, c3, (t - 0.66) / 0.34);
            }
            void main() {
                ${LOGDEPTH.f}
                vec3 rw = normalize(vWorld - cameraPosition);
                vec3 q = cameraPosition - uOrigin;
                vec3 o = vec3(dot(q, uSide), dot(q, uAxis), dot(q, uSide2));
                vec3 d = vec3(dot(rw, uSide), dot(rw, uAxis), dot(rw, uSide2));
                float a = dot(d.xz, d.xz);
                float b = dot(o.xz, d.xz);
                float c = dot(o.xz, o.xz) - uRm * uRm;
                float h = b * b - a * c;
                if (h < 0.0 || a < 1e-7) discard;
                h = sqrt(h);
                float t0 = (-b - h) / a, t1 = (-b + h) / a;
                float dy = abs(d.y) < 1e-6 ? 1e-6 : d.y;
                float ya = (0.0 - o.y) / dy, yb = (uL - o.y) / dy;
                t0 = max(max(t0, min(ya, yb)), 0.0);
                t1 = min(t1, max(ya, yb));
                if (t1 <= t0) discard;
                float dt = (t1 - t0) / float(${steps});
                float jit = hash12(gl_FragCoord.xy + fract(uTime * 7.3) * 91.0);
                vec3 col = vec3(0.0);
                float T = 1.0;
                for (int i = 0; i < ${steps}; i++) {
                    vec3 p = o + d * (t0 + (float(i) + jit) * dt);
                    float s = clamp(p.y / uL, 0.0, 1.0);
                    float merge = smoothstep(0.02, 0.3, s);
                    float rt = min(length(p.xz - vec2(uSep, 0.0)), length(p.xz + vec2(uSep, 0.0)));
                    float rc = length(p.xz);
                    float r = mix(rt, max(rc - uSep * (1.0 - merge * 0.9), 0.0), merge);
                    float Rs = uR0 + (uR1 - uR0) * pow(s, 0.62);
                    // Turbulence carried downstream; eddies scale with the local width.
                    float f = 1.4 / max(Rs, 0.4);
                    float n = fbm(vec3(p.x * f, (p.y - uTime * uFlow) * f * 0.55, p.z * f));
                    float edge = r / (Rs * (0.7 + 0.6 * n));
                    float body = 1.0 - smoothstep(0.45, 1.0, edge);
                    float tail = 1.0 - smoothstep(0.55, 1.0, s);
                    float dens = body * tail * (0.45 + 1.1 * n * n);
                    // Inviscid core and shock cells, right behind each nozzle.
                    float core = (1.0 - smoothstep(0.25 * uR0, 0.95 * uR0, rt)) * (1.0 - smoothstep(0.0, uCoreLen, s));
                    float cell = pow(0.5 + 0.5 * cos(6.2832 * p.y / (2.6 * uR0)), 10.0) * (1.0 - smoothstep(0.0, uCoreLen * 1.3, s)) * (1.0 - smoothstep(0.0, 0.55 * uR0, rt));
                    float temp = clamp((1.0 - 0.75 * pow(s, 1.15)) * (0.6 + 0.4 * (1.0 - smoothstep(0.3, 1.0, edge))) + 0.25 * core, 0.0, 1.0);
                    vec3 emit = fire(temp * 0.92) * uTint * (uEmit * pow(temp, 2.4) * dens / Rs) + vec3(1.0, 0.96, 0.88) * uTint * uCoreI * (core + uDiam * cell) / uR0;
                    // Soot downstream: absorbs, and scatters sunlight and skylight (grey-brown smoke).
                    float smoke = uSoot * smoothstep(0.38, 0.9, s) * dens;
                    float sunVis = 0.5 + 0.5 * dot(normalize(vec3(p.x, 0.0, p.z) + vec3(0.0, 0.001, 0.0)), vec3(dot(uSun, uSide), 0.0, dot(uSun, uSide2)));
                    vec3 scat = smoke * (vec3(0.42, 0.38, 0.34) * (uSunI * 0.16 * sunVis) + uAmb * 0.55) / Rs;
                    float sigma = (dens * uDens + smoke * 2.5 + core * 1.5) / Rs;
                    col += T * (emit + scat) * dt;
                    T *= exp(-sigma * dt);
                    if (T < 0.01) break;
                }
                float alpha = (1.0 - T) * uPower;
                gl_FragColor = vec4(col * uPower, alpha);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }`,
    });
}

/** Per-kind optical settings (sea level and vacuum ends; interpolated by ambient pressure). */
const KINDS: Record<PlumeKind, { emit: [number, number]; dens: [number, number]; soot: [number, number]; diam: number; coreLen: [number, number]; coreI: [number, number]; tint: string; flow: number }> = {
    // Kerosene/oxygen, gas generator: bright yellow-orange, sooty, opaque at sea level.
    kerosene: { emit: [13, 3.5], dens: [2.2, 0.3], soot: [0.8, 0.1], diam: 0.35, coreLen: [0.2, 0.08], coreI: [9, 7], tint: '#ffffff', flow: 70 },
    // Hydrogen/oxygen in vacuum: nearly transparent, a faint blue-violet glow and a hot core.
    hydrogen: { emit: [0.5, 0.5], dens: [0.04, 0.04], soot: [0, 0], diam: 0, coreLen: [0.1, 0.1], coreI: [2.2, 2.2], tint: '#b9c6ff', flow: 90 },
    // Aluminised solid propellant: very bright white, opaque alumina smoke.
    solid: { emit: [5, 2.2], dens: [2.0, 0.6], soot: [0.4, 0.2], diam: 0, coreLen: [0.22, 0.18], coreI: [5, 4], tint: '#fff4e2', flow: 80 },
};

/**
 * A volumetric exhaust plume attached to its parent group: the nozzle exit at the group origin, the
 * flow along the group's −Y. `separation` (m) is half the distance between twin engine axes along x.
 */
export function VolumePlume({
    kind,
    power,
    length,
    radius,
    nozzle,
    pressure,
    separation = 0,
    quality = 'high',
}: {
    kind: PlumeKind;
    power: () => number;
    length: () => number;
    radius: () => number;
    nozzle: number;
    pressure: () => number;
    separation?: number;
    quality?: 'high' | 'low';
}) {
    const ref = useRef<Mesh>(null);
    const material = useMemo(() => (quality === 'high' ? plumeMaterial(28, 3) : plumeMaterial(14, 2)), [quality]);
    useEffect(() => () => material.dispose(), [material]);
    const k = KINDS[kind];
    const tmp = useMemo(() => ({ o: new Vector3(), a: new Vector3(), s: new Vector3(), s2: new Vector3(), c: new Vector3() }), []);
    useFrame((st) => {
        const p = power();
        const mesh = ref.current;
        if (!mesh) return;
        mesh.visible = p > 0.005;
        if (!mesh.visible) return;
        const L = length();
        const R1 = radius();
        const Rm = Math.max(R1, nozzle + separation) * 1.08;
        mesh.scale.set(Rm, L, Rm);
        mesh.position.set(0, -L / 2, 0);
        const u = material.uniforms;
        u.uL.value = L;
        u.uR0.value = nozzle;
        u.uR1.value = R1;
        u.uRm.value = Rm;
        u.uSep.value = separation;
        u.uTime.value = st.clock.elapsedTime;
        u.uPower.value = Math.min(1, p);
        const pr = Math.max(0, Math.min(1, pressure()));
        const mix = (v: [number, number]) => v[1] + (v[0] - v[1]) * pr;
        u.uEmit.value = mix(k.emit) * Math.max(0.35, p);
        u.uDens.value = mix(k.dens);
        u.uSoot.value = mix(k.soot);
        u.uDiam.value = k.diam * pr;
        u.uCoreLen.value = mix(k.coreLen);
        u.uCoreI.value = mix(k.coreI);
        u.uFlow.value = k.flow;
        (u.uTint.value as Color).set(k.tint);
    });
    // The plume's frame is taken at render time, from the final world transform and the camera that is
    // actually rendering (useFrame of a child runs before its parents move the vehicle for the frame).
    useEffect(() => {
        const mesh = ref.current;
        if (!mesh) return;
        mesh.onBeforeRender = (_r, _s, camera) => {
            const g = mesh.parent;
            if (!g) return;
            const m = g.matrixWorld;
            const u = material.uniforms;
            tmp.o.setFromMatrixPosition(m);
            tmp.a.set(0, -1, 0).transformDirection(m);
            tmp.s.set(1, 0, 0).transformDirection(m);
            tmp.s2.crossVectors(tmp.s, tmp.a).normalize();
            (u.uOrigin.value as Vector3).copy(tmp.o);
            (u.uAxis.value as Vector3).copy(tmp.a);
            (u.uSide.value as Vector3).copy(tmp.s);
            (u.uSide2.value as Vector3).copy(tmp.s2);
            // Inside the bounding cylinder (close-ups), draw its far side so the volume is still marched.
            const L = u.uL.value as number;
            const Rm = u.uRm.value as number;
            tmp.c.setFromMatrixPosition(camera.matrixWorld).sub(tmp.o);
            const along = tmp.c.dot(tmp.a);
            const radial = Math.sqrt(Math.max(0, tmp.c.lengthSq() - along * along));
            const inside = along > -0.5 && along < L + 0.5 && radial < Rm + 0.5;
            material.side = inside ? BackSide : FrontSide;
            material.depthTest = !inside;
            material.uniformsNeedUpdate = true;
        };
        return () => {
            mesh.onBeforeRender = () => {};
        };
    }, [material, tmp]);
    return (
        <mesh ref={ref} material={material} renderOrder={6} frustumCulled={false}>
            <cylinderGeometry args={[1, 1, 1, 24, 1, false]} />
        </mesh>
    );
}

// ── Lit exhaust clouds ───────────────────────────────────────────────────

/**
 * Four 256 px cumulus-like puffs in a 2×2 atlas: RG = normal (x, y), B = thickness, A = density.
 * Each is a union of spherical caps (bulges) of several sizes with fine noise erosion at the edge.
 */
function puffAtlas() {
    if (typeof document === 'undefined') return null;
    const S = 320;
    const N = S * 2;
    const c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d')!;
    const img = g.createImageData(N, N);
    let seed = 11;
    const rnd = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    };
    const grid = Array.from({ length: 65 * 65 }, () => rnd());
    const vn = (x: number, y: number) => {
        const ix = Math.floor(x) & 63;
        const iy = Math.floor(y) & 63;
        const fx = x - Math.floor(x);
        const fy = y - Math.floor(y);
        const sm = (t: number) => t * t * (3 - 2 * t);
        const a = grid[iy * 65 + ix];
        const b = grid[iy * 65 + ix + 1];
        const cc = grid[(iy + 1) * 65 + ix];
        const d = grid[(iy + 1) * 65 + ix + 1];
        return a + (b - a) * sm(fx) + (cc - a) * sm(fy) + (a - b - cc + d) * sm(fx) * sm(fy);
    };
    const fbm = (x: number, y: number) => 0.5 * vn(x, y) + 0.25 * vn(x * 2.03, y * 2.03) + 0.125 * vn(x * 4.1, y * 4.1) + 0.0625 * vn(x * 8.3, y * 8.3);
    for (let v = 0; v < 4; v++) {
        const ox = (v % 2) * S;
        const oy = Math.floor(v / 2) * S;
        // Billows at three scales, as spheres seen from the camera: a core mass, medium lobes around it
        // and small cauliflower lobes on the outline, more of them on the upper (rising) side.
        const lobes: [number, number, number, number][] = [];
        const core = 0.34 + rnd() * 0.06;
        lobes.push([0, 0, core, 0]);
        for (let i = 0; i < 9; i++) {
            const a = rnd() * Math.PI * 2;
            const d = core * (0.55 + rnd() * 0.45);
            const r = 0.14 + rnd() * 0.12;
            lobes.push([Math.cos(a) * d, Math.sin(a) * d * 0.9, r, Math.sqrt(Math.max(0, core * core - d * d)) * 0.7]);
        }
        for (let i = 0; i < 24; i++) {
            const a = rnd() * Math.PI * 2;
            const up = Math.sin(a) > 0 ? 1 : 0.75;
            const d = (core + 0.04 + rnd() * 0.15) * up;
            const r = 0.07 + rnd() * 0.1;
            lobes.push([Math.cos(a) * d, Math.sin(a) * d, r, rnd() * 0.06]);
        }
        // Smooth union of the lobes (log-sum-exp), so billows merge instead of meeting in hard creases.
        const KU = 16;
        const acc = new Float32Array(S * S);
        for (const [lx, ly, lr, lz] of lobes) {
            const x0 = Math.max(0, Math.floor(((lx - lr) * 0.5 + 0.5) * S));
            const x1 = Math.min(S - 1, Math.ceil(((lx + lr) * 0.5 + 0.5) * S));
            const y0 = Math.max(0, Math.floor(((ly - lr) * 0.5 + 0.5) * S));
            const y1 = Math.min(S - 1, Math.ceil(((ly + lr) * 0.5 + 0.5) * S));
            for (let y = y0; y <= y1; y++)
                for (let x = x0; x <= x1; x++) {
                    const px = (x / S) * 2 - 1;
                    const py = (y / S) * 2 - 1;
                    const dd = (px - lx) ** 2 + (py - ly) ** 2;
                    if (dd < lr * lr) acc[y * S + x] += Math.exp(KU * (lz + Math.sqrt(lr * lr - dd)));
                }
        }
        const H = new Float32Array(S * S);
        for (let k = 0; k < S * S; k++) H[k] = acc[k] > 0 ? Math.max(0, Math.log(acc[k]) / KU) : 0;
        // Fine turbulent detail on the surface and an eroded, wispy outline.
        for (let y = 0; y < S; y++)
            for (let x = 0; x < S; x++) {
                const k = y * S + x;
                if (H[k] <= 0) continue;
                const n = fbm(x / 11 + v * 9.7, y / 11 + v * 4.1);
                H[k] = Math.max(0, H[k] + (n - 0.5) * 0.09);
            }
        for (let y = 0; y < S; y++)
            for (let x = 0; x < S; x++) {
                const k = y * S + x;
                const hx = H[y * S + Math.min(S - 1, x + 1)] - H[y * S + Math.max(0, x - 1)];
                const hy = H[Math.min(S - 1, y + 1) * S + x] - H[Math.max(0, y - 1) * S + x];
                const sc = 15;
                let nx = -hx * sc;
                let ny = hy * sc; // canvas y runs down; +y is up on the billboard
                let nz = 1;
                const l = Math.hypot(nx, ny, nz);
                nx /= l;
                ny /= l;
                nz /= l;
                const h = H[k];
                const wisp = fbm(x / 9 + v * 3.3, y / 9 + v * 7.7);
                const dens = Math.min(1, Math.max(0, (h - 0.006 - (1 - wisp) * 0.03) / 0.05));
                const i = ((oy + (S - 1 - y)) * N + ox + x) * 4;
                img.data[i] = (nx * 0.5 + 0.5) * 255;
                img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
                img.data[i + 2] = Math.min(255, (h / 0.5) * 255);
                img.data[i + 3] = dens * 255;
            }
    }
    g.putImageData(img, 0, 0);
    const t = new CanvasTexture(c);
    t.flipY = false;
    t.generateMipmaps = true;
    t.minFilter = LinearMipmapLinearFilter;
    t.magFilter = LinearFilter;
    t.premultiplyAlpha = false;
    return t;
}

const CLOUD_VERT = /* glsl */ `${LOGDEPTH.vPars}
    attribute vec3 iPos; attribute vec4 iData; attribute vec2 iLight;
    varying vec2 vUv; varying float vRot; varying float vAlpha; varying float vShade; varying float vHeat; varying vec3 vWorld; varying float vSize;
    void main() {
        float size = iData.x; float rot = iData.y; float variant = iData.z;
        vSize = size;
        // Puffs right at the camera fade out instead of filling the frame.
        float dc = length(iPos - cameraPosition);
        vAlpha = iData.w * smoothstep(0.35 * size, 1.3 * size, dc); vShade = iLight.x; vHeat = iLight.y; vRot = rot;
        vec2 c = position.xy;
        float cs = cos(rot), sn = sin(rot);
        vec2 rc = vec2(cs * c.x - sn * c.y, sn * c.x + cs * c.y);
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vWorld = iPos + (right * rc.x + up * rc.y) * size;
        vUv = (vec2(uv.x, 1.0 - uv.y) + vec2(mod(variant, 2.0), floor(variant / 2.0))) * 0.5;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
        ${LOGDEPTH.v}
    }`;

const CLOUD_FRAG = /* glsl */ `${LOGDEPTH.fPars}
    uniform sampler2D uAtlas; uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uSky; uniform vec3 uGround;
    uniform vec3 uPlumePos; uniform vec3 uPlumeCol; uniform float uPlumeI; uniform float uPlumeR;
    uniform vec3 uFogCol; uniform float uFogDensity; uniform vec3 uAlbedo; uniform float uGroundY;
    varying vec2 vUv; varying float vRot; varying float vAlpha; varying float vShade; varying float vHeat; varying vec3 vWorld; varying float vSize;
    void main() {
        ${LOGDEPTH.f}
        vec4 t = texture2D(uAtlas, vUv);
        // Soft contact with the ground instead of a hard cut where the billboard meets it.
        float ground = smoothstep(0.0, 0.3 * vSize, vWorld.y - uGroundY);
        float dens = t.a * vAlpha * ground;
        if (dens < 0.003) discard;
        vec2 nxy = t.rg * 2.0 - 1.0;
        float cs = cos(vRot), sn = sin(vRot);
        nxy = vec2(cs * nxy.x - sn * nxy.y, sn * nxy.x + cs * nxy.y);
        vec3 nv = vec3(nxy, sqrt(max(0.0, 1.0 - dot(nxy, nxy))));
        vec3 nw = normalize((vec4(nv, 0.0) * viewMatrix).xyz);
        float height = t.b;
        // Crevices between billows see less sky and less sun.
        float ao = 0.6 + 0.4 * smoothstep(0.03, 0.6, height);
        // Sun: lightly wrapped diffuse, shadowed by the rest of the cloud towards the Sun.
        float ndl = dot(nw, uSun);
        float direct = pow(clamp((ndl + 0.3) / 1.3, 0.0, 1.0), 1.2);
        float shadow = vShade * vShade;
        vec3 sun = uSunCol * direct * shadow * mix(0.6, 1.0, ao);
        // Sky above and ground bounce below.
        vec3 amb = mix(uGround, uSky, nw.y * 0.5 + 0.5) * ao * (0.6 + 0.4 * vShade);
        // Orange light from the exhaust, falling off with distance.
        vec3 lp = uPlumePos - vWorld;
        float dist = length(lp);
        float pl = uPlumeI / (1.0 + dist * dist / (uPlumeR * uPlumeR)) * (0.25 + 0.75 * clamp(dot(nw, lp / max(dist, 1e-3)) * 0.5 + 0.5, 0.0, 1.0)) * ao;
        vec3 col = uAlbedo * (sun + amb) / 3.14159 + uAlbedo * uPlumeCol * pl + vec3(1.0, 0.45, 0.12) * vHeat * 4.0;
        // Aerial perspective, matching the scene haze.
        float fog = 1.0 - exp(-uFogDensity * length(vWorld - cameraPosition));
        col = mix(col, uFogCol, fog);
        gl_FragColor = vec4(col * dens, dens);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }`;

interface Puff {
    birth: number;
    life: number;
    src: 0 | 1 | 2;
    dir: Vector3;
    speed: number;
    tau: number;
    rise: number;
    size0: number;
    grow: number;
    rot: number;
    spin: number;
    variant: number;
    alpha: number;
}

/**
 * The launch ground cloud. Sources (positions in the site frame, metres):
 *  0 — exhaust and steam leaving the flame trench's north exit (ignition to the first seconds);
 *  1 — exhaust spreading over the pad deck once the vehicle lifts off, until it is ~80 m up;
 *  2 — steam from the sound-suppression water around the launch table.
 * Each puff decelerates by drag (time constant tau), rises by buoyancy, grows as it entrains air and
 * drifts with a light wind; it lives 60–140 s.
 */
export function ExhaustClouds({
    met,
    trenchExit,
    deck,
    plume,
    throttle,
    altitude,
    quality,
}: {
    met: () => number;
    trenchExit: Vector3;
    deck: number;
    /** World position of the plume's brightest part (for lighting the cloud). */
    plume: () => Vector3;
    /** First-stage throttle while firing (0 otherwise). */
    throttle: () => number;
    /** Vehicle altitude above the pad (m). */
    altitude: () => number;
    quality: 'high' | 'low';
}) {
    const count = quality === 'high' ? 460 : 170;
    const camera = useThree((s) => s.camera);
    const atlas = useMemo(() => puffAtlas(), []);
    const puffs = useMemo(() => {
        let s = 29;
        const rnd = () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
        const out: Puff[] = [];
        for (let i = 0; i < count; i++) {
            const r = rnd();
            const src: 0 | 1 | 2 = r < 0.42 ? 0 : r < 0.86 ? 1 : 2;
            let birth: number;
            const dir = new Vector3();
            let speed: number;
            let tau: number;
            let rise: number;
            let size0: number;
            let grow: number;
            if (src === 0) {
                // Trench: from the start of ignition (−2.8 s) with most of it in the first 6 s.
                birth = -2.8 + rnd() ** 1.6 * 14;
                const a = (rnd() - 0.5) * 0.9;
                dir.set(Math.sin(a), 0.05 + rnd() * 0.15, -Math.cos(a)).normalize();
                speed = 40 + rnd() * 40;
                tau = 2.5 + rnd() * 2.5;
                rise = 1.6 + rnd() * 2.8;
                size0 = 5 + rnd() * 5;
                grow = 4.2 + rnd() * 2.6;
            } else if (src === 1) {
                // Deck spread: from liftoff while the plume still reaches the pad (≈ 0–9 s).
                birth = rnd() ** 1.3 * 9;
                const a = rnd() * Math.PI * 2;
                dir.set(Math.cos(a), 0.04 + rnd() * 0.1, Math.sin(a)).normalize();
                speed = 30 + rnd() * 45;
                tau = 2 + rnd() * 2.5;
                rise = 1.2 + rnd() * 2.2;
                size0 = 4 + rnd() * 4;
                grow = 4 + rnd() * 3;
            } else {
                // Deluge steam: from just before ignition, rising around the table.
                birth = -4 + rnd() * 14;
                const a = rnd() * Math.PI * 2;
                dir.set(Math.cos(a), 0, Math.sin(a));
                speed = 4 + rnd() * 6;
                tau = 3;
                rise = 3 + rnd() * 3;
                size0 = 2.5 + rnd() * 2;
                grow = 2.4 + rnd() * 1.5;
            }
            out.push({ birth, life: 60 + rnd() * 80, src, dir, speed, tau, rise, size0, grow, rot: rnd() * Math.PI * 2, spin: (rnd() - 0.5) * 0.12, variant: Math.floor(rnd() * 4), alpha: 0.75 + rnd() * 0.25 });
        }
        return out;
    }, [count]);

    const geometry = useMemo(() => {
        const g = new InstancedBufferGeometry();
        const plane = new PlaneGeometry(2, 2);
        g.index = plane.index;
        g.setAttribute('position', plane.getAttribute('position'));
        g.setAttribute('uv', plane.getAttribute('uv'));
        g.setAttribute('iPos', new InstancedBufferAttribute(new Float32Array(count * 3), 3));
        g.setAttribute('iData', new InstancedBufferAttribute(new Float32Array(count * 4), 4));
        g.setAttribute('iLight', new InstancedBufferAttribute(new Float32Array(count * 2), 2));
        g.instanceCount = 0;
        return g;
    }, [count]);
    const material = useMemo(
        () =>
            new ShaderMaterial({
                transparent: true,
                depthWrite: false,
                side: DoubleSide,
                blending: CustomBlending,
                blendSrc: OneFactor,
                blendDst: OneMinusSrcAlphaFactor,
                uniforms: {
                    uAtlas: { value: atlas },
                    uSun: { value: SUN.clone() },
                    uSunCol: { value: new Color(1, 0.97, 0.92).multiplyScalar(SUN_IRRADIANCE) },
                    uSky: { value: new Color(0.42, 0.52, 0.72).multiplyScalar(1.7) },
                    uGround: { value: new Color(0.3, 0.28, 0.24).multiplyScalar(0.9) },
                    uPlumePos: { value: new Vector3() },
                    uPlumeCol: { value: new Color(1.0, 0.5, 0.18) },
                    uPlumeI: { value: 0 },
                    uPlumeR: { value: 18 },
                    uFogCol: { value: HORIZON.clone() },
                    uFogDensity: { value: 3.2e-5 },
                    uAlbedo: { value: new Color(0.86, 0.86, 0.85) },
                    uGroundY: { value: deck * 0.3 },
                },
                vertexShader: CLOUD_VERT,
                fragmentShader: CLOUD_FRAG,
            }),
        [atlas, deck],
    );
    useEffect(
        () => () => {
            geometry.dispose();
            material.dispose();
            atlas?.dispose();
        },
        [geometry, material, atlas],
    );

    const work = useMemo(() => ({ pos: new Float32Array(count * 3), size: new Float32Array(count), alpha: new Float32Array(count), rot: new Float32Array(count), heat: new Float32Array(count), variant: new Float32Array(count), shade: new Float32Array(count), order: new Int32Array(count), depth: new Float32Array(count), v: new Vector3() }), [count]);
    const ref = useRef<Mesh>(null);
    useFrame(() => {
        const t = met();
        const W = work;
        const wind = W.v.set(2.2, 0, -1.2);
        let n = 0;
        const lift = altitude();
        for (const p of puffs) {
            const age = t - p.birth;
            if (age < 0 || age > p.life) continue;
            // Deck-spread puffs only form while the exhaust still reaches the pad.
            if (p.src === 1 && p.birth > 0 && Math.max(0, lift) > 90) continue;
            const travel = p.speed * p.tau * (1 - Math.exp(-age / p.tau));
            const i3 = n * 3;
            let x: number;
            let y: number;
            let z: number;
            if (p.src === 0) {
                x = trenchExit.x + p.dir.x * travel;
                z = trenchExit.z + p.dir.z * travel;
                y = trenchExit.y + 3 + p.dir.y * travel + p.rise * age;
            } else if (p.src === 1) {
                const r0 = 9;
                x = p.dir.x * (r0 + travel);
                z = p.dir.z * (r0 + travel);
                y = deck + 2 + p.dir.y * travel + p.rise * age;
            } else {
                const r0 = 7;
                x = p.dir.x * (r0 + travel);
                z = p.dir.z * (r0 + travel);
                y = deck + 1.5 + p.rise * age;
            }
            const size = p.size0 + p.grow * Math.pow(age + 0.3, 0.72);
            // Keep the cloud above the ground as it grows.
            y = Math.max(y, deck * 0.3 + size * 0.55);
            W.pos[i3] = x + wind.x * age;
            W.pos[i3 + 1] = y;
            W.pos[i3 + 2] = z + wind.z * age;
            W.size[n] = size;
            const fadeIn = Math.min(1, age / 0.6);
            const fadeOut = Math.min(1, (p.life - age) / (p.life * 0.35));
            W.alpha[n] = p.alpha * fadeIn * fadeOut;
            W.rot[n] = p.rot + age * p.spin;
            W.variant[n] = p.variant;
            // Fresh exhaust near the trench glows from the hot gas inside it.
            W.heat[n] = p.src === 0 ? Math.exp(-age / 1.1) * throttle() * 0.6 : p.src === 1 ? Math.exp(-age / 0.9) * throttle() * 0.35 : 0;
            n++;
        }
        // Self-shadowing: the optical path towards the Sun through the other puffs.
        const sx = SUN.x;
        const sy = SUN.y;
        const sz = SUN.z;
        for (let i = 0; i < n; i++) {
            let occ = 0;
            const xi = W.pos[i * 3];
            const yi = W.pos[i * 3 + 1];
            const zi = W.pos[i * 3 + 2];
            for (let j = 0; j < n; j++) {
                if (j === i) continue;
                const dx = W.pos[j * 3] - xi;
                const dy = W.pos[j * 3 + 1] - yi;
                const dz = W.pos[j * 3 + 2] - zi;
                const along = dx * sx + dy * sy + dz * sz;
                if (along <= 0) continue;
                const px = dx - along * sx;
                const py = dy - along * sy;
                const pz = dz - along * sz;
                const perp2 = px * px + py * py + pz * pz;
                const rr = W.size[j] * 0.8;
                if (perp2 < rr * rr) occ += W.alpha[j] * (1 - perp2 / (rr * rr));
            }
            W.shade[i] = Math.exp(-occ * 0.9);
        }
        // Back to front.
        const cx = camera.position.x;
        const cy = camera.position.y;
        const cz = camera.position.z;
        for (let i = 0; i < n; i++) {
            W.order[i] = i;
            W.depth[i] = (W.pos[i * 3] - cx) ** 2 + (W.pos[i * 3 + 1] - cy) ** 2 + (W.pos[i * 3 + 2] - cz) ** 2;
        }
        const ord = Array.from(W.order.subarray(0, n)).sort((a, b) => W.depth[b] - W.depth[a]);
        const iPos = geometry.getAttribute('iPos') as InstancedBufferAttribute;
        const iData = geometry.getAttribute('iData') as InstancedBufferAttribute;
        const iLight = geometry.getAttribute('iLight') as InstancedBufferAttribute;
        const P = iPos.array as Float32Array;
        const D = iData.array as Float32Array;
        const Lt = iLight.array as Float32Array;
        ord.forEach((i, k) => {
            P[k * 3] = W.pos[i * 3];
            P[k * 3 + 1] = W.pos[i * 3 + 1];
            P[k * 3 + 2] = W.pos[i * 3 + 2];
            D[k * 4] = W.size[i];
            D[k * 4 + 1] = W.rot[i];
            D[k * 4 + 2] = W.variant[i];
            D[k * 4 + 3] = W.alpha[i];
            Lt[k * 2] = W.shade[i];
            Lt[k * 2 + 1] = W.heat[i];
        });
        iPos.needsUpdate = true;
        iData.needsUpdate = true;
        iLight.needsUpdate = true;
        geometry.instanceCount = n;
        if (ref.current) ref.current.visible = n > 0;
        const u = material.uniforms;
        (u.uPlumePos.value as Vector3).copy(plume());
        // Plume light: strong while the engines fire close to the ground.
        u.uPlumeI.value = throttle() * 16 * Math.max(0, 1 - Math.max(0, lift) / 400);
        u.uFogDensity.value = 3.2e-5;
    });
    return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={7} />;
}
