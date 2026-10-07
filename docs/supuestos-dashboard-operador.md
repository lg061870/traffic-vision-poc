# Supuestos y fuentes del dashboard del operador

**Fecha:** 6 de octubre de 2026 · **Autor:** Guillermo Jimenez

---

## 1. Para qué sirve este documento

El dashboard del operador muestra indicadores en colones: ingreso estimado, costo de operación, pérdida en horas por debajo del punto de equilibrio. Cada número sale de una tarifa, un costo o un supuesto. Este documento registra **de dónde sale cada valor, qué tan confiable es y cómo se calculó**, para poder defenderlo ante el jurado y ante el operador.

Cada valor se clasifica así:

| Tipo | Significado |
|---|---|
| **Oficial** | Publicado por la autoridad (ARESEP). Se puede citar. |
| **Fuente secundaria** | Tomado de prensa o sitios especializados que citan una fuente oficial. No lo verificamos contra el documento original. |
| **Estimación propia** | Calculado por el equipo con un método explícito (sección 4). Es razonable, pero no es un dato del operador. |
| **Supuesto** | Valor elegido para la demostración, sin fuente. Se debe confirmar con el operador. |
| **Simulado** | Generado por el simulador de flota. No representa la operación real. |

## 2. Resumen de valores

| Valor | Cifra usada | Tipo | Fuente |
|---|---|---|---|
| Tarifa troncal San José–Coronado | ₡460 | Oficial | ARESEP RE-0115-IT-2026 |
| Tarifa Coronado–Las Nubes–Cascajal | ₡460 | Oficial | ARESEP RE-0115-IT-2026 |
| Tarifa Periférica Coronado e Ipís | ₡410 | Oficial | ARESEP RE-0115-IT-2026 |
| Tarifa ramales cortos | ₡400 | Oficial | ARESEP RE-0115-IT-2026 |
| Tarifa adulto mayor | ₡0 | Oficial | ARESEP (viajes menores a 25 km) |
| Proporción de adultos mayores | 12 % | Supuesto | Ninguna; preguntar al operador |
| Costo de operación por hora-bus | ₡12 950 (rango ₡10 500–16 550) | Estimación propia | Sección 4 |
| Punto de equilibrio | 32–37 abordajes por hora-bus (escenario medio) | Estimación propia | Sección 5 |
| Diésel | ₡785/L | Fuente secundaria | Precio aprobado por ARESEP, octubre 2026 (Monumental) |
| Salario mínimo, chofer de vehículo pesado | ₡419 756/mes | Fuente secundaria | Decreto de salarios mínimos 2026 (Alegra) |
| Tipo de cambio | ₡455 por US$ | Fuente secundaria | Junio 2026 (Observador) |
| Flota, rutas, capacidades y demanda | 43 buses, 11 rutas | Simulado | Sección 7 |

## 3. Tarifas

**Fuente:** ARESEP, resolución **RE-0115-IT-2026** del 28 de agosto de 2026, vigente desde el 4 de septiembre de 2026, expediente **RA-083**. Es la ruta 142, San José–San Isidro de Coronado y ramales, operada por Autobuses Unidos de Coronado, S.A. El equipo consultó el pliego tarifario el 6 de octubre de 2026.

| Recorrido | Tarifa regular |
|---|---|
| San José–Coronado, por Calle Blancos o por Hospital Calderón Guardia (10,4 km) | ₡460 |
| Coronado–Las Nubes–Cascajal | ₡460 |
| Periférica Coronado y Periférica Ipís | ₡410 |
| Ramales cortos: San Rafael, San Antonio, San Pedro, San Francisco, Dulce Nombre, El Rodeo, La Colmena, Patio de Agua | ₡400 |
| Adulto mayor, en todos los ramales | ₡0 |

**Asignación a las rutas del simulador:**

| Ruta simulada | Tarifa | Nota |
|---|---|---|
| R142 troncal | ₡460 | |
| R142-01 Cascajal, R142-02 Las Nubes | ₡460 | |
| R142-03 Dulce Nombre, R142-04 Patio de Agua, R142-05 San Rafael | ₡400 | |
| R142-06 Patalillo | ₡400 | **No aparece en el pliego.** Se usa la tarifa de ramal corto hasta confirmar. |
| R142-07 a R142-10 ("por definir") | ₡400 / ₡410 | Se propone renombrarlos con ramales reales del pliego (San Antonio, El Rodeo, La Colmena, Periférica Ipís) |

