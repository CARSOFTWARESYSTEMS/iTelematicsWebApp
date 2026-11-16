/**
 * Measured physical data for the Solar System Discovery tour (Phase B, Mode A), from the planetary
 * fact sheets of the NSSDCA (https://nssdc.gsfc.nasa.gov/planetary/factsheet/; sources in
 * docs/SOLAR_SYSTEM.md). Rounded for display. Moon counts are
 * left out on purpose: they change as new moons are confirmed.
 *
 * Imagery used for each body is listed with its source type, so the interface can say what is a
 * measured map and what is an illustrative surface.
 */
import type { PlanetId } from './ephemeris';

export type BodyId = 'sun' | 'mercury' | 'venus' | 'earth' | 'moon' | 'mars' | 'asteroids' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto' | 'kuiper';

export interface Body {
    id: BodyId;
    name: string;
    /** Where the tour places it: a planet from the ephemeris, the Moon beside the Earth, or a belt. */
    orbit: PlanetId | 'moon' | 'belt' | 'sun';
    /** Mean radius, km (belts: none). */
    radiusKm?: number;
    /** Equatorial flattening (oblate giants). */
    flattening?: number;
    /** Mean distance from the Sun (AU), or the belt's range. */
    distance: string;
    /** Orbital period around the Sun (or the Earth, for the Moon). */
    year?: string;
    /** Length of the sidereal day; negative = retrograde. */
    day?: string;
    /** Axial tilt (obliquity to the orbit), degrees. */
    tiltDeg?: number;
    atmosphere: string;
    features: string;
    /** Map used and what it is. */
    imagery: {
        file?: string;
        kind:
            | 'Map from mission data (Solar System Scope, CC BY 4.0)'
            | 'Earth imagery (public domain, credited on Terms)'
            | 'Mosaic from mission data (USGS, public domain; colour approximated)'
            | 'Illustrative surface (not imagery)'
            | 'Illustrative distribution (not a catalogue)';
    };
    rings?: { innerKm: number; outerKm: number };
}

