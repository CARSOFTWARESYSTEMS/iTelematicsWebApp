/**
 * U.S. Standard Atmosphere 1976: temperature, pressure and density by geometric altitude.
 * 0–86 km from the seven-layer model (geopotential altitude, lapse rates, hydrostatic pressure);
 * above 86 km density and temperature are interpolated (log-linear for density) in the published
 * tables, and pressure follows the ideal-gas law. Valid to 1,000 km; beyond that the density is
 * extrapolated with the last scale height.
 */

const R_AIR = 287.053; // J/(kg·K), specific gas constant of dry air
const GAMMA = 1.4;
const R0 = 6356.766; // km, effective Earth radius for geopotential altitude
const GMR = 34.1632; // K/km, g0·M/R*

/** Base geopotential altitude (km), base temperature (K), lapse rate (K/km), base pressure (Pa). */
const LAYERS: readonly (readonly [number, number, number, number])[] = [
    [0, 288.15, -6.5, 101325],
    [11, 216.65, 0, 22632.06],
    [20, 216.65, 1.0, 5474.889],
    [32, 228.65, 2.8, 868.0187],
    [47, 270.65, 0, 110.9063],
    [51, 270.65, -2.8, 66.93887],
    [71, 214.65, -2.0, 3.95642],
];

/** Geometric altitude (km), temperature (K), density (kg/m³), from the 1976 tables above 86 km. */
const UPPER: readonly (readonly [number, number, number])[] = [
    [86, 186.87, 6.958e-6],
    [90, 186.87, 3.416e-6],
    [100, 195.08, 5.604e-7],
    [110, 240.0, 9.708e-8],
    [120, 360.0, 2.222e-8],
    [130, 469.27, 8.152e-9],
    [150, 634.39, 2.076e-9],
    [180, 800.0, 5.194e-10],
    [200, 854.56, 2.541e-10],
    [250, 941.33, 6.073e-11],
    [300, 976.01, 1.916e-11],
    [400, 995.83, 2.803e-12],
    [500, 999.24, 5.215e-13],
    [700, 999.99, 3.07e-14],
    [1000, 1000.0, 3.561e-15],
];

export interface AirState {
    temperature: number; // K
    pressure: number; // Pa
    density: number; // kg/m³
    /** Speed of sound, m/s (meaningful below 86 km). */
    soundSpeed: number;
}

export function atmosphere(altitudeM: number): AirState {
    const z = Math.max(0, altitudeM / 1000);
    if (z < 86) {
        const h = (R0 * z) / (R0 + z);
        let i = LAYERS.length - 1;
        while (i > 0 && h < LAYERS[i][0]) i--;
        const [hb, tb, lapse, pb] = LAYERS[i];
        const temperature = tb + lapse * (h - hb);
        const pressure = lapse === 0 ? pb * Math.exp((-GMR * (h - hb)) / tb) : pb * Math.pow(tb / temperature, GMR / lapse);
        const density = pressure / (R_AIR * temperature);
        return { temperature, pressure, density, soundSpeed: Math.sqrt(GAMMA * R_AIR * temperature) };
    }
    let j = 0;
    while (j < UPPER.length - 2 && z > UPPER[j + 1][0]) j++;
    const [z0, t0, d0] = UPPER[j];
    const [z1, t1, d1] = UPPER[j + 1];
    const f = (z - z0) / (z1 - z0);
    const temperature = z >= 1000 ? 1000 : t0 + (t1 - t0) * Math.min(1, f);
    const density = d0 * Math.pow(d1 / d0, f);
    return { temperature, pressure: density * R_AIR * temperature, density, soundSpeed: Math.sqrt(GAMMA * R_AIR * temperature) };
}

/** Atmospheric layer name for a geometric altitude, for the explanation panel. */
export function layerName(altitudeM: number): string {
    const km = altitudeM / 1000;
    if (km < 12) return 'Troposphere';
    if (km < 50) return 'Stratosphere';
    if (km < 85) return 'Mesosphere';
    if (km < 600) return 'Thermosphere';
    return 'Exosphere';
}
