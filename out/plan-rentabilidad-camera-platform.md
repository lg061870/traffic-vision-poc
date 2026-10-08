# Plan: port the "Rentabilidad" tab into camera-platform

Handoff plan. Nothing has been coded yet; no branch has been created.

## Goal

Add a **Rentabilidad** page to the camera-platform dashboard (`C:\Users\lg061\source\repos\camera-platform\apps\web`,
Next.js 16 + Tailwind + shadcn, repo `github.com/CruzBas/camera-platform`) that reproduces the
"Rentabilidad" tab of our operator dashboard (`C:\Users\lg061\source\repos\traffic-vision-poc\src\operator-dashboard-web`,
Vite + React + plain CSS).

## Decisions already made (do not reopen)

- **Data source: our simulated Occupancy API**, not camera-platform's cameras. The page reads
  `GET https://lg0618pp-002-site2.htempurl.com/api/v1/fleet/hourly` directly from the browser.
  Verified: it answers 200 with `Access-Control-Allow-Origin: *`, so no proxy is needed.
  camera-platform's YOLO counts are people on board, not boardings, so they can't feed revenue.
- Nothing changes in traffic-vision-poc or the Occupancy API (its contract must stay identical).
- The UI says the data is simulated (as ours does). Never present it as the operator's real data.
- camera-platform belongs to CruzBas: work on a branch `feat/rentabilidad` and open a PR. Do not
  commit to their `main`. Ask the user before pushing or opening the PR.
- Follow camera-platform's conventions: **comments in Spanish**, identifiers in English, UI text in
  Spanish (Costa Rica), kebab-case files, `"use client"` pages under `app/(app)/`, Tailwind classes
  in the style of `app/(app)/page.tsx` (cards `rounded-2xl border border-black/10 bg-white`, muted
  text `text-black/45`, accent `#1d7fe0`, alerts `text-red-700`), `StatusPill` for pills,
  `Card*` from `components/ui/card.tsx`.
- Read `apps/web/AGENTS.md`: this Next.js version has breaking changes; check
  `node_modules/next/dist/docs/` before using any Next API beyond what existing pages already use.

## Source files to port (in traffic-vision-poc/src/operator-dashboard-web/src)

| Ours | What it is | Port to (camera-platform/apps/web) |
|---|---|---|
| `config/operatorSettings.ts` | Fares per route (ARESEP), `defaultAssumptions` (cost per bus-hour 12 950, senior share 0.12), `sourcesWithBoardings`, `fareOf`, `fareSource` | `lib/operator-settings.ts` (drop `cameraDemo`, `thresholds.bunchingMeters`) |
| `kpis.ts` | Pure functions: `usageRows`, `totals`, `breakEven`, `groupBy`, `costaRicaHour`, `serviceDay`, `Period`/`periodLabels`/`rowsInPeriod`/`inPeriod`, `loadGroups`/`loadShares`, colón formatters | `lib/profit.ts` (drop the live-view section: `inService`, `routeOf`, `bunching`, `distanceMeters`) |
| `types/occupancy.ts` (`HourlyUsage`, `BusHourlyUsage`, `FleetHourlyUsage`, `SensorSource`) | API types | top of `lib/profit.ts` or `lib/occupancy-api.ts` |
| `components/Tile.tsx` | KPI tile with "est." mark | reuse/extend the local `Kpi` in `app/(app)/page.tsx` pattern |
| `components/Gauge.tsx` | SVG half-dial, boardings per bus-hour vs break-even | `components/profit/gauge.tsx` |
| `components/HourlyChart.tsx` | SVG bars per hour, green/red vs break-even line (only `mode="riders"` needed) | `components/profit/hourly-chart.tsx` |
| `components/Heatmap.tsx` | CSS grid route × hour, colored by ratio to break-even | `components/profit/heatmap.tsx` |
| `components/RouteRail.tsx` | Route list with riders/bus-hour (doubles as ranking) + period segmented control | `components/profit/route-list.tsx` (profit mode only) |
| `components/ProfitView.tsx` | Composes the above | `app/(app)/rentabilidad/page.tsx` |
| `hooks/useRoutes.ts` | Route names from a geojson | replace with a static map (below); `shortName()` too |
| `styles.css` | Colors `--heat-bad #e0645a`, `--heat-weak #f4b9b2`, `--heat-ok #b9dd94`, `--heat-good #5fb05a`, `--heat-none #eceff3`; gauge/chart classes (lines ~375–500, ~850) | Tailwind arbitrary values or a small block in `app/globals.css` |

Route names (from `data/routes/coronado-routes-osm.geojson`), ordered R142 first:

