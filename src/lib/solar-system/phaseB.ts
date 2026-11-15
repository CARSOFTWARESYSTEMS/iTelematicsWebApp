/**
 * Phase B of the Solar System experience: from Earth departure into the Solar System.
 *
 * Physics mode (chapters 09–11): the reference mission SOL-1 flies the Earth → Jupiter → Saturn
 * trajectory designed in trajectory.ts from the planetary ephemeris (launch 25 June 2034). Mission
 * elapsed time (MET, seconds) continues from Phase A: MET 0 is liftoff on the launch date. Every
 * reading comes from the trajectory, the ephemeris or the spacecraft power model.
 *
 * Discovery mode (chapter 12): a guided tour of the Sun, planets, Moon, belts and Pluto. It is a
 * cinematic tour, not a trajectory: the camera travels between destinations at planet positions for
 * the tour date, and the spacecraft does not visit them in this order. The data shown are measured
 * values (bodies.ts); imagery is labelled for what it is.
 */
import { BODIES, body, type BodyId } from './bodies';
import { AU, C_LIGHT, MU_SUN } from './constants';
import { DAY, isoDate, jd, norm, positionAU, scale, state, sub, type Vec } from './ephemeris';
import { mission, reading, type Chapter, type Label, type Reading, type SceneId, type Segment, type ShotId, type TKey } from './mission';
import { rtgPower } from './spacecraft';
import { CONSTRAINTS, flybyPosition, LAUNCH_WINDOW, MISSION_DATES, missionTrajectory, MU_JUPITER, R_JUPITER, spacecraftAt } from './trajectory';

/** Planet positions for the Discovery tour (cinematic mode): 1 January 2035, during the cruise. */
export const TOUR_EPOCH = jd(2035, 1, 1);

const hold = (met: number, seconds: number, scene: SceneId, shot: ShotId, body?: BodyId): Segment => ({ met: [met, met], seconds, scene, shot, body });
const span = (a: number, b: number, seconds: number, scene: SceneId, shot: ShotId): Segment => ({ met: [a, b], seconds, scene, shot });

/** MET (s) of a Julian date. */
export const metOf = (t: number) => (t - missionTrajectory().launch) * DAY;
/** Julian date of an MET (s). */
export const dateOf = (met: number) => missionTrajectory().launch + met / DAY;

let built: Chapter[] | null = null;

export function phaseB(): Chapter[] {
    return (built ??= build());
}

