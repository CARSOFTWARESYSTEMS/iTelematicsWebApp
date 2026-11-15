'use client';
// The Solar System experience's 3D scene and cinematic camera director. One mission clock drives
// everything: the segment playing chooses the scene (intro, pad/ascent, orbit, departure, deployment,
// Sun-centred) and the camera shot; mission time positions and configures the vehicle from the flight
// simulation. Within a scene, changing shot blends the camera over about a second; changing scene cuts.
//
// Frames: the pad/ascent scene is fixed to the ground at the launch site (x east, y up, z south);
// orbit, departure and deployment use the Earth-centred inertial frame of the simulation (the site at
// +y at liftoff); the Sun-centred view uses the ecliptic (y up) with orbits to scale.
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, FogExp2, Matrix4, Quaternion, Vector3, type Group, type HemisphereLight, type PerspectiveCamera, type PointLight } from 'three';
import { atmosphere } from '@/lib/solar-system/atmosphere';
import type { MissionClock } from '@/lib/solar-system/clock';
import { AU, OMEGA_EARTH, ORBIT_AU, R_EARTH } from '@/lib/solar-system/constants';
import { eventTime, flight, sampleAt, SEQUENCE } from '@/lib/solar-system/flight';
import { boomsAtMet, type Focus, type SceneId, type ShotId } from '@/lib/solar-system/mission';
import { elements } from '@/lib/solar-system/orbit';
import { attitudeAt } from '@/lib/solar-system/spacecraft';
import { VEHICLE } from '@/lib/solar-system/vehicle';
import { Globe } from './environment';
import { AtmosphereSky, SkyEnvironment } from './atmosphere';
import { Reflections } from '@/components/space-twin/environment';
import LaunchSite, { MOUNT_TOP, terrainHeight } from './LaunchSite';
import LaunchVehicle, { KickStage, STACK, type VehicleState } from './LaunchVehicle';
import SpacecraftModel from './Spacecraft';
import { HelioView, Marker, Path, Stars } from './views';
import { CruiseView, JupiterView, SaturnView, saturnCraft, toScene, TourView, tourDistance } from './PlanetViews';
import { tourPosition } from '@/lib/solar-system/phaseB';
import { dateOf } from '@/lib/solar-system/phaseB';
import { flybyPosition, missionTrajectory, planetAt, R_JUPITER, R_SATURN, spacecraftAt } from '@/lib/solar-system/trajectory';
import type { BodyId } from '@/lib/solar-system/bodies';
import { useLabelAnchor } from '@/components/space-twin/labels';

const Y = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);
/** Morning Sun at the site: east-south-east, 30° up (site frame = inertial frame at liftoff). */
export const SUN = new Vector3(0.814, 0.5, 0.296).normalize();
const SITE_LON_DEG = -61;

/** Earth model orientation placing the site (10° N) at +Y with east along +X and north along −Z. */
function siteOrientation(latDeg: number, lonDeg: number) {
    const f = (latDeg * Math.PI) / 180;
    const l = (lonDeg * Math.PI) / 180;
    const up = new Vector3(Math.cos(l) * Math.cos(f), Math.sin(f), -Math.sin(l) * Math.cos(f));
    const east = new Vector3(-Math.sin(l), 0, -Math.cos(l));
    const north = new Vector3().crossVectors(up, east);
    const local = new Matrix4().makeBasis(east, up, north);
    const world = new Matrix4().makeBasis(new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, -1));
    return new Quaternion().setFromRotationMatrix(world.multiply(local.transpose()));
}
const SITE_Q = siteOrientation(VEHICLE.siteLatitudeDeg, SITE_LON_DEG);

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/** Ease in and out with a gentler start, for long camera moves. */
const glide = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);
const DEG = Math.PI / 180;

/**
 * A pad camera placed by azimuth A (degrees from south towards west, around the vehicle axis),
 * horizontal distance d and height h, looking at height ty on the axis. The Sun is to the east-south-
 * east, so azimuths of 10–30° see the vehicle lit from the right with soft shade on the left.
 */
interface PadCam {
    A: number;
    d: number;
    h: number;
    ty: number;
    fov: number;
}
const padCam = (c: PadCam): Cam => ({ pos: v3(-c.d * Math.sin(c.A * DEG), c.h, c.d * Math.cos(c.A * DEG)), target: v3(0, c.ty, 0), fov: c.fov });
const mixCam = (a: PadCam, b: PadCam, k: number): PadCam => ({ A: a.A + (b.A - a.A) * k, d: a.d * Math.pow(b.d / a.d, k), h: a.h + (b.h - a.h) * k, ty: a.ty + (b.ty - a.ty) * k, fov: a.fov + (b.fov - a.fov) * k });

/** Key compositions of the pad (the vehicle and launch table are 69 m tall). */
const PAD = {
    establish: { A: 26, d: 320, h: 24, ty: 31, fov: 30 },
    establishEnd: { A: 23, d: 305, h: 24, ty: 32, fov: 30 },
    reveal: { A: 38, d: 118, h: 30, ty: 39, fov: 34 },
    payloadId: { A: 2, d: 36, h: 64, ty: 62.5, fov: 36 },
    full: { A: 18, d: 235, h: 10, ty: 34, fov: 30 },
    fullEnd: { A: 15, d: 228, h: 10, ty: 34, fov: 30 },
    fairing: { A: 0, d: 31, h: 63, ty: 62.5, fov: 40 },
    payload: { A: 4, d: 21, h: 61.5, ty: 60.2, fov: 40 },
    payloadEnd: { A: 14, d: 18.5, h: 61, ty: 59.8, fov: 40 },
} satisfies Record<string, PadCam>;

interface Frame {
    scene: SceneId;
    shot: ShotId;
    focus?: Focus;
    progress: number;
    met: number;
    /** Viewport width / height. */
    aspect: number;
    /** Phase B: discovery destination and the floating origin (scene metres) of the view. */
    body?: BodyId;
    origin: Vector3;
    /** Vehicle base and axis in the scene's frame. */
    P: Vector3;
    A: Vector3;
    S: Vector3;
    O: Vector3;
    altitude: number;
}

interface Cam {
    pos: Vector3;
    target: Vector3;
    fov: number;
    up?: Vector3;
}

