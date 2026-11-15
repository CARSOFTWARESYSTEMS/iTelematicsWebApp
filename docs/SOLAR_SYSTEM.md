# Solar System — From Earth Launch to Deep Space Exploration (option 06)

This is the sixth Space Digital Twin option, on the homepage and `/research-lab`. Phase A, built 14 November 2026, covers
the reference mission from the launch pad to Earth departure and spacecraft deployment. On 15 November 2026 the visual quality
and the interface were rebuilt (see **Visual quality recovery**) and Phase B was added: the cruise, the Jupiter encounter and
gravity assist, Saturn and deep space (physics mode) and the Solar System Discovery tour (cinematic mode).

All values are **SIMULATED — Conceptual reference mission SOL-1**. The launch vehicle and the spacecraft are conceptual: no real vehicle is
modelled or named. This is a physics-based visual simulation, not a validated digital twin.

## Phases

| Phase | Scope | Status |
|---|---|---|
| A | Launch vehicle preparation, ignition and liftoff, atmospheric ascent, staging, fairing separation, orbit insertion, Earth departure, spacecraft separation and deployment; Sun-centred view of the transfer | Built |
| B | Interplanetary cruise (09); Jupiter encounter and gravity assist (10); Saturn and deep space (11): a Lambert/ephemeris Earth–Jupiter–Saturn trajectory. Solar System Discovery (12): the Sun, eight planets, Moon, Pluto, asteroid and Kuiper belts | Built 15 Nov 2026 |
| B (rest) | Fault scenarios (launch-vehicle performance anomaly, power degradation, communication interruption); Pluto and moon imagery; a designed Saturn flyby | Open |

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


## Visual quality recovery (15 November 2026)

### Why the first version looked like a prototype (audit of the code and renders)

- **Camera.** The opening was an 8 s globe shot, then a distant aerial in which the vehicle was about a quarter of the frame
  height over a large empty apron. Chapter 01 ended on a close shot through a *translucent* fairing.
- **Geometry and materials.** The vehicle was plain cylinders with one flat panel texture; the tower was red instanced boxes; the
  launch mount a black slab on posts; buildings were untextured boxes; the "trench" a dark box.
- **Environment.** A flat circular ground fading to a single colour; the ocean lay behind the camera in every pad shot; no
  propellant farm, piping, lightning protection or relief.
- **Interface.** A permanent 360 px side panel, every topic of a chapter at once (6–8), 5–6 readings, 0.62 rem text over the
  scene.

### What changed

- **Layout** (`SolarSystemExperience.tsx`, `.module.css`). The scene fills the width (16:9; 4:5 on phones). On top: the stage,
  the mission time or date, and "Simulated · SOL-1". One contextual card: title, *What happens*, *Why it matters*, two to four
  readings, *Learn more*, and the stage's three to six main topics (the rest under *More topics*: all 49 Phase A topics are kept).
  Below: a timeline of the twelve stages with Previous, Play/Pause, Next, Replay and Back. On wide screens the card floats on the
  left and the hardware is framed right of centre (a camera view offset); on phones the card is a sheet under the scene. Full screen
  uses the same layout.
- **Opening** (`mission.ts` intro, `SolarScene.tsx`). Five continuous shots: establishing view of the whole complex → slow
  approach along the vehicle → the closed fairing → back to the full vehicle → ready (the Start Mission button is emphasised).
  Pad compositions are aspect-aware and keep the whole 69 m vehicle and table in frame.
- **Explore Spacecraft Payload.** Approach with the fairing highlighted → an engineering section cut opens towards the camera
  (clipping planes; the fairing is never translucent) → part names (antenna, RTGs, magnetometer boom, kick stage, adapter, fairing
  lining) → the cut closes on the way back to the full vehicle. The interstage and tank topics use the same kind of cut.
- **Launch vehicle** (`LaunchVehicle.tsx`, same `STACK` dimensions). Engine bay with heat shield, turbopumps, turbine exhaust ducts,
  gimbal actuators and regeneratively cooled nozzles; weld lands and panel joints on the tank barrels; ribbed intertank; carbon
  interstage with four separation motors and a polished separation ring; foam-insulated hydrogen upper stage with a
  niobium-tinted nozzle extension; roll-tracking band and the RLV-1 name; raceways, clamps, pressurisation line and umbilical
  plates; opaque fairing with seam rails and an acoustic lining. Surface detail is procedural (`textures.ts`), no downloaded models.
