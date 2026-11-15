'use client';
// Procedural surface textures for the Solar System experience's hardware (option 06). Everything here
// is drawn in code: no downloaded files. Each surface gets a colour map, a normal map derived from a
// height map (weld seams, panel joints, stringers, cooling tubes, foam texture) and a roughness map
// with subtle variation, so physically based materials catch light like painted metal, composite or
// foam rather than plain plastic. Textures are built once per page and shared.
import { CanvasTexture, ClampToEdgeWrapping, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';

type Ctx = CanvasRenderingContext2D;

function canvas(w: number, h: number) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return { c, g: c.getContext('2d', { willReadFrequently: true }) as Ctx };
}

/** Seeded random numbers, so every texture is identical on every load. */
function rng(seed: number) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

/** Tileable value noise on a w×h grid with `cells` cells across. */
function noiseField(w: number, h: number, cellsX: number, cellsY: number, seed: number) {
    const r = rng(seed);
    const grid = Array.from({ length: cellsX * cellsY }, () => r());
    const at = (i: number, j: number) => grid[(((j % cellsY) + cellsY) % cellsY) * cellsX + (((i % cellsX) + cellsX) % cellsX)];
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
        const gy = (y / h) * cellsY;
        const j = Math.floor(gy);
        const fy = gy - j;
        const sy = fy * fy * (3 - 2 * fy);
        for (let x = 0; x < w; x++) {
            const gx = (x / w) * cellsX;
            const i = Math.floor(gx);
            const fx = gx - i;
            const sx = fx * fx * (3 - 2 * fx);
            const a = at(i, j);
            const b = at(i + 1, j);
            const c = at(i, j + 1);
            const d = at(i + 1, j + 1);
            out[y * w + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
        }
    }
    return out;
}

/** Sum of octaves of tileable noise, 0…1. */
function fbm(w: number, h: number, baseX: number, baseY: number, octaves: number, seed: number) {
    const out = new Float32Array(w * h);
    let amp = 0.5;
    let total = 0;
    for (let o = 0; o < octaves; o++) {
        const n = noiseField(w, h, baseX << o, baseY << o, seed + o * 101);
        for (let k = 0; k < out.length; k++) out[k] += n[k] * amp;
        total += amp;
        amp *= 0.5;
    }
    for (let k = 0; k < out.length; k++) out[k] /= total;
    return out;
}

/** A normal map from a height field (Sobel), wrapping at the edges so it tiles. */
function normalFromHeight(hgt: Float32Array, w: number, h: number, strength: number) {
    const { c, g } = canvas(w, h);
    const img = g.createImageData(w, h);
    const H = (x: number, y: number) => hgt[((y + h) % h) * w + ((x + w) % w)];
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x - 1, y) - H(x - 1, y + 1)) * strength;
            const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x, y - 1) - H(x + 1, y - 1)) * strength;
            const len = Math.hypot(dx, dy, 1);
            const i = (y * w + x) * 4;
            img.data[i] = (-dx / len) * 127.5 + 127.5;
            img.data[i + 1] = (dy / len) * 127.5 + 127.5;
            img.data[i + 2] = (1 / len) * 127.5 + 127.5;
            img.data[i + 3] = 255;
        }
    g.putImageData(img, 0, 0);
    return c;
}

/** A greyscale canvas (roughness etc.) from a field and a mapping. */
function greyFromField(f: Float32Array, w: number, h: number, map: (v: number, x: number, y: number) => number) {
    const { c, g } = canvas(w, h);
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            const v = Math.max(0, Math.min(255, map(f[y * w + x], x, y) * 255));
            const i = (y * w + x) * 4;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
            img.data[i + 3] = 255;
        }
    g.putImageData(img, 0, 0);
    return c;
}