/** Hardstand deck height (LaunchSite.DECK). */
const DECK_Y = 3;

/**
 * A pad composition adjusted to the viewport: on narrow (portrait) views the camera backs off so the
 * whole vehicle still fits with a margin; wide views keep the composition as designed.
 */
function fitPad(c: PadCam, aspect: number): PadCam {
    if (aspect >= 1.2) return c;
    return { ...c, d: c.d * (1 + (1.2 - Math.max(0.55, aspect)) * 0.35) };
}

const fit = (pos: Vector3, target: Vector3, size: number, max: number) => Math.min(max, Math.max(0.6, (2 * Math.atan(size / pos.distanceTo(target)) * 180) / Math.PI));

/** The camera programme for each shot. */
function shotCamera(f: Frame): Cam {
    const { P, A, S, O, progress: p } = f;
    const at = (a: number, s: number, o: number) => P.clone().addScaledVector(A, a).addScaledVector(S, s).addScaledVector(O, o);
    const ring = (r: number, angle: number, y: number) => v3(r * Math.cos(angle), MOUNT_TOP + y, r * Math.sin(angle));
    const R = R_EARTH;
    switch (f.shot) {
        case 'earthApproach': {
            const k = smooth(p);
            return {
                pos: v3(0.55 * R, 2.9 * R, 2.3 * R).lerp(v3(0.06 * R, 1.36 * R, 0.3 * R), k),
                target: v3(0, 0.55 * R, 0).lerp(v3(0, R, 0), k),
                fov: 36 - 6 * k,
            };
        }
        // ── Opening: one continuous documentary move (each shot starts where the last ended) ──
        case 'establish':
            return padCam(mixCam(fitPad(PAD.establish, f.aspect), fitPad(PAD.establishEnd, f.aspect), p));
        case 'reveal':
            return padCam(mixCam(fitPad(PAD.establishEnd, f.aspect), PAD.reveal, glide(p)));
        case 'payloadId':
            return padCam(mixCam(PAD.reveal, PAD.payloadId, glide(p)));
        case 'fullVehicle':
            return padCam(mixCam(PAD.payloadId, fitPad(PAD.full, f.aspect), glide(p)));
        case 'ready':
            return padCam(mixCam(fitPad(PAD.full, f.aspect), fitPad(PAD.fullEnd, f.aspect), p));
        // ── Explore Spacecraft Payload: approach, open the fairing, name the parts, return ──
        case 'payloadApproach':
            return padCam(mixCam(fitPad(PAD.full, f.aspect), PAD.fairing, glide(p)));
        case 'payloadCut':
            return padCam(mixCam(PAD.fairing, PAD.payload, glide(p)));
        case 'payloadHold':
            return padCam(mixCam(PAD.payload, PAD.payloadEnd, p));
        case 'payloadReturn':
            return padCam(mixCam(PAD.payloadEnd, fitPad(PAD.full, f.aspect), glide(p)));
        case 'padReveal':
            return padCam(fitPad(PAD.full, f.aspect));
        case 'padWide':
            return padCam(mixCam(fitPad({ A: 12, d: 210, h: 8, ty: 34, fov: 32 }, f.aspect), fitPad({ A: 16, d: 200, h: 9, ty: 34, fov: 32 }, f.aspect), p));
        case 'padTour': {
            // Up the vehicle from the engine section to the fairing, on the sunlit side.
            const k = smooth(p);
            const h = MOUNT_TOP + 2 + 55 * k;
            return padCam({ A: 6 + 30 * p, d: 34, h, ty: h - 1, fov: 42 });
        }
        case 'engines':
            // On the deck under the launch table, looking up at the two nozzles in the exhaust opening.
            return { pos: v3(6.8 - 0.6 * p, DECK_Y + 1.6, 3.4 + 1.2 * p), target: v3(0, MOUNT_TOP - 1.2, 0), fov: 52 };
        case 'stage1':
            return padCam({ A: 18 + 6 * p, d: 52, h: 24, ty: 25, fov: 42 });
        case 'upper':
            return padCam({ A: 10 + 10 * p, d: 19, h: 47, ty: 45.5, fov: 46 });
        case 'tanks':
            return padCam({ A: 14 + 6 * p, d: 48, h: 24, ty: 24, fov: 44 });
        case 'fairingOpen':
            return { pos: ring(15, 0.8 + 0.2 * p, 58), target: v3(0, MOUNT_TOP + 53, 0), fov: 44 };
        case 'payload':
            return { pos: ring(6.5, 0.8 + 0.25 * p, 53), target: v3(0, MOUNT_TOP + 51.5, 0), fov: 48 };
        case 'liftoff': {
            // A remote camera at the perimeter road, low, looking up as the vehicle clears the tower.
            const pos = v3(70, terrainHeight(70, 262) + 2.5, 262);
            const target = at(26, 0, 0);
            return { pos, target, fov: fit(pos, target, 64, 34) };
        }
        case 'engineClose':
            // Low and close on the sunlit side: the engine section, the launch table and the steam, with
            // the igniter flash and the exhaust visible under the table, and the trench exit behind.
            return padCam({ A: 4 + 5 * p, d: 56, h: 7, ty: 15 + Math.max(0, f.P.y - MOUNT_TOP) * 0.8, fov: 34 });
        case 'track': {
            // A long-lens tracking camera 2.7 km from the pad, as in launch coverage: the vehicle and its
            // plume fill a good part of the frame.
            const pos = v3(-700, 14, 2600);
            const target = at(10, 0, 0);
            return { pos, target, fov: fit(pos, target, 70, 30) };
        }
        case 'chase': {
            // Beside the first stage, framing the engines, the plume and most of the body.
            const a = 0.3 * p;
            return { pos: at(6, 72 * Math.cos(a), -22 - 26 * Math.sin(a)), target: at(10, 0, 0), fov: 42 };
        }
        case 'onboard':
            // Mounted on the sunlit side of the interstage, looking back along the stage at the plume and the Earth.
            // Mounted on the forward end of the first stage, 1.5 m off its side, looking aft down the stage:
            // the body runs along one side of the frame, the plume and the Earth below.
            return { pos: at(31, 3.4, -0.8), target: at(-40, 2.6, 16), fov: 74, up: O.clone().negate() };
        case 'high':
            // Beside and above the vehicle, looking ahead and down: the vehicle, its plume and the curving Earth.
            return { pos: at(-35, 110, -45), target: at(30, 0, 25), fov: 48 };
        case 'staging':
            // Ahead of the separation plane and to the side, looking back at the gap opening.
            // Wide enough for both stages as the gap opens, then following the upper stage.
            return { pos: at(44 - 2 * p, 52, -16), target: at(30 + 6 * smooth(p), 0, 0), fov: 46 };
        case 'fairingSep':
            return { pos: at(52, 34, -12), target: at(52, 0, 0), fov: 48 };
        case 'insertion':
            // Behind and above, looking along the orbit: the vehicle against the Earth and the horizon ahead.
            return { pos: at(-75, 35, -40), target: at(70, 0, 20), fov: 50 };
        case 'orbitWide': {
            const a = 0.25 * p;
            return { pos: v3(-1.1 * R, 1.9 * R, 2.6 * R).applyAxisAngle(Y, a), target: v3(0.1 * R, 0.25 * R, 0), fov: 40 };
        }
        case 'departureWide': {
            // The Earth stays in frame while the escape path lengthens: the view widens with the distance flown.
            const reach = Math.max(3.4 * R, P.length() * 0.95);
            const target = P.clone().multiplyScalar(0.38);
            return {
                pos: target.clone().add(
                    v3(0.55, 0.45, 1)
                        .normalize()
                        .multiplyScalar(reach * 1.25),
                ),
                target,
                fov: 42,
            };
        }
        case 'burnChase':
            return { pos: at(28, 32, -12), target: at(44, 0, 0), fov: 44 };
        case 'kick':
            return { pos: at(44, 15, -5), target: at(50, 0, 0), fov: 46 };
        case 'sepClose':
            return { pos: at(2.2, 6.5, -5), target: at(1, 0, 0), fov: 40 };
        case 'deployWide':
            return { pos: at(3.5, 8.5, -6.5), target: at(1, 0, -0.6), fov: 44 };
        case 'eps':
            // The generator side (−X of the spacecraft = −O here): the RTG boom, the bus and the power path.
            return { pos: at(2.6, 4.2, -5.2), target: at(0.7, 0.2, -1.9), fov: 46 };
        case 'antenna':
            return { pos: at(-4.5, 6, 6.5), target: at(1.8, 0, 0), fov: 42 };
        case 'computer':
            return { pos: at(1.6, 2.8, 2.2), target: at(0.9, 0, 0), fov: 48 };
        // ── Phase B: cruise (Sun-centred) ──
        case 'cruiseDepart': {
            const m = missionTrajectory();
            const e = toScene(planetAt('earth', m.launch));
            const j = toScene(planetAt('jupiter', m.jupiter));
            const target = e
                .clone()
                .multiplyScalar(0.55)
                .lerp(j, 0.12 + 0.08 * p);
            const away = e.clone().normalize();
            return {
                pos: target
                    .clone()
                    .addScaledVector(away, 1.6 * AU)
                    .add(v3(0, 1.9 * AU + 0.4 * AU * p, 0)),
                target,
                fov: 42,
            };
        }
        case 'cruiseWide': {
            const m = missionTrajectory();
            const mid = toScene(planetAt('earth', m.launch)).lerp(toScene(planetAt('jupiter', m.jupiter)), 0.5);
            const off = v3(0.6 * AU, 7.8 * AU, 6.2 * AU).applyAxisAngle(Y, -0.2 + 0.25 * p);
            return { pos: mid.clone().add(off), target: mid, fov: 40 };
        }
        case 'cruiseFollow': {
            const m = missionTrajectory();
            const s = toScene(spacecraftAt(dateOf(f.met)).r);
            const j = toScene(planetAt('jupiter', m.jupiter));
            const dir = j.clone().sub(s).normalize();
            return {
                pos: s
                    .clone()
                    .addScaledVector(dir, -1.1 * AU)
                    .add(v3(0, 0.55 * AU, 0)),
                target: j.clone().lerp(s, 0.25),
                fov: 40,
            };
        }
        case 'cruiseOuter': {
            const m = missionTrajectory();
            const mid = toScene(planetAt('jupiter', m.jupiter))
                .lerp(toScene(planetAt('saturn', m.saturn)), 0.5)
                .multiplyScalar(0.8);
            const off = v3(1.5 * AU, 15 * AU, 11 * AU).applyAxisAngle(Y, -0.3 + 0.2 * p);
            return { pos: mid.clone().add(off), target: mid, fov: 40 };
        }
        // ── Phase B: Jupiter encounter (Jupiter-centred, to scale) ──
        case 'jupiterApproach':
        case 'jupiterClose': {
            const m = missionTrajectory();
            const c = toScene(flybyPosition((dateOf(f.met) - m.jupiter) * 86400));
            const back = c.clone().normalize();
            const side = Y.clone().cross(back).normalize();
            const close = f.shot === 'jupiterClose';
            // Behind and beside the spacecraft, looking at Jupiter: RSC-1 in the foreground, Jupiter beyond.
            const pos = c
                .clone()
                .addScaledVector(back, close ? 15 : 24)
                .addScaledVector(side, close ? -7 : -4)
                .add(v3(0, close ? 3.5 : 6.5, 0));
            const target = close ? c.clone().multiplyScalar(0.35) : v3(0, 0, 0);
            return { pos, target, fov: close ? 56 : 46 };
        }
        case 'jupiterWide': {
            const R = R_JUPITER;
            return { pos: v3(18 * R, 62 * R, 46 * R).applyAxisAngle(Y, 0.6 + 0.3 * p), target: v3(0, 0, 0), fov: 42 };
        }
        // ── Phase B: Saturn (Saturn-centred) ──
        case 'saturnClose': {
            const c = saturnCraft(p);
            const back = c.clone().normalize();
            const side = Y.clone().cross(back).normalize();
            return {
                pos: c
                    .clone()
                    .addScaledVector(back, 26 - 6 * p)
                    .addScaledVector(side, -10)
                    .add(v3(0, 5, 0)),
                target: v3(0, -0.15 * R_SATURN, 0),
                fov: 50,
            };
        }
        // ── Phase B: Discovery tour (floating origin at the destination) ──
        case 'tourOverview': {
            return {
                pos: v3(6 * AU, 30 * AU, 40 * AU)
                    .applyAxisAngle(Y, 0.2 * p)
                    .sub(f.origin),
                target: f.origin.clone().negate(),
                fov: 40,
            };
        }
        case 'tourTravel':
        case 'tourBody': {
            const id = f.body ?? 'saturn';
            const sunDir = f.origin.clone().negate().normalize(); // towards the Sun from the destination
            const side = Y.clone().cross(sunDir).normalize();
            const d = tourDistance(id);
            // Three-quarter lit: between the Sun direction and the side, a little above the orbit plane.
            const near = sunDir
                .clone()
                .multiplyScalar(0.55)
                .addScaledVector(side, 0.8)
                .add(v3(0, 0.22, 0))
                .normalize()
                .multiplyScalar(d);
            if (id === 'sun') near.copy(v3(0.3, 0.25, 1).normalize().multiplyScalar(d));
            if (f.shot === 'tourBody') return { pos: near.clone().applyAxisAngle(Y, 0.35 * p), target: v3(0, 0, 0), fov: 40 };
            // Travel: from the overview to the destination along a logarithmic approach.
            const from = v3(6 * AU, 30 * AU, 40 * AU).sub(f.origin);
            const k = glide(p);
            const dist = Math.exp(Math.log(from.length()) * (1 - k) + Math.log(d) * k);
            const dir = from
                .clone()
                .normalize()
                .lerp(near.clone().normalize(), smooth(p * 1.2))
                .normalize();
            return {
                pos: dir.multiplyScalar(dist),
                target: f.origin
                    .clone()
                    .negate()
                    .lerp(v3(0, 0, 0), smooth(p * 3)),
                fov: 40,
            };
        }
        case 'helio': {
            const k = smooth(p);
            const earth = v3(ORBIT_AU.earth * AU, 0, 0);
            return {
                pos: earth
                    .clone()
                    .add(v3(0.12 * AU, 0.35 * AU, 0.55 * AU))
                    .lerp(v3(-0.6 * AU, 6.8 * AU, 6.4 * AU), k),
                target: earth.clone().lerp(v3(-1.6 * AU, 0, 0), k),
                fov: 40,
            };
        }
    }
}