**Vigencia:** ARESEP ajusta las tarifas unas dos veces al año por combustible y salarios. **Hay que revisar el pliego antes de cada demostración.** El dashboard mostrará la resolución y su fecha en el pie de página.

## 4. Costo de operación por hora-bus

ARESEP fija la tarifa dividiendo los costos totales de la ruta entre los pasajeros, pero el pliego público no desglosa el costo por hora ni por kilómetro. Tampoco lo desglosan la prensa ni el informe CRUSA 2024 sobre la flota de buses de San José. Por eso **estimamos el costo de un bus durante una hora de servicio**, componente por componente.

### 4.1 Fórmula

| Componente | Cálculo |
|---|---|
| Combustible | velocidad comercial (km/h) ÷ rendimiento (km/L) × precio del diésel |
| Chofer | salario mensual × (1 + cargas sociales) × choferes por hora-bus ÷ horas trabajadas al mes |
| Mantenimiento, llantas, aceite | velocidad comercial × costo por km |
| Compra del bus | (depreciación lineal + rendimiento sobre la inversión promedio) ÷ horas de servicio al año |
| Seguros, permisos, revisión técnica | costo anual ÷ horas de servicio al año |
| Administración | porcentaje sobre la suma anterior |

- Depreciación lineal = precio del bus × (1 − valor de rescate) ÷ vida útil.
- Rendimiento sobre la inversión = tasa × (precio + valor de rescate) ÷ 2.
- Las **cargas sociales (39 %)** incluyen CCSS, aguinaldo y vacaciones.
- **1,15 choferes por hora-bus** cubre relevos y días libres.
- **208 horas trabajadas al mes** equivalen a 48 horas semanales.

### 4.2 Parámetros por escenario

| Parámetro | Bajo | **Medio** | Alto |
|---|---|---|---|
| Velocidad comercial | 13 km/h | **13 km/h** | 13 km/h |
| Rendimiento | 3,4 km/L | **3,0 km/L** | 2,6 km/L |
| Diésel | ₡785/L | **₡785/L** | ₡785/L |
| Salario del chofer | ₡419 756 (mínimo) | **₡550 000** | ₡700 000 |
| Mantenimiento | ₡110/km | **₡125/km** | ₡145/km |
| Precio del bus | US$130 000 | **US$160 000** | US$200 000 |
| Vida útil / rescate / tasa | 12 años / 10 % / 10 % | **12 años / 10 % / 10 %** | 12 años / 10 % / 10 % |
| Seguros y permisos | ₡2,5 M/año | **₡3,0 M/año** | ₡3,5 M/año |
| Horas de servicio al año | 5 400 | **5 400** (15 h/día) | 4 800 |
| Administración | 10 % | **12 %** | 15 % |

La velocidad se mantiene igual en los tres escenarios a propósito. Una velocidad mayor recorre más kilómetros por hora y **sube** el costo de combustible y mantenimiento por hora, así que no sirve para construir un escenario bajo. La congestión se refleja en el rendimiento (km/L), que empeora en tráfico lento.

### 4.3 Resultado (₡ por hora-bus)

| Componente | Bajo | **Medio** | Alto |
|---|---|---|---|
| Combustible | 3 001 | **3 402** | 3 925 |
| Chofer | 3 226 | **4 227** | 5 380 |
| Mantenimiento | 1 430 | **1 625** | 1 885 |
| Compra del bus | 1 424 | **1 753** | 2 465 |
| Seguros y permisos | 463 | **556** | 729 |
| Administración | 954 | **1 387** | 2 157 |
| **Total** | **10 499** | **12 949** | **16 541** |
| En dólares (₡455) | US$23 | **US$28** | US$36 |

**El dashboard usa el escenario medio, ₡12 950 por hora-bus,** marcado como estimación hasta que el operador dé su cifra. Los dos factores que más mueven el resultado son el salario del chofer y el precio del bus. El combustible viene después.

### 4.4 Cómo obtener la cifra real

1. **Preguntarle al operador.** Es la mejor fuente.
2. **Solicitar a ARESEP el último estudio tarifario ordinario de la ruta 142** (expediente RA-083). Su modelo de costos detalla costos por vehículo y kilómetros mensuales. Contacto: ventanillaunica@aresep.go.cr · 8000-273737.

## 5. Punto de equilibrio

Es la cantidad de abordajes que necesita un bus en una hora para cubrir su costo.

