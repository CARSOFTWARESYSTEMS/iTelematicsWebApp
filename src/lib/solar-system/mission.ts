/**
 * Mission script of the Solar System experience, Phase A: from the launch pad to Earth departure.
 * Chapters map story time onto mission elapsed time (MET) in explicit segments, so the time
 * compression shown on screen is exact; every reading comes from the flight simulation
 * (flight.ts) or the spacecraft model (spacecraft.ts). Each action label answers: what is it, what
 * does it do, why does it matter and what is happening in the animation, with a short Learn more.
 *
 * Order note: on real outer-planet missions the upper stage and a kick stage perform the departure
 * burn with the spacecraft still attached; the spacecraft separates afterwards, already on its escape
 * trajectory. Chapters 07 and 08 follow that physical order.
 */
import { atmosphere, layerName } from './atmosphere';
import { C_LIGHT, MU_EARTH, R_EARTH } from './constants';
import { eventTime, flight, sampleAt, type FlightResult } from './flight';
import { EARTH_JUPITER, circularSpeed, elements, escapeSpeed } from './orbit';
import { attitudeAt, boomsAt, healthAt, linkAt, powerAt } from './spacecraft';
import { FAIRING, FIRST_STAGE, KICK_STAGE, LIFTOFF_MASS, SPACECRAFT, UPPER_STAGE, VEHICLE } from './vehicle';

export const TITLE = 'Solar System';
export const SUBTITLE = 'From Earth Launch to Deep Space Exploration';
export const SUPPORT = 'Every journey into the Solar System begins with understanding how we leave Earth.';
export const DESCRIPTION =
    'Experience the complete journey of space exploration. Discover how a rocket launches, how a spacecraft reaches orbit, how it travels between planets, and how engineering systems make deep-space missions possible.';
export const SIGNATURE = 'Explore the Solar System. Understand the science. Experience the mission.';
export const DATA_LABEL = 'SIMULATED — Conceptual reference mission SOL-1';

export type SceneId = 'intro' | 'pad' | 'ascent' | 'orbit' | 'departure' | 'deploy' | 'helio';

/** Camera programmes, implemented by the scene (SolarScene.tsx). */
export type ShotId =
    | 'earthApproach'
    | 'padReveal'
    | 'padWide'
    | 'padTour'
    | 'engines'
    | 'stage1'
    | 'upper'
    | 'tanks'
    | 'fairingOpen'
    | 'payload'
    | 'liftoff'
    | 'engineClose'
    | 'track'
    | 'chase'
    | 'onboard'
    | 'high'
    | 'staging'
    | 'fairingSep'
    | 'insertion'
    | 'orbitWide'
    | 'departureWide'
    | 'burnChase'
    | 'kick'
    | 'sepClose'
    | 'deployWide'
    | 'eps'
    | 'antenna'
    | 'computer'
    | 'helio';

/** A stretch of story mapped onto mission time: `seconds` of story show MET a → b. */
export interface Segment {
    met: readonly [number, number];
    seconds: number;
    scene: SceneId;
    shot: ShotId;
    /** Highlighted hardware while this segment plays. */
    focus?: Focus;
}

export type Focus =
    | 'vehicle'
    | 'stage1'
    | 'upper'
    | 'engines'
    | 'tanks'
    | 'fairing'
    | 'payload'
    | 'tower'
    | 'plume'
    | 'kick'
    | 'spacecraft'
    | 'rtg'
    | 'eps'
    | 'antenna'
    | 'computer'
    | 'thrusters'
    | 'booms'
    | 'trajectory';

export type TKey =
    | 'met'
    | 'altitude'
    | 'speed'
    | 'airspeed'
    | 'acceleration'
    | 'thrust'
    | 'propellant'
    | 'q'
    | 'mach'
    | 'mass'
    | 'heating'
    | 'downrange'
    | 'flightPath'
    | 'density'
    | 'layer'
    | 'throttle'
    | 'liftoffMass'
    | 'payloadMass'
    | 'stages'
    | 'liftoffThrust'
    | 'readiness'
    | 'perigee'
    | 'apogee'
    | 'period'
    | 'inclination'
    | 'orbitalSpeed'
    | 'escapeSpeed'
    | 'c3'
    | 'earthDistance'
    | 'lightTime'
    | 'rtg'
    | 'loads'
    | 'battery'
    | 'busVolts'
    | 'attitude'
    | 'link'
    | 'health'
    | 'transfer';

export interface Label {
    id: string;
    title: string;
    focus?: Focus;
    /** Replays this window (or holds on it) when chosen. */
    segments: readonly Segment[];
    what: string;
    does: string;
    why: string;
    happening: string;
    learn: string;
    telemetry: readonly TKey[];
}

export interface Chapter {
    id: string;
    number: string;
    title: string;
    /** Short name for the chapter list. */
    short: string;
    summary: string;
    segments: readonly Segment[];
    labels: readonly Label[];
    telemetry: readonly TKey[];
}

const hold = (met: number, seconds: number, scene: SceneId, shot: ShotId, focus?: Focus): Segment => ({ met: [met, met], seconds, scene, shot, focus });
const span = (a: number, b: number, seconds: number, scene: SceneId, shot: ShotId, focus?: Focus): Segment => ({ met: [a, b], seconds, scene, shot, focus });

export const storySeconds = (segments: readonly Segment[]) => segments.reduce((a, s) => a + s.seconds, 0);

/** The segment playing at story time t and the MET it shows. */
export function locate(segments: readonly Segment[], t: number) {
    let start = 0;
    for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        if (t < start + s.seconds || i === segments.length - 1) {
            const f = Math.max(0, Math.min(1, (t - start) / s.seconds));
            return { index: i, segment: s, progress: f, met: s.met[0] + (s.met[1] - s.met[0]) * f };
        }
        start += s.seconds;
    }
    throw new Error('empty segments');
}

/** Time compression of a segment (MET seconds per story second); 0 for a held moment. */
export const compression = (s: Segment) => (s.met[1] - s.met[0]) / s.seconds;

let built: { chapters: Chapter[]; intro: Segment[] } | null = null;

export function mission() {
    return (built ??= build(flight()));
}

const PAD = -90; // MET shown while the vehicle waits on the pad