function tex(c: HTMLCanvasElement, color: boolean, repeat = true) {
    const t = new CanvasTexture(c);
    if (color) t.colorSpace = SRGBColorSpace;
    t.wrapS = repeat ? RepeatWrapping : ClampToEdgeWrapping;
    t.wrapT = repeat ? RepeatWrapping : ClampToEdgeWrapping;
    t.anisotropy = 8;
    return t;
}

export interface SurfaceSet {
    map: Texture;
    normalMap: Texture;
    roughnessMap: Texture;
}

let cache: Map<string, SurfaceSet | Texture> | null = null;
function memo<T extends SurfaceSet | Texture>(key: string, build: () => T): T {
    cache ??= new Map();
    if (!cache.has(key)) cache.set(key, build());
    return cache.get(key) as T;
}

/**
 * Painted aluminium-lithium tank barrel: white paint with slight tonal variation, circumferential weld
 * lands (`rings` across the height), `seams` longitudinal panel joints around, a few access-panel
 * outlines, light grime streaks running down from the welds, and a roughness map to match.
 */
export function paintedBarrel(rings: number, seams: number, seed = 1): SurfaceSet {
    return memo(`barrel-${rings}-${seams}-${seed}`, () => {
        const w = 512;
        const h = 1024;
        const n = fbm(w, h, 4, 8, 5, seed);
        const streak = fbm(w, h, 64, 2, 3, seed + 7);
        const height = new Float32Array(w * h);
        const ringY = Array.from({ length: rings }, (_, i) => Math.round(((i + 0.5) / rings) * h));
        const seamX = Array.from({ length: seams }, (_, i) => Math.round((i / seams) * w));
        const r = rng(seed + 3);
        const panels = Array.from({ length: 3 }, () => ({ x: Math.floor(r() * (w - 60)), y: Math.floor(r() * (h - 80)), w: 30 + Math.floor(r() * 30), h: 40 + Math.floor(r() * 40) }));
        const { c: col, g } = canvas(w, h);
        const img = g.createImageData(w, h);
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                const k = y * w + x;
                let hv = n[k] * 0.05;
                let dirt = 0;
                for (const ry of ringY) {
                    const d = Math.abs(y - ry);
                    if (d < 6) hv += (1 - d / 6) * 0.9; // raised weld land
                    if (y > ry && y - ry < 120) dirt += Math.max(0, streak[k] - 0.55) * (1 - (y - ry) / 120) * 0.5;
                }
                for (const sx of seamX) {
                    const d = Math.min(Math.abs(x - sx), w - Math.abs(x - sx));
                    if (d < 1.5) hv -= 0.6; // panel joint groove
                }
                for (const p of panels) {
                    const onEdge = (Math.abs(x - p.x) < 1.2 || Math.abs(x - p.x - p.w) < 1.2) && y > p.y && y < p.y + p.h;
                    const onEdgeY = (Math.abs(y - p.y) < 1.2 || Math.abs(y - p.y - p.h) < 1.2) && x > p.x && x < p.x + p.w;
                    if (onEdge || onEdgeY) hv -= 0.5;
                }
                height[k] = hv;
                const base = 236 + (n[k] - 0.5) * 14 - dirt * 120;
                const i = k * 4;
                img.data[i] = base;
                img.data[i + 1] = base + 1;
                img.data[i + 2] = base + 3;
                img.data[i + 3] = 255;
            }
        g.putImageData(img, 0, 0);
        return {
            map: tex(col, true),
            normalMap: tex(normalFromHeight(height, w, h, 1.4), false),
            roughnessMap: tex(
                greyFromField(n, w, h, (v) => 0.42 + v * 0.22),
                false,
            ),
        };
    });
}

