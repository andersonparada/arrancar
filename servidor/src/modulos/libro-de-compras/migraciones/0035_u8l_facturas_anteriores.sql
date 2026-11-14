CREATE TABLE "libro_de_compras"."facturas_anteriores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cuenta_id" uuid DEFAULT nullif(current_setting('app.cuenta_id', true), '')::uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"serie" text,
	"numero" text NOT NULL,
	"autorizacion_fel" uuid,
	"fecha_emision" date NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"iva" numeric(14, 2) NOT NULL,
	"notas_de_debito_anteriores_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notas_de_debito_anteriores_iva" numeric(14, 2) DEFAULT '0' NOT NULL,
	"motivo_sin_credito" text,
	"detalle_del_motivo" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "facturas_anteriores_id_proveedor_unico" UNIQUE("id","empresa_id","proveedor_id"),
	CONSTRAINT "facturas_anteriores_tipo_valido" CHECK ("libro_de_compras"."facturas_anteriores"."tipo" in ('factura', 'factura_pequeno_contribuyente', 'factura_pequeno_contribuyente_electronico', 'factura_contribuyente_agropecuario', 'factura_primario_pecuario')),
	CONSTRAINT "facturas_anteriores_serie_valida" CHECK ("libro_de_compras"."facturas_anteriores"."serie" is null or (char_length(btrim("libro_de_compras"."facturas_anteriores"."serie")) between 1 and 40 and btrim("libro_de_compras"."facturas_anteriores"."serie") = upper(btrim("libro_de_compras"."facturas_anteriores"."serie")) and btrim("libro_de_compras"."facturas_anteriores"."serie") !~ '\s')),
	CONSTRAINT "facturas_anteriores_numero_valido" CHECK (char_length(btrim("libro_de_compras"."facturas_anteriores"."numero")) between 1 and 40 and btrim("libro_de_compras"."facturas_anteriores"."numero") = upper(btrim("libro_de_compras"."facturas_anteriores"."numero")) and btrim("libro_de_compras"."facturas_anteriores"."numero") !~ '\s'),
	CONSTRAINT "facturas_anteriores_motivo_valido" CHECK ("libro_de_compras"."facturas_anteriores"."motivo_sin_credito" is null or "libro_de_compras"."facturas_anteriores"."motivo_sin_credito" in ('fuera_de_plazo', 'no_vinculado', 'pequeno_contribuyente', 'contribuyente_agropecuario', 'primario_pecuario', 'exento', 'empresa_sin_credito', 'otra_causa_sin_credito')),
	CONSTRAINT "facturas_anteriores_detalle_del_motivo" CHECK (("libro_de_compras"."facturas_anteriores"."detalle_del_motivo" is null or char_length(btrim("libro_de_compras"."facturas_anteriores"."detalle_del_motivo")) between 1 and 500)
        and (coalesce("libro_de_compras"."facturas_anteriores"."motivo_sin_credito", '') <> 'otra_causa_sin_credito' or "libro_de_compras"."facturas_anteriores"."detalle_del_motivo" is not null)),
	CONSTRAINT "facturas_anteriores_total_positivo" CHECK ("libro_de_compras"."facturas_anteriores"."total" > 0),
	CONSTRAINT "facturas_anteriores_iva_rango" CHECK ("libro_de_compras"."facturas_anteriores"."iva" >= 0 and "libro_de_compras"."facturas_anteriores"."iva" <= "libro_de_compras"."facturas_anteriores"."total"),
	CONSTRAINT "facturas_anteriores_notas_de_debito_rango" CHECK ("libro_de_compras"."facturas_anteriores"."notas_de_debito_anteriores_total" >= 0 and "libro_de_compras"."facturas_anteriores"."notas_de_debito_anteriores_iva" >= 0
        and "libro_de_compras"."facturas_anteriores"."notas_de_debito_anteriores_iva" <= "libro_de_compras"."facturas_anteriores"."notas_de_debito_anteriores_total"),
	CONSTRAINT "facturas_anteriores_motivo_de_la_familia" CHECK (case when "libro_de_compras"."facturas_anteriores"."tipo" in ('factura_pequeno_contribuyente', 'factura_pequeno_contribuyente_electronico', 'factura_contribuyente_agropecuario', 'factura_primario_pecuario') then (case "libro_de_compras"."facturas_anteriores"."tipo" when 'factura_pequeno_contribuyente' then coalesce("libro_de_compras"."facturas_anteriores"."motivo_sin_credito", '') = 'pequeno_contribuyente' when 'factura_pequeno_contribuyente_electronico' then coalesce("libro_de_compras"."facturas_anteriores"."motivo_sin_credito", '') = 'pequeno_contribuyente' when 'factura_contribuyente_agropecuario' then coalesce("libro_de_compras"."facturas_anteriores"."motivo_sin_credito", '') = 'contribuyente_agropecuario' when 'factura_primario_pecuario' then coalesce("libro_de_compras"."facturas_anteriores"."motivo_sin_credito", '') = 'primario_pecuario' else false end)
        else coalesce("libro_de_compras"."facturas_anteriores"."motivo_sin_credito", '') not in ('pequeno_contribuyente', 'contribuyente_agropecuario', 'primario_pecuario') end),
	CONSTRAINT "facturas_anteriores_sin_iva" CHECK (coalesce("libro_de_compras"."facturas_anteriores"."motivo_sin_credito", '') not in ('pequeno_contribuyente', 'contribuyente_agropecuario', 'primario_pecuario', 'exento')
        or ("libro_de_compras"."facturas_anteriores"."iva" = 0 and "libro_de_compras"."facturas_anteriores"."notas_de_debito_anteriores_iva" = 0)),
	CONSTRAINT "facturas_anteriores_primario_pecuario_desde" CHECK ("libro_de_compras"."facturas_anteriores"."tipo" <> 'factura_primario_pecuario' or "libro_de_compras"."facturas_anteriores"."fecha_emision" >= date '2025-04-09')
);
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."facturas_anteriores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" DROP CONSTRAINT "documentos_motivo_sin_credito_valido";--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" DROP CONSTRAINT "documentos_iva_no_acreditable_por_motivo";--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" DROP CONSTRAINT "documentos_nota_con_factura";--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD COLUMN "factura_anterior_id" uuid;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."facturas_anteriores" ADD CONSTRAINT "facturas_anteriores_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."facturas_anteriores" ADD CONSTRAINT "facturas_anteriores_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."facturas_anteriores" ADD CONSTRAINT "facturas_anteriores_proveedor_fk" FOREIGN KEY ("proveedor_id","cuenta_id") REFERENCES "terceros"."proveedores"("id","cuenta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "facturas_anteriores_del_proveedor_unica" ON "libro_de_compras"."facturas_anteriores" USING btree ("empresa_id","proveedor_id",coalesce("serie", ''),"numero");--> statement-breakpoint
CREATE UNIQUE INDEX "facturas_anteriores_autorizacion_fel_unica" ON "libro_de_compras"."facturas_anteriores" USING btree ("empresa_id","autorizacion_fel") WHERE "libro_de_compras"."facturas_anteriores"."autorizacion_fel" is not null;--> statement-breakpoint
CREATE INDEX "facturas_anteriores_proveedor_idx" ON "libro_de_compras"."facturas_anteriores" USING btree ("proveedor_id");--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_factura_anterior_fk" FOREIGN KEY ("factura_anterior_id","empresa_id","proveedor_id") REFERENCES "libro_de_compras"."facturas_anteriores"("id","empresa_id","proveedor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documentos_factura_anterior_idx" ON "libro_de_compras"."documentos" USING btree ("factura_anterior_id") WHERE "libro_de_compras"."documentos"."factura_anterior_id" is not null;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_otra_causa_con_detalle" CHECK (coalesce("libro_de_compras"."documentos"."motivo_sin_credito", '') <> 'otra_causa_sin_credito' or "libro_de_compras"."documentos"."tipo" = 'nota_de_credito' or "libro_de_compras"."documentos"."observaciones" is not null);--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_motivo_sin_credito_valido" CHECK ("libro_de_compras"."documentos"."motivo_sin_credito" is null or "libro_de_compras"."documentos"."motivo_sin_credito" in ('fuera_de_plazo', 'no_vinculado', 'pequeno_contribuyente', 'contribuyente_agropecuario', 'primario_pecuario', 'exento', 'empresa_sin_credito', 'otra_causa_sin_credito', 'nota_de_debito_tardia'));--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_iva_no_acreditable_por_motivo" CHECK (("libro_de_compras"."documentos"."motivo_sin_credito" in ('fuera_de_plazo', 'no_vinculado', 'empresa_sin_credito', 'nota_de_debito_tardia', 'otra_causa_sin_credito') and "libro_de_compras"."documentos"."iva_no_acreditable" = "libro_de_compras"."documentos"."iva")
        or (coalesce("libro_de_compras"."documentos"."motivo_sin_credito", '') not in ('fuera_de_plazo', 'no_vinculado', 'empresa_sin_credito', 'nota_de_debito_tardia', 'otra_causa_sin_credito') and "libro_de_compras"."documentos"."iva_no_acreditable" = 0));--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_nota_con_factura" CHECK (("libro_de_compras"."documentos"."tipo" in ('nota_de_credito', 'nota_de_debito')) = (num_nonnulls("libro_de_compras"."documentos"."documento_afectado_id", "libro_de_compras"."documentos"."factura_anterior_id") = 1)
        and num_nonnulls("libro_de_compras"."documentos"."documento_afectado_id", "libro_de_compras"."documentos"."factura_anterior_id") <= 1);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "libro_de_compras"."facturas_anteriores" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);