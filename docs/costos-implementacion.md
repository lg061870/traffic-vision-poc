# Costo de implementación y retorno de la inversión

**Fecha:** 8 de octubre de 2026 · **Autor:** Guillermo Jimenez

---

## 1. Para qué sirve este documento

Estima cuánto costaría llevar el prototipo a la flota real de la ruta 142 (Autobuses Unidos de Coronado) sobre una red 5G de Nokia: el equipo de cada bus, el equipo del chofer, la instalación, la operación anual y en cuánto tiempo se recupera la inversión.

**Todas las cifras son estimaciones del equipo.** Los precios de equipo son de listas públicas de revendedores en EE. UU. y Europa (octubre de 2026), sin impuestos de importación ni margen local. La red 5G no tiene precio público y se marca **por cotizar**. Los datos de operación (pasajeros, horas-bus, costo por hora-bus, tarifas) salen de [`supuestos-dashboard-operador.md`](supuestos-dashboard-operador.md), con la misma clasificación (oficial, estimación propia, supuesto).

Tipo de cambio: **₡455 por US$** (el mismo del documento de supuestos).

## 2. Resumen

| | Opción completa (con cámara IA) | Opción esencial (sin cámara) |
|---|---|---|
| Equipo e instalación por bus | **US$6 280** | **US$4 180** |
| Inversión inicial, 43 buses (con 15 % de gestión e imprevistos) | **US$362 000** (≈₡165 M) | **US$258 000** (≈₡118 M) |
| Operación anual | **US$58 700** (≈₡26,7 M) | **US$46 600** (≈₡21,2 M) |
| Beneficio anual, escenario medio | US$211 700 | US$211 700 |
| **Recuperación de la inversión, escenario medio** | **2,4 años** | **1,6 años** |
| Recuperación, escenario conservador | 13 años | 6,5 años |

**Conclusión:** el retorno lo dan sobre todo los **contadores de puerta y los datos**, no la cámara. La cámara aporta lo que nadie más mide (sentados y de pie, aglomeración dentro del bus) y es el diferenciador del proyecto, pero conviene probarla primero en pocos buses. Por eso se propone **empezar con un piloto de 5 buses** (sección 8) que mida los beneficios reales antes de equipar la flota.

## 3. Arquitectura del bus sobre la red 5G de Nokia

```
                 Red 5G SA (Nokia AirScale)
                          │
                 antena 5G + GNSS en el techo
                          │
┌──────────────── bus ────┼──────────────────────────────┐
│  router 5G vehicular (SIM de la red privada / slice)   │
│      │ Ethernet              │ Wi-Fi                    │
│  computadora IA a bordo   tablet del chofer             │
│  (OnboardComputerApp +    (app del chofer)              │
│   modelo RF-DETR)                                       │
│      │ PoE                                              │
│  2 cámaras de cabina · 2 contadores 3D de puerta        │
└─────────────────────────────────────────────────────────┘
          │ solo metadatos (JSON cada 10 s, nunca video)
          ▼
   Occupancy API → panel del operador · app de pasajeros (InnoBus)
```

- **El video no sale del bus.** La computadora a bordo corre el modelo y envía solo conteos y detecciones, como ya hace `OnboardComputerApp`. Eso baja el consumo de datos a unos cientos de MB al mes por bus y evita transmitir imágenes de pasajeros (Ley 8968 de protección de datos).
- **La tablet del chofer se conecta al Wi-Fi del router.** Así basta **una SIM por bus**; la 5G propia de la tablet queda de respaldo.
- **Equipo compatible con 5G SA.** Router y tablet deben soportar 5G *standalone* en la banda que use la red de Nokia (por confirmar con Nokia; en Costa Rica suele ser n78, 3,5 GHz).

### 3.1 ¿Qué red 5G de Nokia?

Una línea de bus recorre unos 10 km de ciudad, así que no es práctico montar una red privada propia a lo largo de todo el recorrido. Se proponen dos piezas, las dos con tecnología Nokia:

