# INNOVA Móvil · App de Pasajeros GAM

Aplicación móvil orientada a usuarios de transporte público del Gran Área Metropolitana (GAM) de Costa Rica, con foco en el corredor de Coronado (Ruta 142 y sus 10 ramales).

La aplicación está diseñada en **español** para los pasajeros y evaluadores, con arquitectura reactiva, cálculo multimodal de rutas, telemetría y aforo en tiempo real, cálculo de tarifas con descuentos por ley, catálogo de hitos y paradas, alertas categorizadas, asistente conversacional por palabras clave y resiliencia offline para demostraciones.

---

## Características Implementadas

1. **Planificación de Viajes Multimodal (Trip Planning):**
   - Búsqueda Origen ↔ Destino combinando tramos a pie y tramos en autobús.
   - Cálculo automático de transbordos en la Terminal de Coronado (Ruta troncal + Ramales).
   - Tiempos estimados de salida (`departAt`), llegada (`arriveAt`), tiempo total y minutos de espera en parada.
   - Trazado de recorridos geográficos en mapa Leaflet con líneas continuas (bus) y segmentadas (caminata).
   - Modo de navegación guiada en vivo paso a paso:
     - Radar de aproximación caminando a la parada con margen de tiempo.
     - Modo a bordo con contador de paradas restantes, velocímetro y alarma acústica/háptica de bajada.
     - Sugerencia inteligente de autobús siguiente si el primero viene con aglomeración alta.

2. **Calculadora de Tarifas y Pasajes (Fare Calculator):**
   - Sumatoria automática de costos por tramo troncal y alimentadores.
   - Perfiles de usuario:
     - **Adulto:** Tarifa regular 100% (₡400 troncal / ₡300 ramal).
     - **Estudiante:** Tarifa preferencial reducida (₡250 troncal / ₡180 ramal).
     - **Adulto Mayor (65+):** Gratuito (₡0 por Ley 7935 Ciudadano de Oro).

3. **Telemetría de Flota y Ocupación en Vivo:**
   - Lista interactiva de unidades en circulación con coordenadas GPS, velocidad (km/h) y rumbo (grados).
   - Semáforo y porcentaje de aforo: Baja (verde), Media (amarillo) y Alta (rojo).
   - Modal con gráfico de serie temporal (intervalos de 5 minutos durante la última media hora) que registra picos históricos de aglomeración por placa.

4. **Catálogo de Lugares y Geocodificación:**
   - Autocompletado de paradas oficiales e hitos populares costarricenses (Parque Morazán, Terminal San José, Guadalupe, Ipís, Patalillo, Mall Don Pancho, Dulce Nombre, Las Nubes, Cascajal, UCR).
   - Fallback de texto libre simulado.

5. **Alertas de Red e Incidencias:**
   - Filtros por categoría: Tráfico (presas/accidentes), Desvíos (obras viales) y Sistema (operatividad de red).
   - Clasificación por severidad visual (Éxito, Alerta, Peligro, Información).

6. **Asistente Conversacional (Chatbot FAQ):**
   - Respuestas rápidas ante consultas de capacidad, tarifas, rutas y tráfico.
   - Botones interactivos embebidos para saltar directamente a la pantalla o unidad consultada.

7. **Resiliencia Demo / Modo Offline:**
   - Conmutación automática a datasets locales (`lugares.json`, `trips_sample.json`, `alertas.json`, `fleet_mock.json`) ante fallos de conexión o latencia alta del backend.
   - Botón interactivo en el encabezado (`● En vivo` / `⚡ Modo local`) para alternar manualmente el modo de demostración.
   - Selector de visualización entre marco de teléfono móvil nativo y pantalla completa.

---

## Cómo Ejecutar la Aplicación

```bash
cd src/innova-passenger-mobile
npm install
npm run dev
```

La app se iniciará en `http://localhost:5175`.
Para compilar la versión de producción:

```bash
npm run build
npm run preview
```
