# Supuestos y fuentes del dashboard del operador

**Fecha:** 6 de octubre de 2026 · **Actualizado:** 7 de octubre de 2026 (sección 8) · **Autor:** Guillermo Jimenez

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
| **Supuesto respaldado** | Supuesto que coincide con un dato oficial cercano, aunque no sea exactamente el mismo dato (por ejemplo, población en lugar de pasajeros). |
| **Simulado** | Generado por el simulador de flota. No representa la operación real. |

## 2. Resumen de valores

| Valor | Cifra usada | Tipo | Fuente |
|---|---|---|---|
| Tarifa troncal San José–Coronado | ₡460 | Oficial | ARESEP RE-0115-IT-2026 |
| Tarifa Coronado–Las Nubes–Cascajal | ₡460 | Oficial | ARESEP RE-0115-IT-2026 |
| Tarifa Periférica Coronado e Ipís | ₡410 | Oficial | ARESEP RE-0115-IT-2026 |
| Tarifa ramales cortos | ₡400 | Oficial | ARESEP RE-0115-IT-2026 |
| Tarifa adulto mayor | ₡0 | Oficial | ARESEP (viajes menores a 25 km) |
| Proporción de adultos mayores | 12 % | Supuesto respaldado | Coincide con el 12,0 % de población de 65+ de los distritos atendidos (INEC 2022, sección 8); falta confirmarlo en abordajes |
| Costo de operación por hora-bus | ₡12 950 (rango ₡10 500–16 550) | Estimación propia | Sección 4 |
| Punto de equilibrio | 32–37 abordajes por hora-bus (escenario medio) | Estimación propia | Sección 5 |
| Diésel | ₡785/L | Fuente secundaria | Precio aprobado por ARESEP, octubre 2026 (Monumental) |
| Salario mínimo, chofer de vehículo pesado | ₡419 756/mes | Fuente secundaria | Decreto de salarios mínimos 2026 (Alegra) |
| Tipo de cambio | ₡455 por US$ | Fuente secundaria | Junio 2026 (Observador) |
| Flota, rutas, capacidades y demanda | 43 buses, 11 rutas | Simulado | Sección 7 |
| Pasajeros de la ruta 142 | ≈395 800 al mes (≈13 200 al día), 12 ramales | Oficial, **todavía no aplicado** | ARESEP RE-0060-IT-2024 (sección 8) |
| Población de los distritos atendidos | 193 478 habitantes | Oficial, **todavía no aplicado** | INEC, Estimación de Población y Vivienda 2022 (sección 8) |

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
| Rutas | Troncal R142 y 10 ramales; 4 ramales "por definir" | Notas del equipo; nombres parcialmente inventados. ARESEP fija 12 ramales (sección 8.2) |
| Pasajeros por día | ~28 000 | Notas del equipo, sin verificar. **El dato oficial de ARESEP es unos 13 200** (sección 8.3) |
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
- **Prueba de razonabilidad.** 28 000 pasajeros entre 553 horas-bus dan unos **51 abordajes por hora-bus**, por encima del equilibrio de 32–37. Eso es coherente con una línea concurrida y rentable en conjunto, con horas valle por debajo del equilibrio. El simulador está calibrado para producir unos 28 000 abordajes al día, con un margen de ±20 %. Una prueba automática lo verifica (`MockFleetTests.A_simulated_day_carries_about_the_operators_daily_ridership`). **Ojo:** el dato oficial de ARESEP es unos 13 200 pasajeros al día, la mitad; con ese dato la prueba de razonabilidad no se cumple (ver la pregunta abierta de la sección 8.3).

## 8. Población y demanda por ramal (datos reunidos, todavía no aplicados)

Hoy el simulador reparte los pasajeros entre rutas **sin tener en cuenta cuánta gente vive en cada zona**: cada bus llena su capacidad en las terminales según la franja horaria y recoge un número aleatorio de pasajeros en cada parada. Lo único que cambia de un ramal a otro es su largo, cuántos buses tiene y su capacidad. Por eso **las diferencias entre ramales que muestra el dashboard (por ejemplo, Cascajal en pérdida) salen de la forma del simulador, no de la demanda real.**