/** Carbon-composite interstage or aft skirt: dark, fine stringers, a faint weave and soft sheen. */
export function carbonShell(stringers: number, seed = 11): SurfaceSet {
    return memo(`carbon-${stringers}-${seed}`, () => {
        const w = 1024;
        const h = 256;
        const n = fbm(w, h, 8, 2, 4, seed);
        const height = new Float32Array(w * h);
        const { c: col, g } = canvas(w, h);
        const img = g.createImageData(w, h);
        const period = w / stringers;
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                const k = y * w + x;
                const p = (x % period) / period;
                const rib = p < 0.18 ? Math.sin((p / 0.18) * Math.PI) : 0;
                const weave = ((x >> 2) + (y >> 2)) % 2 ? 0.04 : 0;
                height[k] = rib * 0.9 + weave + n[k] * 0.08;
                const v = 34 + n[k] * 10 + rib * 8 + weave * 60;
                const i = k * 4;
                img.data[i] = v;
                img.data[i + 1] = v + 2;
                img.data[i + 2] = v + 5;
                img.data[i + 3] = 255;
            }
        g.putImageData(img, 0, 0);
        return {
            map: tex(col, true),
            normalMap: tex(normalFromHeight(height, w, h, 2.2), false),
            roughnessMap: tex(
                greyFromField(n, w, h, (v) => 0.5 + v * 0.2),
                false,
            ),
        };
    });
}

/**
 * Spray-on foam insulation over a cryogenic tank barrel (u around, v along): orange-brown closed-cell
 * foam as sprayed, with the broad mottling of the spray passes, slightly yellower hand-sprayed closeouts
 * over the circumferential welds, faint vertical weathering streaks and the fine bumpy grain of the
 * foam surface (normal map). Matt: roughness 0.8–0.95.
 */
export function sprayFoam(rings: number, seed = 41): SurfaceSet {
    return memo(`sofi-${rings}-${seed}`, () => {
        const w = 512;
        const h = 1024;
        const grain = fbm(w, h, 192, 384, 2, seed);
        const mottle = fbm(w, h, 6, 10, 4, seed + 3);
        const streak = fbm(w, h, 48, 3, 3, seed + 9);
        const height = new Float32Array(w * h);
        const ringY = Array.from({ length: rings }, (_, i) => Math.round(((i + 0.5) / rings) * h));
        const { c: col, g } = canvas(w, h);
        const img = g.createImageData(w, h);
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                const k = y * w + x;
                let close = 0;
                for (const ry of ringY) {
                    const d = Math.abs(y - ry);
                    if (d < 18) close = Math.max(close, 1 - d / 18);
                }
                const m = mottle[k] - 0.5;
                const st = Math.max(0, streak[k] - 0.5);
                height[k] = grain[k] * 0.35 + m * 0.25 + close * 0.3;
                const i = k * 4;
                img.data[i] = 199 + m * 26 + close * 12 - st * 40;
                img.data[i + 1] = 106 + m * 16 + close * 14 - st * 26;
                img.data[i + 2] = 46 + m * 8 + close * 8 - st * 12;
                img.data[i + 3] = 255;
            }
        g.putImageData(img, 0, 0);
        return {
            map: tex(col, true),
            normalMap: tex(normalFromHeight(height, w, h, 0.9), false),
            roughnessMap: tex(
                greyFromField(grain, w, h, (v) => 0.8 + v * 0.15),
                false,
            ),
        };
    });
}

/**
 * Spray-on foam insulation of the cryogenic upper stage: a warm tan with darker panel bands where the
 * foam was applied in sections, mottled texture and a matt finish.
 */
export function foamInsulation(seed = 21, palette: 'tan' | 'white' = 'tan'): SurfaceSet {
    return memo(`foam-${seed}-${palette}`, () => {
        const base = palette === 'tan' ? [218, 168, 118] : [232, 233, 230];
        const w = 512;
        const h = 512;
        const n = fbm(w, h, 16, 16, 5, seed);
        const big = fbm(w, h, 3, 3, 3, seed + 5);
        const height = new Float32Array(w * h);
        const { c: col, g } = canvas(w, h);
        const img = g.createImageData(w, h);
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                const k = y * w + x;
                const band = Math.abs((((y / h) * 4) % 1) - 0.5) < 0.012 ? 1 : 0;
                height[k] = n[k] * 0.35 - band * 0.6;
                const t = big[k] * 0.7 + n[k] * 0.3;
                const i = k * 4;
                img.data[i] = base[0] + t * 22 - band * 34;
                img.data[i + 1] = base[1] + t * 20 - band * 30;
                img.data[i + 2] = base[2] + t * 16 - band * 24;
                img.data[i + 3] = 255;
            }
        g.putImageData(img, 0, 0);
        return {
            map: tex(col, true),
            normalMap: tex(normalFromHeight(height, w, h, 1.2), false),
            roughnessMap: tex(
                greyFromField(n, w, h, (v) => 0.78 + v * 0.12),
                false,
            ),
        };
    });
}

