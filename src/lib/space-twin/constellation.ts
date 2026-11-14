/**
 * Experience 02 · Orbital Constellation. A Walker-delta constellation (30 satellites in 3 planes,
 * 550 km, 53°) propagated as circular two-body orbits; illustrative ground stations on a rotating
 * spherical Earth; coverage footprints from a 10° minimum elevation; ground links only when the
 * satellite is above the station's horizon mask; in-plane links only with a clear line of sight.
 * A simplified engineering model: no J2, drag, ellipsoid or atmospheric refraction.
 */
import {
    coverageFraction,
    coverageHalfAngleDeg,
    earthRotationDeg,
    elevationDeg,
    fibonacciSphere,
    footprintRadiusKm,
    geoToEcef,
    inEarthShadow,
    lineOfSight,
    maxSlantRangeKm,
    periodMin,
    positionEci,
    rotateZ,
    speedKmS,
    subPoint,
    unit,
    walkerDelta,
    type OrbitSlot,
    type Vec3,
} from './orbit';
import { cameraPath, fmt, missionClock, wrap, type CameraKey, type Hud, type Phase, type Stage, type View } from './story';

export const CON = { total: 30, planes: 3, phasing: 1, incDeg: 53, altKm: 550 } as const;
export const CON_MIN_ELEV_DEG = 10;
/** Links between neighbours must pass at least this high above the surface (atmosphere margin). */
export const CON_LINK_CLEARANCE_KM = 100;
export const CON_LOOP = 26;
/** One story second shows three simulated minutes: an orbit takes about 32 s on screen. */
export const CON_SIM_MIN_PER_S = 3;

export const CON_SLOTS: readonly OrbitSlot[] = walkerDelta(CON);
export const CON_PERIOD_MIN = periodMin(CON.altKm);
export const CON_SPEED_KMS = speedKmS(CON.altKm);
export const CON_HALF_ANGLE_DEG = coverageHalfAngleDeg(CON.altKm, CON_MIN_ELEV_DEG);
export const CON_FOOTPRINT_KM = footprintRadiusKm(CON.altKm, CON_MIN_ELEV_DEG);
export const CON_MAX_RANGE_KM = maxSlantRangeKm(CON.altKm, CON_MIN_ELEV_DEG);

/** Illustrative ground stations (spherical Earth, sea level). */
export const CON_STATIONS = [
    { id: 'gs1', name: 'Bengaluru', lat: 13.03, lon: 77.57 },
    { id: 'gs2', name: 'Lisbon', lat: 38.72, lon: -9.14 },
    { id: 'gs3', name: 'Hawaii', lat: 19.72, lon: -155.08 },
] as const;

export type StationId = (typeof CON_STATIONS)[number]['id'];

const DEG = Math.PI / 180;

/**
 * Scene frame (three.js, y up) from ECI (z up): (x, z, −y). Earth's texture longitude 0 then lies
 * on +x, so Earth-fixed positions and the imagery agree.
 */
export const toScene = (v: Vec3, kmPerUnit = 100): [number, number, number] => [v[0] / kmPerUnit, v[2] / kmPerUnit, -v[1] / kmPerUnit];

/** The opening view looks at Bengaluru from this azimuth; the initial Earth angle puts it there. */
const OPEN_AZ = 18;
export const CON_EARTH0_DEG = OPEN_AZ - 90 - CON_STATIONS[0].lon;

/** The Sun, fixed in inertial space at a mid-November declination (−18°), lighting the opening view from the left. */
const SUN_DEC = -18;
const SUN_AZ = OPEN_AZ - 58;
export const CON_SUN_SCENE: [number, number, number] = [Math.cos(SUN_DEC * DEG) * Math.sin(SUN_AZ * DEG), Math.sin(SUN_DEC * DEG), Math.cos(SUN_DEC * DEG) * Math.cos(SUN_AZ * DEG)];
/** The same direction in ECI, for the shadow test. */
export const CON_SUN_ECI: Vec3 = [CON_SUN_SCENE[0], -CON_SUN_SCENE[2], CON_SUN_SCENE[1]];

