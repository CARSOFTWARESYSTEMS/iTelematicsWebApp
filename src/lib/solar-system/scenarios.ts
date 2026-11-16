/**
 * Fault scenarios ("What if?") of the Solar System experience, computed with the same models as the
 * nominal mission. Nothing here is scripted: each outcome is what the flight simulation, the power model
 * or the trajectory gives (checked in scenarios.test.ts).
 *
 * 1. Launch-vehicle performance anomaly: one of the two first-stage engines fails (flight.ts with
 *    `engineOutAt`). Thresholds and outcomes are stored here and recomputed by the test, so opening the
 *    topic runs one simulation, not a search.
 * 2. Power degradation: one RTG fails at separation (spacecraft.ts, rtgFaultScenario).
 * 3. Communication interruption: solar conjunction, when RSC-1 appears within 3° of the Sun from Earth
 *    (trajectory.ts, conjunctions); one ends on the day of the Jupiter flyby.
 */
import { simulateFlight, type FlightResult } from './flight';

export const ENGINE_OUT = {
    /** The failure shown in the scene, s after liftoff (just before Max Q). */
    at: 60,
    /** Computed outcomes of failures at other times: when the vehicle falls back, and how far downrange. */
    cases: [
        { at: 30, impact: 82, downrangeKm: 6 },
        { at: 60, impact: 170, downrangeKm: 60 },
        { at: 110, impact: 353, downrangeKm: 548 },
    ],
    /** A failure after these times still reaches the parking orbit / still reaches Jupiter's C3. */
    orbitAfter: 125,
    jupiterAfter: 137,
} as const;

let engineOut: FlightResult | null = null;

/** The flight with one first-stage engine lost at ENGINE_OUT.at (computed once, about 50 ms). */
export function engineOutFlight() {
    return (engineOut ??= simulateFlight({ engineOutAt: ENGINE_OUT.at }));
}
