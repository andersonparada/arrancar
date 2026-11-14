-- CP4-EB: tres conceptos de sistema para el efectivo de los pagos a proveedores (mismos que
-- `dominio/conceptos-iniciales.ts`; si cambia uno, cambiar el otro), solo en las empresas que ya tienen catálogo
-- (las demás lo reciben completo al abrir Conceptos). Si la empresa ya tiene un concepto sin clave con ese nombre,
-- se le pone la clave; si no, se inserta; nunca se duplica ni se pisa.
UPDATE "bancos"."conceptos" c
SET "clave_de_sistema" = s."clave"
FROM (VALUES
    ('efectivo_para_pagos', 'Efectivo para pagos a proveedores'),
    ('devolucion_de_efectivo_para_pagos', 'Devolución de efectivo para pagos'),
    ('faltante_de_efectivo', 'Faltante de efectivo')
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
    ('efectivo_para_pagos', 'Efectivo para pagos a proveedores', 'debito', 'ninguna', NULL),
    ('devolucion_de_efectivo_para_pagos', 'Devolución de efectivo para pagos', 'credito', 'ninguna', NULL),
    ('faltante_de_efectivo', 'Faltante de efectivo', 'debito', 'operacion', 'Faltante de efectivo')
) AS s("clave", "nombre", "aplica_a", "actividad", "grupo")
WHERE EXISTS (SELECT 1 FROM "bancos"."conceptos" c WHERE c."empresa_id" = e."id")
  AND NOT EXISTS (
    SELECT 1 FROM "bancos"."conceptos" c WHERE c."empresa_id" = e."id" AND c."clave_de_sistema" = s."clave"
  )
ON CONFLICT DO NOTHING;
