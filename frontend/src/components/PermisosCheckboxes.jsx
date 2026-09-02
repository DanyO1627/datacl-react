// Checkboxes de permisos granulares por módulo (R10.2/R10.6) — reutilizado en
// el formulario de creación de usuario y en el modal de editar permisos de
// Perfil.jsx, para no duplicar la grilla ni la regla de dependencia dos veces.
//
// Regla de dependencia: marcar "Crear"/"Editar" (o "Generar"/"Eliminar" en
// Informes) marca y bloquea el "Ver" del mismo módulo — no tiene sentido
// poder crear o editar algo que no se puede ver.

const MODULOS = [
  {
    titulo: "Tratamientos",
    campoVer: "tratamientos_ver",
    dependeDe: ["tratamientos_crear", "tratamientos_editar"],
    campos: [
      { campo: "tratamientos_ver", etiqueta: "Ver" },
      { campo: "tratamientos_crear", etiqueta: "Crear" },
      { campo: "tratamientos_editar", etiqueta: "Editar" },
    ],
  },
  {
    titulo: "Informes",
    campoVer: "informes_ver",
    dependeDe: ["informes_generar", "informes_eliminar"],
    campos: [
      { campo: "informes_ver", etiqueta: "Ver" },
      { campo: "informes_generar", etiqueta: "Generar" },
      { campo: "informes_eliminar", etiqueta: "Eliminar" },
    ],
  },
  {
    titulo: "Riesgos",
    campoVer: null,
    dependeDe: [],
    campos: [
      { campo: "riesgos_ver", etiqueta: "Ver" },
    ],
  },
];

export default function PermisosCheckboxes({ permisos, onChange }) {
  function toggle(campo) {
    const nuevoValor = !permisos[campo];
    const siguiente = { ...permisos, [campo]: nuevoValor };

    // Si lo que se acaba de marcar es un "crear/editar/generar/eliminar",
    // fuerza el "ver" de su mismo módulo a true.
    for (const modulo of MODULOS) {
      if (modulo.campoVer && modulo.dependeDe.includes(campo) && nuevoValor) {
        siguiente[modulo.campoVer] = true;
      }
    }

    onChange(siguiente);
  }

  return (
    <div className="permisos-grid">
      {MODULOS.map((modulo) => (
        <div key={modulo.titulo} className="permisos-modulo">
          <span className="permisos-modulo-titulo">{modulo.titulo}</span>
          <div className="permisos-modulo-checks">
            {modulo.campos.map(({ campo, etiqueta }) => {
              const bloqueado =
                modulo.campoVer === campo &&
                modulo.dependeDe.some((c) => permisos[c]);
              return (
                <label key={campo} className="permiso-check">
                  <input
                    type="checkbox"
                    checked={!!permisos[campo]}
                    disabled={bloqueado}
                    onChange={() => toggle(campo)}
                  />
                  <span>{etiqueta}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
