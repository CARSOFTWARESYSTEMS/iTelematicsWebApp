/**
 * The reference mission of the Solar System experience (option 06): a conceptual launch vehicle
 * RLV-1 carrying a conceptual outer-planet spacecraft RSC-1. Neither is a real vehicle. Masses,
 * thrusts and specific impulses are illustrative values typical of their engine classes (a
 * kerosene/liquid-oxygen first stage, a restartable liquid-hydrogen/liquid-oxygen upper stage and a
 * solid kick motor), chosen so the stack can reach Earth orbit and then depart towards Jupiter.
 * Every mass, thrust and event the 3D scene and telemetry show comes from these numbers.
 */

export interface LiquidStage {
    name: string;
    propellant: string;
    /** Structure, engines, residuals: everything left when the usable propellant is gone, kg. */
    dryMass: number;
    /** Usable propellant, kg. */
    propellantMass: number;
    engines: number;
    /** Total thrust at sea level and in vacuum, N. */
    thrustSL: number;
    thrustVac: number;
    /** Specific impulse at sea level and in vacuum, s. */
    ispSL: number;
    ispVac: number;
    /** Lowest throttle setting (fraction of full thrust). */
    minThrottle: number;
    diameter: number; // m
    length: number; // m
}

export interface SolidStage {
    name: string;
    propellant: string;
    inertMass: number; // kg
    propellantMass: number; // kg
    thrust: number; // N, vacuum average
    isp: number; // s, vacuum
    diameter: number;
    length: number;
}

export const FIRST_STAGE: LiquidStage = {
    name: 'First stage',
    propellant: 'Kerosene (RP-1) / liquid oxygen',
    dryMass: 21000,
    propellantMass: 285000,
    engines: 2,
    thrustSL: 4.15e6,
    thrustVac: 4.58e6,
    ispSL: 311,
    ispVac: 338,
    minThrottle: 0.4,
    diameter: 3.8,
    length: 32.5,
};

export const UPPER_STAGE: LiquidStage = {
    name: 'Upper stage',
    propellant: 'Liquid hydrogen / liquid oxygen (restartable)',
    dryMass: 2350,
    propellantMass: 20800,
    engines: 2,
    thrustSL: 0, // vacuum engines, never lit in the dense atmosphere
    thrustVac: 2.036e5,
    ispSL: 0,
    ispVac: 451,
    minThrottle: 1,
    diameter: 3.05,
    length: 12.7,
};

export const KICK_STAGE: SolidStage = {
    name: 'Solid kick stage',
    propellant: 'Solid (HTPB/aluminium/ammonium perchlorate)',
    inertMass: 124,
    propellantMass: 2010,
    thrust: 6.86e4,
    isp: 286,
    diameter: 1.24,
    length: 2.03,
};

export const FAIRING = { name: 'Payload fairing', mass: 2100, diameter: 4.2, length: 12.9 } as const;
/** Payload attach fitting; stays on the upper stage when the kick stage separates. */
export const ADAPTER_MASS = 150;

/** RSC-1: a radioisotope-powered outer-planet flyby spacecraft (conceptual). */
export const SPACECRAFT = {
    name: 'Reference Spacecraft RSC-1',
    mass: 720, // kg at launch, including 45 kg of hydrazine
    hydrazine: 45,
    /** Two radioisotope thermoelectric generators, electrical output at beginning of life, W. */
    rtgCount: 2,
    rtgPowerBOL: 245, // W each
    /** Pu-238 half-life (years) and thermocouple degradation (fraction per year). */
    halfLifeYears: 87.7,
    thermocoupleLossPerYear: 0.008,
    /** Lithium-ion battery for short peak loads, Wh usable. */
    batteryWh: 450,
    busVolts: 30,
    highGainAntennaM: 3.7,
    /** Booms that deploy after separation: radioisotope generator boom, magnetometer boom, science boom. */
    booms: ['RTG boom', 'Magnetometer boom', 'Science boom'],
} as const;

/** Total mass of what sits on the upper stage (adapter, kick stage, spacecraft), kg. */
export const PAYLOAD_STACK = ADAPTER_MASS + KICK_STAGE.inertMass + KICK_STAGE.propellantMass + SPACECRAFT.mass;

/** Mass on the pad, kg. */
export const LIFTOFF_MASS = FIRST_STAGE.dryMass + FIRST_STAGE.propellantMass + UPPER_STAGE.dryMass + UPPER_STAGE.propellantMass + FAIRING.mass + PAYLOAD_STACK;

/** Mass flow at full thrust, kg/s, from thrust and vacuum specific impulse. */
export const massFlow = (thrustVac: number, ispVac: number) => thrustVac / (ispVac * 9.80665);

export const VEHICLE = {
    name: 'Reference Launch Vehicle RLV-1',
    mission: 'Reference Mission SOL-1: outer Solar System flyby, departing Earth towards Jupiter',
    /** Reference launch site: a conceptual coastal site at 10° N, launching due east. */
    siteLatitudeDeg: 10,
    launchAzimuthDeg: 90,
    /** Total height of the stack on the pad, m. */
    height: 61.4,
    /** Aerodynamic reference diameter, m. */
    diameter: FAIRING.diameter,
    /** Peak acceleration the first stage throttles to respect, in g. */
    maxAccelerationG: 4.5,
    /** Parking orbit, circular, km. */
    parkingOrbitKm: 185,
} as const;
