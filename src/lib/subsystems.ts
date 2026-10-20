export type Subsystem = {
    id: string;
    name: string;
    purpose: string;
    dependsOn: string;
    telemetry: string;
    question: string;
};

/** Spacecraft subsystems for the Satellite Engineering systems overview (6U EO reference mission). */
export const SUBSYSTEMS: Subsystem[] = [
    {
        id: 'mission',
        name: 'Mission & Orbit',
        purpose: 'Defines what the spacecraft must do and the environment it works in: altitude, inclination, eclipses and ground access.',
        dependsOn: 'Sets the power, thermal and communications budgets for every other subsystem.',
        telemetry: 'Position and velocity, eclipse state, β angle.',
        question: 'How does seasonal eclipse duration change the energy margin?',
    },
    {
        id: 'power',
        name: 'Power',
        purpose: 'Generates, stores, regulates and distributes electrical power through the solar arrays, EPS and battery.',
        dependsOn: 'Feeds every subsystem through switched, current-limited power rails.',
        telemetry: 'Array voltage and current, battery voltage, current, temperature and SOC, bus voltages, per-channel load current.',
        question: 'How should loads be prioritised during low-energy conditions?',
    },
    {
        id: 'avionics',
        name: 'Avionics',
        purpose: 'The onboard computer: command and data handling, scheduling and fault management.',
        dependsOn: 'Talks to sensors and actuators over data buses; can power-cycle subsystems through the EPS.',
        telemetry: 'Processor load, resets and watchdog events, memory errors, storage use.',
        question: 'How can onboard logic tell a failed sensor from a failing subsystem?',
    },
    {
        id: 'adcs',
        name: 'ADCS',
        purpose: 'Determines and controls attitude so arrays face the Sun, the payload sees its target and antennas reach the ground.',
        dependsOn: 'Draws power for wheels and magnetorquers; sets pointing for payload and arrays.',
        telemetry: 'Attitude quaternion, body rates, wheel speeds, sun-sensor and magnetometer readings.',
        question: 'Which pointing strategy maximises energy without compromising the payload?',
    },
    {
        id: 'comms',
        name: 'Communications',
        purpose: 'Downlinks telemetry and payload data and receives commands.',
        dependsOn: 'Links to the ground segment; the transmitter is a major load during passes.',
        telemetry: 'Signal strength, link margin, packet counts, transmitter temperature and power.',
        question: 'How should downlink scheduling trade data volume against energy?',
    },
    {
        id: 'payload',
        name: 'Payload',
        purpose: 'The mission instrument. For the reference mission, an Earth-observation imager.',
        dependsOn: 'Shapes the power and thermal budgets, ADCS pointing, storage and downlink.',
        telemetry: 'Operating mode, temperature, data volume generated.',
        question: 'How much payload duty cycle can the energy budget sustain across seasons?',
    },
    {
        id: 'thermal',
        name: 'Thermal',
        purpose: 'Keeps components, especially batteries, within limits using coatings, insulation and heaters.',
        dependsOn: 'Heaters draw power; every subsystem has temperature limits.',
        telemetry: 'Thermistor temperatures, heater states.',
        question: 'How much energy do battery heaters use in long eclipses, and how can it be reduced?',
    },
    {
        id: 'ground',
        name: 'Ground',
        purpose: 'Operates the spacecraft: tracking, commanding, receiving and analysing telemetry.',
        dependsOn: 'Reaches the spacecraft through the communications link; operations decisions feed back on board.',
        telemetry: 'Pass schedule, received frames, anomaly logs.',
        question: 'How can routine telemetry reveal early battery degradation?',
    },
];
