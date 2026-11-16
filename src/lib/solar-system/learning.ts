/**
 * Learning layer of the Solar System experience: what the guided mission says while it plays, and how
 * a visitor checks and keeps what they saw.
 *
 * For every chapter:
 * - beats: short narration lines tied to the modelled events (MET from the flight simulation or the
 *   trajectory), shown in the caption at the moment they happen and marked on the scrub bar;
 * - hero: the two readings the caption shows (the chapter's subject, not just the first two keys);
 * - chart: a reading plotted over the chapter's mission time, with "now" and the key event marked;
 * - science: the scientific view of the chapter (diagram or engineering view), one toggle away;
 * - recap and check: three points to keep and one question, shown when the chapter ends.
 *
 * Every number is computed from the same models as the scene and the readings (flight.ts,
 * trajectory.ts, spacecraft.ts, bodies.ts); nothing here is typed in by hand.
 */
import { body, type BodyId } from './bodies';
import { AU, MU_EARTH } from './constants';
import { DAY, isoDate, norm, state, sub } from './ephemeris';
import { eventTime, flight, sampleAt, SEQUENCE } from './flight';
import { storySeconds, type Focus, type SceneId, type Segment, type ShotId, type TKey } from './mission';
import { elements } from './orbit';
import { dateOf, DISCOVERY_STOPS, journey, metOf, STOP_HOLD, STOP_TRAVEL } from './phaseB';
import { powerAt, rtgPower } from './spacecraft';
import { CONSTRAINTS, conjunctions, flybyPosition as flybyAt, flybySpeed, missionTrajectory, planetAt, spacecraftAt } from './trajectory';
import { FIRST_STAGE, KICK_STAGE, LIFTOFF_MASS, SPACECRAFT, UPPER_STAGE } from './vehicle';

export interface Beat {
    /** Story seconds from the start of the chapter's cinematic programme. */
    t: number;
    text: string;
}

export interface Check {
    question: string;
    options: string[];
    answer: number;
    explain: string;
}

/** Numeric series that can be charted against mission time. */
export type SeriesKey = 'q' | 'altitude' | 'speed' | 'acceleration' | 'mass' | 'heating' | 'c3' | 'loads' | 'rtg' | 'soc' | 'sunDist' | 'lightTime' | 'helioSpeed' | 'escapeSun' | 'jupSpeed';

export interface ChartSpec {
    title: string;
    unit: string;
    series: { key: SeriesKey; label: string }[];
    /** MET range plotted, s. */
    range: [number, number];
    log?: boolean;
    /** A marked moment (e.g. Max Q). */
    mark?: { met: number; text: string };
    /** A horizontal reference line (e.g. the 3° conjunction limit). */
    line?: { value: number; text: string };
}

export interface Lesson {
    beats: Beat[];
    hero: TKey[];
    chart?: ChartSpec;
    science?: { label: string; text: string; segments: Segment[] };
    recap: string[];
    check: Check;
}

const hold = (met: number, seconds: number, scene: SceneId, shot: ShotId, focus?: Focus, b?: BodyId): Segment => ({ met: [met, met], seconds, scene, shot, focus, body: b });
const span = (a: number, b: number, seconds: number, scene: SceneId, shot: ShotId, focus?: Focus): Segment => ({ met: [a, b], seconds, scene, shot, focus });

/** Story time (s) at which a programme first shows mission time `met`. */
export function storyTimeOf(segments: readonly Segment[], met: number) {
    let start = 0;
    for (const s of segments) {
        if (s.met[1] > s.met[0] && met >= s.met[0] && met <= s.met[1]) return start + ((met - s.met[0]) / (s.met[1] - s.met[0])) * s.seconds;
        if (met < s.met[0]) return start;
        start += s.seconds;
    }
    return storySeconds(segments);
}

const n0 = (x: number) => x.toFixed(0);
const n1 = (x: number) => x.toFixed(1);
const n2 = (x: number) => x.toFixed(2);
const tPlus = (s: number) => `T+${Math.round(s)} s`;
const g = 9.80665;

let built: Record<string, Lesson> | null = null;

/** The learning layer for each chapter id. */
export function lessons(): Record<string, Lesson> {
    return (built ??= build());
}