/** Attitude (degrees above local horizontal) for drawing: thrust direction, held through short coasts. */
const attitude = (() => {
    let cache: number[] | null = null;
    return () => {
        if (cache) return cache;
        const s = flight().samples;
        let last = 90;
        cache = s.map((x) => {
            if (Number.isFinite(x.pitchDeg)) last = x.pitchDeg;
            else if (x.phase !== 'staging' && x.phase !== 'ignition') last = x.flightPathDeg;
            return last;
        });
        return cache;
    };
})();

function attitudeAtMet(met: number) {
    const s = flight().samples;
    let lo = 0;
    let hi = s.length - 1;
    if (met <= s[0].t) return 90;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (s[mid].t <= met) lo = mid;
        else hi = mid;
    }
    return attitude()[lo];
}

let events: ReturnType<typeof readEvents> | null = null;
const EV = () => (events ??= readEvents());
function readEvents() {
    const f = flight();
    return {
        sep: eventTime('stageSep', f),
        usIgn: eventTime('usIgnition', f),
        fair: eventTime('fairingSep', f),
        kickSep: eventTime('kickSep', f),
        kickIgn: eventTime('kickIgnition', f),
        scSep: eventTime('scSep', f),
        seco1: eventTime('seco1', f),
        restart: eventTime('usRestart', f),
    };
}