> **Abordajes de equilibrio por hora-bus = costo por hora-bus ÷ (tarifa × (1 − proporción de adultos mayores))**

El ajuste por adultos mayores importa: ellos abordan, cuentan en la ocupación y no pagan. Sin el ajuste, el punto de equilibrio se subestima.

| Tarifa | Sin adultos mayores | Con 12 % de adultos mayores |
|---|---|---|
| ₡460 (troncal, Cascajal, Las Nubes) | 28,2 | **32,0** |
| ₡410 (periféricas) | 31,6 | **35,9** |
| ₡400 (ramales cortos) | 32,4 | **36,8** |

Escenario medio, ₡12 950 por hora-bus. **El dashboard calcula el punto de equilibrio por ruta, con la tarifa de cada ruta,** en lugar de usar un promedio para toda la flota.

En el escenario bajo, el equilibrio de la troncal baja a 25,9 abordajes por hora-bus. En el alto, sube a 40,9 (los dos con 12 % de adultos mayores).

## 6. Indicadores que usan estos valores

| Indicador | Cálculo | Valores que usa |
|---|---|---|
| **Abordajes por hora-bus vs. equilibrio** | abordajes de la ruta o del bus ÷ horas en servicio, comparado con la sección 5 | Tarifa, adultos mayores, costo por hora-bus |
| **Ingreso estimado del día** | Σ abordajes × tarifa de su ruta × (1 − proporción de adultos mayores) | Tarifa, adultos mayores |
| **Pérdida estimada en horas bajo equilibrio** | Σ (costo por hora-bus − ingreso de esa hora), solo en las horas-bus donde el ingreso no cubrió el costo | Todos |
| **Horas-bus saturadas** | tiempo en servicio por encima de 90 % de ocupación | Umbral (sección 6.1) |

Se usa **pérdida** y no "costo de horas vacías" a propósito. Recortar un viaje ahorra combustible y mantenimiento, pero no necesariamente al chofer ni el bus. Multiplicar las horas vacías por el costo completo exageraría el ahorro, y un operador que conoce sus números lo notaría.

### 6.1 Umbrales

| Umbral | Valor | Tipo |
|---|---|---|
| Niveles de ocupación GTFS-Realtime: muchos asientos / pocos asientos / de pie / muy lleno / lleno | < 50 % / < 80 % / < 95 % / < 100 % / ≥ 100 % | Configuración actual de la Occupancy API (`appsettings.json`) |
| Alerta de bus saturado | ≥ 90 % | Supuesto |
| Alerta de bus casi vacío en servicio | < 20 % | Supuesto |
| Agrupamiento (*bunching*) | dos buses de la misma ruta y sentido a menos de 400 m | Supuesto, por validar con datos |

## 7. Datos simulados

Todo lo que el dashboard muestra sobre la operación (posiciones, ocupación, abordajes) **es simulado** y se rotula como tal en pantalla. Origen de los datos de flota (`src/Innova.Occupancy.Api/MockData/coronado-fleet.json`):

| Dato | Valor | Origen |
|---|---|---|
| Flota | 43 buses: 27 troncales, 16 de ramales | Notas de investigación del equipo, sin verificar |
| Rutas | Troncal R142 y 10 ramales; 4 ramales "por definir" | Notas del equipo; nombres parcialmente inventados |
| Pasajeros por día | ~28 000 | Notas del equipo, sin verificar |
| Capacidad | 90 por bus troncal, 50 por bus de ramal | Inventado |
| Placas | | Inventadas |
| Recorridos | Calles de OpenStreetMap enrutadas con OSRM | Aproximan, no trazan, los recorridos reales |

**Comportamiento del simulador** (`SimulatedBus.cs`, `TransitTiming.cs`):

| Franja | Flota en servicio | Demanda relativa (hacia San José / de regreso) |
|---|---|---|
| 5:00–8:00 | 100 % | 1,0 / 0,25 |
| 8:00–9:00 | 100 % | 0,45 / 0,25 |
| 9:00–16:00 | 55 % | 0,2 / 0,2 |
| 16:00–19:00 | 100 % | 0,25 / 1,0 |
| 19:00–22:00 (23:00 la flota) | 50 % | 0,2 / 0,26 |
| Noche | 0 % | 0,03 |

Velocidad de crucero: troncal 12 km/h en hora pico y 20 km/h fuera de ella; ramales 16 y 24 km/h. Un bus lleno deja gente en la parada, y esa gente no cuenta como abordaje.

