import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BarraLateral from "../components/BarraLateral";
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
  const [form, setForm] = useState({
    motor: "mysql",
    host: "",
    puerto: 3306,
    base_datos: "",
    usuario: "",
    password: "",
  });

  const [estado, setEstado] = useState("idle"); // idle | probando | ok | error | analizando
  const [errorMsg, setErrorMsg] = useState("");
  const [tablas, setTablas] = useState([]);
  const [tablaSelec, setTablaSelec] = useState("");

  const token = localStorage.getItem("token");

  const cambiar = (campo) => (e) => {
    const val = campo === "puerto" ? Number(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [campo]: val }));
    // Si cambia el motor, actualizar puerto por defecto
    if (campo === "motor") {
      setForm((prev) => ({
        ...prev,
        motor: e.target.value,
        puerto: PUERTOS_DEFAULT[e.target.value] ?? prev.puerto,
      }));
    }
    // Resetear estado si el usuario edita algo
    setEstado("idle");
    setTablas([]);
    setTablaSelec("");
  };

  const formCompleto =
    form.host.trim() &&
    form.base_datos.trim() &&
    form.usuario.trim() &&
    form.puerto;

  const probarConexion = async () => {
    setEstado("probando");
    setErrorMsg("");
    try {
      const res = await fetch("http://localhost:8000/analizar/conexion/probar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setEstado("ok");
        setTablas(data.tablas ?? []);
      } else {
        setEstado("error");
        setErrorMsg(data.detail ?? "Error al conectar");
      }
    } catch {
      setEstado("error");
      setErrorMsg("No se pudo conectar con el servidor. Verifica que el backend esté corriendo.");
    }
  };

  const analizar = async () => {
    if (!tablaSelec) return;
    setEstado("analizando");
    setErrorMsg("");
    try {
      const res = await fetch("http://localhost:8000/analizar/conexion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, tabla: tablaSelec }),
      });
      const data = await res.json();
      if (res.ok) {
        // Navega a resultados pasando el resultado por state (mismo flujo que archivo)
        onAnalisis(data, tablaSelec, form.motor);
      } else {
        setEstado("ok"); // vuelve a estado ok para no perder la selección
        setErrorMsg(data.detail ?? "Error al analizar");
      }
    } catch {
      setEstado("ok");
      setErrorMsg("No se pudo conectar con el servidor.");
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
              value={form.motor}
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
              value={form.base_datos}
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
              value={form.host}
              onChange={cambiar("host")}
            />
          </div>
          <div className="cbd-field">
            <label className="cbd-label">Puerto</label>
            <input
              className="cbd-input"
              type="number"
              value={form.puerto}
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
              value={form.usuario}
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
              value={form.password}
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
                  onClick={() => setTablaSelec(t)}
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
  const [paso, setPaso] = useState(1); // 1 = instrucciones, 2 = formulario

  const handleAnalisis = (resultado, tabla, motor) => {
    // Navega a resultados-analisis pasando los datos por location.state
    // (mismo flujo que CargaArchivo para mantener consistencia)
    navigate("/resultados-analisis", {
      state: {
        resultado,
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