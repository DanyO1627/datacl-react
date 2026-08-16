// Barra de progreso nueva, la comparten los 4 pasos del formulario de tratamiento. 
// antes se duplicaba en cada paso, ahora es un componente. Y usa el css que estaba antes de cada paso.

export default function BarraProgreso({ pasoActual, prefix, pasos }) {
  const nombresPasos = pasos || [
    "Identificación",
    "Datos y titulares",
    "Transferencias y sistemas",
    "Principios y riesgos",
  ];

  return (
    <div className={`${prefix}-progreso`}>
      {nombresPasos.map((nombre, i) => {
        const num = i + 1;
        const activo = num === pasoActual;
        const completado = num < pasoActual;
        return (
          <div key={i} className={`${prefix}-progreso-item`}>
            <div className={`${prefix}-paso-burbuja ${activo ? "activo" : ""} ${completado ? "completado" : ""}`}>
              {completado ? "✓" : num}
            </div>
            <span className={`${prefix}-paso-nombre ${activo ? "activo" : ""}`}>{nombre}</span>
            {i < nombresPasos.length - 1 && (
              <div className={`${prefix}-paso-linea ${completado ? "completada" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
