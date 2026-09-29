-- H3b: cada movimiento lleva un concepto (bancos.conceptos), de la misma empresa. Pasos: la columna nace
-- nulable; se siembra el catálogo en las empresas con movimientos que aún no lo tengan; se rellena con reglas
-- deterministas (informe del contador, §4: nada inferido); y recién entonces queda NOT NULL con su llave foránea.
ALTER TABLE "bancos"."conceptos" ADD CONSTRAINT "conceptos_id_empresa_unico" UNIQUE("id","empresa_id");--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD COLUMN "concepto_id" uuid;--> statement-breakpoint
-- 1. Siembra (mismos conceptos que 0016; si cambia uno, cambiar el otro) en cada empresa con movimientos y sin catálogo.
INSERT INTO "bancos"."conceptos"
  ("empresa_id", "clave_de_sistema", "nombre", "aplica_a", "actividad_de_flujo", "grupo_de_flujo",
   "es_cargo_bancario", "pide_datos_de_intereses", "admite_factura", "activo")
SELECT e."id", s."clave", s."nombre", s."aplica_a", s."actividad", s."grupo", s."cargo", s."intereses", false, true
FROM "core"."empresas" e
CROSS JOIN (VALUES
    ('transferencia', 'Transferencia entre cuentas', 'ambos', 'ninguna', NULL, false, false),
    ('pago_a_proveedor', 'Pago a proveedores', 'debito', 'operacion', 'Pagos a proveedores', false, false),
    ('saldo_inicial', 'Saldo inicial', 'ambos', 'ninguna', NULL, false, false),
    ('sin_clasificar', 'Sin clasificar', 'ambos', 'ninguna', NULL, false, false),
    ('cheque_caduco', 'Cheque caduco', 'credito', 'ninguna', NULL, false, false),
    (NULL, 'Depósito de ventas', 'credito', 'operacion', 'Cobros a clientes', false, false),
    (NULL, 'Comisiones bancarias', 'debito', 'operacion', 'Comisiones bancarias', true, false),
    (NULL, 'Intereses ganados', 'credito', 'operacion', 'Intereses ganados', true, true),
    (NULL, 'Cheque rechazado', 'debito', 'operacion', 'Cheques rechazados', true, false),
    (NULL, 'Planilla', 'debito', 'operacion', 'Pagos de planilla', false, false),
    (NULL, 'Préstamo recibido', 'credito', 'financiamiento', 'Préstamos recibidos', false, false),
    (NULL, 'Pago de préstamo', 'debito', 'financiamiento', 'Pagos de préstamos', false, false),
    (NULL, 'Compra de activo', 'debito', 'inversion', 'Compra de activos', false, false),
    (NULL, 'Aporte de socios', 'credito', 'financiamiento', 'Aportes de socios', false, false),
    (NULL, 'Retiro de socios', 'debito', 'financiamiento', 'Retiros de socios', false, false),
    (NULL, 'Impuestos', 'debito', 'operacion', 'Pago de impuestos', false, false)
) AS s("clave", "nombre", "aplica_a", "actividad", "grupo", "cargo", "intereses")
WHERE EXISTS (SELECT 1 FROM "bancos"."movimientos" m WHERE m."empresa_id" = e."id")
  AND NOT EXISTS (SELECT 1 FROM "bancos"."conceptos" c WHERE c."empresa_id" = e."id")
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Si la empresa ya tenía catálogo pero le falta alguno de los tres de sistema que usa este relleno, se le agrega.
INSERT INTO "bancos"."conceptos"
  ("empresa_id", "clave_de_sistema", "nombre", "aplica_a", "actividad_de_flujo", "grupo_de_flujo",
   "es_cargo_bancario", "pide_datos_de_intereses", "admite_factura", "activo")
SELECT e."id", s."clave", s."nombre", 'ambos', 'ninguna', NULL, false, false, false, true
FROM "core"."empresas" e
CROSS JOIN (VALUES
    ('transferencia', 'Transferencia entre cuentas'),
    ('saldo_inicial', 'Saldo inicial'),
    ('sin_clasificar', 'Sin clasificar')
) AS s("clave", "nombre")
WHERE EXISTS (SELECT 1 FROM "bancos"."movimientos" m WHERE m."empresa_id" = e."id")
  AND NOT EXISTS (
    SELECT 1 FROM "bancos"."conceptos" c WHERE c."empresa_id" = e."id" AND c."clave_de_sistema" = s."clave"
  )
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- 2. Notas de transferencia -> transferencia; saldo inicial -> saldo_inicial.
UPDATE "bancos"."movimientos" m
SET "concepto_id" = c."id"
FROM "bancos"."conceptos" c
WHERE c."empresa_id" = m."empresa_id" AND c."clave_de_sistema" = 'transferencia'
  AND m."transferencia_id" IS NOT NULL AND m."revierte_a_id" IS NULL;--> statement-breakpoint
UPDATE "bancos"."movimientos" m
SET "concepto_id" = c."id"
FROM "bancos"."conceptos" c
WHERE c."empresa_id" = m."empresa_id" AND c."clave_de_sistema" = 'saldo_inicial'
  AND m."saldo_inicial" AND m."revierte_a_id" IS NULL AND m."concepto_id" IS NULL;--> statement-breakpoint
-- 3. El resto de los originales (notas y cheques, incluidos los anulados a la antigua) -> sin_clasificar.
UPDATE "bancos"."movimientos" m
SET "concepto_id" = c."id"
FROM "bancos"."conceptos" c
WHERE c."empresa_id" = m."empresa_id" AND c."clave_de_sistema" = 'sin_clasificar'
  AND m."revierte_a_id" IS NULL AND m."concepto_id" IS NULL;--> statement-breakpoint
-- 4. Los inversos (incluidos los de transferencias) heredan el concepto de su original, ya clasificado.
UPDATE "bancos"."movimientos" i
SET "concepto_id" = o."concepto_id"
FROM "bancos"."movimientos" o
WHERE i."revierte_a_id" = o."id" AND i."concepto_id" IS NULL;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ALTER COLUMN "concepto_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD CONSTRAINT "movimientos_concepto_de_la_empresa_fk" FOREIGN KEY ("concepto_id","empresa_id") REFERENCES "bancos"."conceptos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "movimientos_concepto_fecha_idx" ON "bancos"."movimientos" USING btree ("empresa_id","concepto_id","fecha");
