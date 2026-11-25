CREATE TABLE "libro_de_ventas"."datos_fiscales_de_cliente" (
	"cliente_id" uuid PRIMARY KEY NOT NULL,
	"cuenta_id" uuid DEFAULT nullif(current_setting('app.cuenta_id', true), '')::uuid NOT NULL,
	"agente_de_retencion_iva" text DEFAULT 'ninguno' NOT NULL,
	"exporta_productos_agropecuarios" boolean DEFAULT false NOT NULL,
	"retiene_isr" boolean DEFAULT false NOT NULL,
	"retiene_iva_a_pequeno_contribuyente" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "datos_fiscales_de_cliente_agente" CHECK ("libro_de_ventas"."datos_fiscales_de_cliente"."agente_de_retencion_iva" in ('ninguno', 'exportador', 'contribuyente_especial', 'sector_publico', 'otro')),
	CONSTRAINT "datos_fiscales_de_cliente_exportador" CHECK ("libro_de_ventas"."datos_fiscales_de_cliente"."agente_de_retencion_iva" = 'exportador' or not "libro_de_ventas"."datos_fiscales_de_cliente"."exporta_productos_agropecuarios"),
	CONSTRAINT "datos_fiscales_de_cliente_iva_a_pequeno" CHECK ("libro_de_ventas"."datos_fiscales_de_cliente"."agente_de_retencion_iva" <> 'ninguno' or not "libro_de_ventas"."datos_fiscales_de_cliente"."retiene_iva_a_pequeno_contribuyente")
);
--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."datos_fiscales_de_cliente" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."conceptos_de_ingreso" DROP CONSTRAINT "conceptos_de_ingreso_nombre_unico";--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."conceptos_de_ingreso" ADD COLUMN "clave_de_sistema" text;--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."datos_fiscales_de_cliente" ADD CONSTRAINT "datos_fiscales_de_cliente_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."datos_fiscales_de_cliente" ADD CONSTRAINT "datos_fiscales_de_cliente_cliente_fk" FOREIGN KEY ("cliente_id","cuenta_id") REFERENCES "terceros"."clientes"("id","cuenta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "datos_fiscales_de_cliente_cuenta_idx" ON "libro_de_ventas"."datos_fiscales_de_cliente" USING btree ("cuenta_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conceptos_de_ingreso_nombre_unico" ON "libro_de_ventas"."conceptos_de_ingreso" USING btree ("empresa_id",core.nombre_normalizado("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "conceptos_de_ingreso_clave_unica" ON "libro_de_ventas"."conceptos_de_ingreso" USING btree ("empresa_id","clave_de_sistema") WHERE "libro_de_ventas"."conceptos_de_ingreso"."clave_de_sistema" is not null;--> statement-breakpoint
CREATE INDEX "conceptos_de_ingreso_empresa_activo_idx" ON "libro_de_ventas"."conceptos_de_ingreso" USING btree ("empresa_id","activo");--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."conceptos_de_ingreso" ADD CONSTRAINT "conceptos_de_ingreso_id_empresa_unico" UNIQUE("id","empresa_id");--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."conceptos_de_ingreso" ADD CONSTRAINT "conceptos_de_ingreso_nombre_largo" CHECK (char_length(btrim("libro_de_ventas"."conceptos_de_ingreso"."nombre")) between 1 and 80);--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."conceptos_de_ingreso" ADD CONSTRAINT "conceptos_de_ingreso_tipo" CHECK ("libro_de_ventas"."conceptos_de_ingreso"."tipo" in ('bien', 'servicio'));--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."conceptos_de_ingreso" ADD CONSTRAINT "conceptos_de_ingreso_clave" CHECK ("libro_de_ventas"."conceptos_de_ingreso"."clave_de_sistema" in ('venta_de_activo_fijo'));--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."conceptos_de_ingreso" ADD CONSTRAINT "conceptos_de_ingreso_sistema_activo" CHECK ("libro_de_ventas"."conceptos_de_ingreso"."clave_de_sistema" is null or "libro_de_ventas"."conceptos_de_ingreso"."activo");--> statement-breakpoint
CREATE POLICY "aislamiento_por_cuenta" ON "libro_de_ventas"."datos_fiscales_de_cliente" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid) WITH CHECK (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid);--> statement-breakpoint
-- LV-1: la auditoría de los documentos de venta y de las retenciones recibidas no se depura mientras exista la empresa
-- (catálogo de la migración 0024 del core). Corre como dueño, así que puede escribir en el catálogo del core.
INSERT INTO "core"."recursos_de_auditoria_permanente" ("recurso", "motivo")
VALUES
  ('libro-de-ventas.documentos', 'Conservación de libros y documentos (Código de Comercio art. 382; Código Tributario, por confirmar)'),
  ('libro-de-ventas.retenciones', 'Conservación de libros y documentos (Código de Comercio art. 382; Código Tributario, por confirmar)')
ON CONFLICT DO NOTHING;
