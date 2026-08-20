"""
Migración: agrega columnas faltantes a organizaciones y detalle_rat_extendido.
Ejecutar una vez:  python migrate_add_columns.py
"""
from app.basededatos import engine
from sqlalchemy import text

MIGRATIONS = [
    "ALTER TABLE organizaciones ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1",
    "ALTER TABLE organizaciones ADD COLUMN color_institucional VARCHAR(7) NULL",
    "ALTER TABLE organizaciones ADD COLUMN logo_ruta VARCHAR(500) NULL",
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
    "ALTER TABLE detalle_rat_extendido ADD COLUMN sistemas_origen TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN sistemas_destino TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN sistemas_tratamiento TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN tipos_tratamiento_sistema TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN base_datos_nombre VARCHAR(200) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN proveedor_tecnologico VARCHAR(200) NULL",
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
    "ALTER TABLE detalle_rat_extendido ADD COLUMN pais_destino VARCHAR(200) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN categorias_sensibles TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN categorias_datos_seleccion TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN requiere_dpia TINYINT(1) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN dpia_realizada TINYINT(1) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN dpia_detalle TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN proceso_asociado TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN imagen_proceso VARCHAR(300) NULL",
    # R9.1 — Paso 2 datos ampliados
    "ALTER TABLE detalle_rat_extendido ADD COLUMN datos_academicos_laborales TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN datos_financieros_patrimoniales TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN origen_sistemico_datos TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN origen_datos_detalle TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN datos_sensibles_descripcion TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN otros_datos TEXT NULL",
    # R9.1 — Paso 3 transferencias
    "ALTER TABLE detalle_rat_extendido ADD COLUMN base_legal_transferencia_internacional TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN metodo_transferencia_detalle TEXT NULL",
    # R9.1 — Paso 4 Principios 1 y 2
    "ALTER TABLE detalle_rat_extendido ADD COLUMN finalidad_todos_necesarios TINYINT(1) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN finalidad_misma TINYINT(1) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN informa_titulares_si_no TINYINT(1) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN usa_solo_fines_declarados TINYINT(1) NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN asegura_transparencia_detalle TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN minimizacion_si_no TINYINT(1) NULL",
    # 2026-08-20 — texto libre "Método de eliminación: otro" + detalle de
    # "¿Se evalúa periódicamente la pertinencia de los datos?"
    "ALTER TABLE detalle_rat_extendido ADD COLUMN metodo_eliminacion_otro TEXT NULL",
    "ALTER TABLE detalle_rat_extendido ADD COLUMN evaluacion_periodica_detalle TEXT NULL",
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
