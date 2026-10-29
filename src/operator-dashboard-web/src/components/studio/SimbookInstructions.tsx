// Shown in place of the results while a Simbook has no Simsheets yet (only its initial draft).
// Read-only on purpose: the ribbon and the parameter tabs are where the user acts.
export function SimbookInstructions() {
  return (
    <main className="sv-stage">
      <div className="sv-card sv-instructions">
        <h2>Simbook nuevo: todavía no hay Simsheets</h2>
        <p>
          Un Simbook es su libro de trabajo. Cada vez que ejecuta la simulación se agrega una Simsheet, una pestaña en la parte
          inferior con los parámetros que usó y sus resultados. Por ahora este Simbook solo tiene un borrador.
        </p>
        <ol>
          <li>
            <strong>Revise los parámetros</strong> en las pestañas Rutas y Ramales, Despacho Horario, Nivel de Demanda y Costos.
            Lo que cargó automáticamente del CTP y ARESEP es una referencia pública, y lo marcado como estimado conviene
            reemplazarlo por los datos de su empresa.
          </li>
          <li>
            <strong>Ejecute la simulación</strong> con el botón Ejecutar simulación de la cinta. La primera ejecución crea la
            Simsheet 1, la línea base: nunca cambia, y todas las demás se comparan con ella.
          </li>
          <li>
            <strong>Pruebe otras ideas</strong> cambiando parámetros y ejecutando de nuevo. Cada ejecución agrega una Simsheet
            sin borrar las anteriores.
          </li>
          <li>
            <strong>Guarde</strong> con Guardar (Ctrl+S). El archivo <code>.simbook</code> queda en su computadora; BusLab no
            guarda sus datos en sus servidores.
          </li>
        </ol>
      </div>
    </main>
  )
}