Esta sección reúne los datos para corregirlo. **Todavía no se aplicaron al simulador.**

### 8.1 Población por distrito (INEC, 2022)

No existen tablas oficiales del "Censo 2022" por distrito: por la baja cobertura del censo, el INEC publicó las cifras oficiales como **Estimación de Población y Vivienda 2022**, que combina el censo con otras fuentes. Así hay que citarlas.

| Cantón | Distrito | Población | Viviendas ocupadas | Viviendas con carro | Personas por vivienda | 65 años o más | Personas en viviendas sin carro¹ | 65+ (% de la población)¹ |
|---|---|---|---|---|---|---|---|---|
| Vázquez de Coronado | San Isidro | 18 377 | 5 918 | 64,5 % (≈3 817) | 3,08 | 2 361 | ≈6 471 (35 %) | 12,8 % |
| Vázquez de Coronado | San Rafael | 8 005 | 2 514 | 55,2 % (≈1 388) | 3,17 | 985 | ≈3 570 (45 %) | 12,3 % |
| Vázquez de Coronado | Dulce Nombre de Jesús | 11 193 | 3 581 | 55,3 % (≈1 980) | 3,13 | 1 168 | ≈5 010 (45 %) | 10,4 % |
| Vázquez de Coronado | Patalillo | 21 161 | 6 896 | 61,6 % (≈4 248) | 3,07 | 2 327 | ≈8 130 (38 %) | 11,0 % |
| Vázquez de Coronado | Cascajal | 8 342 | 2 594 | 49,5 % (≈1 284) | 3,20 | 745 | ≈4 192 (50 %) | 8,9 % |
| Goicoechea | Guadalupe | 20 913 | 6 750 | 51,7 % (≈3 490) | 3,06 | 3 977 | ≈9 976 (48 %) | 19,0 % |
| Goicoechea | Calle Blancos | 16 894 | 5 594 | 50,5 % (≈2 825) | 3,01 | 2 839 | ≈8 335 (49 %) | 16,8 % |
| Goicoechea | Mata de Plátano | 22 461 | 7 271 | 65,5 % (≈4 763) | 3,09 | 2 393 | ≈7 751 (35 %) | 10,7 % |
| Goicoechea | Ipís | 31 762 | 9 740 | 41,5 % (≈4 042) | 3,26 | 3 664 | ≈18 575 (58 %) | 11,5 % |
| Goicoechea | Purral | 34 370 | 10 159 | 34,8 % (≈3 535) | 3,38 | 2 762 | ≈22 388 (65 %) | 8,0 % |
| **Total** | | **193 478** | | | | **23 221** | **≈94 398 (49 %)** | **12,0 %** |

¹ Columnas calculadas por el equipo, no publicadas por el INEC: personas en viviendas sin carro = viviendas × (1 − % con carro) × personas por vivienda.

**Notas sobre los datos:**

- "Viviendas ocupadas" son las **viviendas individuales ocupadas**, que es lo que el INEC publica en lugar de hogares.
- El INEC da por separado el % de viviendas con carro y con moto, **sin contar vehículos de trabajo**. No publica "al menos un vehículo", y los dos porcentajes no se pueden sumar porque hay viviendas con ambos. Se usa el % de carro; el de moto va de 11 % a 18 % según el distrito.
- Los números entre paréntesis de "Viviendas con carro" son % × viviendas.
- Algunos sitios publican otras cifras (por ejemplo, Patalillo con 24 434 habitantes). No salen de estas tablas del INEC; se usan las del INEC.

**Fuentes** (las dos en inec.cr/tabulados):

- Población, viviendas y personas por vivienda: INEC, *Resultados de la Estimación de Población y Vivienda 2022*, Cuadro 11 (`reResultadosEstimacionPoblacionVivienda2022.xlsx`, versión de junio de 2025).
- 65 años o más y viviendas con carro: INEC, *Estimaciones de indicadores sociales y de vivienda de Costa Rica 2022*, Cuadro 1 (grupos de edad) y Cuadro 9 (artefactos en la vivienda) (`reResultadosEstimacionesSocialesVivienda2022.xlsx`, versión de junio de 2025; su fe de erratas de abril de 2025 no afecta estas columnas).

