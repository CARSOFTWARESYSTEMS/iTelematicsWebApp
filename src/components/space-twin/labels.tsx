"use client";
// Scene labels as ordinary DOM over the canvas (from the "Learn to Protect Missions" showcase).
// Parts register an anchor (an object and an offset); the overlay registers one element per label;
// a projector inside the canvas moves each element to its anchor's screen position on every drawn
// frame. No nested React roots, so labels mount and unmount freely. An optional occluding sphere
// (the Earth) hides labels on its far side.
import { createContext, useContext, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, type Camera, type Object3D } from 'three';

export class LabelRegistry {
    private anchors = new Map<string, { object: Object3D; offset: Vector3 }>();
    private nodes = new Map<string, HTMLElement>();
    private requestFrame: () => void = () => {};
    private readonly world = new Vector3();
    private readonly toPoint = new Vector3();
    private readonly toCentre = new Vector3();
    private occluder: { centre: Vector3; radius: number } | null = null;

    setAnchor(id: string, object: Object3D, offset: Vector3) {
        this.anchors.set(id, { object, offset });
        this.requestFrame();
    }

    removeAnchor(id: string, object: Object3D) {
        if (this.anchors.get(id)?.object === object) this.anchors.delete(id);
    }

    setNode(id: string, node: HTMLElement | null) {
        if (node) {
            node.style.visibility = 'hidden';
            this.nodes.set(id, node);
        } else this.nodes.delete(id);
    }

    setOccluder(occluder: { centre: Vector3; radius: number } | null) {
        this.occluder = occluder;
    }

    setFrameRequester(fn: () => void) {
        this.requestFrame = fn;
        fn();
    }

    refresh() {
        this.requestFrame();
    }

    private hidden(camera: Camera) {
        const o = this.occluder;
        if (!o) return false;
        // Ray from the camera to the label: hidden if it enters the sphere before reaching the label.
        this.toPoint.copy(this.world).sub(camera.position);
        const dist = this.toPoint.length();
        this.toPoint.divideScalar(dist);
        this.toCentre.copy(o.centre).sub(camera.position);
        const along = this.toCentre.dot(this.toPoint);
        if (along < 0) return false;
        const d2 = this.toCentre.lengthSq() - along * along;
        const r2 = o.radius * o.radius;
        if (d2 > r2) return false;
        return along - Math.sqrt(r2 - d2) < dist - 0.5;
    }

    project(camera: Camera, width: number, height: number) {
        for (const [id, node] of this.nodes) {
            const anchor = this.anchors.get(id);
            if (!anchor) {
                node.style.visibility = 'hidden';
                continue;
            }
            this.world.copy(anchor.offset);
            anchor.object.localToWorld(this.world);
            const occluded = this.hidden(camera);
            this.world.project(camera);
            node.style.visibility = this.world.z > 1 || occluded ? 'hidden' : 'visible';
            node.style.transform = `translate(${((this.world.x + 1) / 2) * width}px, ${((1 - this.world.y) / 2) * height}px) translate(-50%, -50%)`;
        }
    }
}

export const LabelContext = createContext<LabelRegistry | null>(null);

export function useLabelRegistry() {
    return useMemo(() => new LabelRegistry(), []);
}

/** Inside the canvas: register an object as a label anchor. */
export function useLabelAnchor(id: string | null, ref: React.RefObject<Object3D | null>, offset: readonly [number, number, number]) {
    const registry = useContext(LabelContext);
    const key = offset.join(',');
    useEffect(() => {
        const object = ref.current;
        if (!registry || !object || id === null) return;
        const [x, y, z] = key.split(',').map(Number);
        registry.setAnchor(id, object, new Vector3(x, y, z));
        return () => registry.removeAnchor(id, object);
    }, [registry, id, ref, key]);
}

/** Inside the canvas: projects every anchored label on each drawn frame. */
export function LabelProjector() {
    const registry = useContext(LabelContext);
    const { camera, size, invalidate } = useThree();
    useEffect(() => {
        registry?.setFrameRequester(invalidate);
    }, [registry, invalidate]);
    useFrame(() => registry?.project(camera, size.width, size.height));
    return null;
}

/** Outside the canvas: the label elements themselves. */
export function LabelOverlay({ labels, className, alertClassName }: { labels: { id: string; text: string; alert?: boolean }[]; className: string; alertClassName: string }) {
    const registry = useContext(LabelContext);
    useEffect(() => {
        registry?.refresh();
    }, [labels, registry]);
    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden="true">
            {labels.map((l) => (
                <span
                    key={l.id}
                    ref={(node) => registry?.setNode(l.id, node)}
                    className={`${className} ${l.alert ? alertClassName : ''}`}
                    style={{ position: 'absolute', left: 0, top: 0, willChange: 'transform' }}
                >
                    {l.text}
                </span>
            ))}
        </div>
    );
}
