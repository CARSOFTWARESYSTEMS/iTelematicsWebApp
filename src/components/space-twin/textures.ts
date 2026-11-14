"use client";
// Surface textures drawn once on a canvas in the browser (from the "Learn to Protect Missions"
// showcase): nothing to download, seeded so every visit looks the same. Solar cells with cropped
// corners and gridlines, crinkled multi-layer insulation (gold or silver), mirrored radiator tiles,
// and white radiator panels for the station.
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';

function surface(w: number, h: number) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return { canvas, g: canvas.getContext('2d')! };
}

function random(seed: number) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function texture(canvas: HTMLCanvasElement, anisotropy: number, srgb: boolean) {
    const t = new CanvasTexture(canvas);
    if (srgb) t.colorSpace = SRGBColorSpace;
    t.anisotropy = anisotropy;
    return t;
}

/** A solar panel face: cols × rows cells with cropped corners, fine gridlines and a busbar, on a dark substrate. */
function solarCells(anisotropy: number, { cols = 4, rows = 4, W = 512, H = 880, seed = 7, hue = 224 } = {}) {
    const color = surface(W, H);
    const rough = surface(W, H);
    const rnd = random(seed);
    color.g.fillStyle = '#0a0d14';
    color.g.fillRect(0, 0, W, H);
    rough.g.fillStyle = '#d8d8d8';
    rough.g.fillRect(0, 0, W, H);
    const cw = W / cols;
    const ch = H / rows;
    const gap = Math.max(2, Math.round(cw * 0.04));
    const cut = Math.round(Math.min(cw, ch) * 0.13);
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            const x = i * cw + gap;
            const y = j * ch + gap;
            const w = cw - 2 * gap;
            const h = ch - 2 * gap;
            const path = new Path2D();
            path.moveTo(x + cut, y);
            path.lineTo(x + w - cut, y);
            path.lineTo(x + w, y + cut);
            path.lineTo(x + w, y + h);
            path.lineTo(x, y + h);
            path.lineTo(x, y + cut);
            path.closePath();
            const grad = color.g.createLinearGradient(x, y, x + w, y + h);
            grad.addColorStop(0, `hsl(${hue + rnd() * 6}, 64%, ${22 + rnd() * 4}%)`);
            grad.addColorStop(1, `hsl(${hue + 6 + rnd() * 6}, 72%, ${12 + rnd() * 3}%)`);
            color.g.fillStyle = grad;
            color.g.fill(path);
            color.g.save();
            color.g.clip(path);
            color.g.fillStyle = 'rgba(165, 185, 230, 0.16)';
            const pitch = Math.max(4, Math.round(ch / 18));
            for (let gy = y + pitch * 1.6; gy < y + h; gy += pitch) color.g.fillRect(x, gy, w, 1);
            color.g.fillStyle = 'rgba(205, 214, 228, 0.7)';
            color.g.fillRect(x + cut, y + 3, w - 2 * cut, Math.max(2, Math.round(ch * 0.018)));
            color.g.restore();
            rough.g.fillStyle = '#3a3a3a';
            rough.g.fill(path);
        }
    }
    color.g.fillStyle = 'rgba(196, 204, 216, 0.85)';
    for (let i = 0; i < cols; i++) for (let j = 1; j < rows; j++) for (const dx of [0.3, 0.7]) color.g.fillRect(i * cw + cw * dx - gap, j * ch - gap, gap * 2, gap * 1.6);
    return { map: texture(color.canvas, anisotropy, true), roughnessMap: texture(rough.canvas, anisotropy, false) };
}

/** Crinkled multi-layer insulation: soft facets catch the light at different angles; taped edges and a seam. */
function foil(anisotropy: number, tint: 'gold' | 'silver', seed = 11) {
    const SW = 256;
    const SH = 416;
    const small = surface(SW, SH);
    const smallBump = surface(SW, SH);
    const rnd = random(seed);
    const nx = 18;
    const ny = 30;
    const pts: [number, number][][] = [];
    for (let i = 0; i <= nx; i++) {
        pts.push([]);
        for (let j = 0; j <= ny; j++) {
            const edge = i === 0 || j === 0 || i === nx || j === ny;
            pts[i].push([(i / nx) * SW + (edge ? 0 : (rnd() - 0.5) * (SW / nx) * 0.9), (j / ny) * SH + (edge ? 0 : (rnd() - 0.5) * (SH / ny) * 0.9)]);
        }
    }
    const tri = (a: [number, number], b: [number, number], c: [number, number]) => {
        const shade = rnd();
        const fill =
            tint === 'gold'
                ? `rgb(${Math.round(184 + shade * 62)}, ${Math.round(136 + shade * 70)}, ${Math.round(52 + shade * 56)})`
                : `rgb(${Math.round(150 + shade * 90)}, ${Math.round(156 + shade * 88)}, ${Math.round(166 + shade * 82)})`;
        const g = Math.round(70 + shade * 120);
        for (const [ctx, f] of [
            [small.g, fill],
            [smallBump.g, `rgb(${g}, ${g}, ${g})`],
        ] as const) {
            ctx.fillStyle = f;
            ctx.beginPath();
            ctx.moveTo(...a);
            ctx.lineTo(...b);
            ctx.lineTo(...c);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = f;
            ctx.lineWidth = 0.6;
            ctx.stroke();
        }
    };
    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
            const [a, b, c, d] = [pts[i][j], pts[i + 1][j], pts[i + 1][j + 1], pts[i][j + 1]];
            if (rnd() > 0.5) {
                tri(a, b, c);
                tri(a, c, d);
            } else {
                tri(a, b, d);
                tri(b, c, d);
            }
        }
    }
    const W = 512;
    const H = 832;
    const color = surface(W, H);
    const bump = surface(W, H);
    for (const [dst, src] of [
        [color.g, small.canvas],
        [bump.g, smallBump.canvas],
    ] as const) {
        dst.imageSmoothingEnabled = true;
        dst.imageSmoothingQuality = 'high';
        dst.drawImage(src, 0, 0, W, H);
    }
    color.g.strokeStyle = tint === 'gold' ? 'rgba(120, 82, 22, 0.9)' : 'rgba(70, 76, 88, 0.9)';
    color.g.lineWidth = 14;
    color.g.strokeRect(7, 7, W - 14, H - 14);
    color.g.fillStyle = tint === 'gold' ? 'rgba(110, 76, 20, 0.85)' : 'rgba(80, 86, 98, 0.85)';
    color.g.fillRect(W * 0.62, 0, 5, H);
    color.g.fillStyle = tint === 'gold' ? 'rgba(235, 205, 130, 0.9)' : 'rgba(220, 226, 236, 0.9)';
    for (let y = 10; y < H; y += 18) color.g.fillRect(W * 0.62 - 3, y, 11, 2);
    bump.g.fillStyle = '#202020';
    bump.g.fillRect(W * 0.62, 0, 5, H);
    return { map: texture(color.canvas, anisotropy, true), bumpMap: texture(bump.canvas, anisotropy, false) };
}

