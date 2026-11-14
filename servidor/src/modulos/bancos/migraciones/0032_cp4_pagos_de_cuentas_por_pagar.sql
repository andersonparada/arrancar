CREATE TABLE "bancos"."desglose_de_movimientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"movimiento_id" uuid NOT NULL,
	"concepto_id" uuid NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "desglose_de_movimientos_concepto_unico" UNIQUE("movimiento_id","concepto_id"),
	CONSTRAINT "desglose_de_movimientos_monto_positivo" CHECK ("bancos"."desglose_de_movimientos"."monto" > 0)
);
--> statement-breakpoint
ALTER TABLE "bancos"."desglose_de_movimientos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bancos"."desglose_de_movimientos" ADD CONSTRAINT "desglose_de_movimientos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bancos"."desglose_de_movimientos" ADD CONSTRAINT "desglose_de_movimientos_movimiento_id_movimientos_id_fk" FOREIGN KEY ("movimiento_id") REFERENCES "bancos"."movimientos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bancos"."desglose_de_movimientos" ADD CONSTRAINT "desglose_de_movimientos_concepto_de_la_empresa_fk" FOREIGN KEY ("concepto_id","empresa_id") REFERENCES "bancos"."conceptos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "desglose_de_movimientos_movimiento_idx" ON "bancos"."desglose_de_movimientos" USING btree ("movimiento_id");--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "bancos"."desglose_de_movimientos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);
--> statement-breakpoint
-- CP4: tres conceptos de sistema nuevos (mismos que `dominio/conceptos-iniciales.ts`; si cambia uno, cambiar el otro),
-- solo en las empresas que ya tienen catálogo (las demás lo reciben completo al abrir Conceptos). Si la empresa ya
-- tiene un concepto sin clave con ese nombre, se le pone la clave; si no, se inserta; nunca se duplica ni se pisa.
UPDATE "bancos"."conceptos" c
SET "clave_de_sistema" = s."clave"
FROM (VALUES
    ('pago_a_proveedor_de_activo', 'Pago a proveedores de activo fijo'),
    ('reintegro_de_proveedor', 'Reintegro de proveedores'),
    ('reintegro_de_proveedor_de_activo', 'Reintegro de proveedores de activo fijo')
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
    ('pago_a_proveedor_de_activo', 'Pago a proveedores de activo fijo', 'debito', 'inversion', 'Compra de activos'),
    ('reintegro_de_proveedor', 'Reintegro de proveedores', 'credito', 'operacion', 'Pagos a proveedores'),
    ('reintegro_de_proveedor_de_activo', 'Reintegro de proveedores de activo fijo', 'credito', 'inversion', 'Compra de activos')
) AS s("clave", "nombre", "aplica_a", "actividad", "grupo")
WHERE EXISTS (SELECT 1 FROM "bancos"."conceptos" c WHERE c."empresa_id" = e."id")
  AND NOT EXISTS (
    SELECT 1 FROM "bancos"."conceptos" c WHERE c."empresa_id" = e."id" AND c."clave_de_sistema" = s."clave"
  )
ON CONFLICT DO NOTHING;
