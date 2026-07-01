import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BarraLateral from "../components/BarraLateral";
import { useFormulario } from "../context/FormularioContext";
import "../styles/ConexionBD.css";

// ── SQL de instrucciones por motor ────────────────────────────────────────
const SQL_INSTRUCCIONES = {
  mysql: `CREATE USER 'datacl_reader'@'%' IDENTIFIED BY 'tu_contraseña';
GRANT SELECT ON information_schema.* TO 'datacl_reader'@'%';
FLUSH PRIVILEGES;`,
  postgresql: `CREATE USER datacl_reader WITH PASSWORD 'tu_contraseña';
GRANT CONNECT ON DATABASE tu_base TO datacl_reader;
GRANT USAGE ON SCHEMA public TO datacl_reader;`,
  sqlserver: `CREATE USER datacl_reader WITH PASSWORD 'tu_contraseña';
GRANT CONNECT ON DATABASE tu_base TO datacl_reader;
GRANT USAGE ON SCHEMA public TO datacl_reader;`,
};

const PUERTOS_DEFAULT = { mysql: 3306, postgresql: 5432, sqlserver: 1433 };

// ── Pantalla 1: Instrucciones de permisos ────────────────────────────────
function PantallaInstrucciones({ onContinuar }) {
  const [motorActivo, setMotorActivo] = useState("mysql");
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    await navigator.clipboard.writeText(SQL_INSTRUCCIONES[motorActivo]);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <>
      <h1 className="cbd-titulo">Antes de conectarte</h1>
      <p className="cbd-subtitulo">
        Crea un usuario de solo lectura en tu base de datos para que DataCL
        pueda leer los nombres de columnas
      </p>

      <div className="cbd-alerta">
        <span className="cbd-alerta-icono">ℹ️</span>
        <span>
          DataCL nunca accede a tus datos ni guarda tus credenciales.
          Solo lee los nombres de tablas y columnas de tu base de datos,
          jamás el contenido de los registros.
        </span>
      </div>

      <div className="cbd-tabs">
        {["mysql", "postgresql", "sqlserver"].map((m) => (
          <button
            key={m}
            className={`cbd-tab${motorActivo === m ? " activo" : ""}`}
            onClick={() => setMotorActivo(m)}
          >
            {m === "sqlserver" ? "SQL Server" : m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <div className="cbd-codigo-wrapper">
        <pre className="cbd-codigo">{SQL_INSTRUCCIONES[motorActivo]}</pre>
        <button className="cbd-copiar-btn" onClick={copiar}>
          {copiado ? "✓ Copiado" : "⧉ copiar"}
        </button>
      </div>

      <ol className="cbd-pasos">
        <li className="cbd-paso">
          <span className="cbd-paso-num">1</span>
          <span>
            Copia y ejecuta el código anterior en tu gestor de base de datos
            (phpMyAdmin, DBeaver, terminal MySQL, etc.)
          </span>
        </li>
        <li className="cbd-paso">
          <span className="cbd-paso-num">2</span>
          <span>
            Usa el usuario <strong>datacl_reader</strong> (o el nombre que
            elegiste) y la contraseña que definiste al conectarte en el
            siguiente paso
          </span>
        </li>
        <li className="cbd-paso">
          <span className="cbd-paso-num">3</span>
          <span>
            Asegúrate de que tu base de datos acepta conexiones desde fuera si
            DataCL corre en un servidor distinto
          </span>
        </li>
      </ol>

      <div className="cbd-botones">
        <button className="cbd-btn-primario" onClick={onContinuar}>
          ya creé el usuario, continuar →
        </button>
      </div>
    </>
  );
}

// ── Pantalla 2: Formulario de conexión ──────────────────────────────────
function PantallaFormulario({ onVolver, onAnalizarDirecto }) {
  const { form: formGlobal, actualizarForm } = useFormulario();
  const conexion = formGlobal.conexionBD;

  const actualizarConexion = (cambios) => {
    actualizarForm({ conexionBD: { ...formGlobal.conexionBD, ...cambios } });
  };

  const { motor, host, puerto, base_datos, usuario, password, estado, errorMsg, tablas, tablasSelec } = conexion;

  const token = localStorage.getItem("token");

  const cambiar = (campo) => (e) => {
    const val = campo === "puerto" ? Number(e.target.value) : e.target.value;
    const cambios = { [campo]: val };
    if (campo === "motor") {
      cambios.puerto = PUERTOS_DEFAULT[e.target.value] ?? puerto;
    }
    cambios.estado = "idle";
    cambios.tablas = [];
    cambios.tablasSelec = [];
    actualizarConexion(cambios);
  };

  const formCompleto =
    host.trim() &&
    base_datos.trim() &&
    usuario.trim() &&
    puerto;

  const probarConexion = async () => {
    actualizarConexion({ estado: "probando", errorMsg: "" });
    try {
      const res = await fetch("http://localhost:8000/analizar/conexion/probar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ motor, host, puerto, base_datos, usuario, password }),
      });
      const data = await res.json();
      if (res.ok) {
        actualizarConexion({ estado: "ok", tablas: data.tablas ?? [], errorMsg: "" });
      } else {
        actualizarConexion({ estado: "error", errorMsg: data.detail ?? "Error al conectar" });
      }
    } catch {
      actualizarConexion({ estado: "error", errorMsg: "No se pudo conectar con el servidor. Verifica que el backend esté corriendo." });
    }
  };

  const irADiccionario = async () => {
    if (!tablasSelec.length) return;
    actualizarConexion({ estado: "cargando_columnas", errorMsg: "" });
    try {
      const res = await fetch("http://localhost:8000/analizar/conexion/columnas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ motor, host, puerto, base_datos, usuario, password, tablas: tablasSelec }),
      });
      const data = await res.json();
      if (res.ok) {
        actualizarConexion({ estado: "ok", columnasTablas: data.columnas, diccionarioColumnas: {}, paso: 3 });
      } else {
        actualizarConexion({ estado: "ok", errorMsg: data.detail ?? "Error al obtener columnas" });
      }
    } catch {
      actualizarConexion({ estado: "ok", errorMsg: "No se pudo conectar con el servidor." });
    }
  };

  return (
    <>
      <h1 className="cbd-titulo">Conectar a base de datos</h1>
      <p className="cbd-subtitulo">
        Ingresa las credenciales del usuario de solo lectura que creaste en el
        paso anterior
      </p>

      <div className="cbd-card">
        <div className="cbd-grid2">
          <div className="cbd-field">
            <label className="cbd-label">Motor de base de datos</label>
            <select className="cbd-select" value={motor} onChange={cambiar("motor")}>
              <option value="mysql">MySQL</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="sqlserver">SQL Server</option>
            </select>
          </div>
          <div className="cbd-field">
            <label className="cbd-label">Nombre de la base de datos</label>
            <input className="cbd-input" placeholder="mi_base_de_datos" value={base_datos} onChange={cambiar("base_datos")} />
          </div>
        </div>

        <div className="cbd-grid2">
          <div className="cbd-field">
            <label className="cbd-label">Host</label>
            <input className="cbd-input" placeholder="192.168.1.100" value={host} onChange={cambiar("host")} />
          </div>
          <div className="cbd-field">
            <label className="cbd-label">Puerto</label>
            <input className="cbd-input" type="number" value={puerto} onChange={cambiar("puerto")} />
          </div>
        </div>

        <div className="cbd-grid2">
          <div className="cbd-field">
            <label className="cbd-label">Usuario</label>
            <input className="cbd-input" placeholder="datacl_reader" value={usuario} onChange={cambiar("usuario")} autoComplete="off" />
          </div>
          <div className="cbd-field">
            <label className="cbd-label">Contraseña</label>
            <input className="cbd-input" type="password" placeholder="••••••••" value={password} onChange={cambiar("password")} autoComplete="new-password" />
          </div>
        </div>

        <button
          className="cbd-btn-primario"
          style={{ marginTop: "1rem" }}
          onClick={probarConexion}
          disabled={!formCompleto || estado === "probando" || estado === "cargando_columnas"}
        >
          {estado === "probando" ? (
            <><span className="cbd-spinner" /> Probando...</>
          ) : (
            "⟳ Probar conexión"
          )}
        </button>

        {estado === "ok" && (
          <div className="cbd-estado-ok">
            ✓ Conexión exitosa — {tablas.length} tabla{tablas.length !== 1 ? "s" : ""} encontrada{tablas.length !== 1 ? "s" : ""}
          </div>
        )}
        {(estado === "error" || (errorMsg && estado === "ok")) && (
          <div className="cbd-estado-error">
            <span>⚠</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {estado === "ok" && tablas.length > 0 && (
          <div style={{ marginTop: "1.4rem" }}>
            <p className="cbd-label" style={{ marginBottom: "8px" }}>
              Selecciona las tablas a analizar
              {tablasSelec.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: "#052659", background: "#dbeafe", borderRadius: 20, padding: "2px 10px" }}>
                  {tablasSelec.length} seleccionada{tablasSelec.length !== 1 ? "s" : ""}
                </span>
              )}
            </p>
            <div className="cbd-tablas-grid">
              {tablas.map((t) => (
                <button
                  key={t}
                  className={`cbd-tabla-chip${tablasSelec.includes(t) ? " seleccionada" : ""}`}
                  onClick={() => {
                    const next = tablasSelec.includes(t)
                      ? tablasSelec.filter((x) => x !== t)
                      : [...tablasSelec, t];
                    actualizarConexion({ tablasSelec: next });
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="cbd-nota-privacidad">
          <span>🔒</span>
          <span>
            DataCL no guarda tus credenciales. La conexión se abre y cierra en el
            momento del análisis. Solo se leen los nombres de tablas y columnas —
            nunca el contenido de tus registros.
          </span>
        </div>
      </div>

      <div className="cbd-botones">
        <button className="cbd-btn-secundario" onClick={onVolver}>
          ← Instrucciones de permisos
        </button>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="cbd-btn-secundario"
            onClick={onAnalizarDirecto}
            disabled={!tablasSelec.length || estado === "cargando_columnas"}
          >
            Analizar directo →
          </button>
          <button
            className="cbd-btn-primario"
            onClick={irADiccionario}
            disabled={!tablasSelec.length || estado === "cargando_columnas"}
          >
            {estado === "cargando_columnas" ? (
              <><span className="cbd-spinner" /> Cargando...</>
            ) : (
              "Describir columnas →"
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Pantalla 3: Diccionario de columnas ──────────────────────────────────
function PantallaDiccionario({ onVolver, onAnalizar }) {
  const { form: formGlobal, actualizarForm } = useFormulario();
  const conexion = formGlobal.conexionBD;
  const { columnasTablas, diccionarioColumnas, estado } = conexion;

  const actualizarConexion = (cambios) => {
    actualizarForm({ conexionBD: { ...formGlobal.conexionBD, ...cambios } });
  };

  const actualizarDescripcion = (clave, valor) => {
    actualizarConexion({
      diccionarioColumnas: { ...diccionarioColumnas, [clave]: valor },
    });
  };

  const descripciones = Object.values(diccionarioColumnas).filter((v) => v.trim()).length;

  const tablasUnicas = [...new Set(columnasTablas.map((c) => c.tabla_origen))];

  return (
    <>
      <h1 className="cbd-titulo">Diccionario de columnas</h1>
      <p className="cbd-subtitulo">
        Si tus columnas tienen nombres técnicos, agrega una descripción para
        mejorar la clasificación. Este paso es opcional.
      </p>

      <div className="cbd-alerta">
        <span className="cbd-alerta-icono">💡</span>
        <span>
          Ejemplo: si una columna se llama <strong>usr_nm</strong>, escribe
          "Nombre del usuario" para que DataCL la clasifique correctamente como
          dato personal.
        </span>
      </div>

      <div className="cbd-card">
        <div className="cbd-dic-resumen">
          <span>{columnasTablas.length} columna{columnasTablas.length !== 1 ? "s" : ""}</span>
          <span className="cbd-dic-sep">·</span>
          <span>{tablasUnicas.length} tabla{tablasUnicas.length !== 1 ? "s" : ""}</span>
          {descripciones > 0 && (
            <>
              <span className="cbd-dic-sep">·</span>
              <span className="cbd-dic-descritas">{descripciones} descrita{descripciones !== 1 ? "s" : ""}</span>
            </>
          )}
        </div>

        <div className="cbd-dic-tabla-wrapper">
          <table className="cbd-dic-tabla">
            <thead>
              <tr>
                <th>Columna</th>
                <th>Tabla</th>
                <th>Descripción (opcional)</th>
              </tr>
            </thead>
            <tbody>
              {columnasTablas.map((col, i) => (
                <tr key={`${col.tabla_origen}-${col.nombre}-${i}`}>
                  <td className="cbd-dic-col-nombre">
                    <code>{col.nombre}</code>
                    {diccionarioColumnas[`${col.tabla_origen}__${col.nombre}`]?.trim() && (
                      <small className="cbd-dic-preview">
                        {diccionarioColumnas[`${col.tabla_origen}__${col.nombre}`]}
                      </small>
                    )}
                  </td>
                  <td className="cbd-dic-col-tabla">
                    <span className="cbd-dic-tabla-badge">{col.tabla_origen}</span>
                  </td>
                  <td>
                    <input
                      className="cbd-dic-input"
                      placeholder="Ej: Nombre del usuario"
                      value={diccionarioColumnas[`${col.tabla_origen}__${col.nombre}`] || ""}
                      onChange={(e) => actualizarDescripcion(`${col.tabla_origen}__${col.nombre}`, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cbd-botones">
        <button className="cbd-btn-secundario" onClick={onVolver}>
          ← Volver
        </button>
        <button
          className="cbd-btn-primario"
          onClick={onAnalizar}
          disabled={estado === "analizando"}
        >
          {estado === "analizando" ? (
            <><span className="cbd-spinner" /> Analizando...</>
          ) : (
            "Analizar columnas →"
          )}
        </button>
      </div>
    </>
  );
}

// ── Componente principal ─────────────────────────────────────────────────
export default function ConexionBD() {
  const navigate = useNavigate();
  const { form, actualizarForm } = useFormulario();
  const paso = form.conexionBD.paso; // 1 = instrucciones, 2 = formulario, 3 = diccionario
  const setPaso = (p) => actualizarForm({ conexionBD: { ...form.conexionBD, paso: p } });

  const conexion = form.conexionBD;
  const token = localStorage.getItem("token");

  const handleAnalisis = (resultado) => {
    const { motor, tablasSelec } = conexion;
    navigate("/resultados-analisis", {
      state: {
        ...resultado,
        fuente: "bd",
        nombre: tablasSelec.join(", "),
        motor,
      },
    });
  };

  const analizarConDiccionario = async () => {
    const { motor, host, puerto, base_datos, usuario, password, tablasSelec, diccionarioColumnas } = conexion;
    actualizarForm({ conexionBD: { ...conexion, estado: "analizando", errorMsg: "" } });

    const dicLimpio = {};
    for (const [clave, v] of Object.entries(diccionarioColumnas)) {
      if (!v.trim()) continue;
      const nombre = clave.includes("__") ? clave.split("__").slice(1).join("__") : clave;
      dicLimpio[nombre] = v.trim();
    }

    try {
      const res = await fetch("http://localhost:8000/analizar/conexion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          motor, host, puerto, base_datos, usuario, password,
          tablas: tablasSelec,
          diccionario: Object.keys(dicLimpio).length > 0 ? dicLimpio : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const enriquecer = (campos) => (campos ?? []).map((c) => {
          const desc = diccionarioColumnas[`${c.tabla_origen}__${c.nombre_columna}`]?.trim();
          return desc ? { ...c, descripcion: desc } : c;
        });
        handleAnalisis({
          ...data,
          detectados: enriquecer(data.detectados),
          pendientes: enriquecer(data.pendientes),
        });
      } else {
        actualizarForm({ conexionBD: { ...conexion, estado: "ok", errorMsg: data.detail ?? "Error al analizar" } });
      }
    } catch {
      actualizarForm({ conexionBD: { ...conexion, estado: "ok", errorMsg: "No se pudo conectar con el servidor." } });
    }
  };

  const analizarDirecto = async () => {
    const { motor, host, puerto, base_datos, usuario, password, tablasSelec } = conexion;
    actualizarForm({ conexionBD: { ...conexion, estado: "analizando", errorMsg: "" } });
    try {
      const res = await fetch("http://localhost:8000/analizar/conexion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ motor, host, puerto, base_datos, usuario, password, tablas: tablasSelec }),
      });
      const data = await res.json();
      if (res.ok) {
        handleAnalisis(data);
      } else {
        actualizarForm({ conexionBD: { ...conexion, estado: "ok", errorMsg: data.detail ?? "Error al analizar" } });
      }
    } catch {
      actualizarForm({ conexionBD: { ...conexion, estado: "ok", errorMsg: "No se pudo conectar con el servidor." } });
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "linear-gradient(160deg, #C1E8FF 0%, #e8f4ff 40%, #f0f8ff 100%)" }}>

      <BarraLateral />

      <main style={{ flex: 1, padding: "2.5rem 2.5rem 2.5rem 2rem", maxWidth: "860px" }}>
        {paso === 1 && (
          <PantallaInstrucciones
            onContinuar={() => setPaso(2)}
          />
        )}
        {paso === 2 && (
          <PantallaFormulario
            onVolver={() => setPaso(1)}
            onAnalizarDirecto={analizarDirecto}
          />
        )}
        {paso === 3 && (
          <PantallaDiccionario
            onVolver={() => setPaso(2)}
            onAnalizar={analizarConDiccionario}
          />
        )}
      </main>

    </div>
  );
}