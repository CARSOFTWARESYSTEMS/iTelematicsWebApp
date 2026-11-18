# Space Station Electrical Power & Energy Management (EPS-1)

The fifth Space Digital Twin option ("05 Power & Energy"), on the homepage and `/research-lab`.
A guided engineering investigation of the electrical power system of Station Reference Case SRC-1:
a conceptual modular station modelled on no real station. Every value is **SIMULATED — Conceptual
Space Station EPS**; it is not an operational digital twin and is connected to no real system.

## Integration (additive)

- `src/components/space-twin/SpaceTwinViewer.tsx`: one fifth tab and a lazily loaded panel. While the
  fifth option is open the standard frame is hidden (not unmounted), so its presence observer releases
  the shared 3D canvas; returning restores it. No other Space Digital Twin file changed.
- New: `src/lib/station-eps/model.ts` (simulation), `scenes.ts` (labels, faults, guided tour),
  `src/components/station-eps/` (experience, canvas, 3D scene, styles), tests.
- The 3D station is the SRC-1 geometry from `src/components/station-twin/StationScene.tsx`.

## Architecture (per channel, four channels)

solar array → shunt regulator → 160 V primary bus ⇄ battery charge/discharge unit ⇄ 45 kWh battery group;
primary bus → main bus switching (cross-ties 1↔2 and 3↔4, 12 kW) → DC-DC converter → 120 V secondary →
remote power controllers → loads. Critical loads are dual-fed (primary + alternate channel).

| Loads (kW) | Ch 1 | Ch 2 | Ch 3 | Ch 4 |
|---|---|---|---|---|
| Critical (alternate) | Life support A 9 (→3) | Life support B 9 (→4), Thermal A 6 (→1) | Thermal B 6 (→2), Avionics 6 (→1) | Comms 4 (→2) |
| Essential | Habitat A 8 | — | — | Habitat B 8 |
| Deferrable | Research A 1.5 | Research B 3.5 | Research C 6.5 | Research D 6.5 |

## Equations and parameters

- Orbit: 400 km circular, β = 0°; T = 2π√(a³/μ) ≈ 92.6 min; cylindrical-shadow eclipse ≈ 36.1 min; 30 s penumbra.
- Arrays: P = P_rated · illumination · cos θ · (1 + γ(T − 28 °C)) · (1 − d)^years · health;
  P_rated 46.8 kW/channel, γ −0.35 %/°C, d 0.75 %/yr over 5 years, θ 2° tracking error;
  temperature first-order (τ 12 min) between −70 °C (umbra) and 60 °C (sun) → ≈ 40 kW per channel sunlit.
- Efficiencies: regulator 0.97, converter 0.928, charge 0.95, discharge 0.97.
- Battery group: 45 kWh usable, 30 cells, V_oc = 30 × (3.40 + 0.75·SOC) V, R = 0.015 Ω,
  P = V_t · I with V_t = V_oc ± I·R; limits 20 kW charge (taper above 95 % SOC), 30 kW discharge.
  SOC_next = SOC + (P_charge·η_c − P_discharge/η_d)·Δt / E_usable, clamped to [0, 1]; Δt = 15 s.
  Thermal: m·c dT/dt = I²R − h(T − 15 °C), m·c = 60 kJ/K, h = 60 W/K; warning 28 °C, limit 35 °C.
- Power balance, every step, exact by construction (tested):
  P_array,drawn = P_loads + P_stored + P_losses (P_stored < 0 when discharging); cross-tie flows cancel.
- Orbit capacity of a channel: L_max = E_bus,sunlit / (t_sun/η_conv + t_ecl/(η_conv·η_d·η_c)) ≈ 21.2 kW.

## Diagnostics, protection and recovery

- Array residual r = 1 − P_observed/P_expected; fault when r > 15 % on 5 consecutive 1-min samples (lit).
- Battery: ≥ 28 °C → warning and charge limited to 25 %; ≥ 35 °C → group isolated.
- Bus fault: overcurrent protection trips the channel at once; dual-fed loads switch to the alternate feed.
- Recovery decision 2 min after detection: shed research → move dual-fed critical loads to their
  alternate (if it can carry them with its own critical loads) → shed essential loads. Outcomes:
  Recovered, Partially Recovered, Degraded Operation, Unrecovered, Protection Active. Instantaneous
  protection sheds the lowest-priority load whenever supply cannot meet demand.
- System states come from model conditions: INITIALIZING, NOMINAL_SUNLIGHT, NOMINAL_ECLIPSE,
  DEGRADED_GENERATION, BATTERY_WARNING, DISTRIBUTION_FAULT, PROTECTION_ACTIVE, RECOVERY_EVALUATION,
  PARTIAL_RECOVERY, RECOVERED, UNRECOVERED.

## Results (from `model.test.ts`)

| Scenario | Outcome |
|---|---|
| Nominal | margin +14.9 %; min SOC 72 % (depth of discharge 28 %); max battery 22 °C |
| A · ch 2 arrays at 60 % (t = 100 min) | detected t = 104; Recovered: research B shed; margin +8.5 % |
| B · group 2 cooling lost (t = 92) | warning t ≈ 111.8; Protection Active: charge limited, life support B → ch 4, research B and D shed; max 28.1 °C |
| C · ch 2 bus short (t = 100) | tripped at once; Recovered: three critical loads re-fed, all research shed; margin +13.9 % |
| Channels 1 and 4 lost | Partially Recovered (essential loads shed, critical served) |
| Channels 2 and 4 lost | Unrecovered: life support B and comms lose both feeds |
| Channels 2, 3, 4 lost | Unrecovered: critical demand exceeds supply |

Validation tests: normal sunlight, normal eclipse, low generation, low battery energy, thermal warning,
channel failure, load shedding, recovery success, partial recovery, insufficient power; plus energy
conservation at every step, SOC integration, battery terminal equations and determinism.

## Sources and limits

Concepts follow widely published spacecraft EPS practice (sequential shunt regulation, battery
charge/discharge units, DC-DC conversion, main bus switching, remote power controllers, dual-fed
critical loads). Parameters are illustrative and were not taken from any real station; no compliance
with any standard is claimed.

Limits: no array shadowing by the structure, no seasonal β-angle variation, constant loads, linear
OCV, no state-of-health model (shown as not available), lumped battery thermal model, orbit-average
capacity for recovery decisions, no thermal or life-support models. Fault detection is rule-based, not
AI. Future research: battery ageing and SOH estimation, coupled power–thermal model, string-level
array models with shadowing, telemetry replay, statistical detectors with measured false-alarm rates.
