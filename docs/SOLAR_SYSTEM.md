# Solar System — From Earth Launch to Deep Space Exploration (option 06)

This is the sixth Space Digital Twin option, on the homepage and `/research-lab`. Phase A, built 14 November 2026, covers
the reference mission from the launch pad to Earth departure and spacecraft deployment.

All values are **SIMULATED — Conceptual reference mission SOL-1**. The launch vehicle and the spacecraft are conceptual: no real vehicle is
modelled or named. This is a physics-based visual simulation, not a validated digital twin.

## Phases

| Phase | Scope | Status |
|---|---|---|
| A | Launch vehicle preparation, ignition and liftoff, atmospheric ascent, staging, fairing separation, orbit insertion, Earth departure, spacecraft separation and deployment; Sun-centred view of the transfer | Built |
| B | Interplanetary cruise; the Sun, eight planets, Moon, major moons, rings, asteroid and Kuiper belts (Mode A, Guided Discovery); a Lambert/ephemeris Jupiter–Saturn trajectory (Mode B); gravity assist; deep-space operations; three fault scenarios | Next |

## Integration (additive)

- **`src/components/space-twin/SpaceTwinViewer.tsx`** gains a sixth tab, alongside the fifth one, added in the same way:
  - The tab loads `src/components/solar-system/SolarSystemExperience` lazily.
  - The standard frame is hidden, not unmounted, while the tab is open.
  - The four original experiences are unchanged.
- **Separate code.** The option has its own scene, clock, state and resources. Pure code, testable without a browser, lives in
  `src/lib/solar-system/`; rendering lives in `src/components/solar-system/`.
- **Shared code it imports, read-only:**
  - device hooks
  - the label projector
  - `AdaptiveDpr`
  - `Reflections`
  - `EnergyFlow`
- **Full screen** works through the same `data-present` styles as option 05.

## Reference mission

**Launch vehicle RLV-1** (`vehicle.ts`). It is 61.4 m tall and weighs 334.3 t at liftoff.

| Stage | Propellants | Dry / propellant mass | Thrust | Specific impulse |
|---|---|---|---|---|
| First | Kerosene / oxygen, 2 engines | 21 t / 285 t | 4,150 kN at sea level, 4,580 kN in vacuum | 311 s at sea level, 338 s in vacuum |
| Upper | Hydrogen / oxygen, restartable, 2 engines | 2.35 t / 20.8 t | 203.6 kN | 451 s |
| Kick | Solid | 124 kg / 2,010 kg | 68.6 kN | 286 s |

The first stage throttles down to 40 % to stay under 4.5 g.

**Fairing:** 2.1 t, 4.2 m wide.

**Spacecraft RSC-1:** 720 kg. Spacecraft for the outer planets run on radioisotope power, because sunlight at Jupiter is 1/5.2² ≈ 3.7 % of
its strength at Earth. RSC-1 carries:
- two RTGs, 245 W each at the beginning of life
- a 30 V bus with a shunt regulator and a 450 Wh battery
- a 3.7 m high-gain antenna
- three booms: RTG, magnetometer and science

**Launch site:** a conceptual coastal site at 10° N, launching due east, so the orbit's inclination is 10°.

## Models and equations

**Atmosphere** (`atmosphere.ts`): US Standard Atmosphere 1976. Up to 86 km it uses the seven geopotential layers. Above that it
interpolates the published table, log-linearly for density.

**Flight** (`flight.ts`) is a planar simulation in an Earth-centred inertial frame, integrated with fourth-order Runge–Kutta in 0.2 s
steps.
- The equation of motion is m·a = T·û + D + m·g:
  - Gravity: g = −μ r/|r|³.
  - Thrust: T = T_vac − (T_vac − T_SL)·p/p₀, at a constant ṁ = T_vac / (Isp_vac·g₀).
  - Drag: D = ½ρv²·C_D(M)·A, opposite to the velocity relative to the air. The air co-rotates with the Earth at ω·cos φ.
- The flight sequence:
  1. A vertical rise for 14 s.
  2. A 3.4° pitch-over, then a gravity turn at zero angle of attack.
  3. Upper-stage guidance holds a target radius with a 30 s time constant: a_r = (r_t − r)/τ² − 2ṙ/τ. The pitch is set from
     sin β = (a_r + μ/r² − v_t²/r)/(T/m).
  4. First cutoff when the perigee reaches 183 km.
- Events are triggered by physical conditions, not clocks:
  - First-stage cutoff: propellant depleted.
  - Fairing jettison: free-molecular heating ½ρv³ below 1,135 W/m², above 100 km.
  - Parking orbit: perigee reached.
  - Departure burn: the upper stage burns down to a 120 kg reserve.
  - Kick stage: spin-stabilised (fixed thrust axis), burns to depletion.
- The two-day escape coast uses 30 s steps.

**Orbit** (`orbit.ts`):
- Vis-viva and orbital elements from the planar state.
- Inclination: cos i = cos φ·sin Az.
- A Hohmann Earth → Jupiter transfer gives C3 = 77.3 km²/s² and a 2.73-year transfer.

**Spacecraft** (`spacecraft.ts`):
- Deployment timeline: rate damping, attitude lock at 150 s, booms at 210, 330 and 480 s, first contact at 600 s, health check at
  720 s.
- RTG power = P₀·0.5^(t/87.7 yr)·(1 − 0.008)^t.
- Loads are listed per subsystem. The power balance (RTG = loads + battery + shunt) is checked every second.

