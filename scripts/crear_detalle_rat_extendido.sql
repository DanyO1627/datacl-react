-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint B2-04: crear tabla detalle_rat_extendido
-- Ejecutar en phpMyAdmin en la base de datos datacl (o como se llame la tuya)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS detalle_rat_extendido (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    tratamiento_id  INT NOT NULL UNIQUE,

    -- Identificación detallada
    descripcion_detallada       TEXT NULL,
    subarea_responsable         VARCHAR(200) NULL,
    procesos_relacionados       TEXT NULL,

    -- Finalidad y transparencia
    finalidades_secundarias     TEXT NULL,
    informa_titulares           TINYINT(1) NULL,
    documento_respaldo_permiso  TEXT NULL,

    -- Transferencias y terceros
    destinatarios_internos          TEXT NULL,
    destinatarios_nacionales        TEXT NULL,
    destinatarios_internacionales   TEXT NULL,
    terceros_son_encargados         TINYINT(1) NULL,
    contratos_proteccion_datos      TINYINT(1) NULL,
    datos_transferidos_detalle      TEXT NULL,
    metodo_transferencia            VARCHAR(200) NULL,

    -- Sistemas y tecnología
    sistemas_origen             TEXT NULL,
    sistemas_destino            TEXT NULL,
    sistemas_tratamiento        TEXT NULL,
    tipos_tratamiento_sistema   TEXT NULL,
    base_datos_nombre           VARCHAR(200) NULL,
    proveedor_tecnologico       VARCHAR(200) NULL,

    -- Principios legales
    criterio_plazo              VARCHAR(200) NULL,
    metodo_eliminacion          VARCHAR(200) NULL,
    documenta_destruccion       TINYINT(1) NULL,
    minimizacion_justificacion  TEXT NULL,
    mecanismos_exactitud        TEXT NULL,
    evaluacion_periodica        TINYINT(1) NULL,
    cumplimiento_demostrable    TINYINT(1) NULL,
    incidentes_historicos       TEXT NULL,
    cambios_futuros             TEXT NULL,

    -- Evaluación de impacto (DPIA)
    requiere_dpia               TINYINT(1) NULL,
    dpia_realizada              TINYINT(1) NULL,
    dpia_detalle                TEXT NULL,

    creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NULL,

    CONSTRAINT fk_extendido_tratamiento
        FOREIGN KEY (tratamiento_id) REFERENCES tratamientos(id) ON DELETE CASCADE
);
