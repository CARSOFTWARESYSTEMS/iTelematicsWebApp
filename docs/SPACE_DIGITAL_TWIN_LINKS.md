# Shareable Space Digital Twin links

A link can open one Space Digital Twin experience directly, start it full screen with sound and voice
narration, and play every stage in order. This only adds a way to start an experience. Scenes, cameras,
physics, timings, narration, captions and styling are unchanged, and a visit without the parameter behaves
exactly as before.

## Links

| Experience | Link |
| --- | --- |
| 01 Satellite | <https://itelematics.com/?space_digital_twin=1> |
| 02 Orbital Constellation | <https://itelematics.com/?space_digital_twin=2> |
| 03 Spacecraft | <https://itelematics.com/?space_digital_twin=3> |
| 04 Space Station | <https://itelematics.com/?space_digital_twin=4> |
| 05 Station Power & Energy | <https://itelematics.com/?space_digital_twin=5> |
| 06 Solar System | <https://itelematics.com/?space_digital_twin=6> |

The numbers are the tab numbers. `06` also works for `6`. The same parameter works on `/research-lab`,
which shows the same viewer.

### Sharing from the page

**Share**, beside **Full screen** in the viewer, shares the link of the experience on screen. It follows the
selected tab, so each of the six links above can be shared from there. It shows the link with **Copy link**,
**WhatsApp** and **Email**, plus **More…** (the device's share sheet) where the browser has one. Its clicks
are reported as `station_model_interaction` (`Space Digital Twin share: copy 06` and so on).

## Options

| Parameter | Values | Default with a link | Meaning |
| --- | --- | --- | --- |
| `fullscreen` | `1`, `0` | `1` | Full screen when the mission starts |
| `sound` | `1`, `0` | `1` | All sound. `0` also silences the narration |
| `voice` | `1`, `0` | `1` | Voice narration |
| `captions` | `1`, `0` | `1` | Narration subtitles |
| `volume` | `0`–`100` (decimals allowed) | `100` | Percent of the normal level, for effects and narration |
| `autoplay` | `1`, `0` | `1` | Plays after the start. `0` opens Stage 01 paused |
| `autonext` | `1`, `0` | `1` | Plays every stage in order. `0` plays one stage, then waits |

Example: <https://itelematics.com/?space_digital_twin=6&fullscreen=0&sound=0&voice=0>

- The options apply to that visit only. Nothing is stored, and the visitor's own choices made with the
  controls are never overridden.
- A missing, malformed or repeated option keeps its default.
- An invalid experience number (`0`, `7`, `abc`, repeated) makes the page behave as a normal visit, including
  the homepage poster.
- The URL is read once after the page loads and is never changed. Other parameters (for example
  `utm_source`) are left alone.
- A refresh starts the link again from Stage 01. The Solar System never resumes a saved stage from a link.

## What the visitor sees

The page scrolls to the viewer and selects the experience. If the link needs a click, one action sits over
the waiting scene: **Enter Full Screen & Start Mission**. The scene stays visible, softened, behind it.
Browsers allow full screen and sound only after a click, so a click is needed when the link asks for full
screen, or for sound on the Solar System, or when the visitor prefers reduced motion (the click is then the
choice to play). That one click:

1. unlocks sound and narration (Solar System),
2. asks for full screen,
3. starts the mission from Stage 01.

The button reads **Start Mission** without full screen, and **Enter Full Screen** / **Open Mission** with
`autoplay=0`. A silent, windowed link (`fullscreen=0` on 1–5, or `fullscreen=0&sound=0` on 6) starts
straight away with no click. The homepage poster popup is skipped for a valid link.

### Each experience

| | Plays in order | At the end |
| --- | --- | --- |
| 1–4 | The four stages, once (normally they loop) | Holds the last frame. Play starts again from Stage 1 |
| 5 Station Power & Energy | The eight guided investigation steps, the same as **Start Investigation** | The overview with its closing message, as **Start Investigation** does |
| 6 Solar System | The twelve stages. Each stage's narration finishes, then its recap counts down (12 s, unchanged) and the next stage begins | The mission summary |

Each stage advances only on its own completion signal (the story clock, the EPS step clock, or the Solar
System's chapter end plus narration end). No timers or durations were added.

### Control stays with the visitor

- **Pause / Play** stops and resumes the sequence.
- **Picking a stage** goes there at once, and the sequence carries on from it (with `autonext=0`, that stage
  only).
- **Esc / Exit full screen** leaves full screen. The mission keeps playing and the page returns to where it
  was.
- **Another tab** ends the link: that experience behaves as normal. The six experiences never cycle on
  their own.

## Limits

- Sound, voice narration and subtitles exist only in the Solar System. Options 1–5 are silent, and the
  sound options do not apply to them. No narration was added.
- Full screen needs the browser's Fullscreen API. On iPhone the viewer fills the browser window instead (the
  existing fallback). If the browser refuses full screen, the mission still starts, in the same window-filling
  mode.
- iPhone and iPad ignore page volume for the narration, so `volume` applies to the effects only there.
  The device volume still applies.
- If the 3D scene cannot run (no WebGL), the existing still image and controls are shown.

## Implementation

| File | Change |
| --- | --- |
| `src/lib/space-twin/launch.ts` | URL parser and the 05/06 tab registry (moved here from the viewer) |
| `src/lib/space-twin/story.ts` | `StoryClock.setEnd()` / `ended`: plays once instead of looping, only when set |
| `src/components/space-twin/launch.ts` | `useLinkStart`: an experience gives the viewer its start action, run inside the click |
| `src/components/space-twin/SpaceTwinViewer.tsx` | Reads the link, the launch action, play-once for 1–4. Leaving full screen restores the scroll position |
| `src/components/space-twin/ShareLink.tsx` | **Share**: the link of the experience on screen, with Copy, WhatsApp, Email and the device share sheet |
| `src/components/space-twin/SpaceTwin.module.css` | Launch and Share styles (the launch reuses the Solar System's Start Mission pill) |
| `src/components/solar-system/SolarSystemExperience.tsx` | Opens Stage 01 for a link. Applies voice, subtitles and volume for the visit. Picking a stage carries on in order |
| `src/components/solar-system/narrator.ts`, `sound.ts` | `setVolume()`, which scales the existing narration element and effects mix |
| `src/components/station-eps/EpsExperience.tsx` | Starts the guided investigation. `autonext=0` holds the first step |
| `src/components/site/PosterDialog.tsx`, `src/app/page.tsx` | Homepage poster skipped for a valid link |

Tests: `src/lib/space-twin/launch.test.ts`, the one-pass clock in `space-twin.test.ts`,
`src/components/space-twin/SpaceTwinViewer.test.tsx` (selection, click, full screen, invalid links, Share) and
`src/components/space-twin/SequentialPlayback.test.tsx` (every stage of all six experiences in order, pause,
stage picks, `autonext=0`, narration gating).
