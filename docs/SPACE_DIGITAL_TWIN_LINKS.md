# Shareable Space Digital Twin URLs

This is a launch enhancement only. The existing experience registry, components, clocks, missions,
scenes, cameras, physics, rendering, narration content and navigation remain in use. No 3D simulation
code was changed. No production deployment is included.

## Links

| Experience | Shareable URL |
| --- | --- |
| Satellite | https://itelematics.com/?space_digital_twin=1 |
| Orbital Constellation | https://itelematics.com/?space_digital_twin=2 |
| Spacecraft | https://itelematics.com/?space_digital_twin=3 |
| Space Station | https://itelematics.com/?space_digital_twin=4 |
| Station Power & Energy | https://itelematics.com/?space_digital_twin=5 |
| Solar System | https://itelematics.com/?space_digital_twin=6 |

## Options

Options apply only when `space_digital_twin` selects an existing experience.

| Parameter | Values | Default |
| --- | --- | --- |
| `fullscreen` | `1`, `0` | `1` |
| `sound` | `1`, `0` | `1` |
| `voice` | `1`, `0` | `1` |
| `captions` | `1`, `0` | `1` |
| `volume` | Number from 0 to 100, including decimals | `100` |
| `autoplay` | `1`, `0` | `1` |

`sound=0` initially disables both effects and narration. `voice=0` disables only narration.
`volume` scales the existing effects mix and narration element; 100 preserves their original levels.
`captions` controls Solar System's existing subtitles; stage descriptions stay available.
`autoplay=0` prepares the initial stage paused, including after the launch button is clicked.

Example: https://itelematics.com/?space_digital_twin=6&fullscreen=0&sound=0&voice=0

Unsupported/malformed/duplicate experience IDs fall back to the normal homepage. Malformed or
duplicate optional values use their defaults. Unrelated query parameters and browser history are
untouched. Parsing happens once after hydration; subsequent visitor changes are not reapplied from
the URL. A refresh initializes a fresh launch. Normal visits retain their existing behavior.
The homepage's automatic poster is skipped only for a valid mission link, leaving the launch action
immediately accessible and leaving the poster's session preference untouched.

Solar System starts at Stage 01, not the saved last stage. EPS starts its existing guided investigation.
Completed-stage history remains available. No resume URL parameter is supported. Audio preferences
from a URL are temporary; explicit changes still use the existing preference controls.

## Browser behavior and capability limits

Fullscreen requires browser support, permission and usually transient user activation. The launch
waits for **Enter Full Screen & Start Mission** when a gesture is needed. That click calls the loaded
experience's existing startup/audio APIs synchronously and requests fullscreen. If activation already
exists, launch may proceed immediately. There are no automatic fullscreen retries.

An unsupported or rejected fullscreen request uses the existing window-filling presentation mode;
the mission remains accessible. Escape, native fullscreen exit and the Exit control leave presentation.
`fullscreen=0` never requests fullscreen. A silent, non-fullscreen launch can proceed without a click.

Only Solar System currently implements effects, voice narration and subtitles. Experiences 1–5 keep
their existing visual descriptions and controls; the audio/subtitle options have no implementation
to activate there. No speech engine or narration content was added to them.

Solar System waits for a launch gesture when audible playback is requested, retaining the requested
preferences while paused. Browser/device volume, missing audio assets, OS restrictions and absent
WebGL remain outside the URL feature's control. The existing still-image fallback remains available.

## Changed files

- `src/app/page.tsx` — pass the existing experience IDs to the homepage poster's launch guard.
- `src/components/site/PosterDialog.tsx` — skip the automatic homepage poster only for a valid launch.
- `src/components/site/PosterDialog.test.tsx` — valid, invalid and other-page poster behavior.
- `src/lib/space-twin/launch.ts` — validated URL parser and launch settings.
- `src/lib/space-twin/launch.test.ts` — parameter validation coverage.
- `src/components/space-twin/launch.ts` — loaded-experience launch action bridge.
- `src/components/space-twin/SpaceTwinViewer.tsx` — initialization, selection, overlay and presentation.
- `src/components/space-twin/SpaceTwin.module.css` — launch overlay only, using existing tokens.
- `src/components/space-twin/SpaceTwinViewer.test.tsx` — selection, single launch, rejection and navigation checks.
- `src/components/station-eps/EpsExperience.tsx` — initial guided investigation and launch action.
- `src/components/station-eps/EpsExperience.test.tsx` — guided launch and pause checks.
- `src/components/solar-system/SolarSystemExperience.tsx` — initial stage/preferences and launch action.
- `src/components/solar-system/SolarSystemExperience.test.tsx` — saved progress, overrides, audio and visitor changes.
- `src/components/solar-system/sound.ts` — volume on the existing master gain and handled resume rejection.
- `src/components/solar-system/narrator.ts` — volume on the existing narration element.
- `docs/SPACE_DIGITAL_TWIN_LINKS.md` — usage, limitations and verification.

## Verification

- Full Vitest suite: 294 tests passed across 26 files.
- ESLint: passed.
- Next.js production build: passed, including static homepage generation.
- Unit/component checks cover all six IDs, invalid and duplicate IDs, URL overrides, one-click launch,
  rejected fullscreen, Escape, normal navigation, saved Stage 08 with launch at Stage 01, temporary
  audio preferences, preserved visitor changes and React Strict Mode initialization.
- jsdom does not render WebGL or play audio; those tests verify the existing controls and API calls.
- Local production browser checks: all six selections/launches in Chromium, Firefox and WebKit;
  normal homepage, explicit mute/pause/non-fullscreen overrides, invalid IDs and refresh also passed.
  The final build was checked across all six experiences in Firefox and WebKit and again for Solar
  System in Chromium. The launch prompt was visually checked after suppressing the homepage poster.
- Solar System's real browser audio context reached `running`, its existing `c-prep-1.mp3` narration
  played, and only one viewer canvas and one playing narration element were present. Native
  fullscreen, Escape, re-entry and Exit worked in all three engines.
- Browser checks used installed headless engines, not physical Chrome/Safari/Firefox devices or
  speakers. WebKit is a Safari-engine check, not a full Safari/device certification. The gesture
  fallback was tested with JavaScript activation detection forced off because browser automation's
  script evaluation can grant activation; actual fullscreen and audio APIs were not mocked.

### Remaining observation

One headless WebKit run logged texture-loading errors reporting access-control failures when rapidly refreshing
or navigating away while Solar System assets were still loading. The launch, controls and subsequent
navigation checks completed; a normal-flow comparison did not reproduce the errors. No simulation
or texture-loader changes were made to address this;
physical Safari/iOS verification is still recommended.
