# traffic-vision-poc

Hackathon INNOVA (5G, Costa Rica) prototype for the Coronado bus line (route 142, Autobuses Unidos de Coronado). The user is the only developer of this repo: commit to `main` when asked, no review PRs. Discuss before coding; keep changes small; stage only the files of the change.

## Projects

| Project | What | Published at |
|---|---|---|
| `src/Innova.Occupancy.Api` | Occupancy API with a simulated 43-bus fleet | site2 https://lg0618pp-002-site2.htempurl.com |
| `src/Innova.Occupancy.Map` + `occupancy-reference-web` | Passenger map (static React) | site3 |
| `src/Innova.OnboardComputer.App` | On-board computer (console); `camara-grabada` profile replays real model detections for SJB-10662 | — |
| `src/Innova.OnboardComputer.Host` | The same app hosted in IIS so SJB-10662 reports without a PC | site4 http://lg0618pp-002-site4.htempurl.com/health |
| `src/Innova.OperatorDashboard` + `operator-dashboard-web` | Operator (bus owner) dashboard: Rentabilidad + En vivo tabs | site5 http://lg0618pp-002-site5.htempurl.com |
| `src/TrafficVision.Api` + `traffic-vision-web` | Vision model POC (RF-DETR, sitting/standing) | local only |

## Rules that matter

- **Never break the Occupancy API contract.** Another team's app (github.com/CruzBas/InnoBus) reads `/vehicles`, `/vehicles/{id}`, `/history`, `/events` and `/trips/plan`. Only additive changes (new optional fields, new endpoints); keep existing responses identical.
- **Publishing is manual only:** the GitHub Actions workflow "Publish to SmarterASP" (`.github/workflows/publish-smarterasp.yml`), Run workflow → pick a site; site2 needs `PUBLICAR` typed. Never make it run on push. The password is the `SMARTERASP_PASSWORD` secret; never ask for it or handle it.
- SmarterASP runs every site in one shared app pool, so every ASP.NET Core site must be **OutOfProcess**.
- `data/demo` (the analyzed clip `la_bus_highlights.mp4` and its `.result.json`) is **not in Git**; the workflow downloads it from site5 `/demo`. Don't commit videos.
- Docs and UI text are in **Spanish** (Costa Rica); code and comments in English.
- Money figures (fares, cost per bus-hour, break-even, population data) and their sources live in `docs/supuestos-dashboard-operador.md`; update it together with `src/operator-dashboard-web/src/config/operatorSettings.ts`. Data is simulated and the UI says so; never present it as the operator's real data.

## Build and test

```bash
dotnet test tests/Innova.Occupancy.Api.Tests
dotnet test tests/Innova.OnboardComputer.App.Tests
npm --prefix src/operator-dashboard-web run build
```

The user often runs the API locally on port 5189; when testing, use another port (e.g. `--urls http://localhost:5290`) instead of starting a second copy on 5189.
