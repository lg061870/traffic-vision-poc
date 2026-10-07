# OnboardComputer Host

Corre la [OnboardComputerApp](../Innova.OnboardComputer.App/README.md) dentro de IIS, para publicarla en SmarterASP desde Visual Studio igual que la API y el mapa. Así el bus de la cámara (`SJB-10662`) sigue reportando a la Occupancy API publicada sin depender de una PC encendida.

La app no cambia: este proyecto solo la hospeda (llama al mismo `AddOnboardComputer` que la app de consola) y agrega una página de estado. En un bus real corre la app de consola, no este proyecto.

## Configuración

`onboard-host.json` (se lee después del `appsettings.json` que viene de la app, así que gana sobre él):

| Clave | Valor |
|---|---|
| `OccupancyApiUrl` | `https://lg0618pp-002-site2.htempurl.com` (la API publicada) |
| `VehicleId` | `SJB-10662` |
| `Simulation:ScenarioFile` | `Scenarios/ramal-san-rafael-camara.json`: recorrido del Ramal San Rafael con las detecciones reales del clip analizado |

Las variables de entorno siguen ganando sobre ese archivo. El perfil local (`launchSettings.json`) apunta a `http://localhost:5189`.

El sitio corre *OutOfProcess* (en el `.csproj`) porque en SmarterASP todos los sitios comparten un pool. Los resultados del clip (`data/demo/results`) no están en Git: la publicación los toma de la PC que publica.

## Páginas

| Ruta | Qué devuelve |
|---|---|
| `/` | Estado: bus, API de destino, escenario, último envío aceptado y mensajes en espera |
| `/health` | Lo mismo, con **200** si el último mensaje llegó a la API hace menos de un minuto (o si el sitio acaba de arrancar) y **503** si no |

## Mantenerlo despierto

IIS apaga los sitios sin visitas, y entonces el bus deja de reportar. Un monitor gratuito (por ejemplo UptimeRobot) que abra `/health` cada 5 minutos lo mantiene encendido y avisa si deja de enviar. Conviene otro monitor para la API (`https://lg0618pp-002-site2.htempurl.com/api/v1/vehicles`): así nunca arranca en frío cuando alguien abre el panel.

## Ejecutar localmente

```powershell
dotnet run --project src/Innova.OnboardComputer.Host
```

Abra `http://localhost:5176/health`. Envía a la API local en el puerto 5189.
