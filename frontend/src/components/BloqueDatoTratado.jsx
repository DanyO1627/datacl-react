// Bloque repetible de "descripción detallada" (R8.4, RAT CEDCA).
// Un tratamiento puede tener varias categorías de dato, cada una con su
// propia explicación de qué se trata, para qué y cómo.
//
// OJO: "categoria_dato" acá es texto libre narrativo escrito por el usuario
// (ej. "Datos personales de identificación"), NO tiene relación con las
// categorías de datos con checkboxes y detección automática de Paso2.jsx
// (nombre_apellido, rut_dni, etc.) — son dos conceptos distintos del modelo.

export default function BloqueDatoTratado({ bloque, index, onChange, onEliminar }) {
  function handle(campo) {
    return (e) => onChange(index, campo, e.target.value);
  }

  return (
    <div className="p1-bloque-dato">
      <div className="p1-bloque-dato-header">
        <span className="p1-bloque-dato-numero">Bloque {index + 1}</span>
        <button
          type="button"
          className="p1-bloque-dato-eliminar"
          onClick={() => onEliminar(index)}
        >
          Eliminar este bloque
        </button>
      </div>

      <div className="p1-campo">
        <label className="p1-label" htmlFor={`categoria_dato_${index}`}>
          ¿Qué tipo de dato es? (descríbelo con tus palabras)
        </label>
        <input
          id={`categoria_dato_${index}`}
          type="text"
          className="p1-input"
          placeholder="Ej: Datos personales de identificación"
          value={bloque.categoria_dato}
          onChange={handle("categoria_dato")}
          maxLength={200}
        />
      </div>

      <div className="p1-campo">
        <label className="p1-label" htmlFor={`se_tratan_${index}`}>¿Qué se trata?</label>
        <textarea
          id={`se_tratan_${index}`}
          className="p1-textarea"
          placeholder="Ej: Nombre completo, RUT, fecha de nacimiento"
          value={bloque.se_tratan}
          onChange={handle("se_tratan")}
          rows={2}
        />
      </div>

      <div className="p1-campo">
        <label className="p1-label" htmlFor={`para_que_${index}`}>¿Para qué?</label>
        <textarea
          id={`para_que_${index}`}
          className="p1-textarea"
          placeholder="Ej: Identificar al titular dentro del sistema"
          value={bloque.para_que}
          onChange={handle("para_que")}
          rows={2}
        />
      </div>

      <div className="p1-campo">
        <label className="p1-label" htmlFor={`como_${index}`}>¿Cómo?</label>
        <textarea
          id={`como_${index}`}
          className="p1-textarea"
          placeholder="Ej: Ingreso manual en formulario de registro"
          value={bloque.como}
          onChange={handle("como")}
          rows={2}
        />
      </div>
    </div>
  );
}
