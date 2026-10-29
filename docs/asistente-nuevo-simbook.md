# BusLab: asistente Nuevo Simbook y parámetros guardados

**Fecha:** 28 de octubre de 2026 · **Actualizado:** 29 de octubre de 2026 (sección 4: origen de los datos) · **Estado:** propuesta de diseño, pendiente de implementación  
**Documento relacionado:** [Simbook: archivos de escenario](./simbook-archivos-de-escenario.md)

## 1. Objetivo y principios

Permitir que un empresario cree un Simbook sin volver a introducir las características habituales de su operación. El usuario aprende un único tipo de documento de trabajo: **Simbook**. Los «parámetros guardados de mi empresa» son una comodidad local de la aplicación, no un archivo obligatorio ni un modelo distinto que el usuario deba administrar.

Invariantes:

- Cada Simbook es **autosuficiente**: copia completa de la configuración inicial, borradores, Simsheets ejecutadas, resultados y metadatos para reproducirlas.
- Los datos privados del empresario no se almacenan en servidores de BusLab. Los parámetros guardados se mantienen en almacenamiento local controlado por el navegador; el Simbook vive en el equipo o la nube del usuario.
- Una **Simsheet ejecutada es inmutable**. Editarla inicia un borrador separado. La primera ejecución del borrador inicial crea **Simsheet 1**, la línea base de comparación.
- Cambiar los parámetros guardados no altera Simbooks anteriores. Abrir un Simbook usa sus propias copias, nunca los parámetros guardados más recientes.
- El esquema de parámetros y el motor de simulación los define BusLab; cada empresa suministra valores diferentes, no un motor personalizado.

## 2. Entrada: Nuevo Simbook

Desde **File Explorer → Nuevo Simbook** o **Archivo → Nuevo**:

1. Buscar parámetros de empresa guardados localmente.
2. Si existen, preseleccionar **Usar mis parámetros guardados** y mostrar un resumen de solo lectura: empresa, rutas y ramales, flota, operación, costos y demanda, con alertas de datos faltantes o estimados.
3. Si no existen, ofrecer **Configurar mi empresa** (asistente de captura) o **Copiar parámetros de otro Simbook** (abrir archivo y seleccionar la fuente).
4. El usuario puede elegir **Empezar desde cero** expresamente. Las opciones no cambian la naturaleza autosuficiente del Simbook.

Nunca bloquear la creación solo por datos opcionales ausentes. Antes de ejecutar, validar los requisitos de la simulación elegida y guiar al usuario hacia los campos faltantes.

## 3. Asistente normal: tres pasos

### Paso 1 — Inicializar parámetros

- Opción predeterminada: **Usar mis parámetros guardados**.
- Mostrar nombre de empresa, fecha de actualización, procedencia y estado de completitud por categoría.
- Copiar **todas** las categorías disponibles por defecto; no mostrar casillas para excluir secciones en el flujo normal.
- Acciones secundarias: **Revisar parámetros**, **Copiar de otro Simbook**, **Configurar desde cero**.
- Indicar: «Se creará una copia independiente. Los cambios posteriores en su configuración guardada no modificarán este Simbook».

### Paso 2 — Propósito y método

Preguntas sugeridas: cambiar frecuencias, dimensionar flota, reducir costos, analizar rentabilidad, exposición a riesgo, **simulación libre**. Elegir una pregunta es **opcional**: determina guía, validaciones y resultados destacados, pero no restringe el modelo.

Método inicial: **Estándar** o **Monte Carlo**. La selección es modificable antes de ejecutar. Monte Carlo solicita distribuciones para variables inciertas, relaciones/correlaciones relevantes, iteraciones y semilla reproducible. No convertir cada iteración en una pestaña.

### Paso 3 — Crear

Solicitar nombre y descripción opcional; mostrar resumen del origen, completitud, pregunta y método. **Crear Simbook** prepara el documento en estado **Borrador inicial**, sin Simsheet ejecutada aún. Pedir ubicación de guardado al usar Guardar/Guardar como; indicar claramente si hay cambios sin guardar.

## 4. Primera configuración de empresa

Si no hay parámetros guardados, abrir un asistente con seis secciones: (1) empresa; (2) rutas/ramales/paradas/distancias; (3) flota/capacidades/consumos; (4) frecuencias/horarios/turnos; (5) costos, tarifas e ingresos; (6) demanda y variación temporal.

### 4.1 Primer paso: origen de los datos

Antes de las seis secciones, el asistente pregunta **«¿Cómo quiere cargar los parámetros?»**. La carga automática de datos oficiales es un paso que el usuario elige, nunca algo que la aplicación hace por su cuenta.

| Opción | Qué hace |
|---|---|
| **Automático: datos oficiales CTP / ARESEP** | Precarga lo que publican el CTP y ARESEP para la concesión. Cada valor queda marcado como **referencia pública (CTP/ARESEP)**. |
| **Manual** | El usuario define todo, sección por sección, desde campos vacíos. |
| **Copiar de otro Simbook** | Abre un Simbook y toma sus parámetros (línea base o una Simsheet). |