```
R142    Ruta 142 · San José – San Isidro de Coronado
R142-01 Ramal Cascajal
R142-02 Ramal Las Nubes
R142-03 Ramal Dulce Nombre
R142-04 Ramal Patio de Agua
R142-05 Ramal San Rafael
R142-06 Ramal Patalillo
R142-07..10 Ramal 0N (por definir)
```

## Steps

### Slice 1 (do first, one commit)

1. `cd camera-platform && git switch -c feat/rentabilidad && cd apps/web && npm ci`.
2. `.env.development`: add `NEXT_PUBLIC_OCCUPANCY_API_URL=https://lg0618pp-002-site2.htempurl.com`
   with a Spanish comment (public, not secret; it is our simulated fleet).
3. `lib/operator-settings.ts` and `lib/profit.ts` as in the table. Keep the formulas identical. They
   are documented in traffic-vision-poc `docs/supuestos-dashboard-operador.md`; mention that file in
   a comment as the source of the figures.
4. Fetching: reuse their `useApi<T>(path, refreshMs)` from `lib/api.ts`. It accepts an absolute URL
   (plain GET, no custom headers, so CORS stays simple). Path:
   `${NEXT_PUBLIC_OCCUPANCY_API_URL}/api/v1/fleet/hourly` plus `?from=…&to=…` when `serviceDay(now)`
   returns "ayer" (before 5 a.m. Costa Rica). Refresh every 60 s.
5. `components/profit/{gauge,hourly-chart,heatmap,route-list}.tsx`: same SVG and math, restyled
   with Tailwind. SVG text classes become `fill-black/45 text-[10px]` and similar.
6. `app/(app)/rentabilidad/page.tsx`, layout:
   - Header: `h1` "Rentabilidad de {hoy|ayer}", subtitle "Autobuses Unidos de Coronado · Ruta 142 y
     ramales", plus `StatusPill` (tone warning) "Datos simulados".
   - Period segmented control (Todo el día / Hora pico / Valle). Selected route and period are held
     in page state (optionally `?ruta=&franja=` search params).
   - 4 KPIs: Abordajes, Ingreso estimado (est.), Costo de operación (est.), Pérdida en horas bajo
     equilibrio (est., red when > 0). Copy labels and hints from `ProfitView.tsx`.
   - Grid: route list card | gauge card. Then the hourly chart card, then the heatmap card with its
     legend. Clicking a route toggles the filter. The KPIs, gauge and hourly chart follow the
     filters; the heatmap always shows every route (faded ones not selected).
   - Footer line: `fareSource` · "Costo por hora-bus estimado, por confirmar con el operador".
   - Loading and error states like `FleetPage` (`text-red-700` message).
7. `app/(app)/layout.tsx`: add `{ href: "/rentabilidad", label: "Rentabilidad", icon: <lucide icon> }`
   to `NAV`. Check that the icon exists in `node_modules/lucide-react` (e.g. `TrendingUpIcon`).
8. README.md: add a row to the "Páginas del dashboard" table and one sentence saying the page reads
   the simulated Occupancy API.
9. Verify: `npm run lint && npm run build`. Then run `npm run dev` (the page itself needs no backend
   besides site2, but the auth layout calls `/api/auth/me`; if their API isn't running, the 401 or
   error redirects to login. Either run `docker compose up -d` or check the pieces in isolation).
   Compare the numbers with our dashboard at site5 for the same day and filters: they must match.
10. Commit in their style (`feat(web): …`, Spanish). Stop and ask the user before push or PR.

### Slice 2 (later)

- `LoadStack` ("Tiempo por nivel de ocupación", uses `loadGroups`/`loadShares`).
- Editable assumptions dialog (`AssumptionsPanel.tsx` + `hooks/useAssumptions.ts`, stored in
  localStorage) using their `components/ui/dialog.tsx`. The "Supuestos •" button shows a dot when
  the values differ from the defaults.
- "Explicar resultado" dialog (`narrative.ts` + `ExplainPanel.tsx`).
- Help "?" popovers (`help.ts` + `HelpButton.tsx`): Spanish texts per tile/panel.

## Gotchas

- `totals()` counts money only for sources in `sourcesWithBoardings`. `CABIN_CAMERA` hours
  (bus SJB-10662) have unknown boardings, not zero; keep that.
- Hours are Costa Rica time (UTC−6, no DST) via `costaRicaHour`; don't use the browser's time zone.
- Their `occupancy()` levels (70/40 %) are for the live page. The profit page uses `loadGroups` bands
  instead; don't merge them.
- If the money figures ever change, they change in traffic-vision-poc
  (`operatorSettings.ts` + `docs/supuestos-dashboard-operador.md`) and must be copied here too.
  Say so in a comment in `lib/operator-settings.ts`.