- **Launch complex** (`LaunchSite.tsx`). Raised hardstand with a flame trench running north and a steel deflector; launch table
  with hold-down clamps, tail-service masts and deluge headers; grey steel umbilical tower with platforms, elevator core and three
  swing arms carrying umbilical lines; catenary lightning protection; sound-suppression water tower; liquid-oxygen and
  liquid-hydrogen spheres, kerosene tanks and pipe racks; floodlight towers, perimeter road, gravel apron, buildings; coastal
  terrain with relief, dunes and a beach; the ocean (with surf) now behind the pad in the opening shots.
- **Ignition and liftoff.** The green TEA–TEB igniter flash, wider sooty kerosene plumes, a deflected exhaust jet out of the trench
  while the vehicle is low, self-lit steam that bursts at ignition. Pad readings show air-relative speed and "On the pad" for
  acceleration until release (the simulation's sensed acceleration excludes the clamp reaction).
- **Sky.** An approximate multiple-scattering term removes the brown, too-dark horizon of single scattering.
- **Spacecraft RSC-1** (`Spacecraft.tsx`). Decagonal bus in gold and black multi-layer insulation, radiator louvres, star trackers,
  Sun sensors, thruster clusters; ribbed 3.7 m dish with tripod subreflector, feed and low-gain antenna; two finned RTGs with end caps
  on their boom; a coilable lattice magnetometer boom; the science boom's scan platform with camera and spectrometers. Still no
  solar arrays.
- **Staging, fairing separation** cameras widened so both stages, and both fairing halves, stay in frame.
- **Readings.** "Suborbital" instead of a negative perigee during the ascent.

The flight simulation, atmosphere, orbit, vehicle, spacecraft and clock modules are unchanged (byte-identical to the previous
commit). Visual changes do not alter any engineering result.

## Phase B: physics mode (chapters 09–11)

**Ephemeris** (`ephemeris.ts`). Published approximate Keplerian elements for 1800–2050 (E. M. Standish, JPL Solar System Dynamics),
J2000 ecliptic. Checked against JPL Horizons vectors (fixtures in `ephemeris.test.ts`): Earth–Moon barycentre within 0.0001 AU,
Jupiter 0.004 AU, Saturn 0.022 AU, inside the stated accuracy.

**Lambert and propagation** (`lambert.ts`). Universal-variable Lambert solver (bisection on z, single revolution, prograde) and a
universal Kepler propagator; tests propagate each solution to its end point (relative error < 1e-7) and check energy conservation.

**Trajectory design** (`trajectory.ts`). Grid search over launch dates 2030–2045 for Earth → Jupiter → Saturn, patched conics:
- departure C3 ≤ 113.6 km²/s² (what the simulated SOL-1 launch delivers);
- Jupiter periapsis ≥ 4 Jupiter radii;
- periapsis burn ≤ 80 m/s (RSC-1 carries 45 kg of hydrazine);
- Saturn within 9 years.

The flyby periapsis is solved from δ = asin(1/e_in) + asin(1/e_out). The best window is mid-2034, and a refined 1/2/4-day search selects:

| Quantity | Value |
|---|---|
| Launch | 25 June 2034 (window 23 May – 22 July 2034) |
| Departure energy | C3 = 79.6 km²/s² (Hohmann reference 77.3) |
| Departure declination (DLA) | 3.9°, inside the ±10° reachable from the 10° parking orbit |
| Jupiter flyby | 3 July 2037 (3.02 years); periapsis 4.07 Jupiter radii (≈ 220,000 km above the cloud tops); v∞ 5.97 km/s; turn 135°; periapsis trim 1.9 m/s |
| Gravity assist | Heliocentric velocity change 11.04 km/s |
| Saturn | 28 November 2040 (6.43 years); v∞ 8.94 km/s; heliocentric speed 13.69 km/s vs solar escape 13.57 km/s there (just above escape) |
| RTG power | 490 W at launch, 467 W at Jupiter, 442 W at Saturn |
| One-way light time | 51.4 min at Jupiter, 85.6 min at Saturn |

`trajectory.test.ts` re-runs the refined search and checks that it returns these dates, that the window is bounded where stated,
and every constraint. **Compatibility with Phase A:** the launch delivers C3 = 113.6 because every stage burns to depletion; a real
mission would shut the upper stage down early at 79.6. That cut-off is not modelled.

**Scenes** (`PlanetViews.tsx`).
- **Cruise:** Sun-centred, orbits to scale, planets placed by the ephemeris on the date shown. Bodies and the spacecraft are
  markers.
- **Jupiter encounter:** Jupiter-centred and to scale. Jupiter is oblate and rotating, lit from the Sun's true direction, with its
  IAU pole. The Galilean moons are on to-scale orbits; their phases are illustrative and their surfaces are plain colours. The
  hyperbola comes from the solved flyby. RSC-1 points its dish sunward, which is within about 11° of the Earth.
- **Saturn:** rings to scale and oriented by Saturn's IAU pole. The spacecraft's pass is a cinematic placement, labelled as such.

## Phase B: Discovery mode (chapter 12)

A guided tour of 13 destinations: Sun, Mercury, Venus, Earth, Moon, Mars, asteroid belt, Jupiter, Saturn, Uranus, Neptune, Pluto
and the Kuiper belt. Six are main topics and the rest sit under *More topics*.
- **Camera:** it travels from a 50 AU overview to each destination along a logarithmic approach. A floating origin keeps full
  precision at true size.
- **Labelling:** the view is labelled "Cinematic Scale — Not to Scale · a guided tour, not a spacecraft trajectory". Planet
  positions are those of 1 January 2035.
- **Data:** `bodies.ts`, rounded values from the NSSDCA planetary fact sheets.
- **Imagery:** each destination states its imagery: a map from mission data (Solar System Scope), Earth imagery, an illustrative
  surface (Pluto) or an illustrative distribution (the belts).

## Cinematic recovery, round 2 (15 November 2026)

The first recovery was rejected as looking like an animation project. This round worked from the brief
"Master Animation Recovery & Cinematic Engineering Prompt" and the reference images supplied (a launch photograph, a
booster-separation render over Earth, a gold spacecraft over the Earth's limb, and a spacecraft against Jupiter), and was
judged on rendered GPU frames, measured frame times and an end-to-end run of every flow.

### Root causes found

| Problem seen | Cause | Fix |
|---|---|---|
| Flat, "CG" look everywhere | No environment light (metal and foil reflected nothing), no glow, tone mapping per material, procedural sky | HDR pipeline (`render.tsx`): linear half-float frame, bloom only above sunlit levels, one ACES tone map, film grade, vignette, lens fringing, grain. Photographed sky (Poly Haven, CC0) with matching image-based light at the pad; live reflections (cube camera) in space |
| Exhaust looked like transparent beams | Textured cones | Ray-marched volumetric plume (`exhaust.tsx`): nozzle cores, shock cells at sea level, turbulent mixing layer, soot; length and width from the simulated ambient pressure |
| Ground cloud looked like cotton | Self-lit sprites | Lit billows: generated normal/density atlas, sun with self-shadowing through the cloud, sky and ground bounce, light from the plume; motion a function of mission time |
| Rocket read as a cylinder | Plain paint, wide lenses | Orange spray-on foam on the kerosene/oxygen first stage (as on the 3.8 m Atlas V core this class of stage resembles), white upper stage; long-lens compositions |
| Empty, flat launch site | One grass texture | Olive coastal scrub (terrain shader), 14,000 foliage-card shrubs, a wooded skyline, sight lines kept clear around every camera |
| Earth blurred at altitude | 2k maps (≈20 km per pixel) | 8k day and cloud maps for this experience only (decoded off the main thread, uploaded during the opening) and fine cloud structure below the map's resolution in low-orbit views |
| Spacecraft unreadable | Noise "foil", studio reflections | Crumpled-foil facets reflecting the live surroundings |
| Cruise and Jupiter were diagrams | Physically scaled views used as the default | Cinematic layer (`deepspace.tsx`, Jupiter shots): spacecraft-centred views with the Sun, Earth and Jupiter in their true directions and angular sizes; the diagrams moved behind View Trajectory, View Orbit and Explore Gravity Assist |
| Interface dominated the scene | Card always open | Default cinematic view: title, simulated-data indicator, mission time, one caption with the guided action and Investigate; the card opens on request; Return to mission view resumes the same moment |
| Opening still differed from the live scene | Static poster cross-faded into a differently framed live frame | The opening fades in from black straight into the live scene once its sky and textures are loaded; posters (rendered from the first frame per layout) are only the no-3D fallback |
| Not smooth | Measured: 32–40 fps on the pad, 1.2 s freeze before orbit, 100 ms spikes | Engine light toggled by visibility recompiled every shader (now faded by intensity); hidden full-screen scattering sky still drawn; 4× multisampled HDR target (now 2×); main-thread decoding of 8k maps; shadow map redrawn every frame (now only while the vehicle moves); shaders compiled at load; reflection cube one face per frame; children updated before the scene each frame (now the scene updates first); dynamic resolution (down to 70 %) on the pad |
| Blocky plume far from the origin | 32-bit world coordinates (~7,000 km) in the shader | Ray set up in the plume's local frame, converted on the CPU in double precision |

### Camera director

- Shots now fit their subject to the frame for any aspect ratio (`fitDistance`), and include the operator's behaviour of real
  footage: a slight lag when following the vehicle, a sub-degree sway, and on the pad cameras the ground shake that arrives with
  the sound (distance ÷ 343 m/s after ignition).
- Opening: long-lens view of the complex (also the first frame) → approach → engine section → payload fairing → Mission Ready.
- Ignition and liftoff: long-lens countdown, a ground-level remote camera at ignition, the long-lens liftoff out of the ground
  cloud past the tower, then a ground tracking telescope.
- Staging and fairing: framings that keep both stages (and both fairing halves) in shot as they separate.
- Orbit and departure: over-the-shoulder views with the horizon level and the Earth filling the background; the stack climbing
  away as the Earth recedes, ending before spacecraft separation (which follows the departure burns, chapter 08).
- Cruise: the Earth left behind (named), deep space in sunlight, the generators, the antenna looking back at the Earth, and the
  approach to Jupiter. Jupiter: approach, closest approach against the sunlit cloud bands, departure.

### Sound

Synthesised in the browser (`sound.ts`, no audio files), driven by the simulation each frame: engine roar and crackle scaled by
thrust, delayed by the distance to the camera at the speed of sound and dulled by air absorption, fading with altitude; wind
following dynamic pressure on the flying cameras; the pad's breeze and oxygen venting; near silence in space with a quiet
ambience and structural thumps for separations and deployments. It starts with Start Mission (browsers require a click), has a
mute toggle that is remembered, and fades out when paused or out of view.

### Measured

- Frame rate (headless Chrome for Testing, ANGLE/Metal, Apple GPU, 1240×698 canvas): opening 59.8 fps, liftoff 58.1, ascent 58.2
  (one 150 ms frame in the window), orbit, deployment, cruise and Jupiter 60; 95th-percentile frame time 18.6–18.8 ms.
- End-to-end run: 12 stages, every guided action and Return to mission view (resumes at the same mission time), Investigate on
  every stage, sound states (off before Start Mission; at liftoff from the 720 m camera: engine on, 2.1 s delay, 2.7 kHz
  absorption cutoff; ambience only in space), no console errors.

## Validation

- **Tests:** 233 site tests pass, 42 of them in the Solar System experience and libraries. The Phase A flight and mission tests
  are unchanged. New tests cover:
  - ephemeris vs Horizons;
  - Lambert and propagation;
  - trajectory search and constraints;
  - flyby hyperbola geometry;
  - every Phase B reading free of gaps;
  - the interface: 3–6 topics, ≤ 4 readings, all topics reachable, payload exploration, cinematic labelling.
- **Lint and build:** ESLint and the type check are clean; the production build result is recorded below for round 2.
- **Visual review:** rendered with GPU WebGL (Chrome for Testing, ANGLE/Metal) on desktop (1440×900), in full screen and on a
  phone (390×844). Reviewed at the opening, the payload cutaway, countdown, ignition, liftoff, tracking, ascent, staging, fairing
  separation, orbit insertion, the parking orbit, departure, deployment, cruise, the Jupiter approach, closest approach and wide
  view, Saturn, and Discovery destinations. The frame rate was 60 fps at about 210,000 triangles and 520 draw calls (headless,
  Apple GPU).

## Known limitations and open items (15 November 2026, after round 2)

- **Realism ceiling.** The hardware and the pad are detailed, code-built models with physically based materials. Lighting, sky,
  exhaust, Earth and camera work now carry most frames to a photographic look, but close-ups of the launch table and tower still
  show their simple geometry; artist-made production models (GLB) would be the next step and are not in this round.
- **Exhaust:** the plume and ground cloud are real-time approximations (ray-marched volume and lit billboards), not fluid
  simulation; the cloud's billows can repeat on close inspection.
- **Not built yet:** the three fault scenarios; imagery for Pluto, Charon and the Galilean moons; a designed Saturn flyby;
  trajectory-correction manoeuvres; thermal, data-rate and radiation models; a launch cutoff targeted at the mission's C3 of
  79.6 km²/s² (the simulated launch still delivers 113.6, as documented in Phase B).
- **Not measured:** real phones, tablets and Safari (headless Chrome on an Apple GPU only); slower GPUs rely on the dynamic
  resolution and the low-quality path.
- **One remaining hitch:** a single ~150 ms frame during the ascent (most likely a render-target reallocation by the dynamic
  resolution), once per launch.