function build(): Record<string, Lesson> {
    const f = flight();
    const ev = (id: Parameters<typeof eventTime>[0]) => eventTime(id, f);
    const { chapters } = journey();
    const seg = (id: string) => chapters.find((c) => c.id === id)!.segments;
    // Beats written by MET are placed on the chapter's own story time.
    const at = (id: string, list: { met?: number; t?: number; text: string }[]): Beat[] => list.map((b) => ({ t: b.t ?? storyTimeOf(seg(id), b.met!), text: b.text })).sort((a, b) => a.t - b.t);

    const meco = ev('meco');
    const sep = ev('stageSep');
    const usIgn = ev('usIgnition');
    const fair = ev('fairingSep');
    const seco1 = ev('seco1');
    const restart = ev('usRestart');
    const seco2 = ev('seco2');
    const kickSep = ev('kickSep');
    const kickIgn = ev('kickIgnition');
    const escape = ev('escape');
    const burnout = ev('kickBurnout');
    const scSep = ev('scSep');
    const maxQ = f.maxQ;
    const tw = FIRST_STAGE.thrustSL / (LIFTOFF_MASS * g);
    const propShare = ((FIRST_STAGE.propellantMass + UPPER_STAGE.propellantMass + KICK_STAGE.propellantMass) / LIFTOFF_MASS) * 100;
    const m = missionTrajectory();
    const J = metOf(m.jupiter);
    const S = metOf(m.saturn);
    const D = DAY;
    const c3 = (met: number) => {
        const s = sampleAt(met, f);
        return elements(s.x, s.y, s.vx, s.vy, MU_EARTH).c3 / 1e6;
    };
    const vHelioIn = norm(m.leg1.v2) / 1000;
    const vHelioOut = norm(m.leg2.v1) / 1000;
    const turn = (m.flyby.turn * 180) / Math.PI;
    const conj = conjunctions().find((w) => w.end >= m.jupiter - 2 && w.start <= m.jupiter);
    const sunAU = (met: number) => norm(spacecraftAt(dateOf(met)).r) / AU;
    const lightMin = (met: number) => {
        const t = dateOf(met);
        return norm(sub(spacecraftAt(t).r, state('earth', t).r)) / 299792458 / 60;
    };
    const tourStops = DISCOVERY_STOPS;

    return {
        prep: {
            beats: at('prep', [
                { t: 0, text: `RLV-1 on the pad: ${n0(LIFTOFF_MASS / 1000)} t, fuelled and venting. Two liquid stages, then a solid kick stage under the fairing.` },
                { t: 6, text: 'From the bottom: twin kerosene engines, the first-stage tanks, the interstage, the hydrogen upper stage and the fairing.' },
                { t: 16, text: `About ${n0(propShare)} % of what stands here is propellant. The spacecraft, the reason for all of it, is ${SPACECRAFT.mass} kg.` },
            ]),
            hero: ['liftoffMass', 'payloadMass'],
            science: {
                label: 'Engineering cutaway',
                text: 'Cutaways open the stage walls: the kerosene and oxygen tanks of the first stage, then the hydrogen upper stage inside the interstage.',
                segments: [hold(-90, 9, 'pad', 'tanks', 'tanks'), hold(-90, 8, 'pad', 'upper', 'upper')],
            },
            recap: [
                `A launch vehicle is mostly propellant: ${n0(propShare)} % of its ${n0(LIFTOFF_MASS / 1000)} t on the pad.`,
                'Each stage is dropped when its tanks are empty, so the rest has less mass to accelerate.',
                `The ${SPACECRAFT.mass} kg spacecraft rides at the top, protected by the fairing.`,
            ],
            check: {
                question: 'Roughly what share of the vehicle on the pad is the spacecraft?',
                options: ['About 20 %', 'About 2 %', 'About 0.2 %'],
                answer: 2,
                explain: `${SPACECRAFT.mass} kg out of ${n0(LIFTOFF_MASS / 1000)} t: about ${n2((SPACECRAFT.mass / LIFTOFF_MASS) * 100)} %. Everything else exists to accelerate it.`,
            },
        },
        liftoff: {
            beats: at('liftoff', [
                { met: -10, text: 'T−10 s: the launch computers run the final count on their own.' },
                { met: -3, text: 'T−3 s: ignition. The engines build to full thrust while clamps hold the vehicle down.' },
                { met: 0, text: `T−0: thrust is ${n2(tw)} times the weight. The clamps release and the vehicle rises.` },
                { met: ev('towerClear'), text: `${tPlus(ev('towerClear'))}: tower clear.` },
                { met: SEQUENCE.verticalRise, text: `${tPlus(SEQUENCE.verticalRise)}: a ${SEQUENCE.pitchOverDeg}° pitch-over. From here gravity bends the path into the turn.` },
            ]),
            hero: ['thrust', 'acceleration'],
            chart: { title: 'Altitude', unit: 'km', series: [{ key: 'altitude', label: 'Altitude' }], range: [0, 40] },
            science: { label: 'Flight path', text: 'The modelled path drawn behind the vehicle: straight up past the tower, then bending over after the pitch-over.', segments: [span(0, 60, 12, 'ascent', 'high', 'trajectory')] },
            recap: [
                'The engines are proven at full thrust before release: a bad start never leaves the pad.',
                `The vehicle rises only once thrust exceeds weight; the excess gives ${n1(FIRST_STAGE.thrustSL / LIFTOFF_MASS - g)} m/s² at liftoff.`,
                'A small pitch-over lets gravity turn the path towards horizontal, with no side loads.',
            ],
            check: {
                question: 'At T−1 s the engines are at full thrust. Why is the vehicle not moving yet?',
                options: ['Thrust is still below its weight', 'Clamps hold it until the engines are proven', 'The engines start pointing sideways'],
                answer: 1,
                explain: `Thrust is already ${n2(tw)} times the weight; the hold-down clamps release only when every engine reports full thrust.`,
            },
        },
        ascent: {
            beats: at('ascent', [
                { met: 30, text: 'Climbing through the lower atmosphere: as speed rises, so does the air pushing on the vehicle.' },
                { met: maxQ.t - 5, text: `Max Q at ${tPlus(maxQ.t)}: ${n1(maxQ.q / 1000)} kPa, ${n1(maxQ.altitude / 1000)} km up. The hardest moment for the structure.` },
                { met: maxQ.t + 18, text: 'Past Max Q the air thins faster than the speed grows, and the load falls away.' },
                { met: 120, text: 'The sky darkens. With less air pushing back on the nozzles, thrust rises and the plume widens.' },
                { met: ev('throttleDown'), text: `${tPlus(ev('throttleDown'))}: the engines throttle back to hold 4.5 g as the vehicle gets lighter.` },
            ]),
            hero: ['q', 'altitude'],
            chart: { title: 'Dynamic pressure', unit: 'kPa', series: [{ key: 'q', label: 'q = ½ρv²' }], range: [0, meco], mark: { met: maxQ.t, text: 'Max Q' } },
            science: { label: 'Flight path', text: 'The whole first-stage path, from vertical to about 10° above the horizon at cutoff: gravity does the turning.', segments: [span(0, meco, 14, 'ascent', 'high', 'trajectory')] },
            recap: [
                `Dynamic pressure q = ½ρv² peaks at Max Q: ${n1(maxQ.q / 1000)} kPa at ${tPlus(maxQ.t)}, ${n1(maxQ.altitude / 1000)} km up.`,
                'After Max Q the air thins faster than speed grows, so the load falls.',
                `Gravity costs ${n0(f.losses.gravity)} m/s and drag only ${n0(f.losses.drag)} m/s: climbing out quickly matters more.`,
            ],
            check: {
                question: 'Where is the air load on the vehicle highest?',
                options: ['At liftoff, where the air is densest', `At Max Q, about ${n0(maxQ.altitude / 1000)} km up`, 'At the edge of space, where it flies fastest'],
                answer: 1,
                explain: 'At liftoff it is slow; high up it is fast but the air is almost gone. q = ½ρv² peaks in between.',
            },
        },
        staging: {
            beats: at('staging', [
                { met: meco - 6, text: 'The first-stage tanks are nearly empty.' },
                { met: meco, text: `MECO at ${tPlus(meco)}: the first-stage engines shut down at ${n2(sampleAt(meco, f).speed / 1000)} km/s.` },
                { met: sep, text: `${tPlus(sep)}: separation. ${n0(FIRST_STAGE.dryMass / 1000)} t of empty stage falls away; nothing explodes, the joint is simply released.` },
                { met: usIgn, text: `${tPlus(usIgn)}: the hydrogen upper stage ignites. Its flame is almost invisible.` },
            ]),
            hero: ['mass', 'speed'],
            chart: { title: 'Vehicle mass', unit: 't', series: [{ key: 'mass', label: 'Mass' }], range: [0, usIgn + 30], mark: { met: sep, text: 'Separation' } },
            science: { label: 'Flight path', text: 'The path through staging: almost horizontal now, the climb nearly finished and the speed still building.', segments: [span(150, usIgn + 30, 12, 'ascent', 'high', 'trajectory')] },
            recap: [
                `The first stage burns until its tanks are empty: MECO at ${tPlus(meco)}, ${n0(sampleAt(meco, f).altitude / 1000)} km up.`,
                `Dropping ${n0(FIRST_STAGE.dryMass / 1000)} t of empty structure removes ${n0((FIRST_STAGE.dryMass / f.masses.beforeStaging) * 100)} % of the mass.`,
                'The upper stage coasts a few seconds before igniting, so its exhaust clears the spent stage.',
            ],
            check: {
                question: 'Why does the vehicle drop the first stage instead of carrying it to orbit?',
                options: ['It would overheat in space', 'Empty structure is dead weight; dropping it lets the same thrust accelerate the rest harder', 'It blocks the upper stage’s antenna'],
                answer: 1,
                explain: 'The rocket equation rewards a high ratio of starting to final mass. Empty tanks ruin that ratio.',
            },
        },
        fairing: {
            beats: at('fairing', [
                { met: usIgn - 1, text: `Above 100 km the air is ten million times thinner than at sea level.` },
                { met: fair, text: `${tPlus(fair)}: air heating has fallen below 1,135 W/m². The fairing halves are released.` },
                { met: fair + 4, text: 'For the first time the spacecraft is in open space, in direct sunlight.' },
            ]),
            hero: ['heating', 'altitude'],
            science: {
                label: 'Flight path',
                text: 'The path around fairing separation, above 100 km: almost horizontal now. Air heating has fallen below the limit, so the shell is no longer needed.',
                segments: [span(fair - 60, fair + 20, 12, 'ascent', 'high', 'trajectory')],
            },
            chart: { title: 'Air heating ½ρv³', unit: 'W/m²', series: [{ key: 'heating', label: 'Heating' }], range: [120, fair + 30], log: true, mark: { met: fair, text: 'Fairing released' }, line: { value: 1135, text: 'Limit 1,135 W/m²' } },
            recap: [
                'The fairing protects the spacecraft from air pressure, heating and noise during the climb.',
                'It is dropped on a condition, not a clock: once air heating is low enough to be harmless.',
                `Every kilogram dropped early is a kilogram less to push towards Jupiter.`,
            ],
            check: {
                question: 'What decides when the fairing is released?',
                options: ['A fixed time after liftoff', 'When air heating falls low enough to be harmless', 'When the upper stage ignites'],
                answer: 1,
                explain: `The trigger is heating below 1,135 W/m² above 100 km, reached here at ${n0(sampleAt(fair, f).altitude / 1000)} km.`,
            },
        },
        orbit: {
            beats: at('orbit', [
                { met: fair + 14, text: 'The upper stage now pushes almost horizontally. An orbit is mostly sideways speed.' },
                { met: seco1 - 25, text: 'Watch the perigee reading: the lowest point of the path is climbing out of the atmosphere.' },
                { met: seco1, text: `${tPlus(seco1)}: cutoff at ${n2(sampleAt(seco1, f).speed / 1000)} km/s, 185 km up. The vehicle is in orbit: falling around the Earth.` },
                { met: seco1 + 5, text: 'Coasting with the engine off. Time is compressed: a quarter of an orbit takes 22 minutes.' },
            ]),
            hero: ['orbitalSpeed', 'perigee'],
            chart: { title: 'Speed', unit: 'km/s', series: [{ key: 'speed', label: 'Inertial speed' }], range: [usIgn, seco1 + 60], mark: { met: seco1, text: 'Orbit' } },
            science: {
                label: 'Orbit diagram',
                text: 'The ascent (amber) and the parking orbit (white) to scale. At 185 km the orbit hugs the Earth: its lowest and highest points are marked.',
                segments: [span(seco1, restart - 30, 12, 'orbit', 'orbitWide', 'trajectory')],
            },
            recap: [
                'An orbit is continuous free fall: the ground curves away as fast as the vehicle falls.',
                `At 185 km that takes ${n2(sampleAt(seco1, f).speed / 1000)} km/s sideways; the Earth’s rotation gave ${n0(sampleAt(-3, f).speed)} m/s for free.`,
                'The engine cuts off on the orbit it has reached, not on a clock.',
            ],
            check: {
                question: 'What keeps the vehicle in orbit?',
                options: ['It is high enough to escape gravity', 'It moves sideways so fast that it keeps falling around the Earth', 'Its engine keeps pushing it up'],
                answer: 1,
                explain: 'Gravity at 185 km is still 95 % of its surface value. The vehicle is falling the whole time; it just keeps missing.',
            },
        },
        departure: {
            beats: at('departure', [
                { met: seco1 + 300, text: 'Coasting to the departure point, set by where Jupiter will be in three years.' },
                { met: restart, text: `${tPlus(restart)}: the upper stage restarts, burning along the direction of motion, low and fast.` },
                { met: seco2 - 40, text: 'Burning deep in Earth’s gravity gives the most energy per kilogram of propellant (the Oberth effect).' },
                { met: seco2, text: `${tPlus(seco2)}: cutoff on the energy target, still bound to Earth, with ${n0(SEQUENCE.departureReserve)} kg of propellant left unburned.` },
                { met: kickSep, text: 'The upper stage separates. The solid kick stage spins up to hold its direction.' },
                { met: kickIgn, text: `${tPlus(kickIgn)}: kick-stage ignition. A solid motor cannot stop: it burns to the end.` },
                { met: escape, text: `${tPlus(escape)}: orbital energy passes zero. RSC-1 is escaping the Earth.` },
                { met: burnout, text: `Burnout: C3 = ${n1(c3(burnout))} km²/s², exactly the energy the trajectory to Jupiter needs.` },
                { met: burnout + 30, text: `The Earth falls away behind at ${n1(sampleAt(burnout, f).speed / 1000)} km/s.` },
            ]),
            hero: ['speed', 'c3'],
            chart: { title: 'Departure energy C3', unit: 'km²/s²', series: [{ key: 'c3', label: 'C3' }], range: [restart - 60, burnout + 120], mark: { met: escape, text: 'Escape' }, line: { value: m.c3, text: `Needed ${n1(m.c3)}` } },
            science: {
                label: 'Escape trajectory',
                text: 'The escape path to scale: no longer a closed orbit but an open curve leaving the Earth, then the orbit around the Sun it joins.',
                segments: [span(burnout + 4, burnout + 7200, 12, 'departure', 'departureWide', 'trajectory'), hold(burnout + 86400, 8, 'cruise', 'cruiseDepart', 'trajectory')],
            },
            recap: [
                'Leaving Earth takes more energy than reaching orbit: about 6.3 km/s more for Jupiter.',
                `The vehicle could deliver C3 = ${CONSTRAINTS.c3Max}; it stops at ${n1(m.c3)} because the trajectory needs exactly that energy.`,
                'C3 above zero means escape: the spacecraft keeps a leftover speed after climbing out of Earth’s gravity.',
            ],
            check: {
                question: 'Why does the upper stage stop before its tanks are empty?',
                options: ['To keep propellant for landing', 'The trajectory needs a precise energy; more would arrive at Jupiter’s orbit when Jupiter is elsewhere', 'Its engine would overheat'],
                answer: 1,
                explain: 'The route to Jupiter is timed to meet the planet. The kick stage’s fixed impulse is part of the plan, so the upper stage stops short by exactly the right amount.',
            },
        },
        deploy: {
            beats: at('deploy', [
                { met: scSep - 20, text: 'RSC-1 still sits on the spent kick stage, already on its way out of Earth’s gravity.' },
                { met: scSep, text: 'Separation: a clamp band opens and springs push the two apart at 0.5 m/s. RSC-1 now flies alone.' },
                { met: scSep + 30, text: 'Small thrusters pulse to damp the tumble left by separation.' },
                { met: scSep + 210, text: 'The RTG boom swings out, carrying the generators’ heat and radiation away from the instruments.' },
                { met: scSep + 330, text: 'The magnetometer mast extends to 7 m, away from the spacecraft’s own magnetic noise.' },
                { met: scSep + 540, text: 'The transmitter switches on.' },
                { met: scSep + 600, text: 'First contact: a ground station hears RSC-1 ten minutes after separation.' },
            ]),
            hero: ['attitude', 'battery'],
            chart: {
                title: 'Electrical power',
                unit: 'W',
                series: [
                    { key: 'rtg', label: 'RTG output' },
                    { key: 'loads', label: 'Loads' },
                ],
                range: [scSep, scSep + 900],
            },
            science: { label: 'Power system', text: 'Power paths inside RSC-1: generators → regulator → 30 V bus → battery and loads.', segments: [span(scSep + 200, scSep + 560, 12, 'deploy', 'eps', 'eps')] },
            recap: [
                'After separation the spacecraft must stabilise, power itself and call home without help.',
                `Two RTGs give ${n0(rtgPower(0))} W whatever the distance from the Sun.`,
                'The power balance closes every second: generated = used + stored + dissipated.',
            ],
            check: {
                question: 'Why does RSC-1 use radioisotope generators instead of solar panels?',
                options: ['They are lighter at Earth', 'At Jupiter sunlight is only 3.7 % as strong as at Earth', 'Solar panels do not work in a vacuum'],
                answer: 1,
                explain: 'Sunlight falls with the square of the distance: 1/5.2² ≈ 3.7 % at Jupiter. Radioisotope power barely changes.',
            },
        },
        cruise: {
            beats: at('cruise', [
                { met: 3 * D, text: 'Free of Earth, the engines are off for good. From here the Sun’s gravity alone shapes the path.' },
                { met: 40 * D, text: 'The Earth shrinks to a point of light behind the spacecraft.' },
                { met: 365.25 * D, text: `One year out: ${n2(sunAU(365.25 * D))} AU from the Sun; radio takes ${n0(lightMin(365.25 * D))} minutes each way.` },
                { met: 730.5 * D, text: `Two years: sunlight is ${n0((1 / sunAU(730.5 * D) ** 2) * 100)} % of its strength at Earth. The RTGs do not notice.` },
                { met: J - 90 * D, text: 'Three months out, Jupiter grows ahead.' },
            ]),
            hero: ['sunDist', 'lightTimeB'],
            chart: { title: 'Distance from the Sun', unit: 'AU', series: [{ key: 'sunDist', label: 'RSC-1' }], range: [0, J] },
            science: { label: 'Trajectory diagram', text: 'The planets’ orbits and the designed path to scale, seen from above: an arc around the Sun timed to meet Jupiter.', segments: [span(3 * D, J - 12 * D, 14, 'cruise', 'cruiseWide')] },
            recap: [
                `A spacecraft cannot fly straight to a planet: it follows an orbit around the Sun, timed to meet Jupiter ${n1(J / (365.25 * D))} years later.`,
                'For three years it coasts; only small corrections would be needed.',
                `Signals take up to ${n0(lightMin(J))} minutes each way by the end, so the spacecraft must manage itself.`,
            ],
            check: {
                question: 'During the three-year cruise, how often does RSC-1 fire its engine?',
                options: ['Continuously, at low thrust', 'Essentially never: it coasts on its orbit around the Sun', 'Once a week to keep up speed'],
                answer: 1,
                explain: 'Nothing slows it down in space. The departure burn set the whole path; only tiny trajectory corrections (not modelled) would follow.',
            },
        },
        jupiter: {
            beats: at('jupiter', [
                { met: J - 4 * D, text: 'Four days out. Jupiter’s gravity has taken over from the Sun’s, and RSC-1 is speeding up as it falls in.' },
                ...(conj ? [{ met: J - 2.5 * D, text: `Seen from Earth, RSC-1 is behind the Sun’s glare (solar conjunction, ${isoDate(conj.start)} to ${isoDate(conj.end)}). The flyby runs on commands stored on board.` }] : []),
                { met: J - 3 * 3600, text: `Falling in at ${n1(flybySpeed(-3 * 3600) / 1000)} km/s relative to Jupiter.` },
                { met: J, text: `Closest approach: ${n1(m.flyby.rp / 7.1492e7)} Jupiter radii from the centre, ${n1(flybySpeed(0) / 1000)} km/s.` },
                { met: J + 2.5 * 3600, text: `Jupiter’s gravity turns the path by ${n0(turn)}°.` },
                { met: J + 0.7 * D, text: `Leaving at the same speed relative to Jupiter, but ${n1(vHelioOut - vHelioIn)} km/s faster relative to the Sun: ${n1(vHelioIn)} → ${n1(vHelioOut)} km/s.` },
            ]),
            hero: ['jupDist', 'jupSpeed'],
            chart: { title: 'Speed around the Sun', unit: 'km/s', series: [{ key: 'helioSpeed', label: 'RSC-1' }], range: [J - 8 * D, J + 8 * D], mark: { met: J, text: 'Flyby' } },
            science: {
                label: 'Gravity-assist diagram',
                text: 'The flyby to scale: the curved path around Jupiter, its incoming and outgoing directions (dashed) and the moons’ orbits.',
                segments: [span(J - 2 * D, J + 2 * D, 14, 'jupiter', 'jupiterWide')],
            },
            recap: [
                `Relative to Jupiter the speed is the same going out as coming in (${n2(m.flyby.vInfIn / 1000)} km/s); only the direction turns, by ${n0(turn)}°.`,
                `Relative to the Sun, Jupiter’s own motion is added: ${n1(vHelioIn)} → ${n1(vHelioOut)} km/s, with no propellant.`,
                `The pass is ${n1(m.flyby.rp / 7.1492e7)} Jupiter radii from the centre: closer bends more, but the radiation belts set the limit.`,
            ],
            check: {
                question: 'Relative to Jupiter, does RSC-1 leave faster than it arrived?',
                options: ['Faster', 'The same speed: only the direction changes', 'Slower'],
                answer: 1,
                explain: `Jupiter’s gravity gives back on the way out what it gave on the way in. Relative to the Sun the turned velocity adds to Jupiter’s ${n1(norm(state('jupiter', m.jupiter).v) / 1000)} km/s, which is where the gain comes from.`,
            },
        },
        saturn: {
            beats: at('saturn', [
                { met: J + 20 * D, text: `Jupiter’s push sends RSC-1 onward: ${n1((S - J) / (365.25 * D))} years to Saturn.` },
                { met: J + 400 * D, text: `Already faster than the Sun’s escape speed: RSC-1 will never fall back.` },
                { met: S - 200 * D, text: `Sunlight here is ${n1((1 / sunAU(S - 200 * D) ** 2) * 100)} % of its strength at Earth.` },
                { t: storySeconds(seg('saturn')) - 10, text: `Saturn, ${n1(sunAU(S))} AU from the Sun. Radio takes ${n0(lightMin(S))} minutes each way.` },
            ]),
            hero: ['sunDist', 'lightTimeB'],
            chart: {
                title: 'Speed around the Sun',
                unit: 'km/s',
                series: [
                    { key: 'helioSpeed', label: 'RSC-1' },
                    { key: 'escapeSun', label: 'Escape speed' },
                ],
                range: [J + 2 * D, S],
            },
            science: { label: 'Trajectory diagram', text: 'From Jupiter to Saturn to scale: the outbound arc, already faster than the Sun’s escape speed.', segments: [span(J + 20 * D, S, 12, 'cruise', 'cruiseOuter')] },
            recap: [
                `After Jupiter, RSC-1 is faster than the Sun’s escape speed: ${n2(m.helioSpeedSaturn / 1000)} against ${n2(m.escapeSpeedSaturn / 1000)} km/s at Saturn.`,
                `Signals take ${n0(lightMin(S))} minutes each way: nothing can be controlled from Earth in real time.`,
                `The RTGs still give ${n0(rtgPower(S / (365.25 * D)))} W, ${n0((rtgPower(S / (365.25 * D)) / rtgPower(0)) * 100)} % of their power at launch.`,
            ],
            check: {
                question: 'After the Jupiter flyby, will RSC-1 ever fall back towards the Sun?',
                options: ['Yes: its orbit is still an ellipse', 'No: it is faster than the Sun’s escape speed', 'Only if Saturn pulls it back'],
                answer: 1,
                explain: 'Its speed around the Sun stays above the local escape speed all the way out: the orbit is a hyperbola around the Sun.',
            },
        },
        discovery: {
            beats: discoveryBeats(tourStops),
            hero: ['bDistance', 'bRadius'],
            science: { label: 'Sizes to scale', text: 'Every planet and Pluto at true size beside the Sun’s edge. Jupiter is 11 Earths across; the Sun is 109.', segments: [hold(0, 18, 'tour', 'tourScale')] },
            recap: [
                'Distance from the Sun shapes each world: rock and metal near the Sun, gas and ice far out.',
                'Jupiter alone has more than twice the mass of all the other planets together.',
                'Most of the Solar System is empty: to scale, the planets would be specks kilometres apart.',
            ],
            check: {
                question: 'If the Sun were a front door 2 m tall, how big would the Earth be?',
                options: ['A football', 'A small coin', 'A grain of sand'],
                answer: 1,
                explain: `The Earth’s diameter is ${n2((6371 / 695700) * 100)} % of the Sun’s: about 1.8 cm next to a 2 m Sun.`,
            },
        },
    };
}

