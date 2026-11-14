"use client";
// Building blocks for the spacecraft models (from the "Learn to Protect Missions" showcase):
// physically based materials that glow when their part is highlighted, boxes and cylinders that
// cast and receive shadows, clickable parts with label anchors, and the energy-flow particles.
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { DoubleSide, Vector3, type Curve, type Group, type Mesh, type Texture } from 'three';
import { useLabelAnchor } from './labels';

export type V3 = [number, number, number];
export type Glow = 'info' | 'alert';

/** The site's semantic colours: telemetry cyan to point something out, fault red for an anomaly. */
export const GLOW: Record<Glow, string> = { info: '#22D3EE', alert: '#F87171' };
export const ENERGY = '#FBBF24';

const ToneContext = createContext<Glow | null>(null);
export const ShadowContext = createContext(true);

export interface MatProps {
    color?: string;
    metalness?: number;
    roughness?: number;
    map?: Texture;
    roughnessMap?: Texture;
    emissive?: string;
    emissiveIntensity?: number;
    doubleSided?: boolean;
    transparent?: boolean;
    opacity?: number;
    /** Scales reflections of the environment (solar cells reflect less than bare metal). */
    envIntensity?: number;
    /** Scales the highlight glow: large dark surfaces (solar cells) need far less to read. */
    glowScale?: number;
}

export function Mat({ color = '#ffffff', metalness = 0.5, roughness = 0.5, map, roughnessMap, emissive, emissiveIntensity = 0, doubleSided, transparent, opacity, envIntensity = 1, glowScale = 1 }: MatProps) {
    const tone = useContext(ToneContext);
    return (
        <meshStandardMaterial
            color={color}
            metalness={metalness}
            roughness={roughness}
            envMapIntensity={envIntensity}
            map={map ?? null}
            roughnessMap={roughnessMap ?? null}
            emissive={tone ? GLOW[tone] : (emissive ?? '#000000')}
            emissiveIntensity={tone ? (tone === 'alert' ? 0.34 : 0.2) * glowScale : emissiveIntensity}
            side={doubleSided ? DoubleSide : undefined}
            transparent={transparent}
            opacity={opacity ?? 1}
        />
    );
}

export function Box({ size, at = [0, 0, 0], rot, ...mat }: { size: V3; at?: V3; rot?: V3 } & MatProps) {
    const shadows = useContext(ShadowContext);
    return (
        <mesh position={at} rotation={rot} castShadow={shadows} receiveShadow={shadows}>
            <boxGeometry args={size} />
            <Mat {...mat} />
        </mesh>
    );
}

export function Cyl({ r, top, h, at = [0, 0, 0], rot, open, segments = 28, ...mat }: { r: number; top?: number; h: number; at?: V3; rot?: V3; open?: boolean; segments?: number } & MatProps) {
    const shadows = useContext(ShadowContext);
    return (
        <mesh position={at} rotation={rot} castShadow={shadows} receiveShadow={shadows}>
            <cylinderGeometry args={[top ?? r, r, h, segments, 1, open]} />
            <Mat {...mat} />
        </mesh>
    );
}

export function Ball({ r, at = [0, 0, 0], segments = 24, ...mat }: { r: number; at?: V3; segments?: number } & MatProps) {
    const shadows = useContext(ShadowContext);
    return (
        <mesh position={at} castShadow={shadows} receiveShadow={shadows}>
            <sphereGeometry args={[r, segments, Math.round(segments * 0.75)]} />
            <Mat {...mat} />
        </mesh>
    );
}

// Finishes.
export const RAIL = { color: '#8d95a3', metalness: 0.85, roughness: 0.3 };
export const ANODISED = { color: '#1b1f27', metalness: 0.78, roughness: 0.4 };
export const ANODISED_LIGHT = { color: '#2c313b', metalness: 0.8, roughness: 0.36 };
export const PCB = { color: '#18432f', metalness: 0.15, roughness: 0.62 };
export const CHIP = { color: '#0d0f13', metalness: 0.3, roughness: 0.45 };
export const GOLD = { color: '#d8b15a', metalness: 1, roughness: 0.28 };
export const SILVER = { color: '#c9ced6', metalness: 0.95, roughness: 0.24 };
export const COPPER = { color: '#b9733d', metalness: 0.9, roughness: 0.34 };
export const GLASS = { color: '#0b1530', metalness: 1, roughness: 0.06 };
export const CERAMIC = { color: '#ece8de', metalness: 0, roughness: 0.62 };
export const WHITE_PAINT = { color: '#e9ecef', metalness: 0.05, roughness: 0.55 };
export const TITANIUM = { color: '#9aa1ab', metalness: 0.9, roughness: 0.35 };

