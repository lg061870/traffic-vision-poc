# InnoBus — Costos, precio y márgenes

**Respaldo interno del pitch · Hackatón · 9 de octubre de 2026**  
> *Estos números NO se dicen en el speech. Van acá para responder si un juez o un operador los pide.*

---

## Supuestos base

| Supuesto | Valor |
|---|---|
| Tipo de cambio | ₡447 por dólar |
| Tarifa urbana promedio | ₡535 ≈ $1.20 por pasajero |
| Valor de un bus urbano nuevo | ≈ $120,000 |
| Unidad de análisis | 1 bus instalado |

---

## 1 · Costo por unidad (lo que nos cuesta a nosotros)

| Componente | Tipo | Costo |
|---|---|---|
| Modem Teltonika RUTX11 | Único | $383.00 |
| Cámara IP con infrarrojo | Único | $120.00 |
| Equipo de borde (cómputo a bordo) | Único | $250.00 |
| Instalación y cableado | Único | $80.00 |
| **Total hardware + instalación** | **Único** | **$833.00** |
| Chip de datos (₡16,500) | Mensual | $36.91 |
| Nube, mapas y plataforma | Mensual | $5.00 |
| **Total recurrente** | **Mensual** | **$41.91** |

> **Pendiente de confirmar:** El precio real de la cámara y del equipo de borde. El módem y el chip son datos ciertos.

---

## 2 · Precio de venta y margen

| Concepto | Costo | Precio | Margen | % |
|---|---|---|---|---|
| Instalación por unidad (pago único) | $833.00 | $1,200.00 | $367.00 | 31 % |
| Cuota por bus (mensual) | $41.91 | $65.00 | $23.09 | 36 % |

### Racionalidad de estos números
* **$1,200 únicos:** Sigue siendo ~1 % del valor total de la unidad ($120,000), manteniendo intacto el anclaje comercial del pitch.
* **$65 mensuales:** Ajustado respecto a la versión inicial del speech ($20 daba pérdida frente a los $36.91 del chip SIM). Se defiende fácilmente ante el operador porque equivale a **menos de dos pasajeros extra por día**.

---

## 3 · Piloto de 10 unidades

| Concepto | Facturamos | Nos cuesta | Margen |
|---|---|---|---|
| Instalación (pago único) | $12,000.00 | $8,330.00 | $3,670.00 |
| Mensualidad (10 buses) | $650.00 | $419.13 | $230.87 |
| **Año 1 (instalación + 12 meses)** | **$19,800.00** | **$13,359.53** | **$6,440.47** |
| **Año 2 en adelante (anual)** | **$7,800.00** | **$5,029.53** | **$2,770.47** |

---

## 4 · Retorno de inversión para el operador (por bus)

| Pasajeros extra por día | Ingreso extra mensual | Neto tras cuota ($65) | Recupera los $1,200 en |
|---|---|---|---|
| **1.8 (punto de equilibrio)** | $65.00 | $0.00 | Solo cubre la cuota |
| **2** | $71.81 | $6.81 | No se paga en la práctica |
| **5** | $179.53 | $114.53 | ~10 meses |
| **8** | $287.25 | $222.25 | ~5 meses |
| **12** | $430.87 | $365.87 | ~3 meses |

> **Nota:** Este cálculo contempla exclusivamente pasajeros recuperados. El ahorro de diésel al optimizar salidas y evitar despachar unidades vacías acorta aún más el periodo de repago, aunque no ha sido cuantificado.

---

## 5 · Guía de respuestas para preguntas difíciles (Q&A de Jurado / Operador)

| Si preguntan… | Respuesta corta |
|---|---|
| **¿Cuánto cuesta por bus?** | *«Mil doscientos dólares por unidad, una sola vez (cámara, equipo de borde, módem 5G e instalación), y sesenta y cinco dólares por bus al mes.»* |
| **Mil doscientos dólares por bus es caro.** | *«Es cerca del 1 % de lo que vale la unidad, y es hardware que se queda en el bus. Se arranca con diez unidades, no con la flota: doce mil dólares y seiscientos cincuenta al mes.»* |
| **¿Sesenta y cinco dólares al mes no es mucho?** | *«Son dos pasajeros más por día. Si el sistema no le devuelve ni dos pasajeros diarios, no le sirve y no se lo vendemos.»* |
| **¿Por qué cobran instalación y mensualidad?** | *«La instalación cubre hardware que se queda en el bus. La mensualidad cubre el chip de datos y la plataforma, que son costos que corren todos los meses.»* |

### Regla de oro
> **El precio nunca se dice aislado.** Siempre debe comunicarse acompañado de los dos anclajes:  
> 1. *«Representa solo el 1 % del valor de la unidad»*.  
> 2. *«Se arranca con un piloto de diez buses, no con toda la flota»*.
