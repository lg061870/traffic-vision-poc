# Handoff: the Coronado fleet simulator

Brief for another session. Everything below was read from the repo on 2026-10-12; file:line refs are to `main` at `11b3ef9`. Read `CLAUDE.md` first (API contract, Spanish docs, manual publishing).

**Status:** the population/ARESEP data in `docs/supuestos-dashboard-operador.md` §8 is collected but **not applied** to the simulator. The user said "no changes yet". Discuss before coding.

---

## 1. What it is and where it lives

A `BackgroundService` in the Occupancy API (site2) that drives 42 fake buses through the same store as real devices, tagged `source: SIMULATED`. Clients (InnoBus team app, passenger map, operator dashboard) can't tell it apart from real data except by that tag.

| File | Role |
|---|---|
| `src/Innova.Occupancy.Api/MockData/coronado-fleet.json` | Operator, 11 routes (corridor polylines), 43 buses (plate, fleet number, route, capacity, outOfService) |
| `src/Innova.Occupancy.Api/Vehicles/MockFleetSimulator.cs` | Loads the fleet, places buses, replays the morning at startup, ticks every 5 s |
| `src/Innova.Occupancy.Api/Vehicles/Simulation/SimulatedBus.cs` | One bus's state machine: drive → stop → board/alight → terminal → layover → park |
| `src/Innova.Occupancy.Api/Vehicles/Simulation/MockFleet.cs` | JSON model and loader |
| `src/Innova.Occupancy.Api/Transit/TransitTiming.cs` | Speeds, dwell, layover, Costa Rica clock (shared with the trip planner) |
| `src/Innova.Occupancy.Api/Transit/TransitNetwork.cs` | Routes, stops every ~400 m, transfers within 150 m (shared with the trip planner) |
| `src/Innova.Occupancy.Api/Vehicles/UsageCalculator.cs` | Hourly totals behind `GET /api/v1/fleet/hourly` (service seconds, boardings, load bands) |
| `src/Innova.Occupancy.Api/Vehicles/OccupancyClassifier.cs` + `appsettings.json` | GTFS-RT occupancy levels: <50 / <80 / <95 / <100 / ≥100 % |
| `src/Innova.Occupancy.Api/Ingestion/RawAggregator.cs:15` | `RawDataTakeover = 2 min`: a bus sending raw data is not simulated for 2 min |
| `tests/Innova.Occupancy.Api.Tests/MockFleetTests.cs` | Fleet shape (27 + 16), heading, and the daily ridership calibration test |
| `src/operator-dashboard-web/src/config/operatorSettings.ts` | Fares per route, cost per bus-hour, senior share, alert thresholds (dashboard side, not simulator) |

Config (`appsettings.json`, section `MockFleet`): `Enabled=true`, `IntervalSeconds=5`, `WarmUpMinutes=60`, `BackfillFrom="05:00"`, `TimeOfDayOverride=""`. Documented in `src/Innova.Occupancy.Api/README.md:461-465`.

## 2. How it behaves

