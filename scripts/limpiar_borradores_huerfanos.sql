-- ─────────────────────────────────────────────────────────────────────────────
-- Limpieza de tratamientos BORRADOR/PENDIENTE huérfanos
-- (sin ninguna fila en sesion_actividad que los referencie)
--
-- Paso 1 → verificar (no borra nada)
-- Paso 2 → eliminar
-- ─────────────────────────────────────────────────────────────────────────────

-- PASO 1: ver qué se va a borrar
SELECT
    t.id,
    t.nombre,
    t.estado,
    t.creado_en
FROM tratamientos t
LEFT JOIN sesion_actividad sa ON sa.tratamiento_id = t.id
WHERE t.estado IN ('BORRADOR', 'PENDIENTE')
  AND sa.id IS NULL;

-- PASO 2: eliminar (ejecutar solo después de confirmar el paso 1)
DELETE t
FROM tratamientos t
LEFT JOIN sesion_actividad sa ON sa.tratamiento_id = t.id
WHERE t.estado IN ('BORRADOR', 'PENDIENTE')
  AND sa.id IS NULL;