/**
 * Regeneratively cooled nozzle: fine longitudinal cooling tubes, darkening and heat tint towards the
 * exit (v = 0 at the throat, 1 at the exit), for the outside of a bell. `tint` picks the palette.
 */
export function nozzleSkin(kind: 'copper' | 'niobium', seed = 31): SurfaceSet {
    return memo(`nozzle-${kind}-${seed}`, () => {
        const w = 1024;
        const h = 256;
        const n = fbm(w, h, 16, 4, 4, seed);
        const height = new Float32Array(w * h);
        const { c: col, g } = canvas(w, h);
        const img = g.createImageData(w, h);
        const tubes = kind === 'copper' ? 180 : 0;
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                const k = y * w + x;
                const v = y / h; // throat → exit
                const tube = tubes ? 0.5 + 0.5 * Math.cos((x / w) * tubes * Math.PI * 2) : 0;
                height[k] = tube * 0.8 + n[k] * 0.1;
                const i = k * 4;
                if (kind === 'copper') {
                    // Dark oxidised metal with a bronze sheen near the throat.
                    const r0 = 86 - v * 40 + n[k] * 18;
                    img.data[i] = r0 + tube * 10;
                    img.data[i + 1] = r0 * 0.78 + tube * 7;
                    img.data[i + 2] = r0 * 0.62 + tube * 5;
                } else {
                    // Radiatively cooled extension: heat-tinted bands from straw to blue-grey.
                    const band = 0.5 + 0.5 * Math.sin(v * 9 + n[k] * 2);
                    img.data[i] = 150 + band * 40 - v * 30;
                    img.data[i + 1] = 132 + band * 20 - v * 20;
                    img.data[i + 2] = 110 + (1 - band) * 50;
                }
                img.data[i + 3] = 255;
            }
        g.putImageData(img, 0, 0);
        return {
            map: tex(col, true),
            normalMap: tex(normalFromHeight(height, w, h, 3), false),
            roughnessMap: tex(
                greyFromField(n, w, h, (v) => 0.32 + v * 0.18),
                false,
            ),
        };
    });
}

/**
 * Markings decal for a cylinder: transparent except for the vehicle name running up the body and a
 * thin tracking stripe. The alpha channel carries the shape.
 */
