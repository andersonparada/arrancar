-- VC-0b: conceptos de sistema de Cuentas por cobrar (diseño de Cuentas por cobrar y Ventas §4.2 a). Igual que la 0037:
-- el nombre se compara con `core.nombre_normalizado`; al concepto sin clave del mismo nombre se le pone la clave, se le
-- alinea la clasificación (el cargo bancario no se toca) y se reactiva; después se insertan los que falten. «Depósito de
-- ventas» queda sin clave y libre. Repetible: converge siempre al mismo resultado.
-- «Cobros a clientes» es la marca de Cuentas por cobrar: un concepto de ese nombre que ya tiene movimientos NO se adopta
-- (sus notas quedarían marcadas para un módulo que quizá no existe, sin salida). Se renombra y sigue como concepto propio;
-- el de sistema se inserta aparte.
UPDATE "bancos"."conceptos" c
SET "nombre" = c."nombre" || ' (anterior)'
WHERE c."clave_de_sistema" IS NULL
  AND core.nombre_normalizado(c."nombre") = core.nombre_normalizado('Cobros a clientes')
  AND (
    EXISTS (SELECT 1 FROM "bancos"."movimientos" m WHERE m."concepto_id" = c."id")
    OR EXISTS (SELECT 1 FROM "bancos"."desglose_de_movimientos" d WHERE d."concepto_id" = c."id")
  )
  AND NOT EXISTS (
    SELECT 1 FROM "bancos"."conceptos" x
    WHERE x."empresa_id" = c."empresa_id"
      AND core.nombre_normalizado(x."nombre") = core.nombre_normalizado(c."nombre" || ' (anterior)')
  );--> statement-breakpoint
UPDATE "bancos"."conceptos" c
SET "clave_de_sistema" = s."clave", "aplica_a" = s."aplica_a", "actividad_de_flujo" = s."actividad",
    "grupo_de_flujo" = s."grupo", "activo" = true
FROM (VALUES
    ('cobro_a_cliente', 'Cobros a clientes', 'credito', 'operacion', 'Cobros a clientes', false),
    ('cobro_a_cliente_de_activo', 'Cobro de venta de activo fijo', 'credito', 'inversion', 'Venta de activos', false),
    ('devolucion_a_cliente', 'Devoluciones a clientes', 'debito', 'operacion', 'Cobros a clientes', false),
    ('cheque_rechazado', 'Cheque rechazado', 'debito', 'operacion', 'Cobros a clientes', true)
) AS s("clave", "nombre", "aplica_a", "actividad", "grupo", "cargo")
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
SELECT e."id", s."clave", s."nombre", s."aplica_a", s."actividad", s."grupo", s."cargo", false, false, true
FROM "core"."empresas" e
CROSS JOIN (VALUES
    ('cobro_a_cliente', 'Cobros a clientes', 'credito', 'operacion', 'Cobros a clientes', false),
    ('cobro_a_cliente_de_activo', 'Cobro de venta de activo fijo', 'credito', 'inversion', 'Venta de activos', false),
    ('devolucion_a_cliente', 'Devoluciones a clientes', 'debito', 'operacion', 'Cobros a clientes', false),
    ('cheque_rechazado', 'Cheque rechazado', 'debito', 'operacion', 'Cobros a clientes', true)
) AS s("clave", "nombre", "aplica_a", "actividad", "grupo", "cargo")
WHERE EXISTS (SELECT 1 FROM "bancos"."conceptos" c WHERE c."empresa_id" = e."id")
  AND NOT EXISTS (
    SELECT 1 FROM "bancos"."conceptos" c WHERE c."empresa_id" = e."id" AND c."clave_de_sistema" = s."clave"
  )
ON CONFLICT DO NOTHING;