// ── Discovery tour (guided) ────────────────────────────────────────────────

function discoveryBeats(stops: BodyId[]): Beat[] {
    const out: Beat[] = [{ t: 0, text: 'The Solar System from above: eight planets, the belts and Pluto, 1 January 2035.' }];
    stops.forEach((id, i) => {
        const b = body(id);
        out.push({ t: 6 + i * (STOP_TRAVEL + STOP_HOLD) + 0.8, text: `${b.name}: ${b.features}.` });
    });
    return out;
}

// ── Numeric series (charts) ───────────────────────────────────────────────

/** A charted value at mission time `met`, in the chart's unit. */
export function seriesValue(key: SeriesKey, met: number): number {
    const f = flight();
    const scSep = eventTime('scSep', f);
    switch (key) {
        case 'q':
            return sampleAt(met, f).q / 1000;
        case 'altitude':
            return Math.max(0, sampleAt(met, f).altitude) / 1000;
        case 'speed':
            return sampleAt(met, f).speed / 1000;
        case 'acceleration':
            return sampleAt(met, f).acceleration / 9.80665;
        case 'mass':
            return sampleAt(met, f).mass / 1000;
        case 'heating':
            return Math.max(1, sampleAt(met, f).heating);
        case 'c3': {
            const s = sampleAt(met, f);
            return elements(s.x, s.y, s.vx, s.vy, MU_EARTH).c3 / 1e6;
        }
        case 'loads':
            return powerAt(Math.max(0, met - scSep)).loads;
        case 'rtg':
            return powerAt(Math.max(0, met - scSep)).rtg;
        case 'soc':
            return powerAt(Math.max(0, met - scSep)).soc * 100;
        case 'sunDist':
            return norm(spacecraftAt(dateOf(met)).r) / AU;
        case 'lightTime': {
            const t = dateOf(met);
            return norm(sub(spacecraftAt(t).r, state('earth', t).r)) / 299792458 / 60;
        }
        case 'helioSpeed': {
            const m = missionTrajectory();
            const t = dateOf(met);
            if (Math.abs(t - m.jupiter) < 20) {
                // Near Jupiter: Jupiter's velocity plus the flyby velocity relative to Jupiter.
                const dt = (t - m.jupiter) * DAY;
                const v = flybyVelocity(dt);
                const vj = state('jupiter', t).v;
                return Math.hypot(v[0] + vj[0], v[1] + vj[1], v[2] + vj[2]) / 1000;
            }
            return norm(spacecraftAt(t).v) / 1000;
        }
        case 'escapeSun':
            return Math.sqrt((2 * 1.32712440018e20) / norm(spacecraftAt(dateOf(met)).r)) / 1000;
        case 'jupSpeed':
            return flybySpeed((dateOf(met) - missionTrajectory().jupiter) * DAY) / 1000;
    }
}

