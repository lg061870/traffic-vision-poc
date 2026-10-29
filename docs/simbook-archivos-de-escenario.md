# Simbook: archivos de escenario del simulador

**Fecha:** 28 de octubre de 2026 · **Autor:** Guillermo Jimenez · **Estado:** diseño acordado, sin implementar

---

## 1. Para qué sirve este documento

El simulador de BusLab (Studio del dashboard del operador) trabaja hoy con archivos de maqueta: la lista de la barra lateral, los botones Abrir y Guardar, y la vinculación con la nube no hacen nada real. Este documento fija **cómo se van a guardar, abrir y compartir los escenarios**, antes de escribir el código.

La regla de fondo es una promesa al operador: **sus datos financieros y sus escenarios no se guardan en nuestros servidores.** Viven en su computadora o en su propia nube.

**Diseño complementario:** [Asistente Nuevo Simbook y parámetros guardados](./asistente-nuevo-simbook.md). Este documento rige persistencia, Simsheets y privacidad; el complementario describe la inicialización y el flujo de usuario.

## 2. Términos

| Término | Qué es |
|---|---|
| **Simbook** | El archivo de trabajo, como un libro de Excel pero en formato propio de BusLab (extensión `.simbook`). Contiene todas las corridas de un escenario. |
| **Simsheet** | Cada pestaña inferior de la interfaz, una por corrida (hoy "Corrida 1", "Corrida 2"). Se escribe en una sola palabra y se usa igual en la interfaz en español ("Simsheet 1", "Nueva Simsheet"). |
| **Simsheet 1** | La primera **corrida ejecutada** del Simbook, línea base inmutable contra la cual se comparan las demás. No existe mientras solo haya un borrador inicial. |
| **Borrador** | Los parámetros que el usuario está editando y todavía no ha ejecutado; puede ser el borrador inicial o uno derivado de una Simsheet congelada. |
| **Parámetros guardados** | Copia local reutilizable de la configuración habitual de la empresa para crear nuevos Simbooks; no es una dependencia del archivo ni se sincroniza con nuestro servidor. |

## 3. Dónde vive cada dato

| Dato | Dónde | Ejemplos |
|---|---|---|
| Datos propios del operador | **En su Simbook** (computadora o nube propia); opcionalmente, una copia de parámetros predeterminados en almacenamiento local del navegador | Escenarios, flota, costos reales, ingresos y parámetros editados |
| Datos de referencia públicos | Nuestra base de datos | Tarifas ARESEP, rutas y paradas del CTP, valores por defecto de costos, datos de población |
| Cuentas | Nuestra base de datos | Usuarios, puestos, roles |

- Al crear un Simbook se prefieren los **parámetros guardados de la empresa**; si no existen, se ejecuta la configuración inicial o se copian parámetros de otro Simbook. Los valores públicos centrales pueden ofrecerse solo como referencias identificadas, nunca como sustitución silenciosa de datos faltantes.
- Cada Simbook recibe una **copia completa e independiente** de los parámetros iniciales. Al abrirlo se usan sus propios parámetros, nunca los predeterminados locales o centrales. Actualizar los parámetros guardados no cambia Simbooks existentes.
- El navegador puede perder sus parámetros guardados al borrar datos o cambiar de dispositivo; pueden restaurarse desde un Simbook por acción explícita del usuario.
- Si un usuario cambia un valor (por ejemplo su precio del diésel), el cambio se guarda en su Simbook, no en nuestra base de datos.
- Hoy la simulación corre en el navegador, así que nada pasa por el servidor. Si algún día corre en el servidor, la promesa pasa a ser "se procesa, nunca se guarda", y la interfaz lo debe decir.

## 4. Simsheets y parámetros

0. **Un Simbook nuevo empieza en Borrador inicial.** Aún no tiene Simsheets; la primera ejecución crea Simsheet 1 y congela la línea base. El borrador inicial puede guardarse y recuperarse.
1. **Cada Simsheet congela sus parámetros.** Una Simsheet es una fotografía: los parámetros exactos que usó, sus resultados, quién la ejecutó y cuándo. Una vez creada, nada la modifica.
2. **Simsheet 1 es la original.** Todas las demás se rastrean hasta ella.
3. **Seleccionar una Simsheet muestra sus parámetros.** Al hacer clic en una Simsheet, las pestañas de parámetros (Despacho Horario, Nivel de Demanda, Costos…) muestran los valores que esa Simsheet usó. Cada campo distinto de Simsheet 1 se marca con el valor original al lado (por ejemplo "39 → 42 buses"), y un resumen "Cambios vs. Simsheet 1" los lista todos.
4. **Editar crea un borrador.** Como las Simsheets no cambian, editar un parámetro abre una pestaña de borrador ("Borrador, sin ejecutar") a partir de la Simsheet en la que se estaba. Las pestañas de parámetros siempre indican si muestran una Simsheet congelada o el borrador.
5. **Ejecutar convierte el borrador en la siguiente Simsheet.** La primera ejecución crea Simsheet 1; las posteriores agregan Simsheet N sin sustituir corridas anteriores. "Ejecutar simulación" congela el borrador como Simsheet N, con sus cambios contra Simsheet 1.
6. **Se puede ejecutar sin cambios.** Da una Simsheet nueva con la lista de cambios vacía. Tiene sentido: la simulación es aleatoria, así que varias corridas con los mismos parámetros muestran cuánto varían los resultados.

