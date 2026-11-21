# EV.ENGINEER™ animation quality upgrade

Animation-only pass on `/ev-engineer`, the page `www.ev.engineer` serves (middleware rewrite of `/`).
iTelematics® is the quality reference. Content, links, layout, branding, SEO and the
engineering meaning of every visual stay as they were.

Status: implemented and committed on a branch; not merged, pushed or deployed.

## 1. Where the code lives and who uses it

| Area | Files | Consumers |
| --- | --- | --- |
| EV.ENGINEER™ visuals | `src/components/ev/*` | only `src/app/ev-engineer/page.tsx` (checked with grep) |
| EV.ENGINEER™ page styles | `src/app/ev-engineer/page.module.css` | only `/ev-engineer` |
| iTelematics® references (read, imported, not changed) | `src/components/space-twin/device.ts`, `site/Satellite3D*`, `site/OrbitInstrument*`, `station-twin/StationHero*` | iTelematics® pages |
| Shared site code (not touched) | `globals.css`, `layout.tsx`, `Navbar`, `Footer`, `site/*`, `PosterDialog` | both domains |

Every change in this pass is in EV-only files. The one link to shared code is a read-only import of
`usePageVisible` and `useReducedMotion` from `space-twin/device.ts`, which is unchanged.

## 2. EV.ENGINEER™ animation inventory

All EV visuals are inline SVG or HTML with CSS keyframes; none use WebGL. Each sits in a `<Live>`
frame (`Live.tsx`): animations are paused off screen, removed under reduced motion and held by the
page-wide Pause control. Tickers (`setInterval`) cycle illustrative values while the frame is live.

| # | Visual (section) | Component | What it shows (unchanged) | Motion before | Limitations found |
| --- | --- | --- | --- | --- | --- |
| 1 | Hero energy system | `EnergyHero.tsx` | source → pack → BMS → telemetry → diagnostics → decision; phones: `FlowSteps` | node outlines light in turn (12 s), dashed energy/data flow, module thermal tint, CAN wave, bars | flat fills, no light or depth; energy flow has no glow; charging shows no motion in the SOC bar |
| 2 | Space & Aerospace Technologies | `SpaceOrbitVisual` | Earth, orbit, sunlight/eclipse, contact | satellite orbits (24 s), contact beam, stacked readout swaps | flat Earth disc; satellite stays lit inside Earth's shadow; readout text and beam switch in 60–120 ms |
| 3 | Satellite Engineering | `SatelliteSchematicVisual` | arrays → EPS → battery → loads → ground | sunlit/eclipse cycle (16 s), power and telemetry flow | flat array block; sunlight shown only as an opacity pulse |
| 4 | CubeTwin | `CubeTwinVisual` | 3 orbits of SOC/load, fault, safe mode, recovery | traces draw (14 s), fault/safe markers, mode readout | mode text and markers switch in 70 ms; traces have no presence |
| 5 | Rocket Engineering | `RocketVisual` → `drawings.tsx` | tanks → turbopump → chamber → nozzle, sensors → controller | dashed feed flow, impeller spin, combustion breathe, sensor pings | combustion is a flat amber blob; tanks and engine are flat outlines |
| 6 | Space Station | `StationVisual` | station, arrays, links to relay and ground | arrays articulate (20 s), links, node lights | flat modules and arrays; the scene is static apart from the arrays |
| 7 | Aerospace Cybersecurity | `AerospaceVisual` → `drawings.tsx` | eVTOL with rotors, battery, avionics, network boundary, HUMS | rotors spin, boundary dash, sensor pings, meters | flat fuselage; rotors read as rotating crosses with no blur |
| 8 | Aerospace Quality Intelligence | `AqipVisual` | drawing → characteristic → … → acceptance | stage pills step (14 s), balloons, measured/pass, stamp | 70 ms colour jumps between stages; balloons blink on |
| 9 | Battery Safety | `SafetyVisual` | pack → thermal → BMS → CAN → detection → mitigation | chain markers step (12 s), module 3 heats then cools | the module jumps from 31.4 °C to 35.2 °C colour in one frame |
| 10 | Battery Health | `HealthVisual` | SOH ring, 12 cells (cell 07 low), cycle history | ring fills, bars, history trace | flat bars; the low cell is not distinguished in motion |
| 11 | Pack Engineering | `PackBuildVisual` | cell → module → pack + BMS | each step brightens in turn (9 s) | flat cells; only opacity changes |
| 12 | Electric Mobility | `MobilityVisual` | battery → inverter → motor → wheels; terrain; energy | power flow, energy trace | flat terrain; trace has no presence |
| 13 | Cybersecurity (CAN) | `CanNetworkVisual` | ECU, gateway, BMS, motor controller; anomaly → isolation | frames ride the bus, bad frame, node states (12 s) | frames move with `left` (layout every frame); state swaps are instant |
| 14 | Battery flagship | `BatteryFlagshipVisual` | cell → module → pack thermal map → BMS → telemetry → diagnostics | stage outlines light in turn (12 s), flows, ΔV bars, wave, SOH ring | flat cells and modules; no glow on energy |
| 15–18 | Lab glyphs | `Lab3dGlyph`, `LabOrbitGlyph`, `LabRocketGlyph`, `LabCellsGlyph` | stack, orbit + SOC, engine, cells + ring | explode, orbit, exhaust, needle, bars | flat; orbiting dot stays lit in shadow |
| — | Phone flow | `FlowSteps.tsx` | simplified vertical flow per visual | pulse travels down, markers light | pulse moves with `top` (layout every frame) |
| — | Identity connectors | `page.module.css .connector` | animated line between identity rows | pulse travels down | animates `top` and runs even off screen (one tiny layout per frame); measured as cheap, left unchanged (see §6) |
| — | Progress steps | `page.module.css .stepIcon` | Learn → … → Lead | icons light in turn | fine; unchanged |