function build(f: FlightResult) {
    const ev = (id: Parameters<typeof eventTime>[0]) => eventTime(id, f);
    const meco = ev('meco');
    const sep = ev('stageSep');
    const usIgn = ev('usIgnition');
    const fair = ev('fairingSep');
    const seco1 = ev('seco1');
    const restart = ev('usRestart');
    const seco2 = ev('seco2');
    const kickSep = ev('kickSep');
    const kickIgn = ev('kickIgnition');
    const burnout = ev('kickBurnout');
    const scSep = ev('scSep');
    const maxQ = f.maxQ;
    const orbit = f.parking;
    const c3 = f.c3 / 1e6;
    const t = (n: number, d = 0) => n.toFixed(d);

    const intro: Segment[] = [hold(PAD, 8, 'intro', 'earthApproach'), hold(PAD, 7, 'pad', 'padReveal')];

    const chapters: Chapter[] = [
        {
            id: 'prep',
            number: '01',
            title: 'Launch Vehicle Preparation',
            short: 'Preparation',
            summary: `${VEHICLE.name} stands on the pad: a first stage, an upper stage and, under the fairing, a solid kick stage and the spacecraft.`,
            segments: [hold(PAD, 6, 'pad', 'padWide'), hold(PAD, 9, 'pad', 'padTour', 'vehicle'), hold(PAD, 5, 'pad', 'fairingOpen', 'payload')],
            telemetry: ['liftoffMass', 'payloadMass', 'stages', 'liftoffThrust', 'readiness'],
            labels: [
                {
                    id: 'explore-rocket',
                    title: 'Explore Rocket',
                    focus: 'vehicle',
                    segments: [hold(PAD, 10, 'pad', 'padTour', 'vehicle')],
                    what: `A two-stage orbital launch vehicle, ${t(VEHICLE.height, 1)} m tall, with a solid kick stage for the departure from Earth.`,
                    does: 'Lifts the spacecraft through the atmosphere and accelerates it to orbital and then escape speed.',
                    why: 'No single stage can carry enough propellant and still be light enough to reach orbit with a useful payload.',
                    happening: 'The camera rises from the engines to the fairing, past each section of the stack.',
                    learn: `Liftoff mass ${t(LIFTOFF_MASS / 1000, 1)} t, of which ${t((FIRST_STAGE.propellantMass + UPPER_STAGE.propellantMass + KICK_STAGE.propellantMass) / 1000, 1)} t is propellant. The spacecraft is ${SPACECRAFT.mass} kg: about 0.2 % of the vehicle on the pad.`,
                    telemetry: ['liftoffMass', 'payloadMass', 'stages', 'liftoffThrust'],
                },
                {
                    id: 'first-stage',
                    title: 'First Stage',
                    focus: 'stage1',
                    segments: [hold(PAD, 8, 'pad', 'stage1', 'stage1')],
                    what: `The lower ${t(FIRST_STAGE.length, 1)} m of the vehicle: kerosene and liquid-oxygen tanks over ${FIRST_STAGE.engines} main engines.`,
                    does: 'Carries the whole vehicle off the pad and through the dense lower atmosphere.',
                    why: 'It does the heaviest work: lifting the full vehicle against gravity and drag at low speed.',
                    happening: 'The first stage is highlighted: tanks, intertank and engine section.',
                    learn: `${t(FIRST_STAGE.propellantMass / 1000)} t of ${FIRST_STAGE.propellant}, ${t(FIRST_STAGE.dryMass / 1000)} t dry. Thrust ${t(FIRST_STAGE.thrustSL / 1000)} kN at sea level, ${t(FIRST_STAGE.thrustVac / 1000)} kN in vacuum; specific impulse ${FIRST_STAGE.ispSL}–${FIRST_STAGE.ispVac} s.`,
                    telemetry: ['liftoffThrust', 'liftoffMass', 'stages'],
                },
                {
                    id: 'upper-stage',
                    title: 'Upper Stage',
                    focus: 'upper',
                    segments: [hold(PAD, 8, 'pad', 'upper', 'upper')],
                    what: 'A restartable liquid-hydrogen / liquid-oxygen stage above the interstage.',
                    does: 'Finishes the climb to orbit, then restarts in orbit for the departure burn.',
                    why: 'Hydrogen engines are the most efficient chemical engines, which matters most once the vehicle is light and high.',
                    happening: 'The interstage turns translucent to show the upper stage inside the stack.',
                    learn: `${t(UPPER_STAGE.propellantMass / 1000, 1)} t of propellant, ${t(UPPER_STAGE.dryMass / 1000, 2)} t dry, ${UPPER_STAGE.engines} engines of ${t(UPPER_STAGE.thrustVac / UPPER_STAGE.engines / 1000, 1)} kN; specific impulse ${UPPER_STAGE.ispVac} s.`,
                    telemetry: ['stages', 'payloadMass', 'liftoffMass'],
                },
                {
                    id: 'engines',
                    title: 'Rocket Engines',
                    focus: 'engines',
                    segments: [hold(PAD, 8, 'pad', 'engines', 'engines')],
                    what: 'Liquid-propellant engines: pumps feed fuel and oxidiser into a combustion chamber, and a bell-shaped nozzle expands the hot gas.',
                    does: 'Turns the chemical energy of the propellant into a high-speed exhaust jet; pushing that mass backwards pushes the rocket forwards.',
                    why: 'Thrust = mass flow × exhaust speed (plus a pressure term). Higher exhaust speed means less propellant for the same change in velocity.',
                    happening: 'The camera moves to the engine section and the nozzles.',
                    learn: `Each first-stage engine burns about ${t(FIRST_STAGE.thrustVac / FIRST_STAGE.ispVac / 9.80665 / FIRST_STAGE.engines)} kg of propellant per second. Specific impulse (${FIRST_STAGE.ispVac} s here) is the exhaust speed divided by g₀: ${t(FIRST_STAGE.ispVac * 9.80665)} m/s.`,
                    telemetry: ['liftoffThrust', 'stages'],
                },
                {
                    id: 'tanks',
                    title: 'Propellant Tanks',
                    focus: 'tanks',
                    segments: [hold(PAD, 8, 'pad', 'tanks', 'tanks')],
                    what: 'Thin-walled tanks that make up most of each stage’s length.',
                    does: 'Hold fuel and oxidiser at controlled pressure and feed the engines.',
                    why: 'Propellant is about 92 % of the liftoff mass; light tanks are what make orbit possible.',
                    happening: 'The stage walls turn translucent: fuel tank, oxidiser tank and the domes between them.',
                    learn: `First stage: ${t(FIRST_STAGE.propellantMass / 1000)} t of kerosene and liquid oxygen. Upper stage: ${t(UPPER_STAGE.propellantMass / 1000, 1)} t of liquid hydrogen and oxygen, kept near −253 °C and −183 °C.`,
                    telemetry: ['liftoffMass', 'stages'],
                },
                {
                    id: 'fairing',
                    title: 'Payload Fairing',
                    focus: 'fairing',
                    segments: [hold(PAD, 8, 'pad', 'fairingOpen', 'fairing')],
                    what: `A ${t(FAIRING.diameter, 1)} m wide, ${t(FAIRING.length, 1)} m long aerodynamic shell in two halves.`,
                    does: 'Protects the spacecraft from air pressure, heating and acoustic noise during the climb through the atmosphere.',
                    why: 'A spacecraft is built for space, not for flying through air at several times the speed of sound.',
                    happening: 'The fairing turns translucent to show the spacecraft inside: a cutaway view, since on the pad the fairing stays closed.',
                    learn: `The fairing (${FAIRING.mass} kg) is dropped as soon as aerodynamic heating falls below about 1,135 W/m²; on this flight at T+${t(fair)} s, ${t(sampleAt(fair, f).altitude / 1000)} km up.`,
                    telemetry: ['payloadMass', 'stages'],
                },
                {
                    id: 'payload',
                    title: 'Spacecraft Payload',
                    focus: 'payload',
                    segments: [hold(PAD, 8, 'pad', 'payload', 'payload')],
                    what: `${SPACECRAFT.name}, a ${SPACECRAFT.mass} kg outer-planet flyby spacecraft, on a solid kick stage.`,
                    does: 'Carries the science instruments, a 3.7 m high-gain antenna and two radioisotope power generators.',
                    why: 'Everything else on the vehicle exists to deliver this spacecraft onto its path to Jupiter.',
                    happening: 'The camera moves to the top of the vehicle; through the translucent fairing, the spacecraft sits on its kick stage.',
                    learn: `Main systems: high-gain antenna, two RTGs (${SPACECRAFT.rtgPowerBOL} W each at launch), magnetometer and science booms, hydrazine thrusters (${SPACECRAFT.hydrazine} kg), flight computer and a ${SPACECRAFT.batteryWh} Wh battery for peaks.`,
                    telemetry: ['payloadMass', 'stages'],
                },
                {
                    id: 'readiness',
                    title: 'Launch Readiness',
                    focus: 'tower',
                    segments: [hold(PAD, 8, 'pad', 'padWide', 'tower')],
                    what: 'The final checks before ignition: propellant loading, pressures, guidance, range and weather.',
                    does: 'Each system reports “go”; any “no-go” holds the count.',
                    why: 'A launch is committed once the engines ignite and the hold-down clamps release.',
                    happening: 'The vehicle is fuelled and venting; the service arms are still attached to the tower.',
                    learn: 'This is a simulated readiness poll: on this conceptual mission every check reports go. Real launches stop the count automatically if a monitored value leaves its limits.',
                    telemetry: ['readiness', 'liftoffMass', 'liftoffThrust'],
                },
            ],
        },
        {
            id: 'liftoff',
            number: '02',
            title: 'Engine Ignition and Liftoff',
            short: 'Liftoff',
            summary: 'Countdown, ignition, thrust build-up and release: the vehicle rises once thrust exceeds its weight.',
            segments: [
                span(-10, -3, 5, 'ascent', 'liftoff'),
                span(-3, 2, 6, 'ascent', 'engineClose', 'engines'),
                span(2, 12, 7, 'ascent', 'liftoff'),
                span(12, 40, 9, 'ascent', 'track'),
            ],
            telemetry: ['met', 'altitude', 'speed', 'acceleration', 'thrust', 'propellant'],
            labels: [
                {
                    id: 'countdown',
                    title: 'Countdown',
                    segments: [span(-10, -3, 7, 'ascent', 'liftoff')],
                    what: 'The last seconds before ignition, run by the launch computers.',
                    does: 'Switches the vehicle to internal power, arms the engines and starts the ignition sequence.',
                    why: 'Hundreds of steps must happen in a fixed order at exact times; people cannot react that quickly.',
                    happening: 'The service arms have swung away; the count reaches T−3 s.',
                    learn: 'From T−10 s the sequence is automatic. Ignition is commanded at T−3 s so the engines reach full thrust before the clamps release at T−0.',
                    telemetry: ['met', 'thrust', 'propellant'],
                },
                {
                    id: 'ignition',
                    title: 'Engine Ignition',
                    focus: 'engines',
                    segments: [span(-3, 0.5, 8, 'ascent', 'engineClose', 'engines')],
                    what: 'The engines start and ramp to full thrust while the vehicle is held down.',
                    does: 'Proves the engines are healthy before the vehicle is released.',
                    why: 'If an engine fails to reach full thrust the computers shut down before liftoff, with the vehicle still on the pad.',
                    happening: `Thrust builds over ${t(2.5, 1)} s; the exhaust flows into the flame trench.`,
                    learn: `At sea level the engines give ${t(FIRST_STAGE.thrustSL / 1000)} kN against a weight of ${t((LIFTOFF_MASS * 9.80665) / 1000)} kN: a thrust-to-weight ratio of ${t(FIRST_STAGE.thrustSL / (LIFTOFF_MASS * 9.80665), 2)}.`,
                    telemetry: ['met', 'thrust', 'acceleration'],
                },
                {
                    id: 'liftoff',
                    title: 'Liftoff',
                    segments: [span(-0.5, 10, 9, 'ascent', 'liftoff')],
                    what: 'The moment the hold-down clamps release and the vehicle rises.',
                    does: 'Starts the climb; the rocket clears the tower a few seconds later.',
                    why: 'Liftoff happens only when thrust exceeds weight; the excess sets the initial acceleration.',
                    happening: `The vehicle climbs vertically and clears the ${t(75)} m tower at T+${t(ev('towerClear'), 1)} s.`,
                    learn: `Net force F = T − D − m·g. At liftoff that is ${t((FIRST_STAGE.thrustSL - LIFTOFF_MASS * 9.80665) / 1000)} kN, giving ${t((FIRST_STAGE.thrustSL / LIFTOFF_MASS - 9.80665), 1)} m/s² upwards.`,
                    telemetry: ['met', 'altitude', 'speed', 'acceleration'],
                },
                {
                    id: 'thrust',
                    title: 'Rocket Thrust',
                    focus: 'plume',
                    segments: [span(2, 30, 9, 'ascent', 'chase', 'plume')],
                    what: 'The force produced by the exhaust jet.',
                    does: 'Rises as the air thins: less outside pressure pushes back on the nozzle exit.',
                    why: 'The same engine gives more thrust in vacuum than at sea level.',
                    happening: 'The plume is narrow at sea level and widens as ambient pressure falls.',
                    learn: `Thrust grows from ${t(FIRST_STAGE.thrustSL / 1000)} kN at sea level towards ${t(FIRST_STAGE.thrustVac / 1000)} kN in vacuum at the same propellant flow.`,
                    telemetry: ['met', 'thrust', 'altitude', 'propellant'],
                },
                {
                    id: 'acceleration',
                    title: 'Acceleration',
                    segments: [span(0, 200, 12, 'ascent', 'chase')],
                    what: 'How quickly the vehicle gains speed, felt on board as g-load.',
                    does: 'Rises through the first-stage burn as propellant is burned and the vehicle gets lighter.',
                    why: `Thrust stays roughly constant while mass falls, so a = F/m grows; the engines throttle back to hold ${VEHICLE.maxAccelerationG} g.`,
                    happening: 'The vehicle accelerates harder as it climbs; watch the g reading rise.',
                    learn: `Sensed acceleration starts at ${t(sampleAt(0.5, f).acceleration / 9.80665, 2)} g and reaches the ${VEHICLE.maxAccelerationG} g limit at T+${t(ev('throttleDown'))} s, when throttling begins.`,
                    telemetry: ['met', 'acceleration', 'throttle', 'mass'],
                },
                {
                    id: 'gravity-turn',
                    title: 'Gravity Turn',
                    segments: [span(10, 90, 10, 'ascent', 'track')],
                    what: 'A gradual tilt from vertical towards horizontal, started by a small pitch-over.',
                    does: 'Lets gravity bend the path while the vehicle keeps its nose in the airflow.',
                    why: 'Orbit needs horizontal speed; turning with zero angle of attack keeps aerodynamic loads low.',
                    happening: 'After rising vertically the vehicle pitches over a few degrees and gravity does the rest of the turn.',
                    learn: 'Pitch-over: 3.4° from vertical at T+14 s, about 44 m/s. From then on the thrust follows the airflow; the flight-path angle falls from 90° to about 10° by first-stage cutoff.',
                    telemetry: ['met', 'flightPath', 'altitude', 'speed'],
                },
            ],
        },
        {
            id: 'ascent',
            number: '03',
            title: 'Atmospheric Ascent',
            short: 'Ascent',
            summary: 'Through the thinning atmosphere: air resistance peaks at Max Q, then falls away as the vehicle climbs.',
            segments: [span(30, 90, 12, 'ascent', 'chase'), span(90, 160, 9, 'ascent', 'onboard'), span(160, meco - 6, 9, 'ascent', 'high')],
            telemetry: ['met', 'altitude', 'speed', 'q', 'mach'],
            labels: [
                {
                    id: 'layers',
                    title: 'Atmospheric Layers',
                    segments: [span(20, 200, 12, 'ascent', 'high')],
                    what: 'The troposphere, stratosphere, mesosphere and thermosphere, defined by how temperature changes with height.',
                    does: 'Air density halves roughly every 5.5 km; above 100 km there is almost none left.',
                    why: 'Density controls drag, aerodynamic heating and how the engines perform.',
                    happening: 'The sky darkens from blue to black as the vehicle climbs through the layers.',
                    learn: `US Standard Atmosphere 1976: density ${atmosphere(0).density.toFixed(3)} kg/m³ at sea level, ${atmosphere(11e3).density.toFixed(3)} at 11 km, ${atmosphere(50e3).density.toExponential(1)} at 50 km.`,
                    telemetry: ['altitude', 'layer', 'density', 'met'],
                },
                {
                    id: 'gravity-turn-2',
                    title: 'Gravity Turn',
                    segments: [span(20, 200, 12, 'ascent', 'track')],
                    what: 'The continuing bend of the trajectory from vertical towards horizontal.',
                    does: 'Converts climbing speed into the horizontal speed an orbit needs.',
                    why: 'An orbit is mostly sideways speed: about 7.8 km/s at 185 km.',
                    happening: 'The vehicle’s path curves over as it accelerates downrange.',
                    learn: `By first-stage cutoff the vehicle is ${t(sampleAt(meco, f).downrange / 1000)} km downrange, ${t(sampleAt(meco, f).altitude / 1000)} km up, flying ${t(sampleAt(meco, f).flightPathDeg, 1)}° above the horizon.`,
                    telemetry: ['flightPath', 'downrange', 'altitude', 'speed'],
                },
                {
                    id: 'drag',
                    title: 'Air Resistance',
                    segments: [span(20, 140, 10, 'ascent', 'chase')],
                    what: 'The aerodynamic drag force D = ½ρv²·C_D·A.',
                    does: 'Opposes the motion; it grows with the square of speed and with air density.',
                    why: 'Drag costs speed and loads the structure; climbing out of the dense air early reduces it.',
                    happening: 'Drag rises as the vehicle speeds up, then falls as the air thins.',
                    learn: `Total drag loss on this ascent is about ${t(f.losses.drag)} m/s, small next to the ${t(f.losses.gravity)} m/s lost to gravity while climbing.`,
                    telemetry: ['q', 'mach', 'airspeed', 'altitude'],
                },
                {
                    id: 'max-q',
                    title: 'Maximum Dynamic Pressure',
                    segments: [span(Math.max(10, maxQ.t - 25), maxQ.t + 25, 12, 'ascent', 'chase')],
                    what: 'Max Q: the moment of greatest aerodynamic pressure on the vehicle.',
                    does: 'Dynamic pressure q = ½ρv² rises with speed and falls with density; its peak sets the structural loads.',
                    why: 'The vehicle and fairing are designed to survive this peak with margin.',
                    happening: `Replaying the interval around Max Q: ${t(maxQ.q / 1000, 1)} kPa at T+${t(maxQ.t, 1)} s.`,
                    learn: `For this vehicle Max Q is ${t(maxQ.q / 1000, 1)} kPa at ${t(maxQ.altitude / 1000, 1)} km and ${t(maxQ.speed)} m/s relative to the air. It is not at a fixed height or speed: it depends on each vehicle’s trajectory.`,
                    telemetry: ['q', 'met', 'altitude', 'airspeed'],
                },
                {
                    id: 'engine-performance',
                    title: 'Engine Performance',
                    focus: 'plume',
                    segments: [span(20, meco - 4, 10, 'ascent', 'chase', 'plume')],
                    what: 'How thrust and propellant use change during the burn.',
                    does: 'Thrust rises with altitude; propellant flow stays constant until the throttle-down.',
                    why: 'Specific impulse improves from sea level to vacuum, so each kilogram of propellant gives more push higher up.',
                    happening: 'The plume expands into a wide bell as the outside pressure drops.',
                    learn: `Propellant flow at full throttle: ${t(FIRST_STAGE.thrustVac / (FIRST_STAGE.ispVac * 9.80665))} kg/s. The tanks are empty at T+${t(meco, 1)} s.`,
                    telemetry: ['thrust', 'propellant', 'throttle', 'altitude'],
                },
                {
                    id: 'flight-path',
                    title: 'Flight Path',
                    focus: 'trajectory',
                    segments: [span(0, meco, 12, 'ascent', 'high', 'trajectory')],
                    what: 'The trajectory the guidance computer commands.',
                    does: 'Balances climbing out of the air against building horizontal speed.',
                    why: 'Too steep wastes propellant fighting gravity; too shallow keeps the vehicle in dense air.',
                    happening: 'The modelled path is drawn behind the vehicle.',
                    learn: `Gravity loss ${t(f.losses.gravity)} m/s, drag loss ${t(f.losses.drag)} m/s: the extra velocity the vehicle must produce beyond the ${t(orbit.speed)} m/s orbital speed.`,
                    telemetry: ['flightPath', 'altitude', 'downrange', 'speed'],
                },
            ],
        },
        {
            id: 'staging',
            number: '04',
            title: 'First-Stage Cutoff and Separation',
            short: 'Staging',
            summary: 'The first stage is empty: its engines shut down, it separates, and the upper stage ignites.',
            segments: [span(meco - 6, meco + 1, 5, 'ascent', 'chase'), span(meco + 1, usIgn + 3, 12, 'ascent', 'staging', 'upper')],
            telemetry: ['met', 'mass', 'speed', 'altitude', 'thrust'],
            labels: [
                {
                    id: 'meco',
                    title: 'Main Engine Cutoff',
                    focus: 'engines',
                    segments: [span(meco - 4, meco + 2, 7, 'ascent', 'staging', 'engines')],
                    what: 'MECO: the first-stage engines shut down.',
                    does: 'Ends the first-stage burn once its usable propellant is gone.',
                    why: 'A stage burns until its tanks are empty; carrying it further would only add dead weight.',
                    happening: `The plume collapses at T+${t(meco, 1)} s.`,
                    learn: `At cutoff: ${t(sampleAt(meco, f).altitude / 1000, 1)} km, ${t(sampleAt(meco, f).speed)} m/s inertial (${t(sampleAt(meco, f).airspeed)} m/s relative to the rotating Earth).`,
                    telemetry: ['met', 'speed', 'altitude', 'propellant'],
                },
                {
                    id: 'separation',
                    title: 'Stage Separation',
                    focus: 'stage1',
                    segments: [span(meco, usIgn + 2, 10, 'ascent', 'staging', 'stage1')],
                    what: 'The interstage joint releases and the empty first stage falls away.',
                    does: 'Separation devices cut the joint and push the stages apart; there is no explosion.',
                    why: 'The upper stage must not be dragging the empty first stage.',
                    happening: `Separation at T+${t(sep, 1)} s; the first stage drifts back and tumbles slowly.`,
                    learn: `The upper stage coasts ${t(usIgn - sep)} s to gain distance before igniting, so its exhaust does not hit the first stage. The first stage is not recovered in this configuration.`,
                    telemetry: ['met', 'mass', 'altitude'],
                },
                {
                    id: 'us-ignition',
                    title: 'Upper-Stage Ignition',
                    focus: 'upper',
                    segments: [span(usIgn - 3, usIgn + 12, 8, 'ascent', 'staging', 'upper')],
                    what: 'The hydrogen-oxygen engines of the upper stage start.',
                    does: 'Continue the acceleration towards orbit.',
                    why: 'Their higher efficiency makes the most of the propellant now that the vehicle is light.',
                    happening: `Ignition at T+${t(usIgn, 1)} s; the long, faint hydrogen plume appears.`,
                    learn: `Upper-stage thrust ${t(UPPER_STAGE.thrustVac / 1000, 1)} kN on a ${t(sampleAt(usIgn, f).mass / 1000, 1)} t vehicle: ${t(UPPER_STAGE.thrustVac / sampleAt(usIgn, f).mass / 9.80665, 2)} g at first.`,
                    telemetry: ['met', 'thrust', 'acceleration', 'mass'],
                },
                {
                    id: 'why-stages',
                    title: 'Why Multiple Stages?',
                    segments: [span(meco - 2, usIgn + 4, 10, 'ascent', 'staging', 'stage1')],
                    what: 'Discarding empty tanks and engines during the flight.',
                    does: 'Each stage only accelerates what is still useful.',
                    why: 'The rocket equation Δv = Isp·g₀·ln(m₀/m_f) rewards a high ratio of starting to final mass, which empty structure ruins.',
                    happening: 'The empty first stage separates and the much lighter upper stage carries on.',
                    learn: `Mass before separation ${t(f.masses.beforeStaging / 1000, 1)} t, after ${t(f.masses.afterStaging / 1000, 1)} t: dropping ${t(FIRST_STAGE.dryMass / 1000)} t of empty first stage removes ${t((FIRST_STAGE.dryMass / f.masses.beforeStaging) * 100)} % of the mass.`,
                    telemetry: ['mass', 'speed', 'met'],
                },
                {
                    id: 'mass-reduction',
                    title: 'Vehicle Mass Reduction',
                    segments: [span(0, usIgn + 10, 12, 'ascent', 'high')],
                    what: 'How the vehicle’s mass falls through the flight.',
                    does: 'Burning propellant and dropping stages reduce mass continuously and in steps.',
                    why: 'Lower mass means the same thrust gives more acceleration.',
                    happening: 'The mass reading falls steadily, then drops at separation.',
                    learn: `Liftoff ${t(LIFTOFF_MASS / 1000, 1)} t → first-stage cutoff ${t(f.masses.beforeStaging / 1000, 1)} t → after separation ${t(f.masses.afterStaging / 1000, 1)} t → in orbit ${t(f.masses.orbit / 1000, 1)} t.`,
                    telemetry: ['mass', 'met', 'propellant'],
                },
            ],
        },
        {
            id: 'fairing',
            number: '05',
            title: 'Payload Fairing Separation',
            short: 'Fairing',
            summary: 'Above the dense atmosphere the fairing is no longer needed: its two halves separate and the spacecraft is exposed to space.',
            segments: [span(usIgn - 1, fair - 0.5, 5, 'ascent', 'fairingSep', 'fairing'), span(fair - 0.5, fair + 14, 11, 'ascent', 'fairingSep', 'payload')],
            telemetry: ['met', 'altitude', 'heating', 'speed'],
            labels: [
                {
                    id: 'fairing-2',
                    title: 'Payload Fairing',
                    focus: 'fairing',
                    segments: [span(usIgn - 1, fair - 0.5, 7, 'ascent', 'fairingSep', 'fairing')],
                    what: 'The two-piece shell around the spacecraft.',
                    does: 'Has shielded the spacecraft from air pressure, heating and noise since liftoff.',
                    why: 'Without it the airflow would destroy antennas, booms and instruments.',
                    happening: 'The upper stage is firing; the fairing is still closed.',
                    learn: `Fairing mass ${FAIRING.mass} kg: every kilogram carried longer than necessary is a kilogram less for the departure.`,
                    telemetry: ['altitude', 'heating', 'met'],
                },
                {
                    id: 'fairing-sep',
                    title: 'Fairing Separation',
                    focus: 'fairing',
                    segments: [span(fair - 1, fair + 12, 10, 'ascent', 'fairingSep', 'fairing')],
                    what: 'Release of the fairing halves.',
                    does: 'Separation joints along the seam and the base release; springs push the halves apart.',
                    why: 'Dropping the fairing early saves mass, but only once the air can no longer harm the spacecraft.',
                    happening: `The halves swing apart at T+${t(fair, 1)} s.`,
                    learn: `The trigger is a heating condition, not a clock: free-molecular heating ½ρv³ below 1,135 W/m² above 100 km. Reached at ${t(sampleAt(fair, f).altitude / 1000, 1)} km.`,
                    telemetry: ['heating', 'altitude', 'met'],
                },
                {
                    id: 'protection',
                    title: 'Spacecraft Protection',
                    focus: 'payload',
                    segments: [span(60, 90, 9, 'ascent', 'chase', 'fairing')],
                    what: 'What the spacecraft is protected from inside the fairing.',
                    does: 'Dynamic pressure, aerodynamic heating and acoustic noise peak in the lower atmosphere.',
                    why: 'Booms, antennas and instruments are designed for space loads, not for air at Mach 2.',
                    happening: 'Max Q, the hardest moment for the structure, as seen from outside the fairing.',
                    learn: `Peak dynamic pressure ${t(maxQ.q / 1000, 1)} kPa: about ${t((maxQ.q * Math.PI * (FAIRING.diameter / 2) ** 2) / 1000)} kN pressing on the fairing’s frontal area.`,
                    telemetry: ['q', 'heating', 'altitude'],
                },
                {
                    id: 'exposure',
                    title: 'Exposure to Space',
                    focus: 'payload',
                    segments: [span(fair, fair + 20, 9, 'ascent', 'fairingSep', 'payload')],
                    what: 'The spacecraft in open space for the first time.',
                    does: 'It is now exposed to direct sunlight, the cold of space and charged particles.',
                    why: 'From here on the spacecraft’s own thermal design keeps it within temperature limits.',
                    happening: 'The kick stage and spacecraft are visible on top of the upper stage.',
                    learn: `Air density at ${t(sampleAt(fair, f).altitude / 1000)} km is ${atmosphere(sampleAt(fair, f).altitude).density.toExponential(1)} kg/m³, about ten million times thinner than at sea level.`,
                    telemetry: ['altitude', 'density', 'speed'],
                },
            ],
        },
        {
            id: 'orbit',
            number: '06',
            title: 'Earth Orbit Insertion',
            short: 'Orbit',
            summary: 'The upper stage flies until the trajectory becomes an orbit, then shuts down in a 185 km parking orbit.',
            segments: [span(fair + 14, seco1 - 25, 10, 'ascent', 'insertion'), span(seco1 - 25, seco1 + 5, 8, 'ascent', 'insertion'), span(seco1 + 5, restart - 30, 10, 'orbit', 'orbitWide', 'trajectory')],
            telemetry: ['met', 'altitude', 'orbitalSpeed', 'perigee', 'apogee'],
            labels: [
                {
                    id: 'orbital-velocity',
                    title: 'Orbital Velocity',
                    segments: [span(fair + 14, seco1 + 2, 12, 'ascent', 'insertion')],
                    what: 'The horizontal speed at which the ground curves away as fast as the vehicle falls.',
                    does: 'At 185 km it is about 7.79 km/s, from v = √(μ/r).',
                    why: 'Below it the vehicle falls back; above it the orbit becomes elliptical.',
                    happening: 'The upper stage keeps accelerating horizontally at almost constant altitude.',
                    learn: `Circular speed at ${VEHICLE.parkingOrbitKm} km: ${t(circularSpeed(R_EARTH + VEHICLE.parkingOrbitKm * 1000))} m/s. The Earth’s rotation gave ${t(sampleAt(-3, f).speed)} m/s of it for free at liftoff.`,
                    telemetry: ['orbitalSpeed', 'altitude', 'met'],
                },
                {
                    id: 'parking-orbit',
                    title: 'Parking Orbit',
                    focus: 'trajectory',
                    segments: [span(seco1, restart - 30, 10, 'orbit', 'orbitWide', 'trajectory')],
                    what: 'A low, nearly circular orbit used as a waiting point.',
                    does: 'Lets the vehicle coast until it reaches the right place for the departure burn.',
                    why: 'The departure must point the escape trajectory in the right direction relative to the Earth’s motion around the Sun.',
                    happening: 'The orbit is drawn around the Earth; the vehicle coasts.',
                    learn: `Parking orbit ${t(orbit.perigeeKm)} × ${t(orbit.apogeeKm)} km, period ${t(orbit.periodMin, 1)} min. The coast to the departure point lasts ${t((restart - seco1) / 60)} minutes.`,
                    telemetry: ['perigee', 'apogee', 'period', 'met'],
                },
                {
                    id: 'orbital-altitude',
                    title: 'Orbital Altitude',
                    segments: [span(seco1, restart - 30, 9, 'orbit', 'orbitWide', 'trajectory')],
                    what: 'The height of the orbit above the surface.',
                    does: 'Sets the orbital speed and period, and how quickly residual air slows the vehicle.',
                    why: 'At 185 km air drag would bring a vehicle down within days, which is fine for a short parking orbit.',
                    happening: 'The orbit’s lowest and highest points (perigee and apogee) are marked.',
                    learn: `Perigee ${t(orbit.perigeeKm, 1)} km, apogee ${t(orbit.apogeeKm, 1)} km.`,
                    telemetry: ['perigee', 'apogee', 'altitude'],
                },
                {
                    id: 'inclination',
                    title: 'Orbital Inclination',
                    segments: [span(seco1, restart - 30, 9, 'orbit', 'orbitWide', 'trajectory')],
                    what: 'The tilt of the orbit plane relative to the equator.',
                    does: 'A due-east launch from latitude φ gives an inclination equal to φ.',
                    why: 'Changing an orbit’s plane later is very costly, so the launch site and direction set it.',
                    happening: 'The orbit plane is tilted 10° to the equator.',
                    learn: `cos i = cos φ · sin Az with φ = ${VEHICLE.siteLatitudeDeg}° and Az = ${VEHICLE.launchAzimuthDeg}°: i = ${t(orbit.inclinationDeg, 1)}°.`,
                    telemetry: ['inclination', 'period'],
                },
                {
                    id: 'seco',
                    title: 'Engine Cutoff',
                    focus: 'engines',
                    segments: [span(seco1 - 12, seco1 + 4, 8, 'ascent', 'insertion', 'engines')],
                    what: 'The first upper-stage cutoff.',
                    does: 'Ends the burn when the computed orbit’s perigee reaches the target.',
                    why: 'Cutting off on the orbit, not on a clock, absorbs small differences in engine performance.',
                    happening: `Cutoff at T+${t(seco1, 1)} s; the vehicle is in orbit.`,
                    learn: `${t(f.upperStagePropAtOrbit / 1000, 2)} t of upper-stage propellant remains for the departure burn.`,
                    telemetry: ['met', 'orbitalSpeed', 'perigee', 'propellant'],
                },
                {
                    id: 'why-orbit',
                    title: 'Why Spacecraft Stay in Orbit',
                    segments: [span(seco1, restart - 30, 12, 'orbit', 'orbitWide', 'trajectory')],
                    what: 'An orbit is continuous free fall.',
                    does: 'Gravity bends the path; the horizontal speed keeps the vehicle missing the ground.',
                    why: 'Orbit depends on position and velocity together, not on reaching a particular altitude.',
                    happening: 'A quarter of an orbit, time-compressed, with the vehicle never thrusting.',
                    learn: `Vis-viva: v² = μ(2/r − 1/a). Specific energy at insertion ${t(elements(sampleAt(seco1, f).x, sampleAt(seco1, f).y, sampleAt(seco1, f).vx, sampleAt(seco1, f).vy).energy / 1e6, 1)} MJ/kg: negative, so the orbit is bound.`,
                    telemetry: ['orbitalSpeed', 'period', 'altitude'],
                },
            ],
        },
        {
            id: 'departure',
            number: '07',
            title: 'Earth Departure',
            short: 'Departure',
            summary: 'The upper stage restarts, then the solid kick stage fires: the stack leaves Earth on an escape trajectory towards Jupiter.',
            segments: [
                span(seco1 + 300, restart, 6, 'departure', 'departureWide', 'trajectory'),
                span(restart, seco2, 9, 'departure', 'burnChase', 'engines'),
                span(seco2, kickIgn, 4, 'departure', 'kick', 'kick'),
                span(kickIgn, burnout + 4, 8, 'departure', 'kick', 'kick'),
                span(burnout + 4, burnout + 7200, 8, 'departure', 'departureWide', 'trajectory'),
                hold(burnout + 86400, 9, 'helio', 'helio', 'trajectory'),
            ],
            telemetry: ['met', 'speed', 'escapeSpeed', 'c3', 'earthDistance'],
            labels: [
                {
                    id: 'parking-2',
                    title: 'Earth Parking Orbit',
                    focus: 'trajectory',
                    segments: [span(seco1 + 300, restart, 8, 'departure', 'departureWide', 'trajectory')],
                    what: 'The coast before departure.',
                    does: 'Brings the vehicle to the point where the departure burn must happen.',
                    why: 'The escape path must leave Earth in the direction set by the launch window.',
                    happening: `Coasting for ${t((restart - seco1) / 60)} minutes (time compressed).`,
                    learn: 'Launch windows for Jupiter open roughly every 13 months, when Earth and Jupiter are suitably placed; the parking orbit fixes the exact departure point within the day.',
                    telemetry: ['met', 'altitude', 'orbitalSpeed'],
                },
                {
                    id: 'departure-burn',
                    title: 'Departure Burn',
                    focus: 'engines',
                    segments: [span(restart - 10, seco2 + 5, 10, 'departure', 'burnChase', 'engines')],
                    what: 'The upper stage’s second burn.',
                    does: 'Adds speed along the direction of motion, raising the orbit’s energy until it is no longer bound.',
                    why: 'Burning low and fast (the Oberth effect) gives the most energy per kilogram of propellant.',
                    happening: `The upper stage fires for ${t(seco2 - restart)} s; the vehicle passes escape speed at T+${t(ev('escape'))} s.`,
                    learn: `Speed rises from ${t(sampleAt(restart, f).speed)} to ${t(sampleAt(seco2, f).speed)} m/s; escape speed at that height is ${t(escapeSpeed(R_EARTH + sampleAt(seco2, f).altitude))} m/s.`,
                    telemetry: ['speed', 'escapeSpeed', 'c3', 'acceleration'],
                },
                {
                    id: 'delta-v',
                    title: 'Delta-v',
                    segments: [span(restart, burnout + 4, 12, 'departure', 'burnChase')],
                    what: 'The change in velocity a manoeuvre needs: the currency of spaceflight.',
                    does: 'Each burn spends propellant to buy Δv according to the rocket equation.',
                    why: 'The mission is feasible only if the vehicle can supply the Δv the trajectory demands.',
                    happening: 'Two burns in sequence: the upper stage, then the kick stage.',
                    learn: `An instant burn from 185 km to C3 = ${t(EARTH_JUPITER.c3 / 1e6, 1)} km²/s² (a minimum-energy transfer to Jupiter) needs 6.31 km/s. This vehicle reaches C3 = ${t(c3, 1)} km²/s².`,
                    telemetry: ['c3', 'speed', 'mass'],
                },
                {
                    id: 'kick',
                    title: 'Kick Stage',
                    focus: 'kick',
                    segments: [span(seco2, burnout + 4, 10, 'departure', 'kick', 'kick')],
                    what: `A ${t((KICK_STAGE.propellantMass + KICK_STAGE.inertMass) / 1000, 2)} t solid rocket motor under the spacecraft.`,
                    does: 'After the upper stage separates, it spins up for stability and burns all its propellant in one go.',
                    why: 'A third stage adds the last few km/s an outer-planet mission needs.',
                    happening: `Separation at T+${t(kickSep)} s, ignition at T+${t(kickIgn)} s, burnout at T+${t(burnout)} s.`,
                    learn: `Thrust ${t(KICK_STAGE.thrust / 1000, 1)} kN for ${t(burnout - kickIgn)} s; the spacecraft feels up to ${t(KICK_STAGE.thrust / (KICK_STAGE.inertMass + SPACECRAFT.mass) / 9.80665, 1)} g at the end of the burn.`,
                    telemetry: ['met', 'speed', 'acceleration', 'c3'],
                },
                {
                    id: 'escape',
                    title: 'Escape Trajectory',
                    focus: 'trajectory',
                    segments: [span(burnout + 4, burnout + 7200, 12, 'departure', 'departureWide', 'trajectory')],
                    what: 'An open, hyperbolic path away from Earth.',
                    does: 'The spacecraft keeps a leftover speed (v∞) after climbing out of Earth’s gravity.',
                    why: 'That excess speed, added to Earth’s 29.8 km/s around the Sun, sets the orbit to Jupiter.',
                    happening: 'The escape hyperbola is drawn; the first two hours are time-compressed.',
                    learn: `C3 = v∞² = ${t(c3, 1)} km²/s², so v∞ = ${t(Math.sqrt(c3), 2)} km/s.`,
                    telemetry: ['c3', 'earthDistance', 'speed'],
                },
                {
                    id: 'sun-centred',
                    title: 'Sun-Centered Orbit',
                    focus: 'trajectory',
                    segments: [hold(burnout + 86400, 12, 'helio', 'helio', 'trajectory')],
                    what: 'The spacecraft’s orbit around the Sun after it leaves Earth’s influence.',
                    does: 'Earth’s orbital speed plus v∞ puts the spacecraft on an ellipse reaching out to Jupiter.',
                    why: 'A spacecraft cannot fly straight to a planet: it follows an orbit around the Sun and meets the planet where its orbit crosses Jupiter’s.',
                    happening: 'Scientific-scale view: orbits of Earth and Jupiter to scale; the Sun and planets are enlarged so they can be seen.',
                    learn: `A minimum-energy (Hohmann) transfer needs C3 = ${t(EARTH_JUPITER.c3 / 1e6, 1)} km²/s² and takes ${t(EARTH_JUPITER.tofYears, 2)} years. With C3 = ${t(c3, 1)} km²/s² the transfer can be faster; the cruise is the subject of the next phase.`,
                    telemetry: ['transfer', 'c3'],
                },
            ],
        },
        {
            id: 'deploy',
            number: '08',
            title: 'Spacecraft Separation and Deployment',
            short: 'Deployment',
            summary: 'The spacecraft separates from the spent kick stage, stabilises, deploys its booms and makes first contact with Earth.',
            segments: [
                span(scSep - 20, scSep + 120, 8, 'deploy', 'sepClose', 'spacecraft'),
                span(scSep + 120, scSep + 560, 10, 'deploy', 'deployWide', 'booms'),
                span(scSep + 560, scSep + 900, 8, 'deploy', 'antenna', 'antenna'),
            ],
            telemetry: ['rtg', 'battery', 'busVolts', 'attitude', 'link', 'health'],
            labels: [
                {
                    id: 'sc-sep',
                    title: 'Spacecraft Separation',
                    focus: 'spacecraft',
                    segments: [span(scSep - 20, scSep + 60, 8, 'deploy', 'sepClose', 'spacecraft')],
                    what: 'The spacecraft’s release from the spent kick stage.',
                    does: 'A clamp band opens and springs push the two apart at about 0.5 m/s.',
                    why: 'From here the spacecraft flies alone, on the trajectory the launch vehicle gave it.',
                    happening: `Separation at T+${t(scSep)} s, ${t(sampleAt(scSep, f).altitude / 1000)} km from Earth’s surface and climbing.`,
                    learn: 'On real outer-planet missions the departure is flown by the launch vehicle, so the spacecraft separates already on its escape path. Its own thrusters are for small corrections.',
                    telemetry: ['health', 'attitude', 'earthDistance'],
                },
                {
                    id: 'attitude',
                    title: 'Attitude Control',
                    focus: 'thrusters',
                    segments: [span(scSep, scSep + 200, 9, 'deploy', 'sepClose', 'thrusters')],
                    what: 'Control of which way the spacecraft points.',
                    does: 'Small hydrazine thrusters damp the tumble left by separation, then Sun and star sensors fix the orientation.',
                    why: 'The antenna must point at Earth and the instruments at their targets.',
                    happening: 'Thruster pulses slow the tip-off rotation to almost nothing.',
                    learn: `Rate after separation 1.2°/s, under 0.1°/s by ${t(150 / 60, 1)} minutes later.`,
                    telemetry: ['attitude', 'health'],
                },
                {
                    id: 'rtg-boom',
                    title: 'RTG Boom Deployment',
                    focus: 'rtg',
                    segments: [span(scSep + 190, scSep + 300, 9, 'deploy', 'eps', 'rtg')],
                    what: 'The boom that carries the two radioisotope thermoelectric generators away from the spacecraft body.',
                    does: 'Swings out and latches, keeping the generators’ heat and radiation away from the instruments.',
                    why: 'RSC-1 has no solar arrays: at Jupiter sunlight is only 3.7 % as strong as at Earth, so it is powered by radioisotope generators.',
                    happening: 'The RTG boom unfolds; the magnetometer and science booms follow.',
                    learn: 'Solar power falls with the square of the distance from the Sun; radioisotope power falls only with the decay of plutonium-238 (half-life 87.7 years) and the slow ageing of the thermocouples.',
                    telemetry: ['rtg', 'loads', 'health'],
                },
                {
                    id: 'eps',
                    title: 'Electrical Power System',
                    focus: 'eps',
                    segments: [span(scSep + 200, scSep + 560, 10, 'deploy', 'eps', 'eps')],
                    what: 'Generators, a shunt regulator, a 30 V bus, a battery and the loads it feeds.',
                    does: 'The regulator holds the bus at 30 V and dissipates surplus power; the battery stands by for any peak above the generators’ output.',
                    why: 'Power is the one resource every subsystem depends on: the same question as iTelematics’ Satellite Energy Intelligence research.',
                    happening: 'Power paths are highlighted: generators → regulator → bus → battery and loads.',
                    learn: `RTG output ${t(powerAt(0).rtg)} W at launch. Loads peak near ${t(Math.max(...[200, 260, 400, 500].map((x) => powerAt(x).loads)))} W while a boom motor runs, so here the battery only tops up and the regulator dissipates the rest. The balance closes at every second: generated = used + stored + dissipated.`,
                    telemetry: ['rtg', 'loads', 'battery', 'busVolts'],
                },
                {
                    id: 'computer',
                    title: 'Onboard Computers',
                    focus: 'computer',
                    segments: [span(scSep + 100, scSep + 700, 9, 'deploy', 'computer', 'computer')],
                    what: 'The redundant flight computers inside the spacecraft body.',
                    does: 'Run the deployment sequence, attitude control and fault protection on their own.',
                    why: 'Far from Earth, commands take minutes to hours to arrive, so the spacecraft must protect itself.',
                    happening: 'The deployment sequence runs automatically from separation.',
                    learn: 'The sequence: rate damping, Sun and star acquisition, three boom deployments, transmitter on, ground contact, health check. All triggered by elapsed time and sensor conditions.',
                    telemetry: ['attitude', 'health', 'loads'],
                },
                {
                    id: 'comms',
                    title: 'Communication System',
                    focus: 'antenna',
                    segments: [span(scSep + 500, scSep + 900, 9, 'deploy', 'antenna', 'antenna')],
                    what: `A ${SPACECRAFT.highGainAntennaM} m high-gain dish and a low-gain antenna, with an X-band radio.`,
                    does: 'The low-gain antenna works in almost any orientation near Earth; the dish is needed for the long distances later.',
                    why: 'Data rate falls with the square of distance; a large dish pointed at Earth keeps the link usable.',
                    happening: 'The transmitter switches on and the low-gain antenna downlink begins.',
                    learn: `One-way light time grows with distance: t = d / c. At separation it is ${t(((sampleAt(scSep, f).altitude + R_EARTH) / C_LIGHT) * 1000, 1)} ms; at Jupiter it is 35–52 minutes.`,
                    telemetry: ['link', 'lightTime', 'earthDistance'],
                },
                {
                    id: 'first-contact',
                    title: 'First Contact',
                    focus: 'antenna',
                    segments: [span(scSep + 520, scSep + 680, 8, 'deploy', 'antenna', 'antenna')],
                    what: 'The first signal received on the ground after separation.',
                    does: 'Confirms the spacecraft is alive, powered and pointing correctly.',
                    why: 'Until first contact nobody on the ground knows whether separation went well.',
                    happening: 'A ground station acquires the downlink 10 minutes after separation.',
                    learn: 'This contact time is a scenario input of the reference mission (simulated); real first contact depends on which ground stations can see the spacecraft.',
                    telemetry: ['link', 'health', 'lightTime'],
                },
                {
                    id: 'health-check',
                    title: 'Initial Health Check',
                    segments: [span(scSep + 700, scSep + 1150, 9, 'deploy', 'deployWide', 'spacecraft')],
                    what: 'The first checkout of every subsystem.',
                    does: 'Compares temperatures, voltages, currents and rates with their expected ranges.',
                    why: 'Problems found now can be worked around before the long cruise begins.',
                    happening: 'Instruments switch on; the readings are compared with limits.',
                    learn: 'Health states used: Nominal, Warning, Degraded, Safe Mode, Unavailable. Every reading here comes from the simulated power and attitude models.',
                    telemetry: ['health', 'rtg', 'battery', 'loads'],
                },
            ],
        },
    ];
    return { chapters, intro };
}