/**
 * Engineering cutaway for the pad topic views: which part is opened and how far. The fairing opens
 * during the payload sequence (and closes again on the way back); the interstage and tank walls open
 * at the start of their topic views. Chapters never cut anything away.
 */
function cutFor(shot: ShotId, progress: number, focus: Focus | undefined, met: number): { part: VehicleState['cut']['part']; amount: number } {
    if (met > -3) return { part: null, amount: 0 };
    if (shot === 'payloadCut') return { part: 'fairing', amount: smooth(progress) };
    if (shot === 'payloadHold') return { part: 'fairing', amount: 1 };
    if (shot === 'payloadReturn') return { part: 'fairing', amount: 1 - smooth(progress * 1.8) };
    if (focus === 'upper' && shot === 'upper') return { part: 'interstage', amount: smooth(progress * 4) };
    if (focus === 'tanks' && shot === 'tanks') return { part: 'tanks', amount: smooth(progress * 4) };
    return { part: null, amount: 0 };
}

/** Configures the shared vehicle state from mission time. */
function updateVehicle(state: VehicleState, met: number, focus: Focus | undefined, shot: ShotId, time: number, progress: number) {
    const e = EV();
    const s = sampleAt(met);
    state.time = time;
    state.focus = focus;
    const cut = cutFor(shot, progress, focus, met);
    state.cut.part = cut.part;
    state.cut.amount = cut.amount;
    // The green flash of the TEA–TEB igniter as the first-stage engines start.
    state.igniter = Math.max(0, 1 - Math.abs(met + 2.7) / 0.4);
    // Liquid-oxygen frost: full on the pad, shedding in the first 25 s of flight.
    state.frost = met < 0 ? 1 : Math.max(0, 1 - met / 25);
    state.firing1 = s.phase === 'ignition' || s.phase === 'stage1' ? s.throttle : 0;
    state.firing2 = (s.phase === 'stage2' || s.phase === 'departure') && s.thrust > 0;
    state.firingKick = s.phase === 'kick';
    state.pressure = atmosphere(Math.max(0, s.altitude)).pressure / 101325;
    const aUs = 7.4;
    state.stage1Away = met >= e.sep ? 1.5 * (met - e.sep) + (met > e.usIgn ? 0.5 * aUs * (met - e.usIgn) ** 2 : 0) : null;
    state.stage1Tumble = met >= e.sep ? 0.035 * (met - e.sep) : 0;
    state.fairingOpen = met >= e.fair ? Math.min(1, (met - e.fair) / 2.5) : 0;
    const tf = met - e.fair - 1.5;
    state.fairingAway = tf > 0 ? 2 * tf + 0.5 * aUs * tf * tf : 0;
    state.fairingAttached = met < e.fair + 1.5;
    const aKick = 40;
    state.upperAway = met >= e.kickSep ? 0.6 * (met - e.kickSep) + (met >= e.kickIgn ? 0.5 * aKick * (met - e.kickIgn) ** 2 : 0) : null;
    state.spin = met >= e.kickSep + 10 && met < e.scSep ? (met - e.kickSep - 10) * 0.6 : 0;
    state.booms = boomsAtMet(met);
}