Baseline measurement (production build, Chromium, 4× CPU throttle): every visual held 60 fps; the
page ran ≈ 60 layouts per second at every scroll position.

## 3. iTelematics® quality analysis (what transfers to 2D)

| Reference technique | Where in iTelematics® | Applied to EV as |
| --- | --- | --- |
| Lit materials instead of flat fills (face gradients, solar-cell gradient + cell grid, lit Earth with atmosphere rim) | `Satellite3D.module.css`, `OrbitInstrument.tsx`, `primitives.tsx` materials | SVG gradients in the EV's own hues (`gfx.tsx`): top-lit blocks, cylindrical tanks/modules/cells, blue cell arrays, lit Earth with limb glow |
| Sunlight sheen sweeping the arrays | `Satellite3D .sheen` | moving amber sheen on arrays in sunlight only |
| Eclipse darkens the spacecraft | `Satellite3D .shade`, `StationHero` state | orbiting satellite and lab dot dim inside Earth's shadow, synced to the existing eclipse window |
| Emissive glow / bloom | solar-system `render.tsx` bloom | static soft under-glow on energy and data paths (no animated filters), hot-core gradient for combustion |
| Smooth state changes (1–1.5 s ramps, `--ease`) | `Satellite3D` sunlight/eclipse keyframes, hero canvas fade-in | sequential fade-out/fade-in for stacked readouts; colour ramps instead of single-frame jumps; gradual heating and cooling |
| Slow camera drift | `rig.tsx` Director/CameraRig (exponential damping) | very slow drift of the whole station and eVTOL scenes (all parts move together, links stay attached) |
| Rotor/turbine motion blur | Solar System exhaust/plume layering | faint trailing blur sectors behind rotor blades and the turbopump impeller |
| Compositor-only motion | `Satellite3D` transforms | CAN frames and the phone flow pulse move with `transform` instead of `left`/`top` |
| Pause when the tab is hidden | `device.ts usePageVisible` | `Live` also pauses while the tab is hidden (reused, not copied) |
| Flash-free reduced-motion check | `device.ts useReducedMotion` (`useSyncExternalStore`) | `Live` reuses it |

Not transferred, deliberately: WebGL scenes, posters, sound and narration. Moving EV visuals to
three.js would replace their rendering engine and change what they show; the brief asks for the same
visuals executed better.

## 4. File-by-file plan

