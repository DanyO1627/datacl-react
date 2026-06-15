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
function PantallaInstrucciones({ onContinuar, onVolver }) {
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

      {/* Tabs de motor */}
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

      {/* Bloque de código */}
      <div className="cbd-codigo-wrapper">
        <pre className="cbd-codigo">{SQL_INSTRUCCIONES[motorActivo]}</pre>
        <button className="cbd-copiar-btn" onClick={copiar}>
          {copiado ? "✓ Copiado" : "⧉ copiar"}
        </button>
      </div>

      {/* Pasos */}
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
function PantallaFormulario({ onVolver, onAnalisis }) {
  const { form: formGlobal, actualizarForm } = useFormulario();
  const conexion = formGlobal.conexionBD;

  const actualizarConexion = (cambios) => {
    actualizarForm({ conexionBD: { ...formGlobal.conexionBD, ...cambios } });
  };

  const { motor, host, puerto, base_datos, usuario, password, estado, errorMsg, tablas, tablaSelec } = conexion;

  const token = localStorage.getItem("token");

  const cambiar = (campo) => (e) => {
    const val = campo === "puerto" ? Number(e.target.value) : e.target.value;
    const cambios = { [campo]: val };
    // Si cambia el motor, actualizar puerto por defecto
    if (campo === "motor") {
      cambios.puerto = PUERTOS_DEFAULT[e.target.value] ?? puerto;
    }
    // Resetear estado de prueba si el usuario edita algo
    cambios.estado = "idle";
    cambios.tablas = [];
    cambios.tablaSelec = "";
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
        actualizarConexion({ estado: "ok", tablas: data.tablas ?? [] });
      } else {
        actualizarConexion({ estado: "error", errorMsg: data.detail ?? "Error al conectar" });
      }
    } catch {
      actualizarConexion({ estado: "error", errorMsg: "No se pudo conectar con el servidor. Verifica que el backend esté corriendo." });
    }
  };

  const analizar = async () => {
    if (!tablaSelec) return;
    actualizarConexion({ estado: "analizando", errorMsg: "" });
    try {
      const res = await fetch("http://localhost:8000/analizar/conexion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ motor, host, puerto, base_datos, usuario, password, tabla: tablaSelec }),
      });
      const data = await res.json();
      if (res.ok) {
        // Navega a resultados pasando el resultado por state (mismo flujo que archivo)
        onAnalisis(data, tablaSelec, motor);
      } else {
        actualizarConexion({ estado: "ok", errorMsg: data.detail ?? "Error al analizar" }); // vuelve a estado ok para no perder la selección
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
        {/* Fila 1: motor y base de datos */}
        <div className="cbd-grid2">
          <div className="cbd-field">
            <label className="cbd-label">Motor de base de datos</label>
            <select
              className="cbd-select"
              value={motor}
              onChange={cambiar("motor")}
            >
              <option value="mysql">MySQL</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="sqlserver">SQL Server</option>
            </select>
          </div>
          <div className="cbd-field">
            <label className="cbd-label">Nombre de la base de datos</label>
            <input
              className="cbd-input"
              placeholder="mi_base_de_datos"
              value={base_datos}
              onChange={cambiar("base_datos")}
            />
          </div>
        </div>

        {/* Fila 2: host y puerto */}
        <div className="cbd-grid2">
          <div className="cbd-field">
            <label className="cbd-label">Host</label>
            <input
              className="cbd-input"
              placeholder="192.168.1.100"
              value={host}
              onChange={cambiar("host")}
            />
          </div>
          <div className="cbd-field">
            <label className="cbd-label">Puerto</label>
            <input
              className="cbd-input"
              type="number"
              value={puerto}
              onChange={cambiar("puerto")}
            />
          </div>
        </div>

        {/* Fila 3: usuario y contraseña */}
        <div className="cbd-grid2">
          <div className="cbd-field">
            <label className="cbd-label">Usuario</label>
            <input
              className="cbd-input"
              placeholder="datacl_reader"
              value={usuario}
              onChange={cambiar("usuario")}
              autoComplete="off"
            />
          </div>
          <div className="cbd-field">
            <label className="cbd-label">Contraseña</label>
            <input
              className="cbd-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={cambiar("password")}
              autoComplete="new-password"
            />
          </div>
        </div>

        {/* Botón probar conexión */}
        <button
          className="cbd-btn-primario"
          style={{ marginTop: "1rem" }}
          onClick={probarConexion}
          disabled={!formCompleto || estado === "probando" || estado === "analizando"}
        >
          {estado === "probando" ? (
            <><span className="cbd-spinner" /> Probando...</>
          ) : (
            "⟳ Probar conexión"
          )}
        </button>

        {/* Feedback de estado */}
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

        {/* Selector de tablas — solo si la conexión fue exitosa */}
        {estado === "ok" && tablas.length > 0 && (
          <div style={{ marginTop: "1.4rem" }}>
            <p className="cbd-label" style={{ marginBottom: "8px" }}>
              Selecciona la tabla a analizar
            </p>
            <div className="cbd-tablas-grid">
              {tablas.map((t) => (
                <button
                  key={t}
                  className={`cbd-tabla-chip${tablaSelec === t ? " seleccionada" : ""}`}
                  onClick={() => actualizarConexion({ tablaSelec: t })}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nota privacidad */}
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
        <button
          className="cbd-btn-primario"
          onClick={analizar}
          disabled={!tablaSelec || estado === "analizando" || estado === "probando"}
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
  const paso = form.conexionBD.paso; // 1 = instrucciones, 2 = formulario
  const setPaso = (p) => actualizarForm({ conexionBD: { ...form.conexionBD, paso: p } });

  const handleAnalisis = (resultado, tabla, motor) => {
    // Navega a resultados-analisis pasando los datos por location.state
    // (mismo flujo que CargaArchivo para mantener consistencia)
    navigate("/resultados-analisis", {
      state: {
        ...resultado,
        fuente: "bd",
        nombre: tabla,
        motor,
      },
    });
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "linear-gradient(160deg, #C1E8FF 0%, #e8f4ff 40%, #f0f8ff 100%)" }}>

      <BarraLateral />

      <main style={{ flex: 1, padding: "2.5rem 2.5rem 2.5rem 2rem", maxWidth: "860px" }}>
        {paso === 1 ? (
          <PantallaInstrucciones
            onContinuar={() => setPaso(2)}
            onVolver={() => navigate(-1)}
          />
        ) : (
          <PantallaFormulario
            onVolver={() => setPaso(1)}
            onAnalisis={handleAnalisis}
          />
        )}
      </main>

    </div>
  );
}