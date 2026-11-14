# Space Station Digital Twin R&D Center

The homepage section between "Can the satellite complete its mission safely?" and Flagship research. It has four interactive 3D experiences behind one selector and one WebGL canvas: Satellite, Orbital Constellation, Spacecraft and Space Station.

## Architecture

```
Engineering model  →  Simulation state  →  Scene controller  →  3D renderer  →  Telemetry overlay
src/lib/energy-model.ts   src/lib/space-twin/*    StoryClock + scenes     SpaceTwinCanvas      SpaceTwinViewer (HUD)
```

| Layer | Files |
|---|---|
| Energy balance (shared with the Research Platform) | `src/lib/energy-model.ts` (`energyStep`, `eclipseFraction`) |
| Orbits, visibility, coverage, shadow | `src/lib/space-twin/orbit.ts` |
| Power traces, orbit timing, margin equation | `src/lib/space-twin/power.ts` |
| One story per experience (stages, phases, camera path, HUD values) | `satellite.ts`, `constellation.ts`, `spacecraft.ts`, `station.ts` |
| Registry the viewer renders (text alternatives, maturity, assumptions) | `src/lib/space-twin/experiences.ts` |
| Story clock, camera path, HUD types | `src/lib/space-twin/story.ts` |
| Viewer UI (selector, stages, parts, controls, HUD, poster) | `src/components/space-twin/SpaceTwinViewer.tsx` |
| The one canvas (lazy, client only) | `src/components/space-twin/SpaceTwinCanvas.tsx` |
| Scenes | `src/components/space-twin/scenes/*.tsx` |
| Shared 3D pieces: environment, camera rig, labels, primitives, textures | `src/components/space-twin/*.ts(x)` |

The simulation never depends on the frame rate. Every trace is stepped at a fixed 0.25-minute step when its module loads, and is deterministic. Each scene and the HUD read the same clock. Story seconds map to simulated minutes at a fixed ratio per experience (5, 3, 5 and 3.5 min/s). The constellation uses the clock's continuous `elapsed` time, so orbits never jump at the loop. React state changes only on phase changes and on a throttled tick (about 5 per second), never per frame.

## Reused from the "Learn to Protect Missions" reference

The reference is the AutonomousEV component `src/components/space-research-showcase/` (plus `components/space-3d/RealEarth.tsx`, `components/space-academy/viewer/labels.tsx` and `app/space/components/showcase/useStage.ts`). Nothing in AutonomousEV was changed.

- The 6U spacecraft geometry: structure, wings, MLI cutaway, avionics stack and antennas. It now draws its parts from `primitives.tsx`.
- Procedural textures (solar cells, crinkled MLI, radiator tiles), with new silver-MLI, station-blanket and white-radiator variants.
- `StoryClock`, the periodic Hermite camera path and the camera rig. The visitor's drag, pinch or Ctrl/⌘-scroll takes the camera; Reset, Replay, a stage or an experience gives it back. A plain wheel scrolls the page.
- Sky, star field, prefiltered reflections, adaptive pixel ratio, and DOM labels projected from the canvas.
- Earth: day, night-lights and cloud imagery, copied into `public/images/space-twin/`.
- Presence, reduced-motion and WebGL-capability hooks.

Changed for iTelematics®: the purple palette was replaced with the site's tokens. Highlights use telemetry cyan and fault red. The Earth now takes a live Sun direction (for eclipse) and a driven rotation (for the constellation). Labels can hide behind the Earth.

## Equations

- Period: T = 2π √(a³/μ), with a = R⊕ + h, R⊕ = 6378 km and μ = 398600 km³/s².
- Eclipse fraction (cylindrical shadow): f = arccos(√(h² + 2R⊕h) / ((R⊕ + h) cos β)) / π.
- Energy step: `marginW = arrayW·η_EPS − loadW`. Charging adds `marginW·taper·η_charge·Δt / E_batt`, and discharging subtracts `(marginW/η_EPS)·Δt / E_batt`. SOC is clamped to 0–1, and charging tapers linearly above 95 %.
- Orbit margin: `(arrayW·t_sun − (P_sun·t_sun + P_ecl·t_ecl/(η_EPS·η_charge))/η_EPS) / required`.
- Elevation: el = asin(ρ·r̂_gs / |ρ|). A ground link exists only when el ≥ 10°.
- Coverage half-angle: λ = arccos(R⊕ cos ε / (R⊕ + h)) − ε. At 550 km and ε = 10° this gives λ = 15.0° and a footprint radius of 1,665 km.
- Line of sight: the segment's closest approach to Earth's centre must be at least R⊕ + 100 km.

## Reference cases and assumptions

| Experience | Maturity | Case |
|---|---|---|
| Satellite | Simulation | The published 6U reference (550 km, β ≈ 20°, 41.8 W average array power, 22/14 W loads, 86 Wh). The fault is the published heater-stuck scenario (+6 W). Detection is an SOC residual of more than 0.8 pt, followed by a 5-minute assessment, then safe mode with the payload off (14 W). Orbit margin is +20.0 % nominal, −9.1 % with the fault and +12.8 % in safe mode. No credit is taken for the sun-pointing attitude. |
| Orbital Constellation | Simulation | Walker 53°: 30/3/1 at 550 km. Circular two-body orbits around a spherical Earth, with no J2, drag or refraction. The three ground stations are illustrative. The Sun is fixed at −18° declination. Satellites are drawn far larger than scale. |
| Spacecraft | Simulation (conceptual case) | 700 km, β = 25°. Arrays give 2.4 kW at normal incidence, or 2175 W with one-axis tracking (cos β). Battery is 3.6 kWh. Loads are set per subsystem. The fault takes two of four strings on one wing open (−25 % array power); the response limits payload duty to 40 % in sunlight. Margins are +15.0 % nominal, −13.8 % with the fault and +11.9 % power-limited. |
| Space Station | Concept | 400 km, β = 0° (worst-case eclipse). Arrays are 160 kW with two-axis tracking; batteries are 192 kWh. Loads are 70 kW in sunlight and 62 kW in eclipse, with research halved by a schedule. Orbit margin is +23.7 %. Energy only: no thermal, attitude, life-support or crew modelling. Generic design; iTelematics® operates no station. |

Every loop restarts from its settled nominal state, so Replay is exactly reproducible. All values are simulated, not flight data, and the overlay says so.

## Implemented, partial and planned

**Implemented:**
- Four scenes and the shared viewer.
- Deterministic simulations, with numerical tests in `space-twin.test.ts`.
- Poster fallback for no WebGL.
- Reduced-motion support: nothing moves until the visitor presses Play.
- Pausing when off screen or when the tab is hidden.
- Resource release when switching scenes and when navigating away (verified with renderer counters).
- Adaptive pixel ratio.
- Shadows on capable devices.

**Partial:**
- Level of detail is limited to instanced, simplified constellation satellites. There is no automatic LOD switching.
- Frame rate was not measured on real phones. The adaptive pixel ratio drops to 1× when the first frames are slow, and software rendering uses the low-quality path.

**Planned research, not implemented:**
- AI anomaly detection, battery-health estimation and fault classification. Today's detection is a deterministic threshold rule.
- Quantum-inspired energy and contact scheduling.
- A cybersecurity demonstration.
- Cinematic audio. No licensed assets exist, so the interface carries no sound.
- Bloom post-processing, which would need another dependency.

## Debugging

Open `/?twin-debug` (or run in development) and call `window.__spaceTwin.info()` for the renderer's live geometry, texture, program, draw-call and triangle counts.