**Mission script** (`mission.ts`):
- 8 chapters and 49 action labels.
- Each label answers what it is, what it does, why it matters and what is happening, and has a Learn more.
- Telemetry is shown 3–6 readings at a time.
- Story time maps onto mission time in explicit segments, so the "Time ×N" label on screen is exact.

## Results (simulated; tested in `flight.test.ts`)

| Event | Time | Conditions |
|---|---|---|
| Ignition / liftoff | T−3 s / T+0 | Thrust-to-weight ratio 1.27 |
| Max Q | T+72.8 s | 31.3 kPa at 11.1 km, 416 m/s relative to the air |
| Throttle-down (4.5 g) | T+165 s | 63 km |
| First-stage cutoff / separation | T+221.1 s / T+224.3 s | 110.5 km, 5.38 km/s inertial, flight path 10.1° |
| Upper-stage ignition | T+231.3 s | |
| Fairing separation | T+233.1 s | 121.5 km, heating below 1,135 W/m² |
| Parking orbit | T+493.9 s | 183.9 × 187.8 km, 88.2 min period, inclination 10° |
| Departure restart | T+1,993.9 s | After a 25-minute coast |
| Escape (energy > 0) | T+2,152 s | During the upper-stage burn |
| Kick stage burnout | T+2,332.7 s | C3 = 113.6 km²/s² (minimum-energy transfer to Jupiter: 77.3) |
| Spacecraft separation | T+2,572.7 s | |

**Losses:** 726 m/s to gravity, 49 m/s to drag.

**Mass:**
- 334.3 t at liftoff
- 49.3 t before staging
- 28.3 t after staging
- 14.1 t in orbit
- 0.72 t spacecraft

The tests also check:
- the US Standard Atmosphere table values
- mass bookkeeping at every sample
- that propellant flow equals thrust / (Isp·g₀)
- energy conservation while coasting
- that the escape hyperbola's C3 stays constant
- determinism
- guidance sensitivity: a 4.8° pitch-over fails to reach orbit

## Scale and time

- **Pad and ascent:** the vehicle and the Earth are to scale. Time is shown as "Real time" or "Time ×N".
- **Orbit and departure:** the Earth and orbits are to scale. On wide shots the vehicle is shown as an enlarged marker, and the marker
  says so.
- **Sun-centred view:** orbits are to scale. The Sun is enlarged ×25, the Earth ×2,500 and Jupiter ×250, and the view says so.
- **Intro:** labelled "Cinematic Scale — Not to Scale".

## Deviations from the brief, and why

- **Chapter order 07/08.** On outer-planet missions the upper stage and a kick stage fly the departure burn with the spacecraft still
  attached; the spacecraft separates afterwards, already on its escape path. Chapter 07 is therefore Earth Departure and chapter 08
  Spacecraft Separation and Deployment.
- **"Solar Array Deployment"** becomes **RTG Boom Deployment**. RSC-1 has no solar arrays, for the reason given under the reference
  mission above.
- **The departure in Phase A** is checked against a Hohmann (minimum-energy) requirement. The launch window and the exact trajectory
  (Lambert solution with planetary ephemerides) belong to Phase B.

## Limits (Phase A)

- **Flight model:**
  - Planar trajectory with a spherical Earth: no J2, no out-of-plane steering.
  - Drag coefficient is a function of Mach only.
  - Vehicle attitude is drawn from the thrust direction.
  - Engines ramp up but are otherwise ideal; no engine-out cases.
  - Stage 1 is not recovered.
- **Separated hardware:** the first stage and fairing halves drift on simple relative-motion laws, not in their own simulations.
- **Spacecraft:** the spacecraft model covers deployment only, with no thermal model.
- **Fault scenarios:** none yet (Phase B).

## Realism (look and interaction)

- **Sky:** physically based single scattering (Rayleigh + Mie, `atmosphere.tsx`). It is blue at the pad, darkens during ascent and
  is black with a thin blue limb in space. The pad's lighting environment is prefiltered from the same sky, and haze over the ground
  thins with altitude.
- **Launch site:** licensed photographic surfaces (Poly Haven, CC0).
  - Terrain: anti-tiled grass and rock with sand.
  - Ocean: sun glints and Fresnel sky reflection.
  - Pad: concrete with a sooted trench.
  - Buildings: white panels with corrugated relief.
  - Lighting and shadows: lit by the Sun, with shadows near the pad.
- **Vehicle:**
  - nose cone: a tangent ogive
  - ribbed intertank and interstage
  - liquid-oxygen frost that sheds after liftoff
  - venting on the pad
  - umbilical plates, a fairing seam and a separation ring
  - sooty nozzle interiors
  - engine glow (the bloom a camera records), plumes that widen with altitude, the ignition cloud and the exhaust trail
- **Cutaways:** highlights and cutaways appear only for the chosen action label. The chapters play as plain cinematography.
- **Interaction:** as in the other Space Digital Twin experiences:
  - Drag turns the view; one finger only turns, so vertical swipes still scroll the page.
  - Pinch or Ctrl/⌘ + scroll zooms.
  - After a pause the guided camera returns.

## Assets

- Earth imagery: the existing NASA Visible Earth maps, credited on `/policies/terms`.
- Poster: `public/images/space-twin/poster-solar-system.jpg`, rendered from this scene.
- Vehicle, spacecraft, pad and plume are built from code, with no downloaded models.
- Launch site surfaces (Poly Haven, CC0) and the Sun and Jupiter maps (Solar System Scope, CC BY 4.0) are in `public/images/solar-system/` (1.6 MB, loaded only when this experience opens). They are registered in `docs/ASSET_SOURCES.md` and credited on `/policies/terms`.
