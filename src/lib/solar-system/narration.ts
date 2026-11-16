/**
 * Voice narration of the Solar System experience: what the narrator says, and when.
 *
 * Two layers share one voice (Kokoro-82M, hf_alpha; generated once by tools/narration and served as
 * static audio):
 * - the mission narrator: a few lines per chapter, anchored to the modelled events (story time of the
 *   chapter's cinematic programme) and leaving silence at the big moments (ignition, separation, the
 *   Jupiter reveal) so the animation can speak for itself;
 * - the investigation narrator: one focused explanation per topic, starting with the topic's scene.
 *
 * Every number comes from the same models as the scene and the readings. The text is what visitors read
 * in the subtitles; tools/narration/speech.py turns it into what the voice says (numbers in words, codes
 * spelled out). Each line is sized to fit its scene at the voice's pace (about 2.3 words a second);
 * narration.test.ts checks the generated durations against the anchors.
 */
import { DAY, isoDate, norm, state, sub } from './ephemeris';
import { eventTime, flight, sampleAt, SEQUENCE } from './flight';
import { storyTimeOf } from './learning';
import type { Segment } from './mission';
import { dateOf, DISCOVERY_STOPS, journey, metOf, STOP_HOLD, STOP_TRAVEL } from './phaseB';
import { ENGINE_OUT } from './scenarios';
import { rtgFaultScenario, rtgPower } from './spacecraft';
import { conjunctions, missionTrajectory, R_JUPITER, spacecraftAt } from './trajectory';
import { FIRST_STAGE, KICK_STAGE, LIFTOFF_MASS, SPACECRAFT, UPPER_STAGE } from './vehicle';
import { AU } from './constants';

export interface NarrationLine {
    /** Unique id; also the audio file name. */
    id: string;
    /** 'chapter:<chapter id>' (cinematic programme), 'topic:<label id>' or 'finale'. */
    program: string;
    /** Story seconds from the start of the programme. */
    at: number;
    text: string;
}

const n0 = (x: number) => Math.round(x).toLocaleString('en-GB');
const n1 = (x: number) => x.toFixed(1);
const n2 = (x: number) => x.toFixed(2);

let built: NarrationLine[] | null = null;

export function narrationScript(): NarrationLine[] {
    return (built ??= build());
}