export function lettering(text: string, heightPx = 1024, opts: { color?: string; size?: number; vertical?: boolean } = {}): Texture {
    return memo(`text-${text}-${heightPx}-${opts.color}-${opts.size}-${opts.vertical}`, () => {
        const vertical = opts.vertical ?? true;
        const w = vertical ? 256 : 1024;
        const h = vertical ? heightPx : 256;
        const { c, g } = canvas(w, h);
        g.clearRect(0, 0, w, h);
        g.fillStyle = opts.color ?? '#14171c';
        g.font = `700 ${opts.size ?? 150}px "Helvetica Neue", Arial, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        if (vertical) {
            g.translate(w / 2, h / 2);
            g.rotate(-Math.PI / 2);
            g.fillText(text, 0, 8);
        } else g.fillText(text, w / 2, h / 2 + 6);
        return tex(c, true, false);
    });
}

/** Black-and-white roll pattern band (for optical tracking of the vehicle's roll), `cells` around. */
export function rollPattern(cells: number): Texture {
    return memo(`roll-${cells}`, () => {
        const w = 512;
        const h = 64;
        const { c, g } = canvas(w, h);
        const cw = w / cells;
        for (let i = 0; i < cells; i++) {
            g.fillStyle = i % 2 ? '#f1f2f3' : '#17191d';
            g.fillRect(i * cw, 0, cw, h / 2);
            g.fillStyle = i % 2 ? '#17191d' : '#f1f2f3';
            g.fillRect(i * cw, h / 2, cw, h / 2);
        }
        return tex(c, true);
    });
}

/** Weathered steel for structures: grey paint with rust-free grime, chips and roughness variation. */
export function paintedSteel(tone: [number, number, number], seed = 41): SurfaceSet {
    return memo(`steel-${tone.join(',')}-${seed}`, () => {
        const w = 256;
        const h = 256;
        const n = fbm(w, h, 8, 8, 5, seed);
        const streak = fbm(w, h, 32, 2, 3, seed + 9);
        const { c: col, g } = canvas(w, h);
        const img = g.createImageData(w, h);
        for (let k = 0; k < w * h; k++) {
            const grime = Math.max(0, streak[k] - 0.5) * 0.5 + (n[k] - 0.5) * 0.12;
            const i = k * 4;
            img.data[i] = tone[0] * (1 - grime);
            img.data[i + 1] = tone[1] * (1 - grime);
            img.data[i + 2] = tone[2] * (1 - grime);
            img.data[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        const height = new Float32Array(w * h);
        for (let k = 0; k < w * h; k++) height[k] = n[k] * 0.4;
        return {
            map: tex(col, true),
            normalMap: tex(normalFromHeight(height, w, h, 1.2), false),
            roughnessMap: tex(
                greyFromField(n, w, h, (v) => 0.45 + v * 0.3),
                false,
            ),
        };
    });
}

/** Steel grating for platforms: a regular bar pattern with alpha gaps. */
export function grating(): Texture {
    return memo('grating', () => {
        const { c, g } = canvas(128, 128);
        g.clearRect(0, 0, 128, 128);
        g.fillStyle = '#8b9096';
        for (let x = 0; x < 128; x += 8) g.fillRect(x, 0, 3, 128);
        for (let y = 0; y < 128; y += 32) g.fillRect(0, y, 128, 2);
        return tex(c, true);
    });
}

/** Spacecraft multi-layer insulation: crinkled foil with soft highlights (gold or black Kapton). */
export function blanket(kind: 'gold' | 'black' | 'silver', seed = 51): SurfaceSet {
    return memo(`mli-${kind}-${seed}`, () => {
        const w = 512;
        const h = 512;
        const n = fbm(w, h, 12, 12, 5, seed);
        const m = fbm(w, h, 40, 40, 2, seed + 3);
        const height = new Float32Array(w * h);
        const { c: col, g } = canvas(w, h);
        const img = g.createImageData(w, h);
        const base = kind === 'gold' ? [214, 166, 74] : kind === 'black' ? [30, 31, 34] : [196, 200, 206];
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                const k = y * w + x;
                // Crinkles: sharp ridges from the absolute value of noise.
                const cr = 1 - Math.abs(n[k] * 2 - 1);
                const quilt = x % 128 < 2 || y % 128 < 2 ? 1 : 0;
                height[k] = cr * 0.9 + m[k] * 0.3 - quilt * 0.8;
                const shade = 0.8 + cr * 0.32 - quilt * 0.3;
                const i = k * 4;
                img.data[i] = Math.min(255, base[0] * shade);
                img.data[i + 1] = Math.min(255, base[1] * shade);
                img.data[i + 2] = Math.min(255, base[2] * shade);
                img.data[i + 3] = 255;
            }
        g.putImageData(img, 0, 0);
        return {
            map: tex(col, true),
            normalMap: tex(normalFromHeight(height, w, h, 3.2), false),
            roughnessMap: tex(
                greyFromField(n, w, h, (v) => (kind === 'black' ? 0.55 : 0.28) + v * 0.2),
                false,
            ),
        };
    });
}

/** Concrete with stains and expansion joints every `joint` texels (for the pad deck). */
export function padConcrete(seed = 61): SurfaceSet {
    return memo(`concrete-${seed}`, () => {
        const w = 512;
        const h = 512;
        const n = fbm(w, h, 6, 6, 5, seed);
        const s = fbm(w, h, 3, 3, 4, seed + 13);
        const height = new Float32Array(w * h);
        const { c: col, g } = canvas(w, h);
        const img = g.createImageData(w, h);
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                const k = y * w + x;
                const joint = x % 128 < 2 || y % 128 < 2 ? 1 : 0;
                height[k] = n[k] * 0.5 - joint * 0.8;
                const stain = Math.max(0, s[k] - 0.55) * 1.6;
                const v = 188 + (n[k] - 0.5) * 34 - stain * 70 - joint * 50;
                const i = k * 4;
                img.data[i] = v;
                img.data[i + 1] = v - 3;
                img.data[i + 2] = v - 8;
                img.data[i + 3] = 255;
            }
        g.putImageData(img, 0, 0);
        return {
            map: tex(col, true),
            normalMap: tex(normalFromHeight(height, w, h, 1.6), false),
            roughnessMap: tex(
                greyFromField(n, w, h, (v) => 0.82 + v * 0.15),
                false,
            ),
        };
    });
}

/** Building cladding: corrugated metal panels with window bands (`windows` = rows of strip windows). */
export function cladding(tone: [number, number, number], windows: number, seed = 71): SurfaceSet {
    return memo(`clad-${tone.join(',')}-${windows}-${seed}`, () => {
        const w = 512;
        const h = 512;
        const n = fbm(w, h, 8, 8, 4, seed);
        const height = new Float32Array(w * h);
        const { c: col, g } = canvas(w, h);
        const img = g.createImageData(w, h);
        const rows = Array.from({ length: windows }, (_, i) => ((i + 1) / (windows + 1)) * h);
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                const k = y * w + x;
                const corr = 0.5 + 0.5 * Math.cos((x / w) * 96 * Math.PI * 2);
                const win = rows.some((ry) => Math.abs(y - ry) < 10) && x % 64 > 4;
                height[k] = win ? -0.4 : corr * 0.6;
                const shade = win ? 0.22 : 0.9 + corr * 0.1 + (n[k] - 0.5) * 0.12;
                const i = k * 4;
                img.data[i] = tone[0] * shade;
                img.data[i + 1] = tone[1] * shade;
                img.data[i + 2] = (win ? tone[2] * 1.25 : tone[2]) * shade;
                img.data[i + 3] = 255;
            }
        g.putImageData(img, 0, 0);
        return {
            map: tex(col, true),
            normalMap: tex(normalFromHeight(height, w, h, 1.4), false),
            roughnessMap: tex(
                greyFromField(n, w, h, (v, x, y) => (rows.some((ry) => Math.abs(y - ry) < 10) && x % 64 > 4 ? 0.12 : 0.5 + v * 0.2)),
                false,
            ),
        };
    });
}

/** Releases every cached texture (when the experience closes). */
export function disposeTextures() {
    if (!cache) return;
    for (const v of cache.values()) {
        if ('map' in v) {
            v.map.dispose();
            v.normalMap.dispose();
            v.roughnessMap.dispose();
        } else v.dispose();
    }
    cache = null;
}

/** A clone of a texture set with its own repeat (images shared, not duplicated). */
export function repeated(set: SurfaceSet, x: number, y: number): SurfaceSet {
    const k = (t: Texture) => {
        const c = t.clone();
        c.repeat.set(x, y);
        c.needsUpdate = true;
        return c;
    };
    return { map: k(set.map), normalMap: k(set.normalMap), roughnessMap: k(set.roughnessMap) };
}