| Pieza | Qué es | Para qué | Costo |
|---|---|---|---|
| **En ruta: red 5G SA de RACSA** | Nokia AirScale, la primera red 5G SA de Costa Rica ([RCR Wireless](https://www.rcrwireless.com/20241010/featured/racsa-taps-nokia-for-costa-ricas-first-5g-sa-network)), con un **APN privado o un *slice*** para la flota | Que los 43 buses reporten en todo el recorrido con prioridad y aislados del tráfico público | Por cotizar; se supone US$20 por SIM al mes |
| **En el plantel: Nokia Digital Automation Cloud (DAC)** | Una celda 5G privada en el plantel de Coronado ([Nokia DAC](https://dac.nokia.com/private-wireless)) | De noche, con los buses estacionados: actualizar el modelo y el software de toda la flota, bajar clips para reentrenar el modelo, diagnóstico de equipos | Por cotizar; Nokia la vende por suscripción y no publica precios. **Opcional** (fase 3) |

Idea para negociar: la flota de Coronado puede ser **caso de uso de referencia** de Nokia y RACSA para movilidad urbana 5G, a cambio de condiciones especiales en las SIM y en la celda del plantel.

## 4. Equipo por bus

| Equipo | Ejemplo de referencia | Precio (US$) | Rango y fuente |
|---|---|---|---|
| Router 5G vehicular, doble SIM, GNSS | Teltonika RUTM50 | 600 | US$570–670 ([Walmart](https://www.walmart.com/ip/Teltonika-RUTM50-5G-Cellular-Router/15707211419), [NTS Direct](https://shop.ntsdirect.com/product/RUTM50000000-Z/Teltonika-RUTM50000000---RUTM50-Cellular-5G-Router.html)). Alternativa vehicular certificada: Sierra Wireless XR80, US$1 540–2 000 ([CDW](https://www.cdw.com/product/sierra-wireless-airlink-xr80-wireless-router-wwan-wi-fi-6-3g-4g-5/8445977)) |
| Antena de techo 5G + GNSS y cables | Antena combinada vehicular | 250 | Estimación |
| Computadora IA a bordo, sin ventilador, 9–36 V | NVIDIA Jetson Orin Nano (AVerMedia, NEXCOM, Neousys) | 1 500 | €1 270–1 700 la caja industrial ([cartft](https://cartft.com/catalog/PDF/3464/AVerMedia%20D115ONB-8GB%20BoxPC.pdf), [voelkner](https://www.voelkner.de/products/13630043/AVerMedia-D115WONB-8G-BoxPC-NVIDIA-Jetson-Orin-Nano-8GB-256GB-SSD.html)); las versiones vehiculares IP67 se cotizan aparte |
| 2 cámaras de cabina (PoE, conector M12) | Cámara IP vehicular | 500 | Estimación, US$250 cada una |
| 2 contadores 3D de puerta (APC) | Eurotech, Acorel, Thoreb, Hikvision | 1 800 | US$590–1 485 por puerta en una lista de compras pública de transporte ([Park City](https://parkcity.gov/home/showpublisheddocument/76248/638591646557600000)); se usan US$900 |
| Protección de energía, encendido, switch PoE, cableado, caja | | 350 | Estimación |
| **Subtotal equipo del bus** | | **5 000** | |

**Opción esencial:** sin computadora IA ni cámaras (−US$2 000) y menos material de instalación. El conteo sale de los contadores de puerta y la API sigue funcionando igual (`source: DOOR_COUNTER_3D`).

## 5. Equipo del chofer

| Equipo | Ejemplo | Precio (US$) | Fuente |
|---|---|---|---|
| Tablet resistente 5G | Samsung Galaxy Tab Active5 5G | 620 | MSRP US$620 edición empresarial ([SHI](https://www.shi.com/product/51460881/Samsung-Galaxy-Tab-Active5)) |
| Soporte vehicular con carga | | 260 | Estimación |
| **Subtotal** | | **880** | |

**Qué ve el chofer** (app por desarrollar, sección 6):

- **Ocupación de su bus** y aviso de "bus lleno" antes de llegar a una parada con gente esperando.
- **Distancia al bus de adelante y al de atrás** de la misma ruta, para no agruparse (*bunching*), con la regla que ya usa el panel del operador (menos de 400 m).
- **Mensajes del despacho** (por ejemplo, "regrese a la terminal" en hora valle).
- **Botón de incidente**: avería, accidente, desvío. El operador lo ve en vivo.
- Pantalla simple, con letra grande y sin interacción mientras el bus se mueve.

## 6. Instalación y costos únicos

| Concepto | US$ | Nota |
|---|---|---|
| Instalación por bus | 400 | Dos técnicos, una noche en el plantel, con calibración de contadores y cámaras. **El bus no sale de servicio.** |
| Adaptadores de los dispositivos reales | 25 000 | GPS por puerto serie, contador de puerta del fabricante elegido y visión a bordo. La app ya tiene las interfaces (`IGpsSource`, `IDoorCounterSource`, `IVisionSource`); falta conectarlas al hardware |
| App del chofer | 15 000 | Android, sobre la Occupancy API existente |
| Capacitación | 2 000 | Unas 2 horas por chofer y una sesión para despacho |
| Evaluación de privacidad | 3 000 | Cámaras en el bus, Ley 8968; avisos en el bus |
| Gestión del proyecto e imprevistos | 15 % | Sobre el total |

**Inversión inicial, 43 buses:**

| | Completa | Esencial |
|---|---|---|
| Equipo e instalación (43 × US$6 280 / US$4 180) | 270 040 | 179 740 |
| Costos únicos | 45 000 | 45 000 |
| Gestión e imprevistos (15 %) | 47 256 | 33 711 |
| **Total** | **≈362 000** | **≈258 000** |

No incluye impuestos de importación, la celda del plantel (opcional, por cotizar) ni el margen de un integrador local.

## 7. Operación anual

| Concepto | Completa (US$) | Esencial (US$) | Nota |
|---|---|---|---|
| SIM 5G (43 × US$20 × 12) | 10 320 | 10 320 | **Supuesto**, por cotizar con RACSA/Nokia |
| Nube (API, panel, base de datos) | 3 600 | 3 600 | US$300 al mes |
| Gestión remota de routers | 1 548 | 1 548 | US$3 por equipo al mes |
| Mantenimiento y repuestos | 20 227 | 13 175 | 8 % del equipo al año |
| Soporte de software | 18 000 | 18 000 | Medio desarrollador |
| Reentrenar el modelo de visión | 5 000 | — | Etiquetar clips de la flota real |
| **Total** | **58 695** | **46 643** | |

## 8. Retorno de la inversión

Se calcula con los datos del documento de supuestos: **13 200 pasajeros al día** (ARESEP), **553 horas-bus al día** (simulador), tarifa promedio de **₡437** (59 % troncal a ₡460, el resto a ₡400–410), **12 %** de adultos mayores que no pagan y un costo variable de **₡5 027 por hora-bus** (combustible ₡3 402 + mantenimiento ₡1 625, escenario medio). Ingreso anual estimado de la línea: **₡1 851 M (US$4,07 M)**.

### 8.1 De dónde sale el beneficio

| Beneficio | Cómo se calcula | Por qué es creíble |
|---|---|---|
| **Recortar horas-bus bajo el punto de equilibrio** | % de horas-bus recortadas × ₡5 027 × 360 días | Con los pasajeros de ARESEP, la flota simulada opera más horas de las que la demanda paga (supuestos, sección 8.3). El panel muestra exactamente qué horas y ramales. Solo se cuenta el ahorro de combustible y mantenimiento, no el del chofer ni el del bus |
| **Recuperar ingreso no registrado** | % del ingreso anual | Los contadores de puerta cuentan cada abordaje; comparar con lo cobrado revela diferencias por ruta, hora y bus |
| **Más pasajeros** | % del ingreso anual | Con la app de pasajeros (InnoBus) la gente sabe cuándo llega el bus y si viene lleno; esperar menos atrae pasajeros |

### 8.2 Escenarios

| | Conservador | **Medio** | Optimista |
|---|---|---|---|
| Horas-bus recortadas | 3 % | **5 %** | 8 % |
| Ingreso no registrado recuperado | 0,5 % | **1,5 %** | 2 % |
| Aumento de pasajeros | 0 % | **1 %** | 2 % |
| Ahorro por horas-bus (US$/año) | 65 985 | **109 975** | 175 960 |
| Ingreso recuperado (US$/año) | 20 343 | **61 030** | 81 373 |
| Ingreso por más pasajeros (US$/año) | 0 | **40 687** | 81 373 |
| **Beneficio anual (US$)** | **86 328** | **211 692** | **338 707** |
| Beneficio neto, opción completa | 27 633 | **152 997** | 280 012 |
| **Recuperación, opción completa** | 13,1 años | **2,4 años** | 1,3 años |
| Beneficio neto, opción esencial | 39 685 | **165 049** | 292 064 |
| **Recuperación, opción esencial** | 6,5 años | **1,6 años** | 0,9 años |
| Resultado a 5 años, opción completa | −224 130 | **+402 687** | +1 037 763 |

En el escenario conservador la opción completa no se paga en un plazo razonable. Por eso los porcentajes de la sección 8.2 se tienen que **medir en un piloto** antes de comprar para toda la flota.

### 8.3 Beneficios que no se cuentan

- **Estudios tarifarios ante ARESEP.** ARESEP fija la tarifa con los pasajeros de la ruta. Un conteo automático y auditable por ramal y por hora fortalece la posición del operador en cada estudio tarifario.
- **Menos agrupamiento de buses**, con menos combustible gastado en buses vacíos que siguen a uno lleno.
- **Seguridad y respuesta a incidentes** con el botón del chofer y la ubicación en vivo.
- **Planificación con datos reales** de demanda por ramal, en lugar de supuestos (las preguntas abiertas de la sección 8 de supuestos se responden solas).

## 9. Plan por fases

| Fase | Alcance | Inversión aprox. | Qué se decide al final |
|---|---|---|---|
| **1. Piloto (3 meses)** | 5 buses con equipo completo: 3 de la troncal y 2 de ramales. Adaptadores reales y app del chofer | ≈US$88 000 (5 × US$6 280 + costos únicos, con 15 %) | Precisión de los contadores y de la cámara contra conteos manuales; % real de horas-bus recortables; costo real de las SIM |
| **2. Flota** | Los 38 buses restantes, opción esencial o completa según el piloto | US$159 000 (esencial) a US$239 000 (completa) en equipo e instalación, más imprevistos | Si la cámara se pone en toda la flota o solo en la troncal |
| **3. Plantel 5G (opcional)** | Celda Nokia DAC en el plantel para actualizar y reentrenar de noche | Por cotizar | |

## 10. Preguntas para cotizar

**A Nokia y RACSA:**

1. Precio de SIM con APN privado o *slice* para 43 buses y 43 tablets, y la banda 5G SA en la zona de Coronado.
2. Cobertura 5G SA real a lo largo de la ruta 142 y sus ramales (Cascajal, Las Nubes, Patio de Agua).
3. Precio de una celda Nokia DAC para el plantel, y si hay condiciones especiales por ser caso de referencia.

**A los fabricantes de contadores:**

4. Precio por puerta a 86 puertas (43 buses × 2), con certificación vehicular y precisión garantizada.

**Al operador:**

5. Cuántas puertas tiene cada tipo de bus, y si hay espacio y alimentación para el equipo.
6. Si ya tienen GPS, cobro electrónico o cámaras que se puedan reutilizar (bajaría el costo por bus).
7. Cuánto cobran hoy contra cuántos pasajeros estiman que suben, para validar el beneficio de la sección 8.

## 11. Mantenimiento de este documento

Cuando llegue una cotización real, se reemplaza el precio de referencia, se cambia el tipo a "cotización" con su fecha y se recalculan las secciones 6 a 9. Si cambian el costo por hora-bus, los pasajeros o las tarifas, se actualizan primero en [`supuestos-dashboard-operador.md`](supuestos-dashboard-operador.md).