function build(): Chapter[] {
    const m = missionTrajectory();
    const D = DAY;
    const J = metOf(m.jupiter);
    const S = metOf(m.saturn);
    const yrs = (s: number) => (s / (365.25 * D)).toFixed(1);
    const k = (v: number) => (v / 1000).toFixed(2);
    const rj = (m.flyby.rp / R_JUPITER).toFixed(1);

    const cruise: Chapter = {
        id: 'cruise',
        number: '09',
        title: 'Interplanetary Cruise',
        short: 'Cruise',
        summary: `Free of Earth, RSC-1 coasts on an ellipse around the Sun that meets Jupiter ${yrs(J)} years after launch.`,
        why: 'A spacecraft cannot fly straight to a planet: it follows an orbit around the Sun, timed so the planet is there when it arrives.',
        segments: [span(3 * D, 160 * D, 7, 'cruise', 'cruiseDepart'), span(160 * D, J - 90 * D, 11, 'cruise', 'cruiseWide'), span(J - 90 * D, J - 12 * D, 7, 'cruise', 'cruiseFollow')],
        telemetry: ['missionDate', 'sunDist', 'lightTimeB', 'rtgB'],
        labels: [
            {
                id: 'b-trajectory',
                title: 'Sun-Centered Trajectory',
                segments: [span(3 * D, J - 12 * D, 12, 'cruise', 'cruiseWide')],
                what: 'The path of the spacecraft around the Sun, from Earth to Jupiter.',
                does: `An ellipse from 1 AU out to Jupiter’s distance, flown in ${yrs(J)} years without propulsion.`,
                why: 'Once the departure burn is over, the Sun’s gravity alone shapes the path; the launch date decides where it leads.',
                happening: 'The orbits of the planets are drawn to scale; the spacecraft marker moves along its computed path.',
                learn: `Designed with a Lambert solution between Earth on ${MISSION_DATES.launch} and Jupiter on ${MISSION_DATES.jupiter}, using published approximate planetary elements (Standish), checked against a high-precision planetary ephemeris. Patched-conic model: no trajectory-correction manoeuvres or planetary perturbations during the cruise.`,
                telemetry: ['sunDist', 'helioSpeed', 'missionDate'],
            },
            {
                id: 'b-window',
                title: 'Launch Window',
                segments: [span(3 * D, 120 * D, 9, 'cruise', 'cruiseDepart')],
                what: 'The range of launch dates from which the trajectory works.',
                does: `For SOL-1 it runs from ${LAUNCH_WINDOW.opens} to ${LAUNCH_WINDOW.closes}; the chosen date needs the least departure energy.`,
                why: 'Earth, Jupiter and Saturn line up like this only about every 20 years.',
                happening: 'The departure from Earth’s orbit around the Sun, seen from above the ecliptic.',
                learn: `Search: launch dates 2030–2045 on an 8-day grid, Jupiter and Saturn arrival dates on 12- and 16-day grids, then 1-, 2- and 4-day steps around the best window. Constraints: C3 ≤ ${CONSTRAINTS.c3Max} km²/s² (what the simulated launch delivers), Jupiter periapsis ≥ ${CONSTRAINTS.rpMinJupiterRadii} Jupiter radii, periapsis burn ≤ ${CONSTRAINTS.poweredDvMax} m/s, Saturn within ${CONSTRAINTS.maxYearsToSaturn} years. Chosen: C3 = ${m.c3.toFixed(1)} km²/s².`,
                telemetry: ['c3Need', 'dla', 'missionDate'],
            },
            {
                id: 'b-delay',
                title: 'Distance and Signal Delay',
                segments: [span(160 * D, J - 12 * D, 10, 'cruise', 'cruiseFollow')],
                what: 'How far the spacecraft is from Earth, and how long its radio signals take.',
                does: 'Radio travels at the speed of light; delay = distance / c.',
                why: 'Commands sent from Earth arrive tens of minutes later, so the spacecraft must manage itself.',
                happening: 'Earth and the spacecraft move on their own orbits; the distance between them changes through the year.',
                learn: 'At Jupiter the one-way light time is 35–52 minutes, depending on where Earth is in its orbit.',
                telemetry: ['earthDist', 'lightTimeB', 'sunDist'],
            },
            {
                id: 'b-power',
                title: 'Power in Deep Space',
                segments: [span(3 * D, J, 10, 'cruise', 'cruiseWide')],
                what: 'The electrical power available as the spacecraft moves away from the Sun.',
                does: 'The RTGs give almost the same power at any distance; sunlight falls with the square of the distance.',
                why: 'At Jupiter a solar array would receive only 3.7 % of the sunlight it gets at Earth.',
                happening: 'The power reading changes only with radioactive decay and thermocouple ageing, not with distance.',
                learn: 'RTG power = P₀ · 0.5^(t / 87.7 years) · (1 − 0.008)^t. Two generators, 490 W at launch.',
                telemetry: ['rtgB', 'sunlight', 'sunDist'],
            },
            {
                id: 'b-planets',
                title: 'Planet Positions',
                segments: [span(160 * D, J - 12 * D, 10, 'cruise', 'cruiseWide')],
                what: 'Where the planets are during the cruise.',
                does: 'Each planet’s position comes from its orbital elements for the date on screen.',
                why: 'The trajectory is designed to meet Jupiter where Jupiter will be, not where it is at launch.',
                happening: 'Planet markers move along their orbits as the date advances; sizes are not to scale.',
                learn: 'Elements: “Keplerian Elements for Approximate Positions of the Major Planets” (E. M. Standish), valid 1800–2050. Positions agree with a high-precision ephemeris to about 0.004 AU for Jupiter and 0.02 AU for Saturn in our checks.',
                telemetry: ['missionDate', 'sunDist'],
            },
            {
                id: 'b-navigation',
                title: 'Navigation',
                more: true,
                segments: [span(160 * D, J - 12 * D, 10, 'cruise', 'cruiseFollow')],
                what: 'How the spacecraft’s position is known.',
                does: 'Ground antennas measure the range and the Doppler shift of the radio signal; the orbit is fitted to those measurements.',
                why: 'Small errors at launch grow over years; trajectory-correction manoeuvres remove them.',
                happening: 'The spacecraft follows its planned path (in this model it flies exactly on it).',
                learn: 'Not modelled here: tracking, orbit determination and correction manoeuvres. The hydrazine reserve (45 kg) is what would pay for them.',
                telemetry: ['earthDist', 'lightTimeB'],
            },
        ],
    };

    const jupiter: Chapter = {
        id: 'jupiter',
        number: '10',
        title: 'Jupiter Encounter and Gravity Assist',
        short: 'Jupiter',
        summary: `RSC-1 passes ${rj} Jupiter radii from Jupiter’s centre on ${MISSION_DATES.jupiter}; Jupiter’s gravity bends its path towards Saturn.`,
        why: `The flyby changes the spacecraft’s velocity around the Sun by ${k(m.flyby.helioDv)} km/s without using propellant.`,
        segments: [span(J - 4 * D, J - 0.3 * D, 9, 'jupiter', 'jupiterApproach'), span(J - 5 * 3600, J + 5 * 3600, 11, 'jupiter', 'jupiterClose'), span(J + 1.5 * D, J + 14 * D, 8, 'jupiter', 'jupiterWide')],
        telemetry: ['jupDist', 'jupSpeed', 'helioSpeed', 'lightTimeB'],
        labels: [
            {
                id: 'j-approach',
                title: 'Approach to Jupiter',
                segments: [span(J - 6 * D, J - 0.3 * D, 10, 'jupiter', 'jupiterApproach')],
                what: 'The final weeks before the flyby.',
                does: 'Jupiter’s gravity takes over from the Sun’s; the spacecraft speeds up as it falls in.',
                why: 'The aim point set weeks earlier decides the whole flyby.',
                happening: 'Jupiter grows from a disc to a world filling the view; the spacecraft is in the foreground.',
                learn: `Speed relative to Jupiter far away (v∞): ${k(m.flyby.vInfIn)} km/s. Jupiter: ${body('jupiter').features}.`,
                telemetry: ['jupDist', 'jupSpeed'],
            },
            {
                id: 'j-closest',
                title: 'Closest Approach',
                segments: [span(J - 3 * 3600, J + 3 * 3600, 10, 'jupiter', 'jupiterClose')],
                what: 'Periapsis: the point of the flyby closest to Jupiter.',
                does: `RSC-1 passes ${rj} Jupiter radii from the centre, about ${((m.flyby.rp - R_JUPITER) / 1e3).toLocaleString('en-GB', { maximumFractionDigits: 0 })} km above the cloud tops.`,
                why: 'Closer passes bend the path more, but Jupiter’s radiation belts limit how close a spacecraft should go.',
                happening: 'Jupiter’s cloud bands fill the view as the spacecraft swings past.',
                learn: `Speed at periapsis: ${k(Math.sqrt(m.flyby.vInfIn ** 2 + (2 * MU_JUPITER) / m.flyby.rp))} km/s (vis-viva). Minimum allowed in the design: ${CONSTRAINTS.rpMinJupiterRadii} Jupiter radii; Voyager 1 passed at about 4.9.`,
                telemetry: ['jupDist', 'jupSpeed', 'missionDate'],
            },
            {
                id: 'j-assist',
                title: 'Gravity Assist',
                segments: [span(J - 2 * D, J + 2 * D, 11, 'jupiter', 'jupiterWide')],
                what: 'Using a planet’s motion to change a spacecraft’s velocity.',
                does: 'Relative to Jupiter the speed is the same going out as coming in; only the direction turns. Relative to the Sun, Jupiter’s orbital motion is added.',
                why: `Here the turn adds ${k(m.flyby.helioDv)} km/s relative to the Sun: far more than any engine on board could give.`,
                happening: 'The incoming and outgoing directions of the hyperbola are drawn around Jupiter.',
                learn: `Turn angle ${((m.flyby.turn * 180) / Math.PI).toFixed(1)}°, from δ = asin(1/e_in) + asin(1/e_out), e = 1 + r_p v∞²/μ. v∞ in ${k(m.flyby.vInfIn)} km/s, out ${k(m.flyby.vInfOut)} km/s: a ${m.flyby.dv.toFixed(1)} m/s periapsis trim (patched conics).`,
                telemetry: ['assist', 'helioSpeed', 'jupSpeed'],
            },
            {
                id: 'j-moons',
                title: 'Galilean Moons',
                segments: [span(J - 1.5 * D, J + 1.5 * D, 10, 'jupiter', 'jupiterWide')],
                what: 'Io, Europa, Ganymede and Callisto: Jupiter’s four large moons.',
                does: 'Their orbits are drawn to scale around Jupiter; the flyby passes inside some of them.',
                why: 'Europa may hold an ocean under its ice; Ganymede is larger than Mercury.',
                happening: 'The moons circle Jupiter at their true distances and periods.',
                learn: 'Orbit radii 421,700 (Io), 671,000 (Europa), 1,070,000 (Ganymede) and 1,883,000 km (Callisto); periods 1.77, 3.55, 7.15 and 16.7 days. Their positions along the orbits are illustrative (no satellite ephemeris), and their surfaces are drawn as plain colours, not imagery.',
                telemetry: ['jupDist', 'missionDate'],
            },
            {
                id: 'j-radiation',
                title: 'Jupiter’s Radiation',
                more: true,
                segments: [span(J - 3 * 3600, J + 3 * 3600, 9, 'jupiter', 'jupiterClose')],
                what: 'Jupiter’s magnetic field traps energetic particles in intense belts.',
                does: 'The dose rises steeply inside about 10 Jupiter radii.',
                why: 'Radiation damages electronics; it sets the closest safe flyby distance.',
                happening: 'The spacecraft crosses the inner magnetosphere near closest approach.',
                learn: 'Not modelled: the radiation dose. The design rule here is a periapsis of at least 4 Jupiter radii, close to the most aggressive outer-planet flybys flown.',
                telemetry: ['jupDist', 'rtgB'],
            },
        ],
    };

    const saturn: Chapter = {
        id: 'saturn',
        number: '11',
        title: 'Saturn and Deep Space',
        short: 'Saturn',
        summary: `After Jupiter the spacecraft climbs to Saturn, reached on ${MISSION_DATES.saturn}, then heads out of the Solar System.`,
        why: 'Far from Earth and the Sun the spacecraft runs on radioisotope power, long signal delays and its own autonomy.',
        segments: [span(J + 20 * D, S - 30 * D, 10, 'cruise', 'cruiseOuter'), hold(S, 10, 'saturn', 'saturnClose')],
        telemetry: ['sunDist', 'lightTimeB', 'rtgB', 'helioSpeed'],
        labels: [
            {
                id: 's-flyby',
                title: 'Saturn Flyby',
                segments: [hold(S, 12, 'saturn', 'saturnClose')],
                what: 'The spacecraft’s pass by Saturn.',
                does: `The Jupiter–Saturn arc arrives on ${MISSION_DATES.saturn} at ${k(m.vInfSaturn)} km/s relative to Saturn.`,
                why: 'A second flyby can bend the path again, towards Uranus, Neptune or out of the Solar System.',
                happening: 'Saturn and its rings, with the spacecraft passing. The pass geometry at Saturn is a cinematic placement: this phase designs the arrival, not the Saturn flyby.',
                learn: `Arrival date and v∞ come from the Lambert arc. A Saturn flyby would be designed like the Jupiter one, from the next target; not done in this phase.`,
                telemetry: ['sunDist', 'lightTimeB', 'missionDate'],
            },
            {
                id: 's-rings',
                title: 'Saturn’s Rings',
                segments: [hold(S, 10, 'saturn', 'saturnClose')],
                what: 'Countless particles of water ice orbiting in Saturn’s equatorial plane.',
                does: `The main rings span about ${(body('saturn').rings!.innerKm / 1000).toFixed(1)}–${(body('saturn').rings!.outerKm / 1000).toFixed(0)} thousand km from Saturn’s centre but are mostly less than 100 m thick.`,
                why: 'Ring particles are a hazard: flyby paths cross the ring plane only in known gaps or far outside.',
                happening: 'The rings are drawn from a radial map of their brightness and transparency (Solar System Scope).',
                learn: `Saturn: ${body('saturn').atmosphere}. Axial tilt ${body('saturn').tiltDeg}°, so the rings are seen at changing angles over Saturn’s 29.5-year orbit.`,
                telemetry: ['bRadius', 'bTilt'],
            },
            {
                id: 's-escape',
                title: 'Leaving the Solar System',
                segments: [span(J + 20 * D, S, 10, 'cruise', 'cruiseOuter')],
                what: 'Whether the spacecraft is still bound to the Sun.',
                does: `At Saturn its speed around the Sun is ${k(m.helioSpeedSaturn)} km/s; solar escape speed there is ${k(m.escapeSpeedSaturn)} km/s.`,
                why:
                    m.helioSpeedSaturn > m.escapeSpeedSaturn
                        ? 'Faster than escape speed: after the Jupiter assist the spacecraft is already leaving the Solar System.'
                        : 'Slower than escape speed: without another assist the spacecraft would fall back towards the Sun.',
                happening: 'The outbound arc from Jupiter to Saturn, to scale.',
                learn: 'Escape speed from the Sun at distance r: √(2μ☉/r). The Jupiter flyby supplied the difference between the launch energy and a Solar System escape.',
                telemetry: ['helioSpeed', 'escapeSun', 'sunDist'],
            },
            {
                id: 's-ops',
                title: 'Deep Space Operations',
                segments: [span(J + 20 * D, S - 30 * D, 10, 'cruise', 'cruiseOuter')],
                what: 'How a spacecraft is run when it is hours of light-time away.',
                does: 'Sequences are uploaded in advance; on board, fault protection keeps it safe and pointing at Earth.',
                why: 'With signal delays of over an hour, nothing can be controlled from Earth in real time.',
                happening: 'Mission time advances; signal delay and power change with distance and age.',
                learn: 'Health monitoring compares temperatures, voltages and rates with limits and switches to safe mode on a violation (Nominal, Warning, Degraded, Safe Mode). Not modelled in Phase B: thermal control and data rates.',
                telemetry: ['lightTimeB', 'rtgB', 'earthDist'],
            },
            {
                id: 's-power',
                title: 'RTG Power Over Time',
                more: true,
                segments: [span(3 * D, S, 10, 'cruise', 'cruiseOuter')],
                what: 'The slow decline of the generators’ output.',
                does: 'Plutonium-238 decays with an 87.7-year half-life; the thermocouples also age, about 0.8 % a year.',
                why: 'Power sets which instruments can run together; operations plans shed loads as power falls.',
                happening: 'The power reading falls a little each year of the mission.',
                learn: `RTG output: ${rtgPower(0).toFixed(0)} W at launch, ${rtgPower(J / (365.25 * D)).toFixed(0)} W at Jupiter, ${rtgPower(S / (365.25 * D)).toFixed(0)} W at Saturn.`,
                telemetry: ['rtgB', 'missionDate'],
            },
        ],
    };

    // Discovery tour: one topic per destination; six main ones, the rest under More topics.
    const MAIN: BodyId[] = ['sun', 'earth', 'mars', 'jupiter', 'saturn', 'pluto'];
    const tourLabel = (b: (typeof BODIES)[number]): Label => ({
        id: `t-${b.id}`,
        title: b.name,
        more: !MAIN.includes(b.id),
        segments: [hold(0, 4, 'tour', 'tourTravel', b.id), hold(0, 9, 'tour', 'tourBody', b.id)],
        what: `${b.name}: ${b.features}.`,
        does: b.radiusKm ? `Mean radius ${b.radiusKm.toLocaleString('en-GB')} km; ${b.orbit === 'moon' ? '384,400 km from Earth' : b.orbit === 'sun' ? 'at the centre of the Solar System' : `${b.distance} from the Sun`}.` : `${b.distance} from the Sun.`,
        why: b.atmosphere !== '—' ? `Atmosphere: ${b.atmosphere}.` : b.features + '.',
        happening: `Cinematic tour: the camera travels to ${b.name} from the overview. Imagery: ${b.imagery.kind}.`,
        learn: `Data: planetary fact sheets (rounded). ${b.year ? `Year: ${b.year}. ` : ''}${b.day ? `Day: ${b.day}. ` : ''}${b.tiltDeg !== undefined ? `Axial tilt: ${b.tiltDeg}°. ` : ''}Positions are those of ${isoDate(TOUR_EPOCH)}; sizes and distances are not shown to scale together. This is a guided tour, not a spacecraft trajectory.`,
        telemetry: b.radiusKm ? ['bRadius', 'bDistance', b.year ? 'bYear' : 'bDay', 'bImagery'] : ['bDistance', 'bImagery'],
    });
    const discovery: Chapter = {
        id: 'discovery',
        number: '12',
        title: 'Solar System Discovery',
        short: 'Discovery',
        summary: 'A guided tour of the Sun, the planets, the Moon, the asteroid and Kuiper belts and Pluto. Choose a destination.',
        why: 'Each world shows a different outcome of the same physics: distance from the Sun, mass and composition.',
        segments: [hold(0, 8, 'tour', 'tourOverview'), hold(0, 4, 'tour', 'tourTravel', 'saturn'), hold(0, 9, 'tour', 'tourBody', 'saturn')],
        telemetry: ['bDistance', 'bImagery'],
        labels: BODIES.map(tourLabel),
    };
    return [cruise, jupiter, saturn, discovery];
}