export default function SolarScene({ clock, quality, reducedMotion, focusOverride, shift = 0, shiftY = 0 }: { clock: MissionClock; quality: 'high' | 'low'; reducedMotion: boolean; focusOverride?: Focus; shift?: number; shiftY?: number }) {
    const camera = useThree((s) => s.camera) as PerspectiveCamera;
    const [payloadLabels, setPayloadLabels] = useState(false);
    const shiftNow = useRef(shift);
    const shiftYNow = useRef(shiftY);
    const size = useThree((s) => s.size);
    const state = useRef<VehicleState>({
        firing1: 0,
        igniter: 0,
        firing2: false,
        firingKick: false,
        pressure: 1,
        stage1Away: null,
        stage1Tumble: 0,
        fairingOpen: 0,
        fairingAway: 0,
        fairingAttached: true,
        upperAway: null,
        spin: 0,
        cut: { part: null, amount: 0, azimuth: 0 },
        frost: 1,
        booms: { rtgBoom: 0, magnetometerBoom: 0, scienceBoom: 0 },
        time: 0,
    });
    const frame = useRef<Frame>({ scene: 'pad', shot: 'establish', progress: 0, met: -90, aspect: 16 / 9, origin: new Vector3(), P: new Vector3(), A: Y.clone(), S: Z.clone(), O: new Vector3(1, 0, 0), altitude: 0 });
    const sceneRef = useRef<SceneId>('intro');
    const [, force] = useForce();
    const blend = useRef<{ from: ShotId | null; t: number }>({ from: null, t: 1 });
    const lastShot = useRef<ShotId | null>(null);
    const sun = useRef(SUN.clone());
    const gl = useThree((s) => s.gl);
    const invalidate = useThree((s) => s.invalidate);
    // Drag to turn, pinch or Ctrl/⌘ + scroll to zoom, as in the other Space Digital Twin experiences.
    const user = useRef({ yaw: 0, pitch: 0, zoom: 1, tYaw: 0, tPitch: 0, tZoom: 1, last: -1e9 });
    useEffect(() => {
        const el = gl.domElement;
        el.style.touchAction = 'pan-y';
        el.style.cursor = 'grab';
        const pts = new Map<number, { x: number; y: number; type: string }>();
        let pinch = 0;
        const u = user.current;
        const down = (e: PointerEvent) => {
            pts.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
            el.setPointerCapture?.(e.pointerId);
            if (pts.size === 2) {
                const [a, b] = [...pts.values()];
                pinch = Math.hypot(a.x - b.x, a.y - b.y);
            }
            el.style.cursor = 'grabbing';
        };
        const move = (e: PointerEvent) => {
            const p = pts.get(e.pointerId);
            if (!p) return;
            const dx = e.clientX - p.x;
            const dy = e.clientY - p.y;
            p.x = e.clientX;
            p.y = e.clientY;
            if (pts.size === 2) {
                const [a, b] = [...pts.values()];
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                if (pinch > 0) u.tZoom = Math.min(4, Math.max(0.3, (u.tZoom * pinch) / d));
                pinch = d;
            } else {
                u.tYaw -= dx * 0.006;
                // Mouse and pen also tilt; one finger only turns, so vertical swipes still scroll the page.
                if (p.type !== 'touch') u.tPitch = Math.min(1.1, Math.max(-1.1, u.tPitch + dy * 0.005));
            }
            u.last = performance.now();
            invalidate();
        };
        const up = (e: PointerEvent) => {
            pts.delete(e.pointerId);
            pinch = 0;
            el.style.cursor = 'grab';
            u.last = performance.now();
        };
        const wheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return; // a plain wheel scrolls the page
            e.preventDefault();
            u.tZoom = Math.min(4, Math.max(0.3, u.tZoom * Math.exp(e.deltaY * 0.004)));
            u.last = performance.now();
            invalidate();
        };
        el.addEventListener('pointerdown', down);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener('wheel', wheel, { passive: false });
        return () => {
            el.removeEventListener('pointerdown', down);
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerup', up);
            el.removeEventListener('pointercancel', up);
            el.removeEventListener('wheel', wheel);
        };
    }, [gl, invalidate]);
    // A new chapter or label starts from its guided view.
    useEffect(() => {
        Object.assign(user.current, { yaw: 0, pitch: 0, zoom: 1, tYaw: 0, tPitch: 0, tZoom: 1, last: -1e9 });
    }, [clock]);

    useFrame((_, delta) => {
        const loc = clock.location;
        const seg = loc.segment;
        const met = loc.met;
        const f = frame.current;
        f.scene = seg.scene;
        f.shot = seg.shot;
        // Highlights and cutaways belong to the action labels; chapters play as plain cinematography.
        f.focus = focusOverride;
        f.progress = loc.progress;
        f.met = met;
        f.aspect = camera.aspect;
        f.body = seg.body;
        // Floating origin for the Discovery tour: the destination sits at the scene origin.
        if (seg.scene === 'tour' && seg.shot !== 'tourOverview' && seg.body) toScene(tourPosition(seg.body), f.origin);
        else f.origin.set(0, 0, 0);
        updateVehicle(state.current, met, f.focus, seg.shot, clock.time, loc.progress);
        // Part names appear while the payload cutaway is open.
        const named = seg.shot === 'payloadHold' || (seg.shot === 'payloadCut' && loc.progress > 0.75);
        if (named !== payloadLabels) setPayloadLabels(named);

        // Vehicle base and axis in the scene's frame.
        const s = sampleAt(met);
        if (seg.scene === 'pad' || seg.scene === 'ascent') {
            const th = s.downrange / R_EARTH;
            const r = R_EARTH + Math.max(0, s.altitude);
            f.P.set(r * Math.sin(th), r * Math.cos(th) - R_EARTH + MOUNT_TOP, 0);
            const up = v3(Math.sin(th), Math.cos(th), 0);
            const east = v3(Math.cos(th), -Math.sin(th), 0);
            const pitch = (attitudeAtMet(met) * Math.PI) / 180;
            f.A.copy(east.multiplyScalar(Math.cos(pitch)).addScaledVector(up, Math.sin(pitch))).normalize();
            f.altitude = Math.max(0, s.altitude);
        } else if (seg.scene === 'orbit' || seg.scene === 'departure' || seg.scene === 'deploy') {
            f.P.set(s.x, s.y, 0);
            f.A.set(s.vx, s.vy, 0).normalize();
            f.altitude = s.altitude;
        } else {
            f.P.set(0, 0, 0);
            f.A.copy(Y);
            f.altitude = 1e9;
        }
        f.S.copy(Z);
        f.O.crossVectors(f.A, f.S).normalize();

        // Camera: blend between shots within a scene, cut between scenes.
        if (sceneRef.current !== seg.scene) {
            sceneRef.current = seg.scene;
            blend.current = { from: null, t: 1 };
            lastShot.current = seg.shot;
            force();
        } else if (lastShot.current !== seg.shot) {
            blend.current = { from: lastShot.current, t: 0 };
            lastShot.current = seg.shot;
        }
        const cam = shotCamera(f);
        const b = blend.current;
        if (b.from && b.t < 1) {
            b.t = reducedMotion ? 1 : Math.min(1, b.t + delta / 1.2);
            const prev = shotCamera({ ...f, shot: b.from, progress: 1 });
            const k = smooth(b.t);
            cam.pos = prev.pos.lerp(cam.pos, k);
            cam.target = prev.target.lerp(cam.target, k);
            cam.fov = prev.fov + (cam.fov - prev.fov) * k;
        }
        // The visitor's drag and zoom, applied around the guided shot and easing back after a pause.
        const u = user.current;
        const idle = performance.now() - u.last > 5000;
        if (idle) {
            u.tYaw *= 0.94;
            u.tPitch *= 0.94;
            u.tZoom = 1 + (u.tZoom - 1) * 0.94;
        }
        const ease = Math.min(1, delta * 8);
        u.yaw += (u.tYaw - u.yaw) * ease;
        u.pitch += (u.tPitch - u.pitch) * ease;
        u.zoom += (u.tZoom - u.zoom) * ease;
        if (Math.abs(u.yaw) + Math.abs(u.pitch) + Math.abs(u.zoom - 1) > 1e-4) {
            const up = cam.up ?? (seg.scene === 'pad' || seg.scene === 'ascent' ? v3(cam.target.x, cam.target.y + R_EARTH, cam.target.z).normalize() : Y);
            const off = cam.pos.clone().sub(cam.target);
            off.applyAxisAngle(up, u.yaw);
            const right = new Vector3().crossVectors(off, up).normalize();
            if (right.lengthSq() > 0) off.applyAxisAngle(right, u.pitch);
            cam.pos = cam.target.clone().add(off.multiplyScalar(u.zoom));
            if (!idle || Math.abs(u.yaw) > 1e-3 || Math.abs(u.zoom - 1) > 1e-3) invalidate();
        }
        camera.position.copy(cam.pos);
        if (cam.up) camera.up.copy(cam.up);
        else if (seg.scene === 'pad' || seg.scene === 'ascent') camera.up.copy(v3(cam.pos.x, cam.pos.y + R_EARTH, cam.pos.z).normalize());
        else camera.up.copy(Y);
        camera.lookAt(cam.target);
        if (Math.abs(camera.fov - cam.fov) > 1e-3) {
            camera.fov = cam.fov;
        }
        // The cutaway opens towards the camera (azimuth about the vehicle axis, vehicle frame on the pad).
        state.current.cut.azimuth = Math.atan2(camera.position.x - f.P.x, camera.position.z - f.P.z);
        // Composition: on wide layouts the hardware sits right of centre, clear of the overlay card; on
        // phones the opening title sits low, so the vehicle is framed higher. A view offset pans the
        // image without turning the camera.
        shiftNow.current += (shift - shiftNow.current) * Math.min(1, delta * 3);
        shiftYNow.current += (shiftY - shiftYNow.current) * Math.min(1, delta * 3);
        const sx = shiftNow.current;
        const sy = shiftYNow.current;
        if (Math.abs(sx) + Math.abs(sy) > 1e-4) camera.setViewOffset(size.width, size.height, -sx * size.width, sy * size.height, size.width, size.height);
        else if (camera.view?.enabled) camera.clearViewOffset();
        const dist = cam.pos.distanceTo(cam.target);
        // Near plane: the spacecraft can be metres from the camera while a planet is a million km away.
        camera.near =
            seg.scene === 'jupiter' || seg.scene === 'saturn' ? (seg.shot === 'jupiterWide' ? 1e5 : 0.5) : seg.scene === 'cruise' ? 1e7 : seg.scene === 'tour' ? Math.max(1, cam.pos.length() * 1e-4) : seg.scene === 'helio' ? 1e6 : Math.max(0.05, dist * 0.002);
        camera.far = seg.scene === 'helio' || seg.scene === 'cruise' || seg.scene === 'tour' ? 1e15 : seg.scene === 'jupiter' || seg.scene === 'saturn' ? 1e13 : 1e10;
        camera.updateProjectionMatrix();
        if (process.env.NODE_ENV !== 'production') (window as Window & { __solarCam?: unknown }).__solarCam = { shot: seg.shot, scene: seg.scene, met, pos: camera.position.toArray(), target: cam.target.toArray(), fov: camera.fov, P: f.P.toArray() };
    });

    const scene = sceneRef.current;
    const met = () => frame.current.met;
    const P = () => frame.current.P;

    // Camera altitude for sky, ground and globe cross-fades (pad/ascent scene).
    const camAltitude = () => camera.position.distanceTo(v3(0, -R_EARTH, 0)) - R_EARTH;
    const groundOpacity = () => 1 - smooth((camAltitude() - 16000) / 16000);
    const globeOpacity = () => smooth((camAltitude() - 8000) / 12000);
    // Camera position for the sky: metres from the Earth's centre, at the camera's true altitude.
    const skyOrigin = () => {
        const d = v3(camera.position.x, camera.position.y + R_EARTH, camera.position.z);
        const alt = d.length() - R_EARTH;
        return d.normalize().multiplyScalar(6.371e6 + Math.max(1, alt));
    };

    return (
        <>
            {scene === 'intro' && <IntroView sun={sun} />}
            {(scene === 'pad' || scene === 'ascent') && (
                <group>
                    <AtmosphereSky origin={skyOrigin} sun={SUN} quality={quality} />
                    <Haze altitude={camAltitude} />
                    <Stars count={quality === 'high' ? 2200 : 1100} brightness={() => smooth((camAltitude() - 40000) / 40000)} />
                    <SkyEnvironment sun={SUN} />
                    <directionalLight
                        position={[SUN.x * 400, SUN.y * 400, SUN.z * 400]}
                        intensity={3.8}
                        color="#fff5e8"
                        castShadow={quality === 'high'}
                        shadow-mapSize={[2048, 2048]}
                        shadow-camera-left={-120}
                        shadow-camera-right={120}
                        shadow-camera-top={120}
                        shadow-camera-bottom={-120}
                        shadow-camera-near={10}
                        shadow-camera-far={1000}
                    />
                    <HemiByAltitude altitude={camAltitude} />
                    <Globe radius={R_EARTH} position={[0, -R_EARTH - 40, 0]} orientation={SITE_Q} sun={sun} opacity={globeOpacity} />
                    <LaunchSite met={met} head={P} groundOpacity={groundOpacity} quality={quality} />
                    <VehicleAt P={P} A={() => frame.current.A}>
                        <LaunchVehicle state={state} payloadLabels={payloadLabels} />
                    </VehicleAt>
                    <EngineLight state={state} P={P} />
                </group>
            )}
            {(scene === 'orbit' || scene === 'departure') && <InertialView frame={frame} state={state} sun={sun} quality={quality} />}
            {scene === 'deploy' && <DeployView frame={frame} state={state} sun={sun} quality={quality} />}
            {scene === 'helio' && (
                <>
                    <Stars count={quality === 'high' ? 2600 : 1200} brightness={() => 1} />
                    <HelioView sunLight />
                </>
            )}
            {scene === 'cruise' && <CruiseView met={met} />}
            {scene === 'jupiter' && <JupiterView met={met} />}
            {scene === 'saturn' && <SaturnView progress={() => frame.current.progress} />}
            {scene === 'tour' && <TourView dest={() => (frame.current.shot === 'tourOverview' ? undefined : frame.current.body)} origin={() => frame.current.origin} sunLit={() => frame.current.origin.clone().negate().normalize()} />}
        </>
    );
}

