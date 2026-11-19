-- CCL-B1 (corrección de la 0036): el nombre se compara como lo hace el índice único `conceptos_nombre_unico`
-- (`core.nombre_normalizado`: sin mayúsculas, acentos ni espacios repetidos). Así «Devolucion de anticipos» o
-- «Fondo de  caja chica» reciben la clave en vez de chocar con el índice y quedar sin el concepto de sistema. Al que
-- recibe la clave se le alinea la clasificación de §3.2 a (ya no se podrá cambiar a mano) y se reactiva; lo mismo
-- se hace con los que la 0036 ya había marcado (por `lower(nombre)`) sin alinearlos. Después se insertan los que
-- sigan faltando. Repetible: converge siempre al mismo resultado.
UPDATE "bancos"."conceptos" c
SET "clave_de_sistema" = s."clave", "aplica_a" = s."aplica_a", "actividad_de_flujo" = s."actividad",
    "grupo_de_flujo" = s."grupo", "activo" = true
FROM (VALUES
    ('fondo_de_caja_chica', 'Fondo de caja chica', 'debito', 'ninguna', NULL),
    ('devolucion_de_fondo_de_caja_chica', 'Devolución de fondo de caja chica', 'credito', 'ninguna', NULL),
    ('reintegro_de_caja_chica', 'Reintegro de caja chica', 'debito', 'operacion', 'Reintegros de caja chica'),
    ('reintegro_de_caja_chica_de_activo', 'Reintegro de caja chica de activo fijo', 'debito', 'inversion', 'Compra de activos'),
    ('anticipo_por_liquidar', 'Anticipos por liquidar', 'debito', 'ninguna', NULL),
    ('gasto_de_anticipo', 'Gastos liquidados de anticipos', 'debito', 'operacion', 'Gastos liquidados de anticipos'),
    ('gasto_de_anticipo_de_activo', 'Gastos liquidados de anticipos de activo fijo', 'debito', 'inversion', 'Compra de activos'),
    ('anticipo_no_liquidado', 'Anticipos no liquidados', 'debito', 'operacion', 'Anticipos no liquidados'),
    ('devolucion_de_anticipo', 'Devolución de anticipos', 'credito', 'ninguna', NULL)
) AS s("clave", "nombre", "aplica_a", "actividad", "grupo")
WHERE c."clave_de_sistema" = s."clave"
  OR (
    c."clave_de_sistema" IS NULL
    AND core.nombre_normalizado(c."nombre") = core.nombre_normalizado(s."nombre")
    AND NOT EXISTS (
      SELECT 1 FROM "bancos"."conceptos" x WHERE x."empresa_id" = c."empresa_id" AND x."clave_de_sistema" = s."clave"
    )
  );--> statement-breakpoint
INSERT INTO "bancos"."conceptos"
  ("empresa_id", "clave_de_sistema", "nombre", "aplica_a", "actividad_de_flujo", "grupo_de_flujo",
   "es_cargo_bancario", "pide_datos_de_intereses", "admite_factura", "activo")
SELECT e."id", s."clave", s."nombre", s."aplica_a", s."actividad", s."grupo", false, false, false, true
FROM "core"."empresas" e
CROSS JOIN (VALUES
    ('fondo_de_caja_chica', 'Fondo de caja chica', 'debito', 'ninguna', NULL),
    ('devolucion_de_fondo_de_caja_chica', 'Devolución de fondo de caja chica', 'credito', 'ninguna', NULL),
    ('reintegro_de_caja_chica', 'Reintegro de caja chica', 'debito', 'operacion', 'Reintegros de caja chica'),
    ('reintegro_de_caja_chica_de_activo', 'Reintegro de caja chica de activo fijo', 'debito', 'inversion', 'Compra de activos'),
    ('anticipo_por_liquidar', 'Anticipos por liquidar', 'debito', 'ninguna', NULL),
    ('gasto_de_anticipo', 'Gastos liquidados de anticipos', 'debito', 'operacion', 'Gastos liquidados de anticipos'),
    ('gasto_de_anticipo_de_activo', 'Gastos liquidados de anticipos de activo fijo', 'debito', 'inversion', 'Compra de activos'),
    ('anticipo_no_liquidado', 'Anticipos no liquidados', 'debito', 'operacion', 'Anticipos no liquidados'),
    ('devolucion_de_anticipo', 'Devolución de anticipos', 'credito', 'ninguna', NULL)
) AS s("clave", "nombre", "aplica_a", "actividad", "grupo")
WHERE EXISTS (SELECT 1 FROM "bancos"."conceptos" c WHERE c."empresa_id" = e."id")
  AND NOT EXISTS (
    SELECT 1 FROM "bancos"."conceptos" c WHERE c."empresa_id" = e."id" AND c."clave_de_sistema" = s."clave"
  )
ON CONFLICT DO NOTHING;
