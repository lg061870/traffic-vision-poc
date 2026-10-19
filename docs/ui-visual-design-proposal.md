# Propuesta de Diseño Visual: Flujo Completo End-to-End (App Móvil INNOVA)

Esta propuesta reúne el **flujo de usuario completo en 5 pantallas de alta fidelidad** con el lenguaje visual minimalista y limpio inspirado en Apple iOS, Uber Reserve y Citymapper (modo claro, tarjetas blancas con bordes suaves, tipografía SF Pro de alto contraste, semáforos de aforo en tonos pastel y botones píldora negros).

---

## 🎬 Video Animado del Flujo de Usuario (Walkthrough en MP4)

Se ha renderizado una **animación en video MP4** a 30 FPS en resolución vertical de móvil (768×1376) que simula la navegación nativa del usuario a través de las 5 pantallas mediante transiciones suaves de desplazamiento (*slide-left*):

* 📹 **Archivo generado:** [`docs/assets/innova_app_flow_video.mp4`](file:///c:/Users/lg061/source/repos/traffic-vision-poc/docs/assets/innova_app_flow_video.mp4)  
* ⏱️ **Duración:** ~16 segundos de recorrido continuo por cada pantalla.

---

## Galería de Pantallas del Flujo Completo

A continuación se presentan las pantallas que componen el flujo oficial de la aplicación:

### Pantalla 0: Splash / Launch Screen (Apertura Instantánea)

Esta es la pantalla que el usuario ve durante una fracción de segundo al tocar el ícono de la app mientras se inicializa el handshake 5G y se sincroniza la flota en tiempo real:

![Pantalla 0: Splash Screen INNOBUS](C:/Users/lg061/.gemini/antigravity/brain/211a4876-a400-4d65-be16-5eac4e003775/innobus_splash_screen_1791879466408.jpg)

* **Fondo:** Azul marino profundo de alta gama (`#0d1b2a`) con trazas sutiles de la red vial de transporte.
* **Identidad Visual:** Isotipo minimalista de autobús con arcos de conectividad 5G en gradiente cian luminoso.
* **Tipografía:** Logotipo **INNOBUS** en sans-serif moderno de alto impacto y lema *"Movilidad Inteligente en Tiempo Real"*.
* **Estado de Conexión:** Indicador inferior: `📍 Sincronizando Ruta 142 San José - Coronado...` con píldora de carga luminosa.

---

### Pantalla 1: Home — Estilo Transit App (Línea 142, Matriz de 6 Puntos y Botón GO)

![Pantalla 1: Home Estilo Transit App con Ruta 142 y Botón GO](C:/Users/lg061/.gemini/antigravity/brain/211a4876-a400-4d65-be16-5eac4e003775/innobus_transit_style_home_1791879492642.jpg)

* **Cabecera de Ubicación:** Barra superior con pin: `📍 Parque Morazán, San José`.
* **Selector de Pasajero Especializado:** Píldoras táctiles: `🎓 Estudiante` (seleccionada en negro), `🧓 Adulto Mayor`, `♿ Accesible`.
* **Mapa Interactivo:** Trazado de ruta en azul oscuro, ruta peatonal punteada, y pin de bus con ondas 5G y **matriz de ocupación de 6 puntos adherida al pin**. Botones flotantes de acción rápida a la derecha (`X`, pin, campana de alertas, centrar GPS).
* **Tarjeta Principal de la Ruta 142:**
  - Número de ruta masivo: **`142`** en azul marino de gran escala.
  - Dirección: **`➔ Hacia Coronado Centro`**.
  - Proximidad en vivo: **`A 1 parada de ti`** en azul vibrante con **`3 min`** y ondas de señal.
  - Próxima parada: `Próxima parada: Automercado / Av 3`.
  - **Matriz de 6 Puntos de Aforo:** Píldora `[ :.: ] Asientos libres (38 disp.)`.
  - **Accesibilidad:** Píldora `[ ♿ ] Con Rampa`.
  - **Botón de Acción "GO":** Botón squircle azul flotante de gran contraste para iniciar el guiado inmediato.
  - **Pie de Confianza:** `Unidad SJB-2267. Actualizado hace 15 seg por Autobuses Unidos de Coronado e INNOBUS.`

---

### Pantalla 2: Comparador Multimodal — Las 3 Mejores Rutas (Estilo Transit App)

![Pantalla 2: Comparador de 3 Mejores Rutas Estilo Transit App](C:/Users/lg061/.gemini/antigravity/brain/211a4876-a400-4d65-be16-5eac4e003775/innobus_transit_routes_screen_1791879866577.jpg)

* **Barra de Destino y Filtro:** `📍 Coronado Centro · 32 min` con filtro `🎓 Estudiante (Tarifa ₡350)`.
* **Tarjeta Recomendada 1 (Troncal):**
  - Número de ruta masivo: **`142 ➔ Coronado Troncal`**.
  - `28 min · Directo · Walking: 🚶 3 min`.
  - Matriz de 6 puntos de aforo: `[ :.: ] Asientos libres (38/90 pax)`.
  - Píldora de accesibilidad: `[ ♿ ] Con Rampa`.
  - Botón squircle flotante azul **`GO`**.
* **Tarjeta Alternativa 2 (Express):** Píldora turquesa `142-EXP` (`➔ Coronado Express · 22 min · ₡450 · [ :.: ] Pocos asientos (68/90 pax)`).
* **Tarjeta Alternativa 3 (Ramal):** Píldora morada `142-DN` (`➔ Coronado Dulce Nombre · 35 min · ₡350 · [ :.: ] Asientos libres`).

---

### Pantalla 3: Detalles del Viaje y Radar de Aproximación (Estilo Transit App)

![Pantalla 3: Detalles del Viaje y Radar de Llegada](C:/Users/lg061/.gemini/antigravity/brain/211a4876-a400-4d65-be16-5eac4e003775/innobus_transit_details_screen_1791879893183.jpg)

* **Resumen de Horarios:** Salida `06:43 PM ➔ Llegada 07:15 PM (32 min)`.
* **Cabecera y Botón GO:** **`142 ➔ Coronado Troncal`** con botón azul flotante **`GO`**.
* **Radar de Unidad en Vivo:** `((•)) Bus SJB-2267 llega en 3 min` con ondas de señal.
* **Badges:** Matriz de 6 puntos `[ :.: ] Asientos disponibles (38/90 pax)` y `[ ♿ ] Con Rampa activa`.
* **Itinerario Paso a Paso:**
  - 🚶 `Camina 4 min (280 m) a Parada Morazán` (06:43 PM)
  - 🚏 `Aborda Bus SJB-2267 en Parada Parque Morazán` (06:47 PM)
  - 🚌 `16 paradas en autobús por Ruta 142 (28 min)`
  - 🏁 `Desciende en Coronado Centro` (07:15 PM)
* **Liquidación:** `Tarifa Estudiante: ₡350`.

---

### Pantalla 4: Modo Guiado En Ruta (Modo Activo "GO")

![Pantalla 4: Modo En Ruta A Bordo](C:/Users/lg061/.gemini/antigravity/brain/211a4876-a400-4d65-be16-5eac4e003775/innobus_transit_onboard_screen_1791879917511.jpg)

* **Navegación Activa en Mapa:** El mapa acompaña la posición del bus en tiempo real con línea punteada hacia el destino.
* **Banner de Conteo Regresivo:**
  - Texto masivo de alto contraste: **`Faltan 4 paradas para tu destino en Coronado Centro`**.
  - `Próxima parada: Super La Violeta (en 2 min)`.
* **Barra de Telemetría:**
  - Velocímetro: `⚡ 34 km/h`.
  - Unidad: `Bus SJB-2267`.
  - Matriz de 6 puntos: `[ :.: ] 38/90 pax (42% aforo - Cómodo)`.
* **Barra de Progreso:** Indicador `12 of 16` paradas completadas.
* **Alarma Superior:** `🔔 Alarma de bajada activada (aviso en 1 parada)`.
* **Acciones:** `Ver paradas` y botón rojo `Finalizar viaje`.

---

### Pantalla 5: Telemetría de Flota & Historial de 5 Minutos

![Pantalla 5: Telemetría de Flota y Curva de Aforo 5 min](C:/Users/lg061/.gemini/antigravity/brain/211a4876-a400-4d65-be16-5eac4e003775/innobus_transit_fleet_screen_1791879944613.jpg)

* **Detalle por Unidad:** `Unidad SJB-2267` con etiqueta de carrocería `CAIO Apache · IVECO`.
* **Aforo en Vivo:** Matriz de 6 puntos con `38 de 90 Pasajeros (42%)` y barra de progreso.
* **Gráfico de Serie Temporal (Intervalos de 5 min):** Curva de ocupación histórica de 30 minutos con pico detectado (`Pico máximo: 44 pax a las 07:05`).
* **Próximas Unidades en Ruta:**
  - `🚌 SJB-12726 (pasa en 5 min) · [ :.: ] 84 pax (Muy lleno)`.
  - `🚌 SJB-3490 (pasa en 12 min) · [ :.: ] 26 pax (Asientos libres)`.
* **Pie de Página:** `Datos en tiempo real vía sensores 5G de conteo de pasajeros en puertas.`
* **Gráfico de Serie Temporal (Intervalos de 5 min):** Curva de ocupación de la última media hora con detección de hora pico (`Pico máximo: 44 pasajeros a las 07:05`).
* **Comparativa con Unidades Cercanas en la Línea:**
  - `SJB-12726 (pasa en 5 min) · 🔴 84/90 pax (Muy lleno)`.
  - `SJB-10356 (pasa en 12 min) · 🟢 26/90 pax (Vacío)`.
* **Botón de Acción:** `Rastrear unidad en el mapa`.
