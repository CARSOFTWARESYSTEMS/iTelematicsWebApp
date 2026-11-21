import type { CSSProperties } from 'react';

/**
 * Lit materials for the EV.ENGINEER™ drawings, after the iTelematics® spacecraft renders: surfaces
 * lit from above, cylindrical shading for tanks, cells and modules, blue solar-cell arrays and soft
 * glows for energy, in the page's existing hues. Gradient ids are document-wide, so each drawing
 * renders its own set under its own prefix (<Materials>) and exposes it to CSS as custom
 * properties (materials()), e.g. `fill: var(--m-lit)`. Gradients are static: no per-frame work.
 */

const MATERIALS = [
    'lit',
    'cells',
    'cyl',
    'cyl-v',
    'cell-top',
    'sheen',
    'sheen-white',
    'glow-solar',
    'glow-telemetry',
    'glow-nominal',
    'glow-orbit',
    'fade-solar',
    'fade-telemetry',
    'fade-nominal',
    'fade-orbit',
    'earth',
    'atmosphere',
    'night',
    'sun',
] as const;

/** The custom properties pointing a drawing's CSS at its own material set. */
export function materials(prefix: string): CSSProperties {
    return Object.fromEntries(MATERIALS.map((m) => [`--m-${m}`, `url(#${prefix}-${m})`])) as CSSProperties;
}

/** Every material, defined once per drawing under `prefix`. */
export function Materials({ prefix }: { prefix: string }) {
    const id = (m: (typeof MATERIALS)[number]) => `${prefix}-${m}`;
    return (
        <defs>
            <LitSurface id={id('lit')} />
            <SolarCells id={id('cells')} />
            <Cylinder id={id('cyl')} />
            <Cylinder id={id('cyl-v')} vertical />
            <CellTop id={id('cell-top')} />
            <Sheen id={id('sheen')} />
            <Sheen id={id('sheen-white')} color="#F1F5F9" opacity={0.5} />
            <Glow id={id('glow-solar')} color="var(--solar)" opacity={0.42} />
            <Glow id={id('glow-telemetry')} color="var(--telemetry)" opacity={0.45} />
            <Glow id={id('glow-nominal')} color="var(--nominal)" opacity={0.5} />
            <Glow id={id('glow-orbit')} color="var(--orbit)" opacity={0.4} />
            <Fade id={id('fade-solar')} color="var(--solar)" from={0.95} to={0.3} />
            <Fade id={id('fade-telemetry')} color="var(--telemetry)" from={1} to={0.25} />
            <Fade id={id('fade-nominal')} color="var(--nominal)" from={0.9} to={0.2} />
            <Fade id={id('fade-orbit')} color="var(--orbit)" from={0.16} to={0} />
            <Earth id={id('earth')} />
            <Atmosphere id={id('atmosphere')} />
            <Fade id={id('night')} color="#02060C" from={0} to={0.62} horizontal />
            {/* Sunlight glow on the Sun side of a drawing, fading to nothing before every edge of its box */}
            <radialGradient id={id('sun')} cx="0.32" cy="0.5" r="0.32">
                {stops([
                    [0, 'var(--solar)', 0.16],
                    [0.5, 'var(--solar)', 0.05],
                    [1, 'var(--solar)', 0],
                ])}
            </radialGradient>
        </defs>
    );
}

/** Earth lit from the Sun on the left, as in the iTelematics® orbit instrument. */
export function Earth({ id }: { id: string }) {
    return (
        <radialGradient id={id} cx="0.32" cy="0.42" r="0.78">
            {stops([
                [0, '#1A3A5A'],
                [0.42, '#10263D'],
                [0.78, '#0A1828'],
                [1, '#060E18'],
            ])}
        </radialGradient>
    );
}

/** A thin atmosphere at the limb: transparent inside, a glow ring at 0.86 r (Earth's edge when r = 1.16 × Earth). */
export function Atmosphere({ id }: { id: string }) {
    return (
        <radialGradient id={id}>
            {stops([
                [0, 'var(--orbit)', 0],
                [0.82, 'var(--orbit)', 0],
                [0.87, 'var(--orbit)', 0.26],
                [1, 'var(--orbit)', 0],
            ])}
        </radialGradient>
    );
}

type Stop = [offset: number, color: string, opacity?: number];

function stops(list: Stop[]) {
    return list.map(([offset, color, opacity = 1]) => <stop key={offset} offset={offset} style={{ stopColor: color, stopOpacity: opacity }} />);
}

/** A flat panel lit from above: a slightly brighter top edge falling to the page colour. */
export function LitSurface({ id }: { id: string }) {
    return (
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            {stops([
                [0, '#16283D', 0.96],
                [0.45, '#0E1B2A', 0.94],
                [1, '#08121C', 0.92],
            ])}
        </linearGradient>
    );
}

/** A cylinder seen side-on (tanks, cells, modules): dark limbs, a soft highlight off-centre. */
export function Cylinder({ id, vertical = false, tint = '#1F3550' }: { id: string; vertical?: boolean; tint?: string }) {
    return (
        <linearGradient id={id} x1="0" y1="0" x2={vertical ? '0' : '1'} y2={vertical ? '1' : '0'}>
            {stops([
                [0, '#060D15', 0.95],
                [0.32, tint, 0.95],
                [0.48, '#132438', 0.95],
                [1, '#050B12', 0.95],
            ])}
        </linearGradient>
    );
}

/** Blue solar cells lit from the upper left, in the arrays' own blue. */
export function SolarCells({ id }: { id: string }) {
    return (
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            {stops([
                [0, '#3B82F6', 0.5],
                [0.55, '#2563EB', 0.26],
                [1, '#1E3A8A', 0.38],
            ])}
        </linearGradient>
    );
}

/** A soft round glow: a colour at the centre fading to nothing. */
export function Glow({ id, color, opacity = 0.5 }: { id: string; color: string; opacity?: number }) {
    return (
        <radialGradient id={id}>
            {stops([
                [0, color, opacity],
                [0.45, color, opacity * 0.35],
                [1, color, 0],
            ])}
        </radialGradient>
    );
}

/** The end of a cylindrical cell seen from above: a bright rim and a darker cap. */
export function CellTop({ id }: { id: string }) {
    return (
        <radialGradient id={id} cx="0.42" cy="0.38" r="0.62">
            {stops([
                [0, '#1A2C42'],
                [0.62, '#0B1724'],
                [0.86, '#22364E'],
                [1, '#0A1520'],
            ])}
        </radialGradient>
    );
}

/** A band of light used for sheens sweeping across a surface. */
export function Sheen({ id, color = '#FBBF24', opacity = 0.32 }: { id: string; color?: string; opacity?: number }) {
    return (
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            {stops([
                [0, color, 0],
                [0.5, color, opacity],
                [1, color, 0],
            ])}
        </linearGradient>
    );
}

/** A vertical fade (bars, plumes, terrain): colour at the top fading downwards. */
export function Fade({ id, color, from = 0.9, to = 0.15, horizontal = false }: { id: string; color: string; from?: number; to?: number; horizontal?: boolean }) {
    return (
        <linearGradient id={id} x1="0" y1="0" x2={horizontal ? '1' : '0'} y2={horizontal ? '0' : '1'}>
            {stops([
                [0, color, from],
                [1, color, to],
            ])}
        </linearGradient>
    );
}
