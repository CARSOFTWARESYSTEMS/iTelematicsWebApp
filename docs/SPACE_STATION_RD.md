# Space Station Digital Twin R&D (2026-11-14)

The site's research positioning moved from Satellite Engineering to the **Space Station Digital Twin
R&D Center**. `/space-station` is the flagship page; `/satellite-engineering` 301s to it.

## Protected, unchanged

- The Space Digital Twin (`src/components/space-twin/`, `src/lib/space-twin/`) on `/` and `/research-lab`.
  The station work imports its generic pieces read-only (Earth environment, lighting, materials,
  camera rig, labels, procedural textures, device hooks, story clock, power helpers) and never edits them.
- The 6U reference case (`energy-model.ts`, `reference-case.ts`) and the flagship simulator.
- Consultancy: page, menu, links and metadata. The only Consultancy change is the IEEE paper entry
  under Papers & Presentations (a separate request).
- `Satellite3D` (still used by the homepage's interactive-satellite section).

## Station Reference Case SRC-1 (`src/lib/station-twin/model.ts`)

A conceptual modular station, modelled on no real station, with illustrative and unvalidated parameters:

| Item | Value |
|---|---|
| Orbit | 400 km circular, β = 0° (≈ 92.6 min period, ≈ 36.1 min eclipse) |
| Solar | 4 power channels × 40 kW sunlit = 160 kW, sun-tracking, 0 in eclipse |
| Storage | 180 kWh usable (4 battery groups), η_charge 0.95, taper above 95 % SOC |
| Distribution | η_EPS 0.9 |
| Loads | 40 kW critical, 16 kW essential, 18 kW deferrable research (74 kW) |
| Health rule | channel residual > 20 % on 5 consecutive 1-min samples |
| Response | load-priority table 2 min after detection: research 18 → 4 kW |
| Orbit margin | +11.3 % nominal, −8.2 % with channel 2 at 30 %, +13.3 % protected |

It reuses the published `energyStep` and orbit-geometry functions with these parameters, so the
station obeys the same equations as the 6U case without reusing its values. Time runs at 3.5 sim-min/s
through Reveal, Explore and Health, then 1 sim-min/s through Recovery. Tests: `model.test.ts`.

## Files

- `src/app/space-station/`: the page (sections A–K of the brief); content in `src/lib/space-station.ts`.
- `src/components/station-twin/`: `StationTwinViewer` (four-stage model on `/space-station`),
  `StationHero` (homepage hero, nominal only), `StationScene` (geometry, flows, hero scene),
  `Explorer` (systems and competency pathways).
- Posters: `public/images/station-twin/` were rendered from the live scene in headless Chromium.

## SEO, AI search and analytics

- Homepage title: "iTelematics® - Space Station Digital Twin Research & Development" (`SITE.title`). Inner pages: "<title> | iTelematics®".
- Share cards: static JPEGs in `public/images/og/` (about 160 KB each, so WhatsApp shows them), made from the
  homepage hero station. `itelematics-space-station.jpg` is site-wide; `/space-station` has `space-station-rd-center.jpg`.
- Structured data: Organization (with the station image and slogan), WebPage `primaryImageOfPage`, and on
  `/space-station` a ResearchProject plus FAQPage that matches the visible FAQ.
- Sitemap entries for `/` and `/space-station` list the station images. robots.txt names search and AI crawlers
  (OAI-SearchBot, ChatGPT-User, GPTBot, ClaudeBot, PerplexityBot, Google-Extended and others) as allowed.
- `public/llms.txt` (index) and `public/llms-full.txt` (citable facts); a test keeps the SRC-1 numbers in
  `llms-full.txt` equal to the model's.
- Analytics events (`docs/analytics/ANALYTICS.md`): `space_station_click`, `station_model_interaction`,
  `station_explorer_select`, `space_station_view`, `station_model_view`.

## Limits

No station model is validated against measured data; nothing is an operational digital twin. Fault
detection is a deterministic rule, not AI. Thermal load is estimated as load ÷ η_EPS; there is no
thermal, life-support or structural model yet.