- **Se elige por sección, no todo o nada.** El caso común es usar los datos oficiales para rutas y tarifas, y los propios de la empresa para costos. El paso muestra las seis secciones con la opción elegida para cada una; el usuario puede cambiar cualquiera.
- **Lo que cubren los datos oficiales:** rutas, ramales y paradas; flota y frecuencias autorizadas; tarifas ARESEP. Los costos de operación pueden salir del modelo de costos publicado por ARESEP, pero solo como **estimación etiquetada**. Los costos reales y la demanda real de la empresa no están en ningún documento público: aun en modo automático, esas secciones se marcan **«estimado, revise»**.
- **Fuente de los datos oficiales:** por ahora, los datos de la ruta 142 incluidos en BusLab (`src/operator-dashboard-web/src/config/ctpRoutesData.ts` y los valores ARESEP de `docs/supuestos-dashboard-operador.md`). Importar el documento CTP propio del operador (por ejemplo su matriz de concesión) queda como mejora posterior; requiere definir el formato de ese documento.
- **Sin IA en el paquete estándar.** Cargar o importar los datos del CTP y de ARESEP se hace con lectores deterministas para formatos definidos, nunca con un modelo de IA: el mismo documento da siempre los mismos valores. Un documento que no tenga el formato esperado se rechaza con un mensaje claro.
- Después de este paso, las seis secciones se recorren una por una, precargadas o vacías según la opción. Si el usuario reemplaza un valor precargado, su fuente cambia de «referencia pública» a «verificado por operador».

### 4.2 Las seis secciones

Para cada campo registrar, cuando corresponda, **valor, unidad, fuente** (verificado por operador, estimado por operador o referencia pública) y fecha de referencia. Validar consistencia y dependencias; permitir guardar avance y volver. Al terminar, ofrecer «Guardar como mis parámetros predeterminados para nuevos Simbooks».

Un campo desconocido nunca debe convertirse silenciosamente en un valor supuesto. Se puede usar una referencia pública etiquetada como tal, si el usuario la acepta: elegir **Automático** en el paso 4.1 es esa aceptación.

## 5. Parámetros guardados: persistencia y recuperación

- Guardarlos en almacenamiento local de la aplicación (por ejemplo IndexedDB), con versión de esquema y fecha de actualización. **No son un servidor central ni una dependencia externa del Simbook**.
- Como el almacenamiento del navegador se puede borrar o cambiar de dispositivo, permitir **Restaurar mis parámetros desde un Simbook**. El usuario elige la línea base o una Simsheet; la operación sustituye los parámetros predeterminados solo tras confirmación, sin modificar el Simbook fuente.
- Ofrecer **Actualizar mis parámetros predeterminados con los valores de este borrador/Simsheet** como acción explícita, nunca automática.
- Una empresa con varias rutas guarda todas las rutas pertinentes; la simulación puede limitar el alcance a una o varias.
- En equipos compartidos, advertir que los parámetros locales pueden estar disponibles a otros usuarios del mismo perfil de navegador. Evaluar aislamiento por cuenta/perfil local antes de producción.

## 6. Ciclo de vida de Simsheets

1. **Nuevo Simbook → Borrador inicial**: copia de parámetros, modificable; todavía no existe Simsheet 1.
2. **Ejecutar**: validar entradas y congelar parámetros, configuración del motor, versión, semilla si aplica, actor, fecha y resultados en **Simsheet 1**.
3. **Seleccionar Simsheet N**: vista de solo lectura; mostrar diferencias respecto a Simsheet 1.
4. **Editar/Duplicar para experimentar**: crear **Borrador** a partir de la Simsheet elegida, sin alterar la anterior.
5. **Ejecutar Borrador**: agregar **Simsheet N+1**. Se permite ejecutar sin cambios; los resultados estocásticos pueden variar.
6. **Monte Carlo**: una Simsheet representa el experimento completo, con configuración, resumen estadístico, distribuciones de salida y, según límites de tamaño, datos necesarios para auditar o reproducir el resultado. Las iteraciones internas no son Simsheets.
7. **Guardar/Reabrir**: preservar también el borrador no ejecutado, si existe, y marcarlo claramente como tal.

Las diferencias se **calculan** entre los parámetros completos de cada Simsheet y Simsheet 1; no almacenar únicamente deltas.

## 7. Casos de aceptación

- Sin parámetros guardados, Nuevo abre configuración o importación; se puede crear un Simbook con borrador inicial, sin fingir que ya hubo una corrida.
- Con parámetros guardados, Nuevo precarga todos los valores; crear dos Simbooks y cambiar uno no modifica el otro.
- Actualizar parámetros predeterminados no modifica ningún Simbook existente.
- Abrir un Simbook en otra computadora conserva sus parámetros y resultados sin depender de la configuración local.
- Editar una Simsheet congelada crea un borrador; la pestaña original y sus resultados permanecen idénticos.
- Ejecutar dos veces parámetros iguales produce dos Simsheets distintas, con sus metadatos de ejecución.
- Una corrida Monte Carlo de 10 000 iteraciones crea **una** Simsheet.
- Si faltan valores requeridos, ejecutar presenta validación específica y navega a los campos; no sustituye datos privados por valores centrales sin avisar.
- Restaurar parámetros desde un Simbook pide confirmación y no modifica el origen.
- En la primera configuración, elegir **Automático** para rutas y tarifas y **Manual** para costos deja las rutas y tarifas marcadas como referencia pública y los costos vacíos hasta que el usuario los llene.
- Con **Automático** en todas las secciones, costos y demanda quedan marcados «estimado, revise»; ninguna sección aparece como dato verificado del operador sin que él lo haya confirmado.
- Guardar, abrir, guardar como y recuperarse de cierres inesperados deben diferenciar datos persistidos de cambios sin guardar.

## 8. Alcance de implementación

Primero: almacenamiento local de parámetros predeterminados, asistente, importación desde Simbook, inicialización del borrador, validación y contrato de datos versionado. Integrarlo con el formato y la persistencia local definidos en la especificación de Simbook. Después: escenarios guiados y Monte Carlo; más tarde, adaptadores de nube.

**Fuera de alcance de este documento:** la definición de fórmulas específicas, calibración estadística y permisos de OAuth.