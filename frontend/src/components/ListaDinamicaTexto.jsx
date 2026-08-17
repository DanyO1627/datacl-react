// Lista dinámica de items de texto libre, uno por bloque, con agregar/quitar.
// Mismo patrón de interacción que BloqueDatoTratado.jsx (R8.4) pero con un
// solo campo por bloque en vez de 4 — generalizado en R9.6 porque este es el
// segundo lugar que lo necesita (el primero fue datos_tratados en Paso1).
//
// Controlado: el padre es dueño del array de strings y recibe la lista
// completa ya actualizada en cada cambio (no expone índices al padre).

export default function ListaDinamicaTexto({ items, onChange, placeholder, textoBoton, rows = 2 }) {
  function actualizar(index, valor) {
    const copia = [...items];
    copia[index] = valor;
    onChange(copia);
  }

  function agregar() {
    onChange([...items, ""]);
  }

  function eliminar(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="lista-dinamica-texto">
      {items.map((valor, index) => (
        <div key={index} className="p1-bloque-dato">
          <div className="p1-bloque-dato-header">
            <span className="p1-bloque-dato-numero">{index + 1}</span>
            <button type="button" className="p1-bloque-dato-eliminar" onClick={() => eliminar(index)}>
              Eliminar
            </button>
          </div>
          <textarea
            className="p1-textarea"
            placeholder={placeholder}
            value={valor}
            onChange={(e) => actualizar(index, e.target.value)}
            rows={rows}
          />
        </div>
      ))}

      <button type="button" className="p1-bloque-dato-agregar" onClick={agregar}>
        {textoBoton}
      </button>
    </div>
  );
}
