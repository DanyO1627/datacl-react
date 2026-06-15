import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BarraLateral from "../components/BarraLateral";
import { useFormulario } from "../context/FormularioContext";
import "../styles/ingresoManual.css";

/* ─── Catálogo de categorías y campos típicos ────────────────── */
const CATEGORIAS = [
  {
    id: "identificatorios",
    nombre: "Identificatorios",
    sensible: false,
    campos: [
      "Nombre completo",
      "Apellido paterno",
      "Apellido materno",
      "RUT / RUN",
      "Número de pasaporte",
      "Fecha de nacimiento",
      "Edad",
      "Sexo / Género",
      "Nacionalidad",
    ],
  },
  {
    id: "contacto",
    nombre: "Contacto",
    sensible: false,
    campos: [
      "Correo electrónico",
      "Teléfono fijo",
      "Celular",
      "Dirección",
      "Ciudad / Comuna",
      "Región",
      "País",
    ],
  },
  {
    id: "salud",
    nombre: "Salud",
    sensible: true,
    campos: [
      "Diagnóstico médico",
      "Medicamentos",
      "Historia clínica",
      "Discapacidad",
      "Tipo de sangre",
      "Condición psicológica",
      "Condición psiquiátrica",
      "Resultado de exámenes",
    ],
  },
  {
    id: "financieros",
    nombre: "Financieros",
    sensible: false,
    campos: [
      "Cuenta bancaria",
      "AFP / Previsión",
      "Remuneración / Sueldo",
      "Ingreso líquido",
      "Número de tarjeta",
      "Datos tributarios",
    ],
  },
  {
    id: "laborales",
    nombre: "Laborales",
    sensible: false,
    campos: [
      "Cargo / Puesto",
      "Departamento / Área",
      "Fecha de ingreso",
      "Tipo de contrato",
      "Jornada laboral",
      "Supervisor",
      "Empresa",
    ],
  },
  {
    id: "academicos",
    nombre: "Académicos",
    sensible: false,
    campos: [
      "Nivel de estudios",
      "Institución educativa",
      "Título obtenido",
      "Calificaciones",
      "Número de matrícula",
    ],
  },
  {
    id: "biometricos",
    nombre: "Biométricos",
    sensible: true,
    campos: [
      "Huella dactilar",
      "Reconocimiento facial",
      "Iris ocular",
      "Voz / Audio",
      "Geometría de la mano",
    ],
  },
];

/* ─── Etiquetas RAT por categoría temática ────────────────────────
 * Los ids de CATEGORIAS coinciden con las claves de CATEGORIAS_TEMATICAS
 * en backend/app/utils/analisis.py — generar_texto_categoria() agrupa
 * por estas etiquetas (labels), no por el id.
 */
const LABEL_TEMATICA = {
  identificatorios: "Datos identificatorios",
  contacto:         "Datos de contacto",
  salud:            "Datos de salud",
  financieros:      "Datos financieros",
  laborales:        "Datos laborales",
  academicos:       "Datos académicos",
  biometricos:      "Datos biométricos",
};