| File | Change | Risk to shared code |
| --- | --- | --- |
| `src/components/ev/Live.tsx` | reuse `usePageVisible` + `useReducedMotion` from `space-twin/device.ts`; pause when the tab is hidden | none: EV-only; device.ts imported read-only |
| `src/components/ev/gfx.tsx` (new) | small SVG material/gradient definitions with per-visual ids | none |
| `src/components/ev/EnergyHero.tsx`, `.module.css` | lit node cards, energy glow, charging sheen in the SOC bar, lit modules, BMS core glow, bolt glow, bar gradients | none |
| `src/components/ev/space-visuals.tsx` | materials and overlays for orbit, satellite EPS, CubeTwin, station, AQIP | none |
| `src/components/ev/battery-visuals.tsx` | materials and overlays for flagship, CAN, safety, health, pack, mobility, lab glyphs | none |
| `src/components/ev/drawings.tsx`, `.module.css` | rocket tanks/engine shading, combustion core, nozzle glow, impeller blur; eVTOL fuselage shading, rotor blur | none |
| `src/components/ev/visuals.module.css` | materials, glows, smooth ramps, eclipse dimming, sheen, camera drift, transform-based CAN motion | none |
| `src/components/ev/FlowSteps.module.css` | pulse via `transform` | none |
| `src/app/ev-engineer/page.module.css` | planned: connector pulse via `transform`; **dropped after measuring** (§6) | — |

Rules kept: no text, value, label, link, id, heading, metadata or layout changes; timings and the
order of every sequence unchanged; resting (paused / reduced-motion) frames still finished, readable
states; new elements are `aria-hidden` drawing parts inside the existing labelled images.

## 5. What was implemented

**Shared EV mechanism.** `gfx.tsx` defines one material set per drawing (`<Materials prefix>`) and
exposes it through custom properties (`materials(prefix)` → `--m-lit`, `--m-cells`, `--m-cyl`, …).
Shared classes such as `.block`, `.arrayBlock`, `.earth` and `.cellDot` read `var(--m-…, <old flat
fill>)`, so a drawing without materials still renders exactly as before.

| Visual | Rendering | Motion |
| --- | --- | --- |
| Hero energy system | lit node cards, lit modules, gradient diagnostic bars, under-glow on energy and data links, glow behind the charger bolt, BMS core and ONLINE LED | halo follows the live node; light runs along the filled SOC bar while charging; telemetry wave has a glow trace |
| Space orbit | lit Earth (day side to the Sun), atmosphere limb, night-side shading, soft sunlight at the Sun side, cell-gradient panels, beam fades along its length | spacecraft dims inside Earth's shadow (synced to the 42–58 % eclipse window); readouts fade out then in; beam opens and closes over ~0.4 s |
| Satellite EPS | blue cell arrays with the cell grid, lit blocks, power under-glow, LED halos | amber sheen sweeps the arrays in sunlight only; glow on the array feed fades in eclipse |
| CubeTwin | glow under the SOC trace | flare where the fault strikes; mode readout and markers fade rather than cut |
| Rocket | tanks and bell shaded as cylinders, lit controller, pump blur disc | combustion glow + white-hot core + bell lit from inside, flickering on unequal periods |
| Space station | cylindrical modules, cell arrays, truss shading, node glows, link glows | glint on arrays follows their articulation; slow camera drift of the whole scene (a composited transform on the outer `<svg>`) |
| eVTOL | fuselage and wing shading, battery glow | blur sectors trail each rotor blade; gentle hover bob of the whole scene (composited, as above) |
| AQIP | lit part | stage pills ease in and hand on; the Accepted stamp overshoots and settles (a balloon "pop" was tried and dropped: it forced SVG layout every frame) |
| Battery safety | — | module 3 heats over ~1 s, glows while hot and cools once current is limited; chain markers ease; readout values swap without overlap |
| Battery health | gradient cell bars, ring and history glows | flagged cell 07 pulses softly |
| Pack engineering | cylindrical cell, end-on cell tops, lit modules, BMS glow | the active step lifts slightly as it lights |
| Mobility | lit blocks, power under-glow, terrain fades with depth | glow under the energy trace |
| CAN network | glowing frames | frames move with compositor transforms (container units) instead of `left`; gateway and source glow while the anomaly is live; state label fades |
| Battery flagship | lit stage frames, cylindrical cell with a lit charge level, end-on cell tops, warm-module heat glow, BMS glow, gradient ΔV bars, wave and ring glows | halo follows the live stage |
| Lab glyphs | lit boards, cell arrays, lit Earth, cylindrical engine, exhaust glow, gradient bars, ring glow | orbiting dot dims in shadow; exhaust flickers |
| Phone flows | — | pulse moves with `transform`, no per-frame layout |
| `<Live>` frame | — | also pauses while the browser tab is hidden |