**Startup** (`MockFleetSimulator.cs:24-74`)
- `Random(142)` seed, so runs are reproducible.
- Buses of a route are spread evenly along the corridor at `(i + 0.5)/n`, alternating directions; initial load 10–40 % of capacity (`CreateBuses`, :112-131).
- Out-of-service bus (`SJB-7090`, R142-10) reports once at the depot and goes silent, so clients can test stale data (stale after 60 s, `OccupancyApiOptions.StaleAfterSeconds`).
- Replays from 05:00 Costa Rica time (or from yesterday's 05:00 if started before 05:00). Only the last 60 min feed `/history` and `/events`; earlier replay is marked `backfill` and only feeds `/fleet/hourly`. This was done on purpose so the InnoBus team's `/history` and `/events` behave exactly as before backfill existed.

**Each tick** (`SimulatedBus.Step`)
- Cruise speed (`TransitTiming.CruiseKmh`): trunk 12 km/h at rush hour (6–9, 16–19), 20 otherwise; feeders 16 / 24; ±4 km/h jitter.
- Stops: evenly divided, target 400 m (`TransitRoute.StopSpacingMeters`); names are generated ("Ruta 142 · Parada 9"). Dwell 20 s. Terminal layover 5 min.
- At a stop: alights `Passengers × rand × 0.06` inbound or `× 0.30` outbound; boards `rand × (4 trunk | 2 feeder) × Demand(hour)`.
- At a terminal: everyone alights, then boards `capacity × Demand × (0.5–1.0)`.
- Max load is 115 % of capacity (`MaximumLoad`); people who don't fit are dropped, not counted.
- Direction: corridor point 0 is San José (trunk) or the Coronado terminal (feeders), so `INBOUND` (toward point 0) is the morning-peak direction everywhere (`MockFleet.cs` / `TransitNetwork.cs` comments).

**Time of day** (`SimulatedBus.ActiveShare`, `Demand`)

| Costa Rica hour | Fleet in service | Demand inbound / outbound |
|---|---|---|
| 05–08 | 100 % | 1.0 / 0.25 |
| 08–09 | 100 % | 0.45 / 0.25 |
| 09–16 | 55 % | 0.2 / 0.2 |
| 16–19 | 100 % | 0.25 / 1.0 |
| 19–22 | 50 % | 0.2 / 0.26 |
| 22–23 | 50 % | 0.03 |
| 23–05 | 0 % | 0.03 |

A bus is in service when its `ServiceRank` (= its spread position `(i+0.5)/n`) is below the share; when it drops out it finishes its trip, empties at the terminal and parks (`trip` becomes null, so the trip planner never offers it).

**Real data takes over:** `SJB-10662` (fleet #36, R142-05 Ramal San Rafael, 50 seats) is fed by the OnboardComputerApp `camara-grabada` profile (hosted on site4), which replays real RF-DETR detections from `la_bus_highlights.mp4`. While raw data keeps arriving (every ~10 s), the simulator skips that bus (`MockFleetSimulator.cs:63-69`). Its source becomes `CABIN_CAMERA`. Details: `docs/supuestos-dashboard-operador.md` §9.

**Calibration test result (run 2026-10-12):** `A_simulated_day_carries_about_the_operators_daily_ridership` → **27,269 riders in 24 h** (target 28,000 ±20 %); busiest trunk bus 108 % at 6–8 a.m., 98 % at 4–7 p.m.

## 3. Every input and what backs it

Types follow `docs/supuestos-dashboard-operador.md` §1: Oficial, Fuente secundaria, Estimación propia, Supuesto, Supuesto respaldado, Simulado.

| Input | Value in the model | Backing | Type |
|---|---|---|---|
| Operator | Autobuses Unidos de Coronado S.A., route 142 | ARESEP RE-0115-IT-2026 (exp. RA-083) names it as operator | Oficial |
| Fleet size | 43 buses = 27 trunk + 16 feeder | Team research notes, unverified (`coronado-fleet.json` `operator.notes`; README:475,482; supuestos §7) | Supuesto |
| Routes | Trunk R142 + 10 ramales; R142-07…10 "por definir" | Team notes; names partly invented (supuestos §7) | Supuesto |
| Daily riders | 28,000 (`operator.dailyRiders`), test-calibrated | Team notes, unverified (same refs) | Supuesto — **contradicted, see D1** |
| Corridors | OSM streets routed with OSRM from Parroquia San Isidro Labrador to each destination | OpenStreetMap (ODbL) + OSRM; "approximate, not trace" (`operator.notes`; commit `cc45fcb`) | Estimación propia |
| Capacity | 90 trunk, 50 feeder | Invented (`operator.notes`; supuestos §7) | Supuesto |
| Plates | e.g. SJB-16959 | Invented (`operator.notes`) | Supuesto |
| Speeds, dwell, layover, stop spacing | 12/20, 16/24 km/h; 20 s; 5 min; 400 m | No source; code comments only ("GAM traffic is much slower at rush hour") | Supuesto |
| Hourly demand and fleet share | table in §2 | No source; shaped so trunk buses fill at both peaks and the day totals ~28,000 | Supuesto |
| Occupancy levels | 50/80/95/100 % | GTFS-Realtime `OccupancyStatus` names (`Program.cs:11`); cut-offs are config, "approximate seated vs standing space" (`OccupancyApiOptions.cs:15`) | Supuesto |
| Camera bus count | SJB-10662 from real detections | `la_bus_highlights.mp4`, RF-DETR Small v1, not a Coronado bus (supuestos §9) | Real model output on test footage |

Dashboard inputs that read the simulator's output (not in the simulator itself, but the numbers the pitch rests on — sources in supuestos §2–§5):

| Input | Value | Backing |
|---|---|---|
| Fares | ₡460 trunk, Cascajal, Las Nubes; ₡400 short ramales; ₡410 periféricas; seniors ₡0 | **ARESEP RE-0115-IT-2026**, 28 Aug 2026, in force 4 Sep 2026, exp. RA-083 (supuestos §3) — Oficial |
| Senior share | 12 % | **INEC** 2022: 12.0 % of the 10 districts' population is 65+ (supuestos §8.1, §8.3 pt 4) — Supuesto respaldado |
| Cost per bus-hour | ₡12,950 (₡10,499–16,541) | Bottom-up estimate (supuestos §4): diesel ₡785/L (ARESEP via Monumental), min. driver wage ₡419,756 (decree 2026 via Alegra), FX ₡455 (Observador, Jun 2026); CRUSA 2024 report checked, no breakdown — Estimación propia |
| Break-even | 32.0 / 35.9 / 36.8 boardings per bus-hour at ₡460 / ₡410 / ₡400 with 12 % seniors | Derived, supuestos §5 |
| Alerts | crowded ≥90 %, nearly empty <20 %, bunching <400 m | Supuesto (supuestos §6.1) |

Official sources collected but **not yet applied** (supuestos §8):
- **ARESEP RE-0060-IT-2024**, 13 Sep 2024, exp. ET-004-2024 (redoes RE-0025-IT-2024): 12 ramales with km and riders per month (supuestos §8.2 table).
- **INEC, Estimación de Población y Vivienda 2022**, Cuadro 11 (`reResultadosEstimacionPoblacionVivienda2022.xlsx`, Jun 2025) and **Estimaciones de indicadores sociales y de vivienda 2022**, Cuadros 1 and 9 (`reResultadosEstimacionesSocialesVivienda2022.xlsx`, Jun 2025): population, dwellings, car ownership, 65+ for 10 districts (supuestos §8.1). Cite as "Estimación 2022", not "Censo 2022".
- Wikipedia lists of the División Territorial Administrativa for neighbourhood → district (supuestos §8.2).

## 4. Discrepancies

| # | Topic | Simulator says | Other source says | Refs |
|---|---|---|---|---|
| D1 | Daily riders | 28,000 (test gives 27,269) | ≈395,787 / month ≈ **13,200 / day** — half | Sim: `coronado-fleet.json` `dailyRiders`, README:476, supuestos §7. Official: ARESEP RE-0060-IT-2024, supuestos §8.2–8.3 pt 1 |
| D2 | ARESEP total itself | — | Table received says 394,866; its 12 rows sum to 395,787 (921 off). Verify against the resolution | supuestos §8.2 note ² |
| D3 | Route count | 11 routes (trunk + 10), 4 invented names | 12 (trunk + 11) | supuestos §7, §8.3 pt 3; ARESEP RE-0060-IT-2024 |
| D4 | Route identity | Separate "Ramal Las Nubes" and "Ramal Cascajal"; a "Ramal Patalillo" | One ramal Coronado–Las Nubes–Cascajal (Las Nubes is a barrio of San Rafael district); no Patalillo ramal (Patalillo = San Antonio → Coronado–San Antonio). Missing: San Pedro, San Francisco, El Rodeo, La Colmena, Periférica Coronado, Periférica Ipís | supuestos §8.2 "Correcciones"; fares table §3 (Patalillo "no aparece en el pliego"); `operatorSettings.ts:12` |
| D5 | Route lengths (corridor, computed approx. from the JSON) | R142 11.3 km; Cascajal 18.8; Las Nubes 6.5; San Rafael 2.3; Dulce Nombre 1.8; Patio de Agua 6.1 | R142 10.43; Las Nubes–Cascajal 10.40; San Rafael 4.34; Dulce Nombre 2.60; Patio de Agua–Calle La Máquina 5.94 | `coronado-fleet.json` corridors; ARESEP RE-0060-IT-2024 / RE-0115-IT-2026 (supuestos §3, §8.2) |
| D6 | Trunk path | Parque Central – Guadalupe – Ipís – Coronado | Official name: "por Calle Blancos o por Hospital Calderón Guardia"; Purral/Mata de Plátano probably served by other routes (30-35, 44-45-47); confirm with CTP route | `operator.notes`; supuestos §3, §8.2, §8.4 |
| D7 | Bus-hours per day | supuestos §7.1 says ≈553 (12.9 h/bus × 43) | SJB-7090 never runs and rank rounding (e.g. 15 of 27 trunk buses at 55 %, 13 at 50 %; a 1-bus ramal is off at 50 %) gives ≈**538 scheduled** bus-hours for 42 buses (my calc from `ActiveShare` + `CreateBuses`); trips that run past a share change add some. Not measured from `/fleet/hourly`. The derived figures (51 boardings/bus-hour; 23.9 with ARESEP; −₡2.0 M/day; 18,400 riders to break even) all use 553 | supuestos §7.1, §8.3 "Pregunta abierta"; `SimulatedBus.cs` `ActiveShare`; `MockFleetSimulator.cs:124-129` |
| D8 | Service hours per bus | ≈12.9 h/day | Cost model assumes 15 h/day (5,400 h/year); at 12.9 h the medium cost rises to ≈₡13,400 | supuestos §4.2, §7.1 |
| D9 | Profitability | Sim + cost model: line is profitable (≈51 boardings/bus-hour vs 32–37) | With ARESEP riders: 23.9 vs 33.3 break-even, loses ≈₡2.0 M/day. Something is wrong: real bus-hours, cost, or what ARESEP counts (e.g. only paying riders). **Key question for the owner** | supuestos §7.1, §8.3, §10 pt 5 |
| D10 | Demand by ramal | No population input; ramal differences come only from length, bus count and capacity, so "Cascajal in loss" is a simulator artifact | ARESEP riders per ramal (trunk carries 59 %); INEC population and car-less share per district | supuestos §8 intro, §8.3 pt 2, §8.5 |
| D11 | Seniors | Simulator doesn't model them; dashboard applies 12 % to all routes | INEC 65+ share varies 8.0 % (Purral) – 19.0 % (Guadalupe); population ≠ boardings | supuestos §8.1, §8.3 pt 4 |
| D12 | Load above 100 % | Buses reach 115 % (test: 108 % peak) and show `FULL` | Capacity 90/50 is invented, so the over-100 % share is unverifiable | `SimulatedBus.MaximumLoad`; `OccupancyClassifier.cs`; `operator.notes` |
| D13 | Camera bus | SJB-10662 looks lightly loaded and has no boardings | Front camera sees ~10 people max; no door counter, so its camera-only hours are excluded from revenue/loss | supuestos §9; `operatorSettings.ts` `sourcesWithBoardings` |
| D14 | Older figures | Earlier session notes had break-even ≈31 at a ₡420 average fare, cost range ₡11,000–16,500 | Current doc: per-route 32.0–36.8, range ₡10,499–16,541. **Use the doc** | supuestos §4.3, §5 |

## 5. Proposed changes already written down (not decided)

From supuestos §8.5: split demand by ARESEP riders per ramal (population in car-less homes for shared districts); recalibrate the day to ≈13,200 and update the test; replace the 10 ramales with ARESEP's 11 (names and lengths); decide whether buses per ramal follow demand; per-ramal senior share. **The API contract does not change** — only simulated data.

If you do touch it:
- Keep `/vehicles`, `/vehicles/{id}`, `/history`, `/events`, `/trips/plan` responses identical in shape (InnoBus reads them). New route ids would change `trip.routeId` values the README lists (`R142`, `R142-01…10`, README:258) — tell the user, it's visible to the other team.
- `TransitTiming` and `TransitNetwork` are shared with the trip planner; changing speeds/stops changes planned arrivals too.
- Update `docs/supuestos-dashboard-operador.md` §7 and `operatorSettings.ts` fares together (CLAUDE.md rule), and the README "Flota simulada" section.
- Keep SJB-10662 on a 50-seat San Rafael route or update the OnboardComputer scenario (`Scenarios/ramal-san-rafael-camara.json`) and `cameraDemo` in `operatorSettings.ts`.
- Test on another port (`--urls http://localhost:5290`); the user runs 5189.

## 6. Open questions for someone at Coronado (supuestos §8.4, §10)

1. Real bus-hours per day and fleet per ramal, bus types and capacities.
2. Does the ARESEP rider figure include seniors?
3. Cost per bus-hour or per km.
4. Where San Pedro and La Colmena are; whether Periférica Ipís enters Purral; the trunk's path in Goicoechea.