/** Re-renders the scene when the playing segment switches to another scene. */
function useForce() {
    const [n, set] = useState(0);
    return [n, () => set((x) => x + 1)] as const;
}

/** Aerial perspective: haze over the ground that thins with the camera's altitude. */
function Haze({ altitude }: { altitude: () => number }) {
    const fog = useMemo(() => new FogExp2(new Color('#b3c5d9'), 3.2e-5), []);
    const scene = useThree((s) => s.scene);
    useEffect(() => {
        const before = scene.fog;
        scene.fog = fog;
        return () => {
            scene.fog = before;
        };
    }, [scene, fog]);
    useFrame(() => {
        fog.density = 3.2e-5 * Math.exp(-altitude() / 7000);
    });
    return null;
}

/** Daylight sky and ground light near the surface, turning into earthshine from below in space. */
function HemiByAltitude({ altitude }: { altitude: () => number }) {
    const ref = useRef<HemisphereLight>(null);
    const daySky = useMemo(() => new Color('#a9c8ec'), []);
    const dayGround = useMemo(() => new Color('#6d6250'), []);
    const spaceSky = useMemo(() => new Color('#0a0f1c'), []);
    const earthshine = useMemo(() => new Color('#6f93c9'), []);
    useFrame(() => {
        const l = ref.current;
        if (!l) return;
        const k = smooth((altitude() - 10000) / 40000);
        l.color.copy(daySky).lerp(spaceSky, k);
        l.groundColor.copy(dayGround).lerp(earthshine, k);
        l.intensity = 0.95 - 0.35 * k;
    });
    return <hemisphereLight ref={ref} args={['#a9c8ec', '#6d6250', 0.95]} />;
}