/** Velocity relative to Jupiter on the flyby hyperbola (central difference), m/s. */
function flybyVelocity(dt: number) {
    const h = 30;
    const a = flybyAt(dt - h);
    const b = flybyAt(dt + h);
    return [(b[0] - a[0]) / (2 * h), (b[1] - a[1]) / (2 * h), (b[2] - a[2]) / (2 * h)];
}

/** Samples a series over a range for a chart. */
export function sampleSeries(key: SeriesKey, [a, b]: [number, number], n = 120) {
    return Array.from({ length: n + 1 }, (_, i) => {
        const met = a + ((b - a) * i) / n;
        return { met, v: seriesValue(key, met) };
    });
}

// ── Glossary ──────────────────────────────────────────────────────────────

export interface Term {
    id: string;
    term: string;
    /** Matched case-insensitively at word boundaries in card and caption text. */
    match: RegExp;
    text: string;
}

export const GLOSSARY: Term[] = [
    { id: 'maxq', term: 'Max Q', match: /\bMax Q\b/, text: 'The moment of greatest aerodynamic pressure on a rising rocket; it sets the structural loads.' },
    { id: 'q', term: 'Dynamic pressure', match: /\bdynamic pressure\b/i, text: 'q = ½ρv²: the pressure of the oncoming air. It grows with speed and falls with air density.' },
    { id: 'meco', term: 'MECO', match: /\bMECO\b/, text: 'Main engine cutoff: the first-stage engines shut down when their propellant is used up.' },
    { id: 'tw', term: 'Thrust-to-weight', match: /\bthrust-to-weight\b/i, text: 'Thrust divided by weight. Above 1 the rocket can rise; the excess sets its acceleration.' },
    { id: 'isp', term: 'Specific impulse', match: /\bspecific impulse\b/i, text: 'Engine efficiency: exhaust speed divided by g₀, in seconds. Higher means less propellant for the same push.' },
    { id: 'c3', term: 'C3', match: /\bC3\b/, text: 'Characteristic energy: twice the orbital energy per kilogram. Below zero the craft is bound to Earth; above zero it escapes.' },
    { id: 'vinf', term: 'v∞', match: /v∞/, text: 'Hyperbolic excess speed: the speed left over far from a planet after climbing out of (or before falling into) its gravity.' },
    { id: 'dv', term: 'Delta-v', match: /\bdelta-v\b|Δv/i, text: 'The change in velocity a manoeuvre needs. Rockets buy it with propellant, by the rocket equation.' },
    { id: 'perigee', term: 'Perigee', match: /\bperigee\b/i, text: 'The lowest point of an orbit around the Earth.' },
    { id: 'apogee', term: 'Apogee', match: /\bapogee\b/i, text: 'The highest point of an orbit around the Earth.' },
    { id: 'periapsis', term: 'Periapsis', match: /\bperiapsis\b/i, text: 'The closest point of a path to the body it is passing or orbiting (at Jupiter: closest approach).' },
    { id: 'parking', term: 'Parking orbit', match: /\bparking orbit\b/i, text: 'A low, temporary orbit where the vehicle waits for the right place to start its departure burn.' },
    { id: 'gturn', term: 'Gravity turn', match: /\bgravity turn\b/i, text: 'An ascent in which gravity, not steering, bends the path from vertical towards horizontal.' },
    { id: 'oberth', term: 'Oberth effect', match: /\bOberth effect\b/i, text: 'A burn gives more orbital energy when the vehicle is already moving fast, so departure burns are made low and fast.' },
    { id: 'escape', term: 'Escape speed', match: /\bescape speed\b/i, text: 'The speed at which a body’s gravity can no longer pull a spacecraft back: √(2μ/r).' },
    { id: 'au', term: 'AU', match: /\bAU\b/, text: 'Astronomical unit: the mean Earth–Sun distance, about 149.6 million km.' },
    { id: 'rtg', term: 'RTG', match: /\bRTGs?\b/, text: 'Radioisotope thermoelectric generator: turns the heat of decaying plutonium-238 into electricity, with no moving parts.' },
    { id: 'light', term: 'Light time', match: /\blight time\b/i, text: 'How long radio signals, at the speed of light, take to travel between Earth and the spacecraft.' },
    { id: 'assist', term: 'Gravity assist', match: /\bgravity assist\b/i, text: 'A flyby that uses a planet’s motion to change a spacecraft’s speed around the Sun without propellant.' },
    { id: 'incl', term: 'Inclination', match: /\binclination\b/i, text: 'The tilt of an orbit’s plane relative to the equator.' },
    { id: 'kick', term: 'Kick stage', match: /\bkick stage\b/i, text: 'A small solid rocket stage that adds the last few km/s for an escape trajectory. Once lit, it burns to the end.' },
    { id: 'fairing', term: 'Fairing', match: /\bfairing\b/i, text: 'The aerodynamic shell around the spacecraft, dropped once the air can no longer harm it.' },
    { id: 'mach', term: 'Mach', match: /\bMach\b/, text: 'Speed divided by the local speed of sound.' },
    { id: 'conj', term: 'Solar conjunction', match: /\bsolar conjunction\b/i, text: 'When the spacecraft is nearly behind the Sun as seen from Earth; the Sun’s corona corrupts the radio link.' },
    { id: 'safe', term: 'Safe mode', match: /\bsafe mode\b/i, text: 'A protective state: non-essential loads off, antenna and power secured, waiting for instructions from Earth.' },
    { id: 'hyper', term: 'Hyperbola', match: /\bhyperbol(?:a|ic)\b/i, text: 'An open path: a body moving faster than escape speed passes once and never returns.' },
    { id: 'lambert', term: 'Lambert solution', match: /\bLambert\b/, text: 'The orbit that connects two positions in a given flight time; used to design transfers between planets.' },
    { id: 'ephem', term: 'Ephemeris', match: /\bephemeris\b/i, text: 'A table or model of where the planets are at each date.' },
];

// ── Mission summary (finale) ──────────────────────────────────────────────

/** Totals for the end-of-mission summary. */
export function missionSummary() {
    const m = missionTrajectory();
    const f = flight();
    // Distance flown around the Sun: the length of both legs.
    let dist = 0;
    let prev = spacecraftAt(m.launch).r;
    for (let t = m.launch + 2; t <= m.saturn; t += 2) {
        const r = spacecraftAt(t).r;
        dist += norm(sub(r, prev));
        prev = r;
    }
    return {
        launch: isoDate(m.launch),
        jupiter: isoDate(m.jupiter),
        saturn: isoDate(m.saturn),
        years: (m.saturn - m.launch) / 365.25,
        distanceAU: dist / AU,
        distanceKm: dist / 1000,
        c3: f.c3 / 1e6,
        assist: m.flyby.helioDv / 1000,
        lightMin: norm(sub(spacecraftAt(m.saturn).r, state('earth', m.saturn).r)) / 299792458 / 60,
        rtgSaturn: rtgPower((m.saturn - m.launch) / 365.25),
        planetAtSaturn: planetAt('saturn', m.saturn),
    };
}
