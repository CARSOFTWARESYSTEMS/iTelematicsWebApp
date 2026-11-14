# Asset sources and licences

Every third-party file the site ships is listed here with its source, licence and credit. Nothing of
unknown origin, scraped, "free wallpaper", non-commercial (CC BY-NC), editorial-only or extracted from
games or other products is used. Add a row here before adding a file. The public credit line lives on
`/policies/terms#image-credits`.

Last reviewed: 14 November 2026.

## Rules for new assets

1. **Allowed:**
   - US federal works: NASA, USGS and JPL imagery, which is public domain.
   - CC0.
   - CC BY 4.0.
   - Files the owning organisation supplies for its own listing.
2. Before downloading, confirm the licence on the **official source page**, and record:
   - the exact download URL
   - the date
   - the licence
   - the required credit
   - a SHA-256 hash of the file
3. **NASA imagery:**
   - Credit NASA as the source.
   - Never imply NASA endorsement.
   - Never use NASA logos or insignia.
   - Images marked with another copyright holder are not covered (NASA media guidelines).
4. **CC BY 4.0:**
   - Name the author.
   - Link the licence.
   - Say whether the file was changed (resizing or recompression counts as a change).
5. Values or imagery that are reconstructions or artist renderings are labelled as such in the interface.

## Third-party assets in use

| File(s) | Source | Licence | Credit | Notes |
|---|---|---|---|---|
| `public/images/space-twin/earth-day-2k.jpg` | NASA Visible Earth, Blue Marble (via the AutonomousEV project, `docs/satellite-explorer.md`) | Public domain (NASA) | NASA Visible Earth | 2048×1024. No source metadata in the file. Not the Solar System Scope day map (correlation 0.68 on 14 Nov 2026). NASA's server could not be reached from the build machine to compare byte-for-byte. |
| `public/images/space-twin/earth-night-2k.jpg` | NASA Earth Observatory city lights (via AutonomousEV) | Public domain (NASA) | NASA Earth Observatory | Similar to, but not the same file as, the Solar System Scope night map (correlation 0.87). |
| `public/images/space-twin/earth-clouds-2k.jpg` | NASA cloud composite, near-identical to Solar System Scope's `2k_earth_clouds.jpg` (correlation 0.985) | Public domain (NASA) / CC BY 4.0 (Solar System Scope) | Both credited on `/policies/terms` | Credited to both sources because the exact origin of this copy is unconfirmed. |
| Inter, JetBrains Mono (via `next/font/google`, self-hosted at build) | Google Fonts | SIL Open Font License 1.1 | `/policies/terms` | |
| npm runtime dependencies: next, react, react-dom, three, @react-three/fiber, @react-three/drei | npm | MIT | Licence files ship in `node_modules` | Checked 14 Nov 2026. |

## Project-owned or supplied assets

- **Rendered by iTelematics® from its own 3D scenes:**
  - `public/images/space-twin/poster-*.jpg`
  - `public/images/station-twin/*.jpg`
  - `public/images/og/*.jpg`

  These contain the Earth imagery above, so they carry its credits.
- **Drawn in code at runtime:** the solar cell, insulation and radiator textures (`src/components/space-twin/textures.ts`). No files.
- **Supplied by the organisations concerned:**
  - `public/images/gamyaa-digital-twin-research.webp` (Gamyaa AeroSystems poster)
  - `public/images/ev-engineer-fai-card.webp` (EV.ENGINEER™ card)
  - the logo `public/iTelematics.png`
  - the PDFs in `public/documents`, `public/public`, `public/research` and `public/certificates`

  The owner confirms the right to publish them. The certificates contain students' names and registration numbers.

## Planned: Solar System experience (option 06)

**Planet maps** come from [Solar System Scope](https://www.solarsystemscope.com/textures/).
- Licence: CC BY 4.0, "for any purpose, even commercially". Their maps are based on NASA mission data.
- Credit: "Planet maps: Solar System Scope, CC BY 4.0, resized."

**Pluto, Charon and the major moons** come from public-domain USGS Astrogeology / NASA mission mosaics.
- Credit them to the mission, e.g. "NASA/JHUAPL/SwRI, USGS Astrogeology".

Each file is added to the table above when it is downloaded, with its URL and SHA-256.