/** In space: earthshine from the Earth's direction (below the vehicle), a little sky from above. */
function Earthshine({ position, intensity = 0.6 }: { position: () => Vector3; intensity?: number }) {
    const ref = useRef<HemisphereLight>(null);
    useFrame(() => {
        if (ref.current) ref.current.position.copy(position()).normalize();
    });
    return <hemisphereLight ref={ref} args={['#141b2e', '#6f93c9', intensity]} />;
}

/** Places its children at the vehicle base, aligned with the vehicle axis. */
function VehicleAt({ P, A, children }: { P: () => Vector3; A: () => Vector3; children: ReactNode }) {
    const ref = useRef<Group>(null);
    useFrame(() => {
        if (!ref.current) return;
        ref.current.position.copy(P());
        ref.current.quaternion.setFromUnitVectors(Y, A());
    });
    return <group ref={ref}>{children}</group>;
}

/** Orange light from the first-stage engines on the pad, smoke and vehicle while low. */
function EngineLight({ state, P }: { state: MutableRefObject<VehicleState>; P: () => Vector3 }) {
    const ref = useRef<PointLight>(null);
    useFrame(() => {
        if (!ref.current) return;
        const s = state.current;
        ref.current.intensity = s.firing1 * 4500 * Math.max(0, s.pressure - 0.4);
        ref.current.position.copy(P()).add(v3(0, -6, 0));
        ref.current.visible = s.firing1 > 0.01 && s.pressure > 0.4;
    });
    return <pointLight ref={ref} color="#ffae5c" distance={300} decay={2} />;
}