### 8.2 Ramales oficiales de la ruta 142 (ARESEP)

**Fuente:** ARESEP, resolución **RE-0060-IT-2024** del 13 de setiembre de 2024 (expediente ET-004-2024), que anula y rehace la RE-0025-IT-2024 con los mismos ramales. Fija **12 ramales** e incluye los **pasajeros por mes** de cada uno.

| Ramal (nombre ARESEP) | km | Pasajeros por mes | Distritos que atiende (propuesta, por confirmar) |
|---|---|---|---|
| San José–Coronado (por Calle Blancos / Hospital Calderón Guardia) | 10,43 | 234 000 | San Isidro, Calle Blancos, ¿Guadalupe? |
| Coronado–Las Nubes–Cascajal | 10,40 | 38 397 | San Rafael (Las Nubes) y Cascajal |
| Coronado–San Pedro | 2,30 | 26 306 | ¿? |
| Coronado–San Rafael | 4,34 | 18 908 | San Rafael |
| Coronado–Patio de Agua–Calle La Máquina | 5,94 | 18 800 | San Rafael |
| Coronado–El Rodeo | 4,34 | 10 583 | Dulce Nombre de Jesús y Cascajal |
| Periférica Ipís | 12,76 | 9 324 | Ipís, ¿Purral? |
| Coronado–San Francisco | 2,07 | 9 095 | San Isidro |
| Periférica Coronado | 7,18 | 8 517 | San Isidro y Patalillo |
| Coronado–San Antonio | 3,38 | 8 146 | Patalillo |
| Coronado–Dulce Nombre | 2,60 | 7 584 | Dulce Nombre de Jesús |
| Coronado–La Colmena | 4,26 | 6 127 | ¿? |
| **Total** | | **395 787**² | |

² La tabla recibida indica un total de 394 866, pero la suma de sus 12 filas da 395 787 (921 de diferencia). Hay que verificar contra la resolución.

**Correcciones a lo que hoy supone el simulador:**

- **Las Nubes no está en Cascajal:** es un barrio de San Rafael, igual que Patio de Agua y Calle La Máquina. San Rafael (8 005 habitantes) lo comparten tres ramales; se propone repartir su población según los pasajeros de cada uno.
- **No existe un "Ramal Patalillo":** Patalillo es lo que se conoce como San Antonio de Coronado, así que corresponde al ramal Coronado–San Antonio.
- **El Rodeo** está repartido entre Dulce Nombre de Jesús y Cascajal.
- **El San Francisco de este ramal** es un barrio de San Isidro de Coronado, no el distrito San Francisco de Goicoechea.
- **La troncal** va "por Calle Blancos" según su nombre oficial. Es probable que Purral y Mata de Plátano no estén en su recorrido, porque los atienden otras rutas (30-35 y 44-45-47). Hay que confirmarlo con el recorrido del CTP.

Los barrios de cada distrito salen de Wikipedia (listas de la División Territorial Administrativa: San Rafael, Patalillo, San Isidro, Dulce Nombre de Jesús y Cascajal de Coronado). El censo no informa la cobertura por ramal.

### 8.3 Qué cambia respecto de los supuestos actuales

1. **Pasajeros por día.** Los 12 ramales suman unos 395 800 pasajeros al mes, **unos 13 200 al día** (mes de 30 días). El simulador está calibrado a **28 000 al día** (sección 7), tomado de notas del equipo sin verificar: **es el doble del dato oficial**. Aunque la demanda de lunes a viernes sea mayor que la del fin de semana, el promedio de un día hábil seguiría muy por debajo de 28 000.
2. **Reparto entre ramales.** La troncal lleva el **59 %** de los pasajeros; los otros 11 ramales, unos 5 400 al día en total. Los pasajeros por ramal de ARESEP son la mejor base para repartir la demanda del simulador; la población por distrito sirve para los ramales que no tengan dato.
3. **Rutas.** ARESEP fija 12 ramales (la troncal y 11 más); el simulador tiene la troncal y 10 ramales, cuatro de ellos con nombre inventado.
4. **Adultos mayores.** El **12,0 %** de la población de estos 10 distritos tiene 65 años o más (11,3 % en los cinco distritos de Coronado). Coincide con el 12 % que hoy usa el dashboard, que pasa de supuesto sin fuente a supuesto **respaldado por el INEC**. Queda una salvedad: es la proporción en la población, no necesariamente en los abordajes.
5. **Dependencia del bus.** El 49 % de la población vive en viviendas sin carro, con grandes diferencias: 35 % en San Isidro y Mata de Plátano, 58 % en Ipís y 65 % en Purral.

