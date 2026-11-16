# Asset sources and licences

Every third-party file the site ships is listed here with its source, licence and credit. Nothing of
unknown origin, scraped, "free wallpaper", non-commercial (CC BY-NC), editorial-only or extracted from
games or other products is used. Add a row here before adding a file. The public credit line lives on
`/policies/terms#image-credits`.

Last reviewed: 15 November 2026.

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
| `public/images/solar-system/terrain-grass-rock.jpg`, `terrain-grass-rock-normal.jpg` | Poly Haven "Aerial Grass Rock": https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_grass_rock/aerial_grass_rock_diff_1k.jpg and `…_nor_gl_1k.jpg` (14 Nov 2026) | CC0 (https://polyhaven.com/license) | Poly Haven (credit not required, given on Terms) | Recompressed (JPEG q78/q86). Original SHA-256 57b8041b…e1b5d / 1aa3e23b…bda78; published c2c1eb96…/58bb270a… (file names as listed) |
| `public/images/solar-system/terrain-beach.jpg`, `terrain-beach-normal.jpg` | Poly Haven "Aerial Beach 01" (`aerial_beach_01_diff_1k.jpg`, `…_nor_gl_1k.jpg`) | CC0 | Poly Haven | Recompressed. Original 5b849983…, 01337121… |
| `public/images/solar-system/concrete.jpg`, `concrete-normal.jpg` | Poly Haven "Concrete Floor 02" (`concrete_floor_02_diff_1k.jpg`, `…_nor_gl_1k.jpg`) | CC0 | Poly Haven | Recompressed. Original 6db84a6d…, fcda391b… |
| `public/images/solar-system/corrugated.jpg`, `corrugated-normal.jpg` | Poly Haven "Corrugated Iron 02" (`corrugated_iron_02_diff_1k.jpg`, `…_nor_gl_1k.jpg`) | CC0 | Poly Haven | Recompressed. Original 7a7b4309…, 9743c936… |
| `public/images/solar-system/sun-2k.jpg` | Solar System Scope `2k_sun.jpg`: https://www.solarsystemscope.com/textures/download/2k_sun.jpg (14 Nov 2026) | CC BY 4.0 | "Solar System Scope, CC BY 4.0" on Terms | Recompressed (q80). Original ff0f076b…a0c8816, published 1341d139…dc9e34 |
| `public/images/solar-system/jupiter-2k.jpg` | Solar System Scope `2k_jupiter.jpg` (14 Nov 2026) | CC BY 4.0 | "Solar System Scope, CC BY 4.0" on Terms | Recompressed (q82). Original b0f04d00…f2ab33baf, published 40dcc223…b2262b1c |
| `public/images/solar-system/mercury-2k.jpg` | Solar System Scope `2k_mercury.jpg`: https://www.solarsystemscope.com/textures/download/2k_mercury.jpg (15 Nov 2026) | CC BY 4.0 (licence confirmed on https://www.solarsystemscope.com/textures/, 15 Nov 2026) | "Solar System Scope, CC BY 4.0" on Terms | Recompressed (q80). Original 5a5c8060…2b38e48a, published 8d0866d8…b68cce3a |
| `public/images/solar-system/venus-2k.jpg` | Solar System Scope `2k_venus_atmosphere.jpg`: https://www.solarsystemscope.com/textures/download/2k_venus_atmosphere.jpg (15 Nov 2026) | CC BY 4.0 (licence confirmed on https://www.solarsystemscope.com/textures/, 15 Nov 2026) | "Solar System Scope, CC BY 4.0" on Terms | Recompressed (q80). Original 225012ad…7d6991ac, published 04d19c8b…0ce0b767 |
| `public/images/solar-system/moon-2k.jpg` | Solar System Scope `2k_moon.jpg`: https://www.solarsystemscope.com/textures/download/2k_moon.jpg (15 Nov 2026) | CC BY 4.0 (licence confirmed on https://www.solarsystemscope.com/textures/, 15 Nov 2026) | "Solar System Scope, CC BY 4.0" on Terms | Recompressed (q80). Original 2764ba65…a7fd92bd, published bb71a831…f564ddc9 |
| `public/images/solar-system/mars-2k.jpg` | Solar System Scope `2k_mars.jpg`: https://www.solarsystemscope.com/textures/download/2k_mars.jpg (15 Nov 2026) | CC BY 4.0 (licence confirmed on https://www.solarsystemscope.com/textures/, 15 Nov 2026) | "Solar System Scope, CC BY 4.0" on Terms | Recompressed (q80). Original 2d187f3e…bc3f8e01, published ef283875…a494489a |
| `public/images/solar-system/saturn-2k.jpg` | Solar System Scope `2k_saturn.jpg`: https://www.solarsystemscope.com/textures/download/2k_saturn.jpg (15 Nov 2026) | CC BY 4.0 (licence confirmed on https://www.solarsystemscope.com/textures/, 15 Nov 2026) | "Solar System Scope, CC BY 4.0" on Terms | Recompressed (q80). Original 54a900ca…bcd3bbac, published b2def682…d7d797e5 |
| `public/images/solar-system/saturn-ring.png` | Solar System Scope `2k_saturn_ring_alpha.png`: https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png (15 Nov 2026) | CC BY 4.0 (licence confirmed on https://www.solarsystemscope.com/textures/, 15 Nov 2026) | "Solar System Scope, CC BY 4.0" on Terms | Re-saved (PNG, optimised). Original 4b0644b2…650d7334, published ca225070…c30fc791 |
| `public/images/solar-system/uranus-2k.jpg` | Solar System Scope `2k_uranus.jpg`: https://www.solarsystemscope.com/textures/download/2k_uranus.jpg (15 Nov 2026) | CC BY 4.0 (licence confirmed on https://www.solarsystemscope.com/textures/, 15 Nov 2026) | "Solar System Scope, CC BY 4.0" on Terms | Recompressed (q80). Original d15239d4…1204a09d, published 63bca663…ad53364c |
| `public/images/solar-system/neptune-2k.jpg` | Solar System Scope `2k_neptune.jpg`: https://www.solarsystemscope.com/textures/download/2k_neptune.jpg (15 Nov 2026) | CC BY 4.0 (licence confirmed on https://www.solarsystemscope.com/textures/, 15 Nov 2026) | "Solar System Scope, CC BY 4.0" on Terms | Recompressed (q80). Original cb42ea82…00977df6, published ec4c1261…3ebe1896 |
| `public/images/solar-system/sky-cumulus-8k.jpg`, `sky-cumulus-4k.jpg` | Poly Haven "Kloofendal 48d Partly Cloudy (Pure Sky)", 8k HDR: https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/8k/kloofendal_48d_partly_cloudy_puresky_8k.hdr (15 Nov 2026; MD5 28091ec4…3c6d6e9fd as published by Poly Haven) | CC0 (https://polyhaven.com/license) | Poly Haven (credit not required, given on Terms) | Upper hemisphere only, rotated 14.3° so the Sun's azimuth matches the scene's sunlight, stored at 0.4× radiance as sRGB JPEG (q86). Original SHA-256 30ff6bb1…23feaa71; published 5a5ae529…0bf9d619 / a807433c…bcb149ac |
| `public/images/solar-system/sky-cumulus-backdrop.jpg` | Same sky, 16k HDR: https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/16k%2B/kloofendal_48d_partly_cloudy_puresky_16k.hdr (15 Nov 2026; MD5 5e39fb9e…f4ac89ea) | CC0 | Poly Haven | A window behind the pad for the long-lens shots (azimuth −115° to −35°, elevation 0–42°), same rotation and scale. Original 8d19cc94…0e0fb88d; published 3d2ad8e0…bf658e32b6839f4 |
| `public/images/solar-system/sky-cumulus-env.hdr` | Derived from the 8k sky above | CC0 | Poly Haven | 512×256 Radiance HDR for image-based lighting: Sun disc removed (the scene's sun light carries it), ground below the horizon at a measured 16 % reflectance. Published c451ccb6…31f3bac |
| `public/images/solar-system/earth-day-8k.jpg`, `earth-clouds-8k.jpg`, `earth-night-4k.jpg` | Solar System Scope `8k_earth_daymap.jpg`, `8k_earth_clouds.jpg`, `8k_earth_nightmap.jpg`: https://www.solarsystemscope.com/textures/download/… (15 Nov 2026) | CC BY 4.0 (licence confirmed on https://www.solarsystemscope.com/textures/, 15 Nov 2026) | "Solar System Scope, CC BY 4.0" on Terms | Used only by the Solar System experience at high quality (the shared 2k Earth maps are unchanged). Day q82; clouds greyscale q60; night lights resized to 4096×2048 q82. Originals 88ab060b…6fe44abc, c792eca2…d14ba7f5, 9894e83a…3c2ad5f7; published 2d4cd232…8021671a, 36c1a71a…021e9b8, 0119e5da…e6a1c4 (abbreviated) |
| `public/images/solar-system/jupiter-4k.jpg` | Solar System Scope `8k_jupiter.jpg` (4096×2048 as distributed), 15 Nov 2026 | CC BY 4.0 | "Solar System Scope, CC BY 4.0" on Terms | Recompressed (q86). Original 0bd844bf…b6d43085, published f1364d9d…fe0f8c0ae. Replaces `jupiter-2k.jpg` in the experience (the 2k file is kept) |
| `public/images/solar-system/pluto-2k.jpg` | USGS Astrogeology "Pluto New Horizons LORRI MVIC Global Mosaic 300m": https://planetarymaps.usgs.gov/mosaic/Pluto_NewHorizons_Global_Mosaic_300m_Jul2017_8bit.tif (16 Nov 2026) | Public domain (USGS; images from NASA New Horizons) | USGS Astrogeology / NASA image credit on Terms | Downsampled to 2048×1024 and tinted (greyscale → #3a2214…#f3e6d4, approximating Pluto's colours). The southern hemisphere was in darkness during the 2015 flyby: no data, filled with the mean tone. Original 592b7fb0…b473356b, published 37548622…8c6d50df |
| `public/images/solar-system/io-1k.jpg` | USGS Astrogeology "Io Galileo SSI / Voyager Global Mosaic 1km": https://planetarymaps.usgs.gov/mosaic/Io_GalileoSSI-Voyager_Global_Mosaic_1km.tif (16 Nov 2026) | Public domain (USGS; images from NASA Galileo and Voyager) | USGS Astrogeology / NASA image credit on Terms | Downsampled to 1024×512, no-data filled with the mean, tinted (greyscale → #4a3a18…#f4e8a6). Original cf65a032…7b63584c, published a060fffe…1be1fca72 |
| `public/images/solar-system/europa-1k.jpg` | USGS Astrogeology "Europa Voyager - Galileo SSI Global Mosaic 500m": https://planetarymaps.usgs.gov/mosaic/Europa_Voyager_GalileoSSI_global_mosaic_500m.tif (16 Nov 2026) | Public domain (USGS; NASA Galileo and Voyager) | USGS Astrogeology / NASA image credit on Terms | Downsampled, no-data filled, tinted (#3a3026…#f2e6d2). Original a323f0c9…f7c9a624, published 3dd296b9…20b48ddac |
| `public/images/solar-system/ganymede-1k.jpg` | USGS Astrogeology "Ganymede Voyager - Galileo SSI Global Mosaic 1km": https://planetarymaps.usgs.gov/mosaic/Ganymede_Voyager_GalileoSSI_global_mosaic_1km.tif (16 Nov 2026) | Public domain (USGS; NASA Galileo and Voyager) | USGS Astrogeology / NASA image credit on Terms | Downsampled, no-data filled, tinted (#2a251f…#d8ccb8). Original c2c8d950…4df888, published 56bb6863…4e1da347 |
| `public/images/solar-system/callisto-1k.jpg` | USGS Astrogeology "Callisto Voyager - Galileo SSI Global Mosaic 1km": https://planetarymaps.usgs.gov/mosaic/Callisto_Voyager_GalileoSSI_global_mosaic_1km.tif (16 Nov 2026) | Public domain (USGS; NASA Galileo and Voyager) | USGS Astrogeology / NASA image credit on Terms | Downsampled, no-data filled, tinted (#1c1915…#c9bca4). Original e1f0bd2e…5f15a7dbaa3, published 13797c77…b203eb18e84 |
| Inter, JetBrains Mono (via `next/font/google`, self-hosted at build) | Google Fonts | SIL Open Font License 1.1 | `/policies/terms` | |
| npm runtime dependencies: next, react, react-dom, three, @react-three/fiber, @react-three/drei | npm | MIT | Licence files ship in `node_modules` | Checked 14 Nov 2026. |

## Project-owned or supplied assets

- **Rendered by iTelematics® from its own 3D scenes:**
  - `public/images/space-twin/poster-*.jpg` (including `poster-solar-system.jpg`, `poster-solar-system-tablet.jpg` and `poster-solar-system-phone.jpg`: the Solar System opening's first frame for each layout, re-rendered 15 Nov 2026; shown only when 3D is unavailable)
  - `public/images/station-twin/*.jpg`
  - `public/images/og/*.jpg`

  These contain the Earth imagery above, so they carry its credits.
- **Drawn in code at runtime:** the solar cell, insulation and radiator textures (`src/components/space-twin/textures.ts`), and the Solar System experience's launch vehicle, spacecraft, launch site, vegetation, volumetric plumes, exhaust clouds and the scattering sky, with their surface detail maps (`src/components/solar-system/textures.ts`: paint and weld seams, carbon composite, spray-on foam, foam insulation, nozzle cooling tubes, markings, crumpled multi-layer insulation foil, building cladding). Sound is synthesised at runtime (`src/components/solar-system/sound.ts`). No files.
- **Not imagery:** Pluto and the Galilean moons are drawn as plain coloured spheres and are labelled "Illustrative surface (not imagery)" in the interface; the asteroid and Kuiper belts are labelled "Illustrative distribution".
- **Supplied by the organisations concerned:**
  - `public/images/gamyaa-digital-twin-research.webp` (Gamyaa AeroSystems poster)
  - `public/images/ev-engineer-fai-card.webp` (EV.ENGINEER™ card)
  - the logo `public/iTelematics.png`
  - the PDFs in `public/documents`, `public/public`, `public/research` and `public/certificates`

  The owner confirms the right to publish them. The certificates contain students' names and registration numbers.

## Solar System experience (option 06): planet maps

**Planet maps** come from [Solar System Scope](https://www.solarsystemscope.com/textures/).
- Licence: CC BY 4.0, "for any purpose, even commercially". Their maps are based on NASA mission data.
- Credit: "Planet maps: Solar System Scope, CC BY 4.0, resized."

**Pluto, Charon and the major moons** come from public-domain USGS Astrogeology / NASA mission mosaics.
- Credit them to the mission, e.g. "NASA/JHUAPL/SwRI, USGS Astrogeology".

Each file is added to the table above when it is downloaded, with its URL and SHA-256. On 15 November 2026 the maps of Mercury, Venus (cloud tops), the Moon, Mars, Saturn, Saturn's rings, Uranus and Neptune were added. Pluto and moon mosaics have not been downloaded yet (see docs/SOLAR_SYSTEM.md, open items).

**Science data (not files):** planetary positions use the published approximate Keplerian elements (E. M. Standish, JPL Solar System Dynamics, https://ssd.jpl.nasa.gov/planets/approx_pos.html); test fixtures are JPL Horizons vectors fetched 15 November 2026 (https://ssd.jpl.nasa.gov/api/horizons.api). Physical data come from the NSSDCA planetary fact sheets (https://nssdc.gsfc.nasa.gov/planetary/factsheet/). These are cited here and in the code, not named in the interface (site content rule).
