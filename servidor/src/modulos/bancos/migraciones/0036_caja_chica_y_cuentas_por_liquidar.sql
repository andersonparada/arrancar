-- CCL-B1: nueve conceptos de sistema para Caja chica y Cuentas por liquidar (mismos que
-- `dominio/conceptos-iniciales.ts`; si cambia uno, cambiar el otro), solo en las empresas que ya tienen catálogo
-- (las demás lo reciben completo al abrir Conceptos). Si la empresa ya tiene un concepto sin clave con ese nombre
-- (así están «Fondo de caja chica» y «Reintegro de caja chica», que eran sugeridos), se le pone la clave; si no,
-- se inserta; nunca se duplica ni se pisa. Repetible, como la 0033.
UPDATE "bancos"."conceptos" c
SET "clave_de_sistema" = s."clave"
FROM (VALUES
    ('fondo_de_caja_chica', 'Fondo de caja chica'),
    ('devolucion_de_fondo_de_caja_chica', 'Devolución de fondo de caja chica'),
    ('reintegro_de_caja_chica', 'Reintegro de caja chica'),
    ('reintegro_de_caja_chica_de_activo', 'Reintegro de caja chica de activo fijo'),
    ('anticipo_por_liquidar', 'Anticipos por liquidar'),
    ('gasto_de_anticipo', 'Gastos liquidados de anticipos'),
    ('gasto_de_anticipo_de_activo', 'Gastos liquidados de anticipos de activo fijo'),
    ('anticipo_no_liquidado', 'Anticipos no liquidados'),
    ('devolucion_de_anticipo', 'Devolución de anticipos')
) AS s("clave", "nombre")
WHERE c."clave_de_sistema" IS NULL
  AND lower(c."nombre") = lower(s."nombre")
  AND NOT EXISTS (
    SELECT 1 FROM "bancos"."conceptos" x WHERE x."empresa_id" = c."empresa_id" AND x."clave_de_sistema" = s."clave"
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