/** A radiator of small mirrored tiles (optical solar reflectors) with dark gaps. */
function radiatorTiles(anisotropy: number) {
    const W = 128;
    const H = 480;
    const color = surface(W, H);
    const rough = surface(W, H);
    const rnd = random(5);
    color.g.fillStyle = '#2c3038';
    color.g.fillRect(0, 0, W, H);
    rough.g.fillStyle = '#c8c8c8';
    rough.g.fillRect(0, 0, W, H);
    const cols = 4;
    const rows = 15;
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            const v = Math.round(214 + rnd() * 30);
            color.g.fillStyle = `rgb(${v}, ${v + 3}, ${Math.min(255, v + 8)})`;
            color.g.fillRect((i * W) / cols + 2, (j * H) / rows + 2, W / cols - 4, H / rows - 4);
            rough.g.fillStyle = '#1c1c1c';
            rough.g.fillRect((i * W) / cols + 2, (j * H) / rows + 2, W / cols - 4, H / rows - 4);
        }
    }
    return { map: texture(color.canvas, anisotropy, true), roughnessMap: texture(rough.canvas, anisotropy, false) };
}

/** White radiator panels with fluid-loop lines, repeating along a long panel. */
function whitePanels(anisotropy: number) {
    const W = 256;
    const H = 256;
    const color = surface(W, H);
    color.g.fillStyle = '#e8ebee';
    color.g.fillRect(0, 0, W, H);
    color.g.fillStyle = 'rgba(120, 128, 140, 0.35)';
    for (let x = 16; x < W; x += 32) color.g.fillRect(x, 0, 2, H);
    color.g.fillStyle = 'rgba(70, 76, 88, 0.6)';
    color.g.fillRect(0, 0, W, 3);
    color.g.fillRect(0, H - 3, W, 3);
    const t = texture(color.canvas, anisotropy, true);
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    return t;
}

export interface SpaceTextures {
    cells: { map: Texture; roughnessMap: Texture };
    wideCells: { map: Texture; roughnessMap: Texture };
    blanket: { map: Texture; roughnessMap: Texture };
    goldFoil: { map: Texture; bumpMap: Texture };
    silverFoil: { map: Texture; bumpMap: Texture };
    radiator: { map: Texture; roughnessMap: Texture };
    whitePanel: Texture;
}

const BUILDERS: { [K in keyof SpaceTextures]: (anisotropy: number) => SpaceTextures[K] } = {
    cells: (a) => solarCells(a),
    wideCells: (a) => solarCells(a, { cols: 6, rows: 3, W: 768, H: 512, seed: 19, hue: 222 }),
    blanket: (a) => solarCells(a, { cols: 8, rows: 20, W: 512, H: 1280, seed: 23, hue: 218 }),
    goldFoil: (a) => foil(a, 'gold'),
    silverFoil: (a) => foil(a, 'silver', 29),
    radiator: (a) => radiatorTiles(a),
    whitePanel: (a) => whitePanels(a),
};

/**
 * Procedural textures for one scene, drawn on first use only (each scene draws just what it shows)
 * and released when the scene unmounts.
 */
export function useSpaceTextures(): SpaceTextures {
    const gl = useThree((s) => s.gl);
    const { textures, made } = useMemo(() => {
        const a = Math.min(8, gl.capabilities.getMaxAnisotropy());
        const made = new Map<keyof SpaceTextures, SpaceTextures[keyof SpaceTextures]>();
        const textures = {} as SpaceTextures;
        for (const key of Object.keys(BUILDERS) as (keyof SpaceTextures)[]) {
            Object.defineProperty(textures, key, {
                enumerable: true,
                get: () => {
                    if (!made.has(key)) made.set(key, BUILDERS[key](a));
                    return made.get(key);
                },
            });
        }
        return { textures, made };
    }, [gl]);
    useEffect(
        () => () => {
            for (const set of made.values()) {
                if ('isTexture' in set) (set as Texture).dispose();
                else for (const t of Object.values(set)) (t as Texture).dispose();
            }
            made.clear();
        },
        [made],
    );
    return textures;
}