/** All chapters: Phase A (launch to deployment) then Phase B. */
export function journey() {
    const a = mission();
    return { intro: a.intro, chapters: [...a.chapters, ...phaseB()] };
}

// ── Readings ──────────────────────────────────────────────────────────────

const au = (m: number) => m / AU;

/** Formats Phase A and Phase B readings; `bodyId` is the tour destination for the body readings. */
export function readingAny(key: TKey, met: number, bodyId?: BodyId): Reading {
    const t = dateOf(met);
    const m = missionTrajectory();
    const sc = () => spacecraftAt(t);
    switch (key) {
        case 'missionDate':
            return { label: 'Date (UTC)', value: isoDate(t) };
        case 'sunDist':
            return { label: 'Distance from Sun', value: `${au(norm(sc().r)).toFixed(2)} AU` };
        case 'earthDist': {
            const d = norm(sub(sc().r, state('earth', t).r));
            return { label: 'Distance from Earth', value: d < 0.05 * AU ? `${(d / 1e6).toFixed(1)} million km` : `${au(d).toFixed(2)} AU` };
        }
        case 'lightTimeB': {
            const d = norm(sub(sc().r, state('earth', t).r));
            const s = d / C_LIGHT;
            return { label: 'One-way light time', value: s < 120 ? `${s.toFixed(0)} s` : `${(s / 60).toFixed(1)} min` };
        }
        case 'rtgB':
            return { label: 'RTG power', value: `${rtgPower(Math.max(0, met) / (365.25 * DAY)).toFixed(0)} W` };
        case 'sunlight': {
            const r = au(norm(sc().r));
            return { label: 'Sunlight vs at Earth', value: `${((1 / (r * r)) * 100).toFixed(r > 3 ? 1 : 0)} %` };
        }
        case 'helioSpeed': {
            if (Math.abs(t - m.jupiter) < 20) {
                // Near Jupiter: Jupiter's velocity plus the flyby velocity relative to Jupiter.
                const dt = (t - m.jupiter) * DAY;
                const v = scale(sub(flybyPosition(dt + 30), flybyPosition(dt - 30)), 1 / 60);
                return { label: 'Speed around the Sun', value: `${(norm([v[0] + state('jupiter', t).v[0], v[1] + state('jupiter', t).v[1], v[2] + state('jupiter', t).v[2]] as Vec) / 1000).toFixed(2)} km/s` };
            }
            return { label: 'Speed around the Sun', value: `${(norm(sc().v) / 1000).toFixed(2)} km/s` };
        }
        case 'escapeSun':
            return { label: 'Solar escape speed here', value: `${(Math.sqrt((2 * MU_SUN) / norm(sc().r)) / 1000).toFixed(2)} km/s` };
        case 'jupDist': {
            const r = norm(flybyPosition((t - m.jupiter) * DAY));
            return { label: 'From Jupiter’s centre', value: `${(r / R_JUPITER).toFixed(r / R_JUPITER < 20 ? 1 : 0)} Jupiter radii` };
        }
        case 'jupSpeed': {
            const dt = (t - m.jupiter) * DAY;
            const r = norm(flybyPosition(dt));
            const vinf = dt < 0 ? m.flyby.vInfIn : m.flyby.vInfOut;
            return { label: 'Speed relative to Jupiter', value: `${(Math.sqrt(vinf * vinf + (2 * MU_JUPITER) / r) / 1000).toFixed(2)} km/s` };
        }
        case 'assist':
            return { label: 'Velocity change from the flyby', value: `${(m.flyby.helioDv / 1000).toFixed(2)} km/s`, tone: 'nominal' };
        case 'c3Need':
            return { label: 'Departure energy needed', value: `${m.c3.toFixed(1)} km²/s²` };
        case 'dla':
            return { label: 'Departure declination', value: `${m.dlaDeg.toFixed(1)}° (limit ±${CONSTRAINTS.dlaLimitDeg}°)` };
        case 'bRadius': {
            const b = body(bodyId ?? 'saturn');
            return { label: 'Mean radius', value: b.radiusKm ? `${b.radiusKm.toLocaleString('en-GB')} km` : '—' };
        }
        case 'bDistance': {
            const b = body(bodyId ?? 'sun');
            return { label: b.id === 'moon' ? 'Distance from Earth' : 'Distance from Sun', value: b.distance.replace(' from Earth', '') };
        }
        case 'bYear':
            return { label: 'Orbital period', value: body(bodyId ?? 'earth').year ?? '—' };
        case 'bDay':
            return { label: 'Rotation', value: body(bodyId ?? 'earth').day ?? '—' };
        case 'bTilt':
            return { label: 'Axial tilt', value: `${body(bodyId ?? 'saturn').tiltDeg ?? 0}°` };
        case 'bAtmos':
            return { label: 'Atmosphere', value: body(bodyId ?? 'earth').atmosphere };
        case 'bImagery':
            return { label: 'Imagery', value: bodyId ? body(bodyId).imagery.kind.replace(' (Solar System Scope, CC BY 4.0)', '') : 'Labelled per destination' };
        default:
            return reading(key, met);
    }
}

/** Positions (m, heliocentric) of a tour body at the tour epoch. */
export function tourPosition(id: BodyId): Vec {
    const b = body(id);
    if (b.orbit === 'sun') return [0, 0, 0];
    if (b.orbit === 'moon') {
        const e = scale(positionAU('earth', TOUR_EPOCH), AU);
        // The Moon beside the Earth at its mean distance (phase illustrative), sunward-left of Earth.
        const dir = scale(e, -1 / norm(e));
        return [e[0] + 3.844e8 * (dir[0] * 0.5 - dir[1] * 0.866), e[1] + 3.844e8 * (dir[1] * 0.5 + dir[0] * 0.866), e[2]];
    }
    if (b.id === 'asteroids') return scale([2.7, -0.4, 0], AU);
    if (b.id === 'kuiper') return scale([-28, 32, 2], AU);
    return scale(positionAU(b.orbit as Exclude<typeof b.orbit, 'moon' | 'belt' | 'sun'>, TOUR_EPOCH), AU);
}