const LATTICE = fibonacciSphere(1500);
const STATION_ECEF = CON_STATIONS.map((g) => geoToEcef(g.lat, g.lon));

export interface ConLink {
    station: StationId;
    sat: number;
    elevationDeg: number;
    rangeKm: number;
}

export interface ConState {
    tMin: number;
    earthDeg: number;
    sats: Vec3[];
    sunlit: boolean[];
    stations: Vec3[];
    /** Ground contacts above the elevation mask, best elevation first per station. */
    links: ConLink[];
    /** In-plane neighbour pairs with a clear line of sight. */
    crossLinks: [number, number][];
    coverage: number;
}

/** The whole constellation at a simulated time. Deterministic: the same time gives the same state. */
export function conStateAt(tMin: number, { coverage = true }: { coverage?: boolean } = {}): ConState {
    const earthDeg = earthRotationDeg(tMin, CON_EARTH0_DEG);
    const sats = CON_SLOTS.map((slot) => positionEci(slot, tMin));
    const stations = STATION_ECEF.map((p) => rotateZ(p, earthDeg));
    const links: ConLink[] = [];
    CON_STATIONS.forEach((g, gi) => {
        sats.forEach((sat, si) => {
            const el = elevationDeg(stations[gi], sat);
            if (el >= CON_MIN_ELEV_DEG) {
                const d = [sat[0] - stations[gi][0], sat[1] - stations[gi][1], sat[2] - stations[gi][2]];
                links.push({ station: g.id, sat: si, elevationDeg: el, rangeKm: Math.hypot(d[0], d[1], d[2]) });
            }
        });
    });
    links.sort((a, b) => (a.station === b.station ? b.elevationDeg - a.elevationDeg : a.station.localeCompare(b.station)));
    const perPlane = CON.total / CON.planes;
    const crossLinks: [number, number][] = [];
    for (let i = 0; i < sats.length; i++) {
        const next = CON_SLOTS[i].plane * perPlane + ((CON_SLOTS[i].slot + 1) % perPlane);
        if (lineOfSight(sats[i], sats[next], CON_LINK_CLEARANCE_KM)) crossLinks.push([i, next]);
    }
    return {
        tMin,
        earthDeg,
        sats,
        sunlit: sats.map((p) => !inEarthShadow(p, CON_SUN_ECI)),
        stations,
        links,
        crossLinks,
        coverage: coverage ? coverageFraction(sats.map(unit), CON_HALF_ANGLE_DEG, LATTICE) : NaN,
    };
}

export const conSimMinutes = (elapsed: number) => elapsed * CON_SIM_MIN_PER_S;

export const CON_STAGES: readonly Stage[] = [
    { id: 'reveal', label: 'Reveal', title: 'Constellation reveal', start: 0, seconds: 5 },
    { id: 'motion', label: 'Orbits', title: 'Orbital motion', start: 5, seconds: 6 },
    { id: 'coverage', label: 'Coverage', title: 'Ground coverage', start: 11, seconds: 7 },
    { id: 'comms', label: 'Links', title: 'Communication and telemetry', start: 18, seconds: 8 },
];

export const CON_PHASES: readonly Phase[] = CON_STAGES.map((s, i) => ({ id: s.id, stage: i, start: s.start }));
export const CON_STORY = { stages: CON_STAGES, phases: CON_PHASES, loopSeconds: CON_LOOP } as const;

/** What each overlay shows in a phase. Orbit rings, footprints and links appear stage by stage. */
export function conLayers(phase: string) {
    return {
        rings: phase !== 'reveal',
        footprints: phase === 'coverage' || phase === 'comms',
        links: phase === 'comms',
    };
}