**Pregunta abierta, la más importante.** Con los pasajeros oficiales (unos 13 200 al día), la flota simulada (unas 553 horas-bus al día) y el costo estimado (₡12 950 por hora-bus), la línea promediaría **23,9 abordajes por hora-bus**, por debajo del equilibrio de **33,3**, y perdería unos **₡2,0 M al día**. Para cubrir su costo, esa flota necesitaría unos 18 400 pasajeros al día; con 13 200 pasajeros, solo alcanza para unas 396 horas-bus al día.

Como un operador real no pierde dinero todos los días, alguna de estas piezas no coincide con la realidad: la flota real opera menos horas, el costo por hora-bus es menor, o el dato de ARESEP cuenta otra cosa (por ejemplo, solo pasajeros que pagan). **Es una de las preguntas clave para el operador** (sección 10).

### 8.4 Qué falta confirmar con alguien de Coronado

1. Dónde quedan los ramales **San Pedro** y **La Colmena**, y qué distritos atienden.
2. Si la **Periférica Ipís** entra a Purral.
3. Por dónde pasa exactamente la **troncal** en Goicoechea (¿Guadalupe? ¿Purral? ¿Mata de Plátano?).

### 8.5 Cómo se aplicaría (pendiente de decidir)

- **Demanda por ramal:** repartir los pasajeros del simulador según los pasajeros por mes de ARESEP de cada ramal; para los distritos compartidos, según la población en viviendas sin carro más una parte de la población con carro.
- **Total del día:** recalibrar el simulador al dato oficial (unos 13 200 al día) en lugar de 28 000, y actualizar la prueba automática.
- **Rutas:** reemplazar los ramales del simulador por los 12 oficiales, con sus nombres y largos.
- **Buses por ramal:** falta decidir si también se asignan según la demanda.
- **Adultos mayores:** se puede usar la proporción de 65+ de los distritos de cada ramal en lugar de un 12 % único.
- **Contrato de las API:** no cambia; solo cambian los datos simulados.

## 9. Vista de cámara a bordo

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

## 10. Preguntas para el operador

Lo que más mejora la credibilidad del dashboard es reemplazar supuestos por datos del operador:

1. Costo de operación por hora-bus, o por kilómetro.
2. Proporción de adultos mayores entre los pasajeros (la población de 65+ de los distritos atendidos es 12,0 %).
3. Confirmar los 12 ramales de ARESEP y qué distritos atiende cada uno, en particular San Pedro, La Colmena, la Periférica Ipís y el recorrido de la troncal en Goicoechea (sección 8.4).
4. Flota por tipo de bus y su capacidad, y cuántos buses tiene cada ramal.
5. Pasajeros por día y horas de servicio por bus al día. Con los pasajeros de ARESEP (unos 13 200 al día) y el costo estimado, la flota simulada no cubriría su costo: ¿cuántas horas-bus opera realmente la línea, y los pasajeros de ARESEP incluyen a los adultos mayores? (sección 8.3)
6. Horas y ramales donde sienten que pierden dinero. Sirve para comparar con lo que muestra el dashboard.

## 11. Mantenimiento de estos valores

- Las tarifas, el costo por hora-bus, la proporción de adultos mayores y los umbrales serán **configuración del dashboard**, no valores fijos en el código.
- El pie de página del dashboard mostrará la resolución tarifaria y si el costo es estimado o confirmado.
- Cuando cambie un valor, se actualiza este documento con la nueva cifra, su fuente y la fecha.
