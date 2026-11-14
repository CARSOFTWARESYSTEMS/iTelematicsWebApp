/**
 * Physical constants for the Solar System experience (option 06). SI units throughout unless a
 * name says otherwise. Values: IAU/IERS nominal constants and standard gravity.
 */

/** Standard gravity, m/s² (used for specific impulse and g-loads). */
export const G0 = 9.80665;
/** Earth gravitational parameter μ, m³/s². */
export const MU_EARTH = 3.986004418e14;
/** Earth equatorial radius, m. */
export const R_EARTH = 6.378137e6;
/** Earth sidereal rotation rate, rad/s. */
export const OMEGA_EARTH = 7.2921159e-5;
/** Sun gravitational parameter μ, m³/s². */
export const MU_SUN = 1.32712440018e20;
/** Astronomical unit, m. */
export const AU = 1.495978707e11;
/** Speed of light in vacuum, m/s. */
export const C_LIGHT = 299792458;
/** Seconds per Julian year. */
export const YEAR = 365.25 * 86400;

/** Mean orbital radii (semi-major axes) used for the conceptual transfer, in AU (JPL approximate elements, J2000). */
export const ORBIT_AU = {
    earth: 1.00000261,
    jupiter: 5.20288700,
} as const;