### 7.1 Coherencia entre el simulador y el modelo de costos

- **Horas de servicio.** Con la tabla anterior, la flota suma unas **553 horas-bus al día**, es decir 12,9 horas por bus. El modelo de costos supone 15 horas por bus al día. Con 12,9 horas, la compra del bus y los seguros pesan un poco más por hora; el total medio subiría de ₡12 950 a unos ₡13 400. La diferencia no cambia ninguna conclusión, pero hay que tenerla presente.
- **Velocidad.** Las velocidades del simulador son de crucero, sin contar el tiempo detenido en paradas. Los 13 km/h del modelo de costos son velocidad comercial, con paradas incluidas. No se contradicen.
- **Prueba de razonabilidad.** 28 000 pasajeros entre 553 horas-bus dan unos **51 abordajes por hora-bus**, por encima del equilibrio de 32–37. Eso es coherente con una línea concurrida y rentable en conjunto, con horas valle por debajo del equilibrio. El simulador está calibrado para producir unos 28 000 abordajes al día, con un margen de ±20 %. Una prueba automática lo verifica (`MockFleetTests.A_simulated_day_carries_about_the_operators_daily_ridership`).

## 8. Vista de cámara a bordo

El panel "Cámara a bordo" del detalle de cada bus reproduce en bucle un video ya analizado, con las detecciones reales del modelo superpuestas. **No es una transmisión en vivo** y se rotula como "grabación analizada por IA". Todos los buses muestran la misma grabación, cada uno desde un punto distinto; solo en `SJB-10662` el conteo de ocupación sale de ella (ver abajo).

| Dato | Valor |
|---|---|
| Clip | `la_bus_highlights.mp4` (cámara frontal, 119 s, 1280×720) |
| Modelo | RF-DETR Small v1 (`bus-passengers-rfdetr-s-v1`), analizado a 5 cuadros por segundo |
| Picos detectados | 8 sentados, 4 de pie, 10 visibles a la vez |
| Origen del video | Material de prueba del POC; **no es un bus de la flota de Coronado** |

El conteo de "pasajeros únicos" del clip (217) está inflado por falsos positivos y por la fragmentación del seguimiento. **No se mostrará en el dashboard.** Solo se muestran las cajas y los conteos por cuadro.

La inferencia en tiempo real no es viable en el hospedaje actual: en la computadora de desarrollo el modelo procesó cerca de 1 cuadro por segundo.

**El bus de la cámara.** El conteo del bus `SJB-10662` (Ramal San Rafael, 50 plazas) sale de ese clip y no del simulador. La computadora a bordo (OnboardComputerApp, perfil `camara-grabada`) envía a la Occupancy API las detecciones confirmadas del clip, por el mismo camino que usaría un bus real. La API calcula el conteo con la mediana de cada mensaje de 10 s y lo marca como `CABIN_CAMERA`. El clip se repite sobre el reloj Unix, y el dashboard reproduce el video con ese mismo reloj, así que las cajas en pantalla y el número de la API corresponden al mismo momento (con hasta 10 s de diferencia por la mediana).

Límites que hay que mencionar:

- La cámara frontal cubre parte de la cabina; el clip llega a unas 10 personas visibles, así que ese bus aparece poco ocupado.
- Ese bus no tiene contador de puertas: se sabe cuántos van a bordo, pero no cuántos abordaron. Sus horas medidas solo con la cámara no entran en el ingreso ni en la pérdida.

## 9. Preguntas para el operador

Lo que más mejora la credibilidad del dashboard es reemplazar supuestos por datos del operador:

1. Costo de operación por hora-bus, o por kilómetro.
2. Proporción de adultos mayores entre los pasajeros.
3. Lista real de ramales, incluidos los cuatro "por definir" y si Patalillo es un ramal propio.
4. Flota por tipo de bus y su capacidad.
5. Pasajeros por día, en promedio, y horas de servicio por bus al día.
6. Horas y ramales donde sienten que pierden dinero. Sirve para comparar con lo que muestra el dashboard.

## 10. Mantenimiento de estos valores

- Las tarifas, el costo por hora-bus, la proporción de adultos mayores y los umbrales serán **configuración del dashboard**, no valores fijos en el código.
- El pie de página del dashboard mostrará la resolución tarifaria y si el costo es estimado o confirmado.
- Cuando cambie un valor, se actualiza este documento con la nueva cifra, su fuente y la fecha.