/* ─── Componente principal ───────────────────────────────────── */
export default function IngresoManual() {
  const navigate = useNavigate();
  const { form, actualizarForm } = useFormulario();

  /* seleccionados: Set de claves "catId::nombreColumna" */
  /* abiertos: secciones abiertas */
  /* personalizados: campos personalizados por categoría { catId: string[] } */
  /* inputCustom: texto del input personalizado por categoría */
  const { seleccionados, abiertos, personalizados, inputCustom } = form.ingresoManual;

  const [guardando, setGuardando] = useState(false);

  function actualizarIngreso(cambios) {
    actualizarForm({ ingresoManual: { ...form.ingresoManual, ...cambios } });
  }

  /* ── Helpers ─────────────────────────────────────────────────── */
  function clave(catId, nombre) { return `${catId}::${nombre}`; }

  function toggleCampo(catId, nombre) {
    const next = new Set(seleccionados);
    const k = clave(catId, nombre);
    if (next.has(k)) next.delete(k); else next.add(k);
    actualizarIngreso({ seleccionados: next });
  }

  function toggleSeccion(catId) {
    const next = new Set(abiertos);
    if (next.has(catId)) next.delete(catId); else next.add(catId);
    actualizarIngreso({ abiertos: next });
  }

  function seleccionadosDeCat(cat) {
    const todos = todosLosCampos(cat);
    return todos.filter((n) => seleccionados.has(clave(cat.id, n))).length;
  }

  function todosLosCampos(cat) {
    return [...cat.campos, ...(personalizados[cat.id] || [])];
  }

  function agregarCampoCustom(catId) {
    const texto = (inputCustom[catId] || "").trim();
    if (!texto) return;
    const nuevosSeleccionados = new Set(seleccionados);
    nuevosSeleccionados.add(clave(catId, texto));
    actualizarIngreso({
      personalizados: { ...personalizados, [catId]: [...(personalizados[catId] || []), texto] },
      seleccionados: nuevosSeleccionados,
      inputCustom: { ...inputCustom, [catId]: "" },
    });
  }

  /* ── Construir array de campos para el backend ───────────────── */
  function construirCampos() {
    const campos = [];
    for (const cat of CATEGORIAS) {
      const tipo = cat.sensible ? "SENSIBLE" : "PERSONAL";
      for (const nombre of todosLosCampos(cat)) {
        if (seleccionados.has(clave(cat.id, nombre))) {
          campos.push({ nombre_columna: nombre, tipo, categoria_tematica: LABEL_TEMATICA[cat.id] || "Otros" });
        }
      }
    }
    return campos;
  }

  const totalSeleccionados = seleccionados.size;

  /* ── Continuar ───────────────────────────────────────────────── */
  async function handleContinuar() {
    const campos = construirCampos();
    if (campos.length === 0) return;
    setGuardando(true);
    const token = localStorage.getItem("token");
    try {
      await fetch("http://localhost:8000/sesiones", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          fuente: "manual",
          columnas_json: campos,
        }),
      });
    } catch {
      /* El endpoint puede no existir aún — navegamos igualmente */
    } finally {
      setGuardando(false);
    }
    navigate("/resultados-analisis", { state: { detectados: campos, pendientes: [] } });
  }

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="im-layout">
      <BarraLateral />

      <main className="im-main">

        {/* ── Header ── */}
        <div className="im-header">
          <div>
            <h1>Ingreso manual de campos</h1>
            <p>Selecciona los tipos de datos que utiliza esta actividad</p>
          </div>
          <span className={`im-contador-badge ${totalSeleccionados > 0 ? "im-contador-badge--ok" : ""}`}>
            {totalSeleccionados} campo{totalSeleccionados !== 1 ? "s" : ""} seleccionado{totalSeleccionados !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Instrucción ── */}
        <div className="im-instruccion">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Marca los campos de datos personales que se utilizan en esta actividad. Puedes añadir campos propios al final de cada categoría.
        </div>

        {/* ── Secciones colapsables ── */}
        <div className="im-secciones">
          {CATEGORIAS.map((cat) => {
            const abierto   = abiertos.has(cat.id);
            const numSel    = seleccionadosDeCat(cat);
            const campos    = todosLosCampos(cat);
            const tipo      = cat.sensible ? "SENSIBLE" : "PERSONAL";

            return (
              <div key={cat.id} className={`im-seccion ${abierto ? "im-seccion--abierta" : ""}`}>

                {/* Cabecera clicable */}
                <div className="im-seccion-header" onClick={() => toggleSeccion(cat.id)}>
                  <div className="im-seccion-izq">
                    <span className="im-seccion-nombre">{cat.nombre}</span>
                    {cat.sensible && (
                      <span className="im-badge-sensible">Datos sensibles</span>
                    )}
                  </div>
                  <div className="im-seccion-der">
                    {numSel > 0 && (
                      <span className="im-seccion-contador">
                        {numSel} seleccionado{numSel !== 1 ? "s" : ""}
                      </span>
                    )}
                    <span className={`im-chevron ${abierto ? "im-chevron--abierto" : ""}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Cuerpo expandido */}
                {abierto && (
                  <div className="im-seccion-body">
                    {campos.map((nombre) => {
                      const marcado = seleccionados.has(clave(cat.id, nombre));
                      return (
                        <label
                          key={nombre}
                          className={`im-check-item ${marcado ? "im-check-item--marcado" : ""}`}
                        >
                          <input
                            type="checkbox"
                            className="im-check-input"
                            checked={marcado}
                            onChange={() => toggleCampo(cat.id, nombre)}
                          />
                          <span className="im-check-nombre">{nombre}</span>
                          <span className={`im-check-badge ${cat.sensible ? "im-check-badge--sensible" : ""}`}>
                            {tipo}
                          </span>
                        </label>
                      );
                    })}

                    {/* Campo personalizado */}
                    <div className="im-custom-row">
                      <input
                        className="im-custom-input"
                        placeholder="Campo personalizado..."
                        value={inputCustom[cat.id] || ""}
                        onChange={(e) =>
                          actualizarIngreso({ inputCustom: { ...inputCustom, [cat.id]: e.target.value } })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") agregarCampoCustom(cat.id);
                        }}
                        maxLength={80}
                      />
                      <button
                        className="im-custom-btn"
                        onClick={() => agregarCampoCustom(cat.id)}
                        disabled={!(inputCustom[cat.id] || "").trim()}
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer fijo ── */}
        <div className="im-footer">
          <button
            className="im-btn-volver"
            onClick={() => navigate("/subir-archivo")}
          >
            ← Volver
          </button>
          <button
            className="im-btn-continuar"
            onClick={handleContinuar}
            disabled={totalSeleccionados === 0 || guardando}
            title={totalSeleccionados === 0 ? "Selecciona al menos un campo para continuar" : ""}
          >
            {guardando
              ? "Procesando..."
              : `Continuar con ${totalSeleccionados} campo${totalSeleccionados !== 1 ? "s" : ""} →`}
          </button>
        </div>

      </main>
    </div>
  );
}