// ── Telemetry ─────────────────────────────────────────────────────────────

export interface Reading {
    label: string;
    value: string;
    tone?: 'nominal' | 'solar' | 'fault' | 'telemetry';
}

const km = (m: number) => (Math.abs(m) < 1000 ? `${m.toFixed(0)} m` : `${(m / 1000).toFixed(m < 1e5 ? 1 : 0)} km`);
const speedStr = (v: number) => (v < 1000 ? `${v.toFixed(0)} m/s` : `${(v / 1000).toFixed(2)} km/s`);

export function formatMet(t: number) {
    const sign = t < 0 ? '−' : '+';
    const a = Math.abs(Math.round(t));
    const h = Math.floor(a / 3600);
    const m = Math.floor((a % 3600) / 60);
    const s = a % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `T${sign}${h ? `${pad(h)}:` : ''}${pad(m)}:${pad(s)}`;
}

/** One telemetry reading at mission elapsed time `met`. */
export function reading(key: TKey, met: number): Reading {
    const f = flight();
    const s = sampleAt(met, f);
    const scSep = eventTime('scSep', f);
    const afterSep = met - scSep;
    const stageProp = () => {
        if (s.phase === 'pad' || s.phase === 'ignition' || s.phase === 'stage1') return { name: 'First stage', frac: s.prop1 / FIRST_STAGE.propellantMass };
        if (s.phase === 'kick' || s.phase === 'kickCoast' || s.phase === 'escape') return { name: 'Kick stage', frac: s.propKick / KICK_STAGE.propellantMass };
        return { name: 'Upper stage', frac: s.prop2 / UPPER_STAGE.propellantMass };
    };
    const el = elements(s.x, s.y, s.vx, s.vy, MU_EARTH);
    switch (key) {
        case 'met':
            return { label: 'Mission time', value: formatMet(met) };
        case 'altitude':
            return { label: 'Altitude', value: km(Math.max(0, s.altitude)) };
        case 'speed':
            return { label: 'Velocity (inertial)', value: speedStr(s.speed) };
        case 'airspeed':
            return { label: 'Speed relative to air', value: speedStr(s.airspeed) };
        case 'acceleration':
            return { label: 'Acceleration', value: `${(s.acceleration / 9.80665).toFixed(2)} g` };
        case 'thrust':
            return { label: 'Engine thrust', value: s.thrust > 0 ? `${(s.thrust / 1000).toFixed(0)} kN` : 'Off' };
        case 'propellant': {
            const p = stageProp();
            return { label: `${p.name} propellant`, value: `${(p.frac * 100).toFixed(0)} %`, tone: p.frac < 0.1 ? 'solar' : undefined };
        }
        case 'q':
            return { label: 'Dynamic pressure', value: `${(s.q / 1000).toFixed(1)} kPa`, tone: Math.abs(met - f.maxQ.t) < 6 ? 'solar' : undefined };
        case 'mach':
            return { label: 'Mach', value: s.altitude < 86e3 ? s.mach.toFixed(2) : '—' };
        case 'mass':
            return { label: 'Vehicle mass', value: `${(s.mass / 1000).toFixed(s.mass < 1e4 ? 2 : 1)} t` };
        case 'heating':
            return { label: 'Heating ½ρv³', value: s.heating > 1e5 ? `${(s.heating / 1e6).toFixed(2)} MW/m²` : `${(s.heating / 1000).toFixed(2)} kW/m²`, tone: s.heating < 1135 && s.altitude > 1e5 ? 'nominal' : undefined };
        case 'downrange':
            return { label: 'Downrange', value: km(Math.max(0, s.downrange)) };
        case 'flightPath':
            return { label: 'Flight-path angle', value: `${s.flightPathDeg.toFixed(1)}°` };
        case 'density':
            return { label: 'Air density', value: `${atmosphere(s.altitude).density.toExponential(2)} kg/m³` };
        case 'layer':
            return { label: 'Layer', value: layerName(s.altitude) };
        case 'throttle':
            return { label: 'Throttle', value: s.thrust > 0 ? `${(s.throttle * 100).toFixed(0)} %` : 'Off' };
        case 'liftoffMass':
            return { label: 'Rocket mass', value: `${(LIFTOFF_MASS / 1000).toFixed(1)} t` };
        case 'payloadMass':
            return { label: 'Spacecraft mass', value: `${SPACECRAFT.mass} kg` };
        case 'stages':
            return { label: 'Configuration', value: '2 stages + solid kick stage' };
        case 'liftoffThrust':
            return { label: 'Liftoff thrust', value: `${(FIRST_STAGE.thrustSL / 1000).toFixed(0)} kN` };
        case 'readiness':
            return { label: 'Launch readiness', value: met < -3 ? 'GO (simulated)' : 'Committed', tone: 'nominal' };
        case 'perigee':
            return { label: 'Perigee', value: el.energy < 0 ? km(el.rp - R_EARTH) : '—' };
        case 'apogee':
            return { label: 'Apogee', value: el.energy < 0 ? km(el.ra - R_EARTH) : 'Escape' };
        case 'period':
            return { label: 'Orbital period', value: el.energy < 0 && el.rp > R_EARTH ? `${(el.period / 60).toFixed(1)} min` : '—' };
        case 'inclination':
            return { label: 'Inclination', value: `${VEHICLE.siteLatitudeDeg.toFixed(1)}°` };
        case 'orbitalSpeed':
            return { label: 'Orbital velocity', value: speedStr(s.speed) };
        case 'escapeSpeed':
            return { label: 'Escape speed here', value: speedStr(escapeSpeed(s.altitude + R_EARTH)) };
        case 'c3':
            return { label: 'Energy C3', value: `${(el.c3 / 1e6).toFixed(1)} km²/s²`, tone: el.c3 > 0 ? 'nominal' : undefined };
        case 'earthDistance':
            return { label: 'Distance from Earth', value: km(s.altitude + R_EARTH) };
        case 'lightTime':
            return { label: 'One-way light time', value: `${(((s.altitude + R_EARTH) / C_LIGHT) * 1000).toFixed(1)} ms` };
        case 'rtg':
            return { label: 'RTG output', value: `${powerAt(Math.max(0, afterSep)).rtg.toFixed(0)} W` };
        case 'loads':
            return { label: 'Electrical load', value: `${powerAt(Math.max(0, afterSep)).loads.toFixed(0)} W` };
        case 'battery': {
            const p = powerAt(Math.max(0, afterSep));
            return { label: 'Battery', value: `${(p.soc * 100).toFixed(0)} % ${p.battery < -0.5 ? 'discharging' : p.battery > 0.5 ? 'charging' : 'full'}`, tone: p.battery < -0.5 ? 'solar' : undefined };
        }
        case 'busVolts':
            return { label: 'Bus voltage', value: `${powerAt(Math.max(0, afterSep)).busVolts.toFixed(1)} V` };
        case 'attitude': {
            const a = attitudeAt(Math.max(0, afterSep));
            return { label: 'Attitude', value: `${a.rate.toFixed(2)}°/s`, tone: a.rate < 0.1 ? 'nominal' : 'solar' };
        }
        case 'link':
            return { label: 'Link', value: linkAt(Math.max(0, afterSep)), tone: linkAt(Math.max(0, afterSep)).startsWith('Locked') ? 'nominal' : undefined };
        case 'health': {
            const h = healthAt(Math.max(0, afterSep));
            return { label: 'Spacecraft health', value: h, tone: h === 'Nominal' ? 'nominal' : 'solar' };
        }
        case 'transfer':
            return { label: 'Minimum-energy transfer', value: `${EARTH_JUPITER.tofYears.toFixed(2)} years` };
    }
}

/** Boom deployment state for the 3D model at MET. */
export const boomsAtMet = (met: number) => boomsAt(met - eventTime('scSep'));