const KEYS: CameraKey[] = [
    { t: 0, v: { az: OPEN_AZ + 46, el: 32, dist: 1.62, target: [0, 0, 0] } },
    { t: 5, v: { az: OPEN_AZ + 22, el: 30, dist: 1.36, target: [0, 0, 0] } },
    { t: 11, v: { az: OPEN_AZ - 6, el: 20, dist: 1.2, target: [0, 0, 0] } },
    { t: 18, v: { az: OPEN_AZ + 4, el: 14, dist: 1.14, target: [0, 0, 0] } },
];

export const conCameraAt = cameraPath(KEYS, CON_LOOP);
export const CON_HOME: View = KEYS[1].v;
/** Scene units are 100 km; the orbits span about 140 units. */
export const CON_SPAN = 150;

export function conHud(elapsed: number, t: number, selected: number | null): Hud {
    const tMin = conSimMinutes(elapsed);
    const x = conStateAt(tMin);
    const phase = CON_STAGES[Math.max(0, CON_STAGES.findLastIndex((s) => wrap(t, CON_LOOP) >= s.start))].id;
    const contact = (id: StationId) => x.links.find((l) => l.station === id);
    const rows: Hud['rows'] = [];
    if (selected !== null) {
        const slot = CON_SLOTS[selected];
        const sp = subPoint(x.sats[selected], x.earthDeg);
        const link = x.links.find((l) => l.sat === selected);
        const station = link ? CON_STATIONS.find((g) => g.id === link.station)! : null;
        rows.push(
            { label: 'Satellite', value: `${slot.id} · plane ${slot.plane + 1}` },
            { label: 'Sub-satellite point', value: `${fmt(Math.abs(sp.lat))}° ${sp.lat >= 0 ? 'N' : 'S'}, ${fmt(Math.abs(sp.lon))}° ${sp.lon >= 0 ? 'E' : 'W'}` },
            { label: 'Illumination', value: x.sunlit[selected] ? 'Sunlight' : 'Eclipse', tone: x.sunlit[selected] ? 'solar' : 'orbit' },
            { label: 'Ground contact', value: station ? `${station.name} · ${fmt(link!.elevationDeg, 0)}° elev.` : 'None (below every mask)', tone: station ? 'telemetry' : undefined },
            { label: 'Altitude · speed', value: `${CON.altKm} km · ${fmt(CON_SPEED_KMS, 2)} km/s` },
        );
    } else if (phase === 'coverage') {
        rows.push(
            { label: 'Instantaneous coverage', value: `${fmt(x.coverage * 100, 0)} % of Earth`, note: `ε ≥ ${CON_MIN_ELEV_DEG}°` },
            { label: 'Footprint radius', value: `${Math.round(CON_FOOTPRINT_KM).toLocaleString('en')} km`, note: `λ = ${fmt(CON_HALF_ANGLE_DEG)}°` },
            { label: 'Max slant range', value: `${Math.round(CON_MAX_RANGE_KM).toLocaleString('en')} km` },
        );
    } else if (phase === 'comms') {
        for (const g of CON_STATIONS) {
            const c = contact(g.id);
            rows.push({ label: g.name, value: c ? `${CON_SLOTS[c.sat].id} · ${fmt(c.elevationDeg, 0)}°` : 'No satellite in view', tone: c ? 'telemetry' : undefined });
        }
        rows.push({ label: 'In-plane links', value: `${x.crossLinks.length} with clear line of sight` });
    } else {
        rows.push(
            { label: 'Constellation', value: `Walker ${CON.incDeg}°: ${CON.total}/${CON.planes}/${CON.phasing}` },
            { label: 'Altitude · period', value: `${CON.altKm} km · ${fmt(CON_PERIOD_MIN)} min` },
            { label: 'Orbital speed', value: `${fmt(CON_SPEED_KMS, 2)} km/s` },
            { label: 'In Earth’s shadow', value: `${x.sunlit.filter((v) => !v).length} of ${CON.total}` },
        );
    }
    rows.push({ label: 'Mission time', value: missionClock(tMin) });
    return {
        rows,
        note: phase === 'comms' && selected === null ? 'Links are engineering overlays of geometric visibility, not visible beams.' : undefined,
    };
}