export const BODIES: Body[] = [
    {
        id: 'sun',
        name: 'Sun',
        orbit: 'sun',
        radiusKm: 695700,
        distance: 'Centre of the Solar System',
        day: '25.4 days at the equator',
        tiltDeg: 7.25,
        atmosphere: 'Photosphere about 5,772 K; corona above 1 million K',
        features: 'Holds 99.86 % of the Solar System’s mass; its light falls off with the square of distance',
        imagery: { file: 'sun-2k.jpg', kind: 'Map from mission data (Solar System Scope, CC BY 4.0)' },
    },
    {
        id: 'mercury',
        name: 'Mercury',
        orbit: 'mercury',
        radiusKm: 2439.7,
        distance: '0.39 AU',
        year: '88.0 days',
        day: '58.6 days',
        tiltDeg: 0.03,
        atmosphere: 'A thin exosphere only',
        features: 'Heavily cratered; a large iron core; surface from −180 °C to 430 °C',
        imagery: { file: 'mercury-2k.jpg', kind: 'Map from mission data (Solar System Scope, CC BY 4.0)' },
    },
    {
        id: 'venus',
        name: 'Venus',
        orbit: 'venus',
        radiusKm: 6051.8,
        distance: '0.72 AU',
        year: '224.7 days',
        day: '−243.0 days (retrograde)',
        tiltDeg: 177.4,
        atmosphere: '96.5 % carbon dioxide, 92 bar at the surface, sulfuric-acid clouds',
        features: 'Runaway greenhouse: about 465 °C at the surface; the cloud tops are shown',
        imagery: { file: 'venus-2k.jpg', kind: 'Map from mission data (Solar System Scope, CC BY 4.0)' },
    },
    {
        id: 'earth',
        name: 'Earth',
        orbit: 'earth',
        radiusKm: 6371.0,
        distance: '1.00 AU',
        year: '365.26 days',
        day: '23.93 hours',
        tiltDeg: 23.44,
        atmosphere: '78 % nitrogen, 21 % oxygen, 1 bar',
        features: 'Liquid water oceans; the only known world with life',
        imagery: { file: 'earth', kind: 'Earth imagery (public domain, credited on Terms)' },
    },
    {
        id: 'moon',
        name: 'Moon',
        orbit: 'moon',
        radiusKm: 1737.4,
        distance: '384,400 km from Earth',
        year: '27.3 days (around Earth)',
        day: '27.3 days (always the same face)',
        tiltDeg: 6.68,
        atmosphere: 'None (a trace exosphere)',
        features: 'Dark basaltic maria and bright cratered highlands',
        imagery: { file: 'moon-2k.jpg', kind: 'Map from mission data (Solar System Scope, CC BY 4.0)' },
    },
    {
        id: 'mars',
        name: 'Mars',
        orbit: 'mars',
        radiusKm: 3389.5,
        distance: '1.52 AU',
        year: '687 days',
        day: '24.62 hours',
        tiltDeg: 25.19,
        atmosphere: '95 % carbon dioxide, about 0.006 bar',
        features: 'Olympus Mons, Valles Marineris, polar ice caps',
        imagery: { file: 'mars-2k.jpg', kind: 'Map from mission data (Solar System Scope, CC BY 4.0)' },
    },
    {
        id: 'asteroids',
        name: 'Asteroid Belt',
        orbit: 'belt',
        distance: '2.2–3.2 AU',
        atmosphere: '—',
        features: 'Rocky and metallic bodies between Mars and Jupiter; together less than 4 % of the Moon’s mass. Ceres (radius 470 km) is the largest',
        imagery: { kind: 'Illustrative distribution (not a catalogue)' },
    },
    {
        id: 'jupiter',
        name: 'Jupiter',
        orbit: 'jupiter',
        radiusKm: 69911,
        flattening: 0.0649,
        distance: '5.20 AU',
        year: '11.86 years',
        day: '9.93 hours',
        tiltDeg: 3.13,
        atmosphere: 'Hydrogen and helium; ammonia cloud bands; the Great Red Spot',
        features: 'The largest planet: 318 Earth masses. Galilean moons Io, Europa, Ganymede and Callisto',
        imagery: { file: 'jupiter-4k.jpg', kind: 'Map from mission data (Solar System Scope, CC BY 4.0)' },
    },
    {
        id: 'saturn',
        name: 'Saturn',
        orbit: 'saturn',
        radiusKm: 58232,
        flattening: 0.098,
        distance: '9.58 AU',
        year: '29.46 years',
        day: '10.66 hours',
        tiltDeg: 26.73,
        atmosphere: 'Hydrogen and helium',
        features: 'Main rings of water ice from about 74,500 to 140,200 km from the centre, mostly less than 100 m thick. Largest moon Titan',
        imagery: { file: 'saturn-2k.jpg', kind: 'Map from mission data (Solar System Scope, CC BY 4.0)' },
        rings: { innerKm: 74500, outerKm: 140220 },
    },
    {
        id: 'uranus',
        name: 'Uranus',
        orbit: 'uranus',
        radiusKm: 25362,
        flattening: 0.0229,
        distance: '19.2 AU',
        year: '84.0 years',
        day: '−17.2 hours (retrograde)',
        tiltDeg: 97.77,
        atmosphere: 'Hydrogen, helium and methane (which gives the blue-green colour)',
        features: 'Rotates on its side; faint narrow rings',
        imagery: { file: 'uranus-2k.jpg', kind: 'Map from mission data (Solar System Scope, CC BY 4.0)' },
    },
    {
        id: 'neptune',
        name: 'Neptune',
        orbit: 'neptune',
        radiusKm: 24622,
        flattening: 0.0171,
        distance: '30.1 AU',
        year: '164.8 years',
        day: '16.1 hours',
        tiltDeg: 28.32,
        atmosphere: 'Hydrogen, helium and methane; the fastest winds measured in the Solar System',
        features: 'Largest moon Triton orbits backwards',
        imagery: { file: 'neptune-2k.jpg', kind: 'Map from mission data (Solar System Scope, CC BY 4.0)' },
    },
    {
        id: 'pluto',
        name: 'Pluto',
        orbit: 'pluto',
        radiusKm: 1188.3,
        distance: '39.5 AU (mean; 29.7–49.3)',
        year: '248 years',
        day: '−6.39 days (retrograde)',
        tiltDeg: 122.53,
        atmosphere: 'Thin nitrogen, methane and carbon monoxide, freezing out as it moves away',
        features: 'Dwarf planet in the Kuiper Belt; nitrogen-ice plain Sputnik Planitia; moon Charon',
        // The New Horizons mosaic covers the hemisphere seen at closest approach in detail; the far side is coarse.
        imagery: { file: 'pluto-2k.jpg', kind: 'Mosaic from mission data (USGS, public domain; colour approximated)' },
    },
    {
        id: 'kuiper',
        name: 'Kuiper Belt',
        orbit: 'belt',
        distance: 'About 30–50 AU',
        atmosphere: '—',
        features: 'Icy bodies beyond Neptune, including Pluto and Arrokoth, the most distant object a spacecraft has visited',
        imagery: { kind: 'Illustrative distribution (not a catalogue)' },
    },
];

export const body = (id: BodyId) => BODIES.find((b) => b.id === id)!;
