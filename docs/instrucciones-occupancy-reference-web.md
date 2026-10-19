# Instrucciones: Occupancy Reference Web

**Fecha:** 6 de octubre de 2026 · **Autor:** Guillermo Jimenez

---

## 1. Qué hay en el repo

**Repositorio:** [github.com/lg061870/traffic-vision-poc](https://github.com/lg061870/traffic-vision-poc)

Usted va a trabajar en **`occupancy-reference-web`**, una app de React + Vite (mapa, lista de buses y detalle del bus). Aquí se escribe todo el código. Vite es la herramienta que ejecuta la app en desarrollo y la empaqueta para publicarla.

| Proyecto | Qué es | Cuándo se usa |
|---|---|---|
| `occupancy-reference-web` | La app (React + Vite) | **Siempre:** aquí se desarrolla |
| `Innova.Occupancy.Map` | Sitio ASP.NET Core mínimo que sirve la app ya compilada | Solo para publicar en el servidor |

> `Innova.Occupancy.Map` no tiene lógica propia ni API; no necesita tocarlo para desarrollar.

## 2. Requisitos

- **Git** 2.25 o superior (verifíquelo con `git --version`)
- **Node.js**, versión LTS: [nodejs.org](https://nodejs.org)
- **Visual Studio 2022** o superior, con la carga de trabajo *"Desarrollo de ASP.NET y web"*

## 3. Clonar solo las carpetas necesarias

Estos comandos descargan únicamente las dos carpetas que necesita, no el repositorio completo:

```bash
git clone --filter=blob:none --sparse https://github.com/lg061870/traffic-vision-poc.git
cd traffic-vision-poc
git sparse-checkout set src/occupancy-reference-web src/Innova.Occupancy.Map
```

Para traer cambios nuevos más adelante, ejecute `git pull`.

## 4. Configurar la variable de entorno `API_URL`

La app usa `API_URL` para saber a qué API conectarse. Para trabajar contra la API publicada, configúrela de forma permanente con una de estas dos opciones.

### Opción 1: desde la terminal

```bat
setx API_URL "https://lg0618pp-002-site2.htempurl.com"
```

### Opción 2: desde Windows

1. Presione **Win** y busque *"variables de entorno"*.
2. Abra **"Editar las variables de entorno de esta cuenta"**.
3. En **Variables de usuario**, haga clic en **Nueva…**
4. Nombre: `API_URL`
5. Valor: `https://lg0618pp-002-site2.htempurl.com`
6. Haga clic en **Aceptar**.

> **Importante:** cierre y vuelva a abrir cualquier terminal y Visual Studio. Los programas que ya estaban abiertos no ven la variable nueva.

Para verificar, abra una terminal nueva y ejecute el comando de abajo. Debe mostrar la dirección de la API publicada.

```bat
echo %API_URL%
```

## 5. Ejecutar la app en Visual Studio

1. Abra la solución **`5GHackthonInnova.sln`**, en la raíz del repo. Como clonó solo algunas carpetas, los demás proyectos aparecen como *"no disponibles"*. Es normal y puede ignorarlo.
2. En el **Explorador de soluciones**, haga clic derecho en `occupancy-reference-web` y elija **"Establecer como proyecto de inicio"**. No use `Innova.Occupancy.Map`, porque ese proyecto es solo para publicar.
3. Presione **F5**. La primera vez, Visual Studio ejecuta `npm install`, lo cual puede tardar unos minutos. Luego ejecuta `npm run dev` y abre el navegador en <http://localhost:5174>.
4. Verifique que el mapa muestre los buses. Si aparece un error de conexión, revise que `API_URL` esté bien definida y reinicie Visual Studio.

**Alternativa sin Visual Studio:** en una terminal, ejecute:

```bat
cd src\occupancy-reference-web
npm install
npm run dev
```

## 6. Volver a la API local (opcional)

Si más adelante necesita trabajar con la API en su propia máquina:

1. Agregue la carpeta de la API al clon:

   ```bash
   git sparse-checkout add src/Innova.Occupancy.Api
   ```

2. Borre la variable `API_URL`, desde la ventana de variables de entorno o con (PowerShell):

   ```powershell
   [Environment]::SetEnvironmentVariable("API_URL", $null, "User")
   ```

3. Reinicie Visual Studio y ejecute también el proyecto `Innova.Occupancy.Api`.

## Notas

- La app solo lee datos de la API, así que no hay riesgo de modificar nada al probar contra la API publicada.
- Para publicar la app en el servidor: clic derecho en `Innova.Occupancy.Map` → **Publish…**