/** A clickable part that can glow, with a label anchor. A drag to turn the model is not a click. */
export function PartGroup({ id, tone, anchor, onSelect, children, position, rotation }: { id: string; tone?: Glow; anchor: V3; onSelect?: (id: string) => void; children: ReactNode; position?: V3; rotation?: V3 }) {
    const ref = useRef<Group>(null);
    useLabelAnchor(id, ref, anchor);
    return (
        <group
            ref={ref}
            position={position}
            rotation={rotation}
            onClick={(e: ThreeEvent<MouseEvent>) => {
                if (!onSelect || e.delta > 6) return;
                e.stopPropagation();
                onSelect(id);
            }}
            onPointerOver={(e) => {
                if (!onSelect) return;
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                document.body.style.cursor = '';
            }}
        >
            <ToneContext.Provider value={tone ?? null}>{children}</ToneContext.Provider>
        </group>
    );
}

/** A label anchor with no geometry (for points such as a ground station or one array wing). */
export function Anchor({ id, at }: { id: string; at: V3 }) {
    const ref = useRef<Group>(null);
    useLabelAnchor(id, ref, [0, 0, 0]);
    return <group ref={ref} position={at} />;
}

/**
 * Energy as small particles moving along routes: each route is a chain of curves in travel order,
 * walked in proportion to their lengths.
 */
export function EnergyFlow({ routes, playing, count = 16, size = 0.42, speed = 0.38, color = ENERGY }: { routes: Curve<Vector3>[][]; playing: boolean; count?: number; size?: number; speed?: number; color?: string }) {
    const dots = useRef<(Mesh | null)[]>([]);
    const time = useRef(0);
    const lengths = useMemo(() => routes.map((chain) => {
        const l = chain.map((c) => c.getLength());
        const total = l.reduce((a, b) => a + b, 0);
        return { l, total };
    }), [routes]);
    const point = useMemo(() => new Vector3(), []);
    useFrame((_, delta) => {
        if (playing) time.current += Math.min(delta, 0.05) * speed;
        for (let i = 0; i < count; i++) {
            const m = dots.current[i];
            if (!m) continue;
            const r = i % routes.length;
            const chain = routes[r];
            const p = (time.current + i / count) % 1;
            let d = p * lengths[r].total;
            let k = 0;
            while (k < chain.length - 1 && d > lengths[r].l[k]) {
                d -= lengths[r].l[k];
                k++;
            }
            chain[k].getPoint(Math.min(1, d / lengths[r].l[k]), point);
            m.position.copy(point);
        }
    });
    return (
        <group>
            {Array.from({ length: count }, (_, i) => (
                <mesh
                    key={i}
                    ref={(el) => {
                        dots.current[i] = el;
                    }}
                >
                    <sphereGeometry args={[size, 10, 8]} />
                    <meshBasicMaterial color={color} toneMapped={false} />
                </mesh>
            ))}
        </group>
    );
}

/** One calm ring that marks an anomaly, pulsing gently unless motion is reduced. */
export function AnomalyMarker({ at, radius, reducedMotion, rot }: { at: V3; radius: number; reducedMotion: boolean; rot?: V3 }) {
    const ring = useRef<Mesh>(null);
    useFrame(({ clock }) => {
        if (reducedMotion || !ring.current) return;
        const p = (Math.sin(clock.elapsedTime * 3.9) + 1) / 2;
        ring.current.scale.setScalar(1 + 0.2 * p);
    });
    return (
        <mesh ref={ring} position={at} rotation={rot}>
            <torusGeometry args={[radius, radius * 0.045, 10, 48]} />
            <meshBasicMaterial color={GLOW.alert} transparent opacity={0.85} toneMapped={false} />
        </mesh>
    );
}