## 6. Verification and regression results

Method: every visual captured before and after at the same page, viewport (1440 × 900 and
390 × 844), scroll position and animation time (all animations frozen with the Web Animations API at
0, 5, 10 and 12 s), so frames compare like for like. Side-by-side images are in
`docs/ev-engineer-animation/`.

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | pass |
| `npm run lint` (eslint, whole repo) | pass, no warnings |
| `npx vitest run` | 27 files, 335 tests pass (includes `content-guard.test.ts`) |
| `npm run build` | pass; `/ev-engineer` 8.98 kB → 10.2 kB page JS (121 → 122 kB first load); other routes unchanged |
| Content, links, SEO | `/ev-engineer`, `/`, `/space-station`, `/research-lab`: title, description, canonical, Open Graph, JSON-LD, all headings, all 127/48/41/34 links (text, href, analytics event), ids and aria-labels identical before/after; visible text identical apart from the illustrative tickers |
| iTelematics® code | no shared file changed (`git status` lists only `src/components/ev/*`, the new `gfx.tsx` and these docs; `src/app/ev-engineer/page.module.css` ends unchanged); its pages' content snapshots identical |
| WebKit 26.6 (Safari engine) and Firefox | materials resolve through `--m-*`; CAN frames move on desktop (horizontal) and phone (vertical) layouts; no page errors |
| Reduced motion | all 18 visuals static (0 running animations), finished compositions, lit materials kept, no half-visible overlays |
| Resting / paused frames | still the finished states (eclipse readouts, CAN isolated, safety cooled, AQIP accepted) |

**Performance** (production build, Chromium, 4× CPU throttle, median of 3 runs per visual, each
visual centred on screen for 3 s):

| | before | after |
| --- | --- | --- |
| Frame rate | 60 fps on all 36 visual × viewport cells | 60 fps on 34; two desktop cells (satellite EPS, lab rocket) had one long frame in some 3 s windows (median 56 fps; p95 frame 17.5 → 18.2 ms) |
| Main-thread time, phone (390 px, 3× DPR) | 267 ms/s mean | 268 ms/s mean |
| Main-thread time, desktop (1440 px, 2× DPR) | 343 ms/s mean | 378 ms/s mean (+10 %) |

What measuring changed in the plan:
- Moving the **identity connector** pulse from `top` to `transform` made it ~160 ms/s *more* expensive
  (it is off screen most of the time); the original is cheap, so it was reverted.
- Moving the **phone flow** pulse to `transform` cut its cost (134 → 78 ms/s on the hero), so it stays.
- A **balloon pop** in AQIP added a transform animation that forced SVG layout every frame; dropped.
- **Camera drift / hover** moved from an inner SVG group to the outer `<svg>`, where it is composited.
- Most per-visual cost is page-level (the connector pulses and the progress-step icons), not the
  visuals themselves: the orbit visual's own animations measured ≈ 5 ms/s.

## 7. Final report

- EV.ENGINEER™ concepts, content, links, page structure, branding and theme: unchanged (verified by
  snapshot diff; hues are the page's own tokens, with shading only).
- Existing animation functionality: preserved; every sequence keeps its duration, order and timing
  windows; tickers, Pause control and reduced-motion behaviour unchanged (plus pause in hidden tabs).
- Visual quality: improved across all 18 visuals with the iTelematics® lighting/material language,
  emissive glow, eclipse-synced shading, sheens, smoother state changes and gentle scene motion.
- iTelematics®: no shared component modified; its pages' content identical.
- Cost: no change on phones; about +10 % main-thread time on desktop at 60 fps.

Not done, by design or for you to decide: no WebGL conversion; no real-device (iPhone/Android)
check; not pushed or deployed. The 36 before/after images (18 desktop, 18 phone) are in
`docs/ev-engineer-animation/`.
