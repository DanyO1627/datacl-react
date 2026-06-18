"""
Migración: agrega columnas faltantes a organizaciones y detalle_rat_extendido.
Ejecutar una vez:  python migrate_add_columns.py
"""
from app.basededatos import engine
from sqlalchemy import text

MIGRATIONS = [
    # ── organizaciones ─────────────────────────────────────────
    "ALTER TABLE organizaciones ADD COLUMN color_institucional VARCHAR(7) NULL",
    "ALTER TABLE organizaciones ADD COLUMN logo_ruta VARCHAR(500) NULL",
    # ── detalle_rat_extendido — B2-05 datos y transferencias ───
    "ALTER TABLE detalle_rat_extendido ADD COLUMN incluye_nna TINYINT(1) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN nna_detalle TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN datos_navegacion TINYINT(1) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN datos_navegacion_detalle TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN destinatarios_internos TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN destinatarios_nacionales TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN destinatarios_internacionales TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN terceros_son_encargados TINYINT(1) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN contratos_proteccion_datos TINYINT(1) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN contratos_proteccion_datos_detalle TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN datos_transferidos_detalle TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN metodo_transferencia TEXT NULL",
    # ── detalle_rat_extendido — sistemas ───────────────────────
    "ALTER TABLE detalle_rat_extendido ADD COLUMN sistemas_origen TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN sistemas_destino TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN sistemas_tratamiento TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN tipos_tratamiento_sistema TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN base_datos_nombre VARCHAR(200) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN proveedor_tecnologico VARCHAR(200) NULL",
    # ── detalle_rat_extendido — principios Ley 21.719 ──────────
    "ALTER TABLE detalle_rat_extendido ADD COLUMN criterio_plazo VARCHAR(50) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN metodo_eliminacion VARCHAR(100) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN documenta_destruccion TINYINT(1) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN excepciones_plazo TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN minimizacion_justificacion TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN mecanismos_exactitud TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN evaluacion_periodica VARCHAR(50) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN cumplimiento_demostrable TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN incidentes_historicos TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN cambios_futuros TEXT NULL",
    # ── detalle_rat_extendido — DPIA ───────────────────────────
    "ALTER TABLE detalle_rat_extendido ADD COLUMN requiere_dpia TINYINT(1) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN dpia_realizada TINYINT(1) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN dpia_detalle TEXT NULL",
]

def main():
    with engine.connect() as conn:
        for sql in MIGRATIONS:
            try:
                conn.execute(text(sql))
                conn.commit()
                col = sql.split("ADD COLUMN ")[1].split(" ")[0]
                print(f"  + {col}")
            except Exception as e:
                if "Duplicate column name" in str(e):
                    col = sql.split("ADD COLUMN ")[1].split(" ")[0]
                    print(f"  = {col} (ya existe)")
                else:
                    print(f"  ERROR: {e}")
    print("\nMigración completada.")

if __name__ == "__main__":
    main()