7. **Monte Carlo no multiplica pestañas.** Un experimento de miles de iteraciones produce una sola Simsheet con la configuración, semilla cuando corresponda, resultados y estadísticas relevantes. Deben conservarse la versión del motor y los datos necesarios para reproducir la ejecución.

**Cómo se guardan los cambios:** cada Simsheet guarda sus parámetros completos, y los cambios contra Simsheet 1 se calculan al mostrarlos. Guardar solo los cambios haría que una entrada dañada rompiera todas las corridas siguientes.

## 5. El formato `.simbook`

- Por dentro es texto legible (JSON): la copia de configuración inicial, el borrador pendiente si existe, los parámetros congelados completos de cada Simsheet con la fuente de cada valor (referencia pública, estimado, verificado por operador, copiado o sin dato; unidad, fecha y documento de origen), resultados y estadísticas, quién la ejecutó y cuándo, configuración de ejecución (método, motor, versión, semilla si aplica) y un **número de versión del formato** para migrar archivos futuros.
- Si los archivos crecen, se pueden comprimir (como hace `.xlsx`) sin cambiar nada para el usuario.
- **Excel es una exportación, no el archivo de trabajo.** El botón Exportar → Excel de la cinta genera un `.xlsx` normal con los resultados de la Simsheet actual, para imprimir o enviar.
- Windows no reconoce `.simbook`: se abre desde la aplicación. Más adelante, si BusLab se instala como aplicación en Chrome o Edge, puede registrarse para abrir estos archivos con doble clic.

## 6. Abrir y guardar sin pagar APIs

Todo ocurre en el navegador del usuario: la página habla directamente con su computadora o con su nube. Nuestro servidor solo entrega la página. Los permisos de acceso a la nube quedan en el navegador del usuario y nunca llegan a nuestro servidor.

| Origen | Cómo | Costo |
|---|---|---|
| Computadora local (Chrome, Edge) | Abrir un archivo y guardar sobre el mismo archivo, como una aplicación de escritorio. La página puede recordar los archivos recientes (lista "Locales" de la barra lateral). | Gratis, sin API |
| Computadora local (Firefox, Safari) | Diálogo normal para abrir; guardar descarga el archivo. | Gratis, sin API |
| Google Drive | Proyecto de Google Cloud, pantalla de inicio de sesión y selector de archivos de Google. Pedir solo el permiso `drive.file` (solo los archivos que el usuario abre o crea con BusLab). | Gratis |
| OneDrive | Registro de la aplicación en Azure de Microsoft, inicio de sesión de Microsoft y selector de archivos de OneDrive. | Gratis |
| Dropbox | Clave de aplicación y los botones Chooser/Saver de Dropbox. | Gratis |

- **Permiso de Google Drive:** pedir acceso a todo el Drive del usuario obligaría a una auditoría de seguridad pagada. Con `drive.file` basta una revisión liviana de la pantalla de inicio de sesión. Mientras no esté revisada, Google muestra un aviso de "aplicación no verificada" y permite hasta 100 usuarios, suficiente para la hackathon.
- Las tres nubes se conectan a través del mismo adaptador (listar, abrir, guardar), para que la barra lateral las trate igual.

## 7. Compartir un Simbook

- Dos personas comparten un escenario compartiendo el archivo, como cualquier hoja de cálculo: la misma carpeta de Google Drive u OneDrive, o enviándolo por correo. BusLab no necesita su propio sistema para compartir.
- El Simbook es autosuficiente: quien lo abre obtiene exactamente el mismo escenario.
- **Dos personas guardando a la vez:** sin protección, el último en guardar borra el trabajo del otro sin aviso. Google Drive y OneDrive indican si el archivo cambió desde que se abrió, así que antes de guardar BusLab revisa y avisa, por ejemplo: "Carlos guardó una versión más nueva a las 10:42. ¿Recargar, guardar como copia o sobrescribir?"
- Para empezar basta ese aviso. Más adelante se podrían combinar las Simsheets de ambas personas en un solo archivo, porque cada corrida es una entrada independiente.

## 8. Requisitos antes de construir

- **HTTPS en site5.** Hoy site5 es `http://`. El inicio de sesión de Google y Microsoft, y abrir y guardar en el mismo archivo local, solo funcionan en páginas `https://` (o `localhost` durante el desarrollo). Site2 ya tiene dirección `https://`, así que probablemente SmarterASP también puede servir site5 con HTTPS; hay que confirmarlo.
- **Registros gratuitos** en Google Cloud, Azure de Microsoft y Dropbox.

## 9. Orden de trabajo

1. Formato `.simbook` y Abrir / Guardar / Guardar como con archivos locales, reemplazando los botones de maqueta. Simsheets congeladas, borrador inicial y cambios contra Simsheet 1. Integrar el [asistente Nuevo Simbook](./asistente-nuevo-simbook.md), parámetros guardados localmente y recuperación desde Simbook.
2. Google Drive.
3. OneDrive.
4. Dropbox (opcional; es el más sencillo).