function build(): NarrationLine[] {
    const f = flight();
    const ev = (id: Parameters<typeof eventTime>[0]) => eventTime(id, f);
    const { chapters } = journey();
    const seg = (id: string): readonly Segment[] => chapters.find((c) => c.id === id)!.segments;
    const m = missionTrajectory();
    const J = metOf(m.jupiter);
    const S = metOf(m.saturn);
    const D = DAY;
    const meco = ev('meco');
    const sep = ev('stageSep');
    const usIgn = ev('usIgnition');
    const fair = ev('fairingSep');
    const seco1 = ev('seco1');
    const restart = ev('usRestart');
    const seco2 = ev('seco2');
    const kickIgn = ev('kickIgnition');
    const burnout = ev('kickBurnout');
    const scSep = ev('scSep');
    const tw = FIRST_STAGE.thrustSL / (LIFTOFF_MASS * 9.80665);
    const propPct = Math.round(((FIRST_STAGE.propellantMass + UPPER_STAGE.propellantMass + KICK_STAGE.propellantMass) / LIFTOFF_MASS) * 100);
    const sunAU = (met: number) => norm(spacecraftAt(dateOf(met)).r) / AU;
    const lightMin = (met: number) => {
        const t = dateOf(met);
        return norm(sub(spacecraftAt(t).r, state('earth', t).r)) / 299792458 / 60;
    };
    const conj = conjunctions().find((c) => c.end >= m.jupiter - 2 && c.start <= m.jupiter) ?? conjunctions()[0];
    const vHelioIn = norm(m.leg1.v2) / 1000;
    const vHelioOut = norm(m.leg2.v1) / 1000;
    const turn = (m.flyby.turn * 180) / Math.PI;
    const fault = rtgFaultScenario();
    const engineCase = ENGINE_OUT.cases.find((c) => c.at === ENGINE_OUT.at)!;
    const longDate = (jd: number) => {
        const [y, mo, d] = isoDate(jd).split('-').map(Number);
        return `${d} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][mo - 1]} ${y}`;
    };

    const lines: NarrationLine[] = [];
    // A chapter line anchored to a mission time (or directly to a story time).
    const ch = (chapter: string, list: { met?: number; t?: number; text: string }[]) =>
        list.forEach((x, i) => lines.push({ id: `c-${chapter}-${i + 1}`, program: `chapter:${chapter}`, at: Math.max(0.2, x.t ?? storyTimeOf(seg(chapter), x.met!)), text: x.text }));
    const topic = (id: string, text: string) => lines.push({ id: `t-${id}`, program: `topic:${id}`, at: 0.6, text });

    // ── Mission narrator (chapters) ──────────────────────────────────────

    ch('prep', [
        { t: 0.6, text: `This is RLV-1: two liquid-fuelled stages and a solid kick stage, ${n0(LIFTOFF_MASS / 1000)} tonnes, fuelled and ready.` },
        { t: 10.1, text: `${propPct} per cent of it is propellant. At the very top sits the reason for all of it: RSC-1, just ${SPACECRAFT.mass} kilograms.` },
    ]);
    ch('liftoff', [
        { met: -9.6, text: 'The final count is automatic.' },
        { met: 2.6, text: `Thrust is ${n2(tw)} times the weight, so it climbs slowly at first.` },
        { met: SEQUENCE.verticalRise + 1.5, text: 'Now a small tilt. From here, gravity bends the path towards orbit.' },
    ]);
    ch('ascent', [
        { met: 31, text: 'Speed builds faster than the air thins, so the pressure on the rocket rises.' },
        { met: f.maxQ.t - 1, text: `Max Q, ${n1(f.maxQ.q / 1000)} kilopascals: the hardest moment for the structure.` },
        { met: 122, text: 'Beyond it, the air thins faster than the speed grows, and the load falls away.' },
        { met: 176, text: `Gravity costs far more than drag: ${n0(f.losses.gravity)} metres per second.` },
    ]);
    ch('staging', [
        { met: meco - 5.7, text: 'The first stage is almost empty.' },
        { met: sep + 0.8, text: `Released, not blown apart: ${n0(FIRST_STAGE.dryMass / 1000)} tonnes of empty stage fall away.` },
        { met: usIgn + 0.1, text: 'Hydrogen burns almost invisibly.' },
    ]);
    ch('fairing', [
        { met: usIgn - 0.6, text: 'Above 100 kilometres, the air can no longer harm the spacecraft.' },
        { met: fair + 2.8, text: 'So the fairing halves fall away, and RSC-1 sees open space for the first time.' },
    ]);
    ch('orbit', [
        { met: fair + 16, text: 'The upper stage now pushes almost sideways. An orbit is mostly horizontal speed.' },
        { met: seco1 - 22, text: 'Watch the perigee: the lowest point of the path climbs out of the atmosphere.' },
        { met: seco1 + 0.6, text: `Cutoff. ${n2(sampleAt(seco1, f).speed / 1000)} kilometres per second: it is now in orbit, falling around the Earth.` },
    ]);
    ch('departure', [
        { met: seco1 + 330, text: 'Half an orbit later, the stack reaches its departure point.' },
        { met: restart + 5, text: 'The upper stage restarts, low and fast, where each kilogram of propellant buys the most energy.' },
        { met: seco2 + 1, text: 'It stops short, on purpose.' },
        { met: ev('escape') + 6, text: 'The solid kick stage cannot stop. It burns to the end, and RSC-1 escapes the Earth.' },
        { met: burnout + 25, text: `C3, ${n1(f.c3 / 1e6)}: exactly the energy the path to Jupiter needs.` },
    ]);
    ch('deploy', [
        { met: scSep + 5, text: 'Springs push RSC-1 free. From here, it flies alone.' },
        { met: scSep + 95, text: 'Thrusters damp the tumble.' },
        { met: scSep + 212, text: "Booms swing out, carrying the generators' heat away from the instruments." },
        { met: scSep + 606, text: 'Ten minutes after separation, a ground station hears it for the first time.' },
    ]);
    ch('cruise', [
        { met: 3.5 * D, text: "Engines off, for good. From here, the Sun's gravity alone shapes the path." },
        { met: 365.25 * D, text: `A year out, radio takes ${n0(lightMin(365.25 * D))} minutes each way.` },
        { met: 800 * D, text: `Sunlight here is just ${n0((1 / sunAU(800 * D) ** 2) * 100)} per cent of Earth's. The generators do not notice.` },
    ]);
    ch('jupiter', [
        { met: J - 3.85 * D, text: "Four days out, Jupiter's gravity has taken over, and RSC-1 is speeding up as it falls in." },
        { met: J - 1.85 * D, text: "From Earth, it is now hidden in the Sun's glare. The flyby runs on commands stored on board." },
        { met: J - 3.9 * 3600, text: 'Above the cloud tops now, falling faster every minute.' },
        { met: J + 0.1 * 3600, text: `Closest approach: ${n1(m.flyby.rp / R_JUPITER)} Jupiter radii.` },
        { met: J + 2.4 * 3600, text: `Jupiter's gravity turns the path by ${n0(turn)} degrees.` },
        { met: J + 1.1 * D, text: `It leaves at the same speed relative to Jupiter, but ${n0(vHelioOut - vHelioIn)} kilometres per second faster around the Sun, with no propellant used.` },
    ]);
    ch('saturn', [
        { met: J + 22 * D, text: `Jupiter's push sends RSC-1 on: ${n1((S - J) / (365.25 * D))} more years to Saturn.` },
        { t: 6.5, text: "It is already faster than the Sun's escape speed. It will never fall back." },
        { t: 12.4, text: `Saturn. Radio now takes ${n0(lightMin(S))} minutes each way.` },
    ]);
    // Discovery: one line per stop, as the camera arrives.
    const stopLines: Record<string, string> = {
        sun: 'The Sun holds 99.86 per cent of all the mass in the Solar System.',
        earth: 'Earth: liquid oceans, and the only world we know with life.',
        mars: 'Mars: a thin carbon dioxide sky over the tallest volcano in the Solar System.',
        jupiter: 'Jupiter: more than twice the mass of all the other planets together.',
        saturn: "Saturn's rings are vast, but mostly less than 100 metres thick.",
        neptune: 'Neptune, 30 times farther out than Earth. Its moon Triton orbits backwards.',
        pluto: 'Pluto, in the Kuiper Belt: nitrogen ice, and a frozen plain shaped like a heart.',
    };
    ch('discovery', [{ t: 0.4, text: 'The Solar System from above: eight planets, two belts, and Pluto.' }, ...DISCOVERY_STOPS.map((b, i) => ({ t: 6 + i * (STOP_TRAVEL + STOP_HOLD) + 1.0, text: stopLines[b] }))]);
    lines.push({
        id: 'finale',
        program: 'finale',
        at: 0.8,
        text: `From a launch pad on Earth to Saturn in ${n1((m.saturn - m.launch) / 365.25)} years, with one engine-free push from Jupiter. Every number you saw came from the same models as the pictures. Explore any stage again, or ask: what if?`,
    });

    // ── Investigation narrator (topics) ──────────────────────────────────

    const accel = FIRST_STAGE.thrustSL / LIFTOFF_MASS - 9.80665;
    topic(
        'explore-rocket',
        `RLV-1 is a two-stage rocket with a solid kick stage on top: ${n0(LIFTOFF_MASS / 1000)} tonnes on the launch pad. Why stages? No single rocket can carry enough propellant and still be light enough to reach orbit, so empty sections are dropped on the way.`,
    );
    topic(
        'first-stage',
        `The first stage is the lower ${n0(FIRST_STAGE.length)} metres: kerosene and liquid oxygen feeding two engines. It does the heaviest work, lifting the whole vehicle through the dense lower atmosphere, then falls away when its tanks are empty.`,
    );
    topic(
        'upper-stage',
        'Above the interstage sits the upper stage, burning liquid hydrogen and oxygen. Hydrogen engines are the most efficient chemical engines, which matters most once the vehicle is light and high. This stage can restart in orbit for the departure burn.',
    );
    topic(
        'engines',
        'A rocket engine pumps fuel and oxidiser into a combustion chamber, and the bell-shaped nozzle expands the hot gas into a fast jet. Pushing that mass backwards pushes the rocket forwards. The faster the exhaust, the less propellant each push costs.',
    );
    topic(
        'tanks',
        `Most of each stage is tank: thin walls holding fuel and oxidiser under pressure. Propellant is about ${propPct} per cent of the mass on the launch pad, so every kilogram saved in structure is a kilogram more for the journey. The liquid hydrogen is kept at minus 253 degrees.`,
    );
    topic('fairing', 'The fairing is a shell in two halves. It shields the spacecraft from air pressure, heating and noise during the climb. On the launch pad it stays closed; the cutaway shows the spacecraft waiting inside.');
    topic(
        'payload',
        `Inside the fairing, on its kick stage, waits RSC-1: a ${SPACECRAFT.mass}-kilogram spacecraft built for the outer planets. It carries a ${SPACECRAFT.highGainAntennaM}-metre dish to talk to Earth, two radioisotope generators for power, and a magnetometer boom that unfolds in space. Everything else on this rocket exists to deliver it.`,
    );
    topic('readiness', 'In the final minutes, every system reports go: propellant, pressures, guidance, range and weather. One no-go holds the count, because once the engines ignite and the clamps let go, there is no turning back.');
    topic('countdown', 'In the last ten seconds, computers run the count. Hundreds of steps must happen at exact moments, faster than people could react. Ignition is commanded three seconds before release.');
    topic(
        'ignition',
        'The engines start while clamps hold the rocket down. In under three seconds they reach full thrust, and the computers check every one. If any engine falls short, they shut it down before liftoff, with the rocket still safe on the launch pad.',
    );
    topic(
        'liftoff',
        `The clamps release only when thrust beats weight. Here thrust is ${n2(tw)} times the weight, so the excess gives a gentle first acceleration of ${n1(accel)} metres per second, every second. The rocket clears its 75-metre tower in about ${n0(ev('towerClear'))} seconds.`,
    );
    topic(
        'thrust',
        `Thrust comes from pushing exhaust backwards. Near the ground, air pressure pushes back on the nozzle, so the same engines give more thrust as the air thins: from ${n0(FIRST_STAGE.thrustSL / 1000)} to ${n0(FIRST_STAGE.thrustVac / 1000)} kilonewtons. Watch the plume widen as the pressure outside falls.`,
    );
    topic('acceleration', 'As propellant burns, the rocket gets lighter while the thrust stays strong, so it accelerates harder and harder. To protect the structure and the payload, the engines throttle back to hold four and a half g.');
    topic(
        'gravity-turn',
        `A rocket does not steer its way to orbit. After rising straight up, it tilts just ${SEQUENCE.pitchOverDeg} degrees, then lets gravity bend its path. Flying along its own direction of travel keeps sideways loads on the structure low.`,
    );
    topic('layers', 'The atmosphere has layers, defined by how temperature changes with height. Air density halves roughly every five and a half kilometres, so by 100 kilometres almost nothing is left. Watch the sky darken from blue to black.');
    topic('gravity-turn-2', 'The path keeps bending towards horizontal. An orbit is mostly sideways speed, about 7.8 kilometres per second at this height, so the climb gradually becomes a race along the horizon.');
    topic(
        'drag',
        `Drag is the air pushing back. It grows with the square of the speed and with the density of the air. Climbing out of the dense air quickly keeps it small: on this flight drag costs just ${n0(f.losses.drag)} metres per second, against ${n0(f.losses.gravity)} lost to gravity.`,
    );
    topic(
        'max-q',
        `Dynamic pressure is the push of the oncoming air: it rises with speed and falls as the air thins. The two effects meet at a peak called Max Q, here ${n1(f.maxQ.q / 1000)} kilopascals, ${n0(f.maxQ.altitude / 1000)} kilometres up. The rocket and its fairing are designed to survive this moment with margin.`,
    );
    topic('engine-performance', 'Rocket engines work better in thinner air. With less outside pressure on the nozzle, every kilogram of propellant gives more push, so thrust rises through the climb while the propellant flow stays the same.');
    topic('flight-path', 'This is the path the guidance computer flies. Too steep, and propellant is wasted fighting gravity; too shallow, and the rocket stays too long in thick air. The modelled path is drawn behind the vehicle.');
    topic(
        'w-engine',
        `What if one of the two first-stage engines fails, ${ENGINE_OUT.at} seconds after liftoff? We ran the same flight simulation. Thrust halves, and the rocket can no longer out-climb gravity: it falls back ${engineCase.downrangeKm} kilometres downrange. Fail after about ${n0(ENGINE_OUT.orbitAfter / 60)} minutes, and it could still reach orbit. That is why margins, and engines to spare, matter.`,
    );
    topic('meco', `Main engine cutoff. The first stage burns until its usable propellant is gone, ${n0(meco)} seconds after liftoff, then stops. Carrying it any further would only add dead weight.`);
    topic('separation', 'Separation is a release, not an explosion. The joint between the stages is cut, and the empty first stage drifts back. The upper stage waits a few seconds before igniting, so its flame does not hit the stage it just left.');
    topic('us-ignition', 'The upper stage ignites. Its hydrogen flame is almost invisible, but it is the most efficient engine on the vehicle, and now it only has to push a much lighter rocket.');
    topic(
        'why-stages',
        `Why drop stages at all? The rocket equation rewards a high ratio of starting mass to final mass. Empty tanks ruin that ratio, so the rocket throws them away: dropping the first stage removes ${n0((FIRST_STAGE.dryMass / f.masses.beforeStaging) * 100)} per cent of the mass in an instant.`,
    );
    topic(
        'mass-reduction',
        `Watch the mass fall: ${n0(LIFTOFF_MASS / 1000)} tonnes at liftoff, ${n0(f.masses.beforeStaging / 1000)} at first-stage cutoff, ${n0(f.masses.afterStaging / 1000)} after separation, and ${n0(f.masses.orbit / 1000)} in orbit. Less mass means the same thrust gives more acceleration.`,
    );
    topic('fairing-2', 'The two-piece fairing has shielded the spacecraft since liftoff. Without it, the airflow would tear off antennas, booms and instruments. But every kilogram carried longer than needed is a kilogram less for the journey.');
    topic(
        'fairing-sep',
        `The fairing is dropped on a condition, not a clock: when the heating from the thin air falls below 1,135 watts per square metre. Here that happens ${n0(sampleAt(fair, f).altitude / 1000)} kilometres up. Springs push the two halves apart.`,
    );
    topic('protection', 'Inside the fairing, the spacecraft is protected from three things: the pressure of the air, the heat of friction, and intense noise. All three peak low in the atmosphere, around Max Q.');
    topic('exposure', 'For the first time, RSC-1 is in open space: direct sunlight on one side, the cold of space on the other. From here on, its own thermal design keeps it within its temperature limits.');
    topic(
        'orbital-velocity',
        `Orbital velocity is the speed at which the ground curves away as fast as you fall towards it. At 185 kilometres, that is ${n2(sampleAt(seco1, f).speed / 1000)} kilometres per second. The Earth's own rotation gave ${n0(sampleAt(-3, f).speed)} metres per second of it for free.`,
    );
    topic('parking-orbit', `A parking orbit is a waiting place: a low, nearly circular orbit where the vehicle coasts for ${n0((restart - seco1) / 60)} minutes, until it reaches the right point for the departure burn.`);
    topic(
        'orbital-altitude',
        `The lowest point of an orbit around the Earth is the perigee, and the highest is the apogee: here ${n0(f.parking.perigeeKm)} and ${n0(f.parking.apogeeKm)} kilometres. At this height, thin air would bring the vehicle down within days, which is fine for a short wait.`,
    );
    topic('inclination', 'The orbit is tilted 10 degrees to the equator, the latitude of the launch site. Changing the tilt of an orbit later is very expensive, so the launch site and direction decide it.');
    topic('seco', `The upper stage cuts off when the computed orbit reaches its target, not on a clock. That absorbs small differences in engine performance. ${n1(f.upperStagePropAtOrbit / 1000)} tonnes of propellant remain for the departure.`);
    topic(
        'why-orbit',
        'Why does it not fall? It does, all the time. Gravity up here is still nine-tenths of its strength on the ground, but the vehicle moves sideways so fast that it keeps missing the Earth. That is an orbit: continuous free fall.',
    );
    topic('parking-2', 'The coast to the departure point. Launch windows to Jupiter open about every thirteen months, when Earth and Jupiter are well placed; the parking orbit fixes the exact departure point within the day.');
    topic('departure-burn', 'The departure burn adds speed along the direction of motion, low and fast in the Earth’s gravity, where each kilogram of propellant gives the most energy. This is called the Oberth effect.');
    topic('delta-v', 'Delta-v is the change in velocity a manoeuvre needs: the currency of spaceflight. Leaving a 185-kilometre orbit for Jupiter costs about 6.3 kilometres per second, paid for with propellant, burn by burn.');
    topic(
        'kick',
        `The kick stage is a solid rocket motor under the spacecraft. It spins up for stability, and once lit it cannot stop: it burns all its propellant in about ${n0(burnout - kickIgn)} seconds, adding the last few kilometres per second.`,
    );
    topic(
        'escape',
        `Past escape speed, the path is no longer a closed orbit but an open curve. The spacecraft keeps a leftover speed after climbing out of the Earth's gravity: ${n1(Math.sqrt(f.c3 / 1e6))} kilometres per second. Added to the Earth's own 29.8 around the Sun, that sets the road to Jupiter.`,
    );
    topic('sun-centred', 'Free of the Earth, RSC-1 now orbits the Sun. A spacecraft cannot fly straight to a planet: it follows an ellipse, timed so that Jupiter arrives at the same place at the same time, three years later.');
    topic('sc-sep', 'A clamp band opens, and springs push the spacecraft away from the spent kick stage at half a metre per second. From here, RSC-1 flies alone, on the path the rocket gave it.');
    topic('attitude', 'Separation leaves the spacecraft slowly tumbling. Small hydrazine thrusters fire short pulses to stop it; then Sun and star sensors lock its orientation, so the dish can point at Earth.');
    topic(
        'rtg-boom',
        'The RTG boom swings out, carrying the two generators away from the body of the spacecraft, so their heat and radiation stay clear of the instruments. Why not solar panels? At Jupiter, sunlight is only 3.7 per cent as strong as at Earth.',
    );
    topic(
        'eps',
        'Power flows from the generators, through a regulator, to a 30-volt bus that feeds every system. The battery covers short peaks, like a boom motor running. At every moment, the power generated equals the power used, stored and dissipated.',
    );
    topic(
        'computer',
        'The flight computers run the deployment on their own: damping the tumble, finding the Sun and stars, deploying three booms, and switching on the radio. Far from Earth, commands arrive late, so the spacecraft must look after itself.',
    );
    topic(
        'comms',
        `RSC-1 talks to Earth by radio. Near Earth, a small low-gain antenna is enough; far away, the ${SPACECRAFT.highGainAntennaM}-metre dish, pointed precisely at Earth, keeps the link alive. The signal travels at the speed of light, yet at Jupiter it still takes 35 to 52 minutes.`,
    );
    topic('first-contact', 'Ten minutes after separation, a ground station hears the spacecraft for the first time. Until that moment, nobody on Earth knows whether separation went well.');
    topic('health-check', 'The first health check compares every temperature, voltage and rate with its limits. Problems found now can be worked around before the long cruise begins.');
    topic(
        'w-rtg',
        `What if one generator fails at separation? With the same power model: one generator gives ${n0(fault.rtg)} watts, but once the instruments switch on, the spacecraft needs ${n0(fault.loadsFull)}. The battery slowly drains, and after about ${n0(fault.safeModeAt / 3600)} hours, fault protection switches to safe mode and turns the instruments off. The mission survives; the science has to wait.`,
    );
    topic(
        'b-trajectory',
        `This is the whole path to Jupiter, to scale: an arc around the Sun from the Earth's orbit out to Jupiter's, flown in ${n1(J / (365.25 * D))} years without any engine. Once the departure burn is over, the Sun's gravity alone shapes it.`,
    );
    topic(
        'b-window',
        'A launch window is the range of dates when the trajectory works. Leave a few weeks early or late, and the energy needed climbs steeply. For this mission, Earth, Jupiter and Saturn line up like this only about once every twenty years.',
    );
    topic('b-delay', 'Radio travels at the speed of light, but space is big. As RSC-1 moves away, each message takes longer: tens of minutes by the time it reaches Jupiter. Commands are planned in advance; there is no live control.');
    topic('b-power', 'Sunlight weakens with the square of the distance from the Sun, but the generators do not depend on sunlight. Their power falls only slowly, as the plutonium decays and the thermocouples age.');
    topic('b-planets', 'The planets keep moving while the spacecraft travels. The trajectory is aimed at where Jupiter will be in three years, not where it is today.');
    topic(
        'b-navigation',
        'How do engineers know where the spacecraft is? Ground antennas measure the distance and the Doppler shift of its radio signal, and fit its orbit to those measurements. Small errors grow over the years, so small corrections remove them. This model flies exactly on the planned path.',
    );
    topic('j-approach', 'In the final days, the gravity of Jupiter takes over from the Sun’s. RSC-1 speeds up as it falls in, on an aim point set weeks earlier. Jupiter grows from a disc to a world that fills the view.');
    topic(
        'j-closest',
        `Closest approach: ${n1(m.flyby.rp / R_JUPITER)} Jupiter radii from the centre, about ${n0(Math.round((m.flyby.rp - R_JUPITER) / 1e7) * 10000)} kilometres above the cloud tops. Closer passes bend the path more, but Jupiter's radiation belts set the limit.`,
    );
    topic(
        'j-assist',
        `Here is the trick of a gravity assist. Relative to Jupiter, the spacecraft leaves at the same speed it arrived: only its direction turns, by ${n0(turn)} degrees. But Jupiter itself moves around the Sun at ${n0(norm(state('jupiter', m.jupiter).v) / 1000)} kilometres per second. Add that motion, and the speed of RSC-1 around the Sun jumps from ${n1(vHelioIn)} to ${n1(vHelioOut)} kilometres per second, without a drop of propellant.`,
    );
    topic('j-moons', 'These are the four great moons of Jupiter, discovered by Galileo: volcanic Io; icy Europa, which may hide an ocean; Ganymede, larger than the planet Mercury; and cratered Callisto. Their orbits are drawn to scale.');
    topic('j-radiation', 'The powerful magnetic field of Jupiter traps energetic particles in intense radiation belts. Radiation damages electronics, so it sets how close a spacecraft can safely pass.');
    topic(
        'w-link',
        `This one is not a what-if. On this very trajectory, from ${longDate(conj.start)} to ${longDate(conj.end)}, RSC-1 appears within three degrees of the Sun, as seen from Earth, and the Sun's corona scrambles its radio signal. So the most important week of the cruise passes without a reliable link: the flyby has to run on commands uploaded beforehand.`,
    );
    topic(
        's-flyby',
        `After Jupiter, the spacecraft reaches Saturn on ${longDate(m.saturn)}. A second flyby could bend the path again, towards the outer planets. The pass shown here is placed for illustration: this phase designs the arrival, not the flyby itself.`,
    );
    topic('s-rings', 'The rings of Saturn are countless particles of water ice, in a disc hundreds of thousands of kilometres wide but mostly less than 100 metres thick. Spacecraft cross the ring plane only in known gaps, or far outside.');
    topic(
        's-escape',
        `Is RSC-1 still bound to the Sun? At Saturn it moves at ${n2(m.helioSpeedSaturn / 1000)} kilometres per second, just above the Sun's escape speed there, ${n2(m.escapeSpeedSaturn / 1000)}. The Jupiter flyby supplied the difference: the spacecraft will leave the Solar System.`,
    );
    topic('s-ops', 'Hours of light-time away, a spacecraft is run by sequences uploaded in advance. On board, fault protection watches temperatures, voltages and rates, and switches to safe mode if anything leaves its limits.');
    topic(
        's-power',
        `The generators fade slowly: from ${n0(rtgPower(0))} watts at launch to ${n0(rtgPower((m.saturn - m.launch) / 365.25))} at Saturn, as plutonium-238 decays with a half-life of 87.7 years. Operations plans switch instruments on and off to fit the power available.`,
    );
    const tour: Record<string, string> = {
        sun: 'The Sun is an ordinary star, but it holds 99.86 per cent of all the mass in the Solar System. Its light weakens with the square of the distance, which is why the outer planets are so cold.',
        mercury: 'Mercury is the smallest planet and the closest to the Sun: heavily cratered, with a huge iron core, and temperatures from minus 180 to 430 degrees.',
        venus: 'Venus is almost the twin of the Earth in size, but a runaway greenhouse effect heats its surface to about 465 degrees, hot enough to melt lead. What we see are its cloud tops.',
        earth: 'Earth: liquid water oceans, a protective atmosphere, and the only world we know with life, one astronomical unit from the Sun.',
        moon: 'The Moon, 384,400 kilometres away: dark plains of ancient lava, and bright, cratered highlands.',
        mars: 'Mars has a thin carbon dioxide atmosphere. It is home to Olympus Mons, the tallest volcano in the Solar System, and Valles Marineris, a canyon as long as a continent.',
        asteroids: 'The asteroid belt lies between Mars and Jupiter. Despite the films, it is mostly empty: neighbouring asteroids are typically about a million kilometres apart, and all of them together weigh less than 4 per cent of our Moon.',
        jupiter: 'Jupiter is the giant: 318 times the mass of the Earth, more than twice all the other planets combined. Its four large moons are worlds in their own right.',
        saturn: 'Saturn, and its rings of water ice reaching 140,000 kilometres from the centre, yet mostly thinner than 100 metres. Its largest moon, Titan, has a thick atmosphere of its own.',
        uranus: 'Uranus rolls around the Sun on its side, tilted 98 degrees, with faint, narrow rings. A single season there lasts 21 years.',
        neptune: 'Neptune, 30 astronomical units out, is the windiest planet. Its largest moon, Triton, orbits backwards: probably a captured object from the Kuiper Belt.',
        pluto: 'Pluto is a dwarf planet in the Kuiper Belt. New Horizons found a heart-shaped region of nitrogen ice, Sputnik Planitia, and a large moon, Charon. Its far side was in darkness during the flyby, so it is shown as a plain tone.',
        kuiper: 'Beyond Neptune lies the Kuiper Belt: icy bodies 30 to 50 astronomical units from the Sun, including Pluto and Arrokoth, the most distant object a spacecraft has ever visited.',
    };
    for (const [id, text] of Object.entries(tour)) topic(`t-${id}`, text);
    return lines;
}