function IntroView({ sun }: { sun: MutableRefObject<Vector3> }) {
    return (
        <>
            <Stars count={2400} brightness={() => 1} />
            <Reflections sun={[SUN.x, SUN.y, SUN.z]} />
            <directionalLight position={[SUN.x * 1e8, SUN.y * 1e8, SUN.z * 1e8]} intensity={2.2} />
            <Globe radius={R_EARTH} orientation={SITE_Q} sun={sun} />
        </>
    );
}

/** Orbit and departure: the Earth turning beneath the trajectory, in the inertial frame. */
function InertialView({ frame, state, sun, quality }: { frame: MutableRefObject<Frame>; state: MutableRefObject<VehicleState>; sun: MutableRefObject<Vector3>; quality: 'high' | 'low' }) {
    const f = flight();
    const e = EV();
    const ascent = useMemo(() => f.samples.filter((s) => s.t >= 0 && s.t <= e.seco1).map((s) => v3(s.x, s.y, 0)), [f, e.seco1]);
    const parking = useMemo(() => {
        const s = sampleAt(e.seco1 + 30, f);
        const el = elements(s.x, s.y, s.vx, s.vy);
        // Propagate the parking ellipse analytically for one period from the insertion state.
        const pts: Vector3[] = [];
        const r0 = Math.hypot(s.x, s.y);
        const theta0 = Math.atan2(s.y, s.x);
        const h = s.x * s.vy - s.y * s.vx;
        const p = (h * h) / 3.986004418e14;
        const ecc = el.e;
        const nu0 = Math.acos(Math.max(-1, Math.min(1, (p / r0 - 1) / Math.max(1e-9, ecc))));
        for (let i = 0; i <= 256; i++) {
            const d = (i / 256) * Math.PI * 2 * Math.sign(h);
            const nu = nu0 + Math.abs(d);
            const r = p / (1 + ecc * Math.cos(nu));
            const th = theta0 + d;
            pts.push(v3(r * Math.cos(th), r * Math.sin(th), 0));
        }
        return pts;
    }, [f, e.seco1]);
    const departure = useMemo(() => f.samples.filter((s) => s.t >= e.restart).map((s) => v3(s.x, s.y, 0)), [f, e.restart]);
    const departureTimes = useMemo(() => f.samples.filter((s) => s.t >= e.restart).map((s) => s.t), [f, e.restart]);
    const flown = () => {
        const t = frame.current.met;
        let n = 0;
        while (n < departureTimes.length && departureTimes[n] <= t) n++;
        return n;
    };
    const wide = () => frame.current.shot === 'orbitWide' || frame.current.shot === 'departureWide';
    const vehicle = useRef<Group>(null);
    useFrame(() => {
        if (vehicle.current) vehicle.current.visible = !wide();
    });
    return (
        <>
            <Stars count={quality === 'high' ? 2600 : 1200} brightness={() => 1} />
            <Reflections sun={[SUN.x, SUN.y, SUN.z]} />
            <directionalLight position={[SUN.x * 1e9, SUN.y * 1e9, SUN.z * 1e9]} intensity={2.6} color="#fff6ea" />
            <Earthshine position={() => frame.current.P} />
            <Globe radius={R_EARTH} orientation={SITE_Q} spin={() => OMEGA_EARTH * (frame.current.met + SEQUENCE.ignitionLead)} sun={sun} />
            <Path points={ascent} color="#FBBF24" opacity={0.85} />
            <Path points={parking} color="#e2e8f0" opacity={0.75} />
            <Path points={departure} color="#22D3EE" opacity={0.95} count={flown} />
            <Path points={departure} color="#22D3EE" opacity={0.25} dashed />
            <group ref={vehicle}>
                <VehicleAt P={() => frame.current.P} A={() => frame.current.A}>
                    <LaunchVehicle state={state} showStage1={false} showFairing={false} />
                </VehicleAt>
            </group>
            <Marker position={() => frame.current.P} label={wide() ? 'solar-vehicle' : null} size={0.022} />
        </>
    );
}

/** After separation: the spacecraft alone, the spent kick stage drifting away, Earth below. */
function DeployView({ frame, state, sun, quality }: { frame: MutableRefObject<Frame>; state: MutableRefObject<VehicleState>; sun: MutableRefObject<Vector3>; quality: 'high' | 'low' }) {
    const e = EV();
    const craft = useRef<Group>(null);
    const kick = useRef<Group>(null);
    const q = useMemo(() => new Quaternion(), []);
    const tip = useMemo(() => new Quaternion(), []);
    useLabelAnchor('deploy-craft', craft, [0, 2.2, 0]);
    useFrame(() => {
        const f = frame.current;
        const t = f.met - e.scSep;
        q.setFromUnitVectors(Y, f.A);
        // Tip-off rotation after separation, damped by the thrusters (attitude model).
        const att = attitudeAt(Math.max(0, t));
        const angle = t > 0 ? (Math.min(t, 150) * att.rate * Math.PI) / 180 / 3 : 0;
        tip.setFromAxisAngle(Z, angle);
        if (craft.current) {
            craft.current.position.copy(f.P);
            craft.current.quaternion.copy(q).multiply(tip);
        }
        if (kick.current) {
            kick.current.position.copy(f.P).addScaledVector(f.A, -Math.max(0, t) * 0.5 - 0.2);
            kick.current.quaternion.copy(q);
        }
    });
    return (
        <>
            <Stars count={quality === 'high' ? 2600 : 1200} brightness={() => 1} />
            <Reflections sun={[SUN.x, SUN.y, SUN.z]} />
            <directionalLight position={[SUN.x * 1e9, SUN.y * 1e9, SUN.z * 1e9]} intensity={2.8} color="#fff6ea" />
            <Earthshine position={() => frame.current.P} intensity={1.1} />
            <Globe radius={R_EARTH} orientation={SITE_Q} spin={() => OMEGA_EARTH * (frame.current.met + SEQUENCE.ignitionLead)} sun={sun} />
            <group ref={craft}>
                <SpacecraftModel state={state} />
            </group>
            <group ref={kick}>
                <group position={[0, -STACK.kickBase - 1.75, 0]}>
                    <KickStage state={state} />
                </group>
            </group>
        </>
    );
}
